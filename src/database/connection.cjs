const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const { join } = require('node:path');
const { eq } = require('drizzle-orm');
const { validateProjectHierarchy, connectPathParents } = require('./project-hierarchy.cjs');
const schema = require('./schema.cjs');

function openDatabase(home) {
  const client = new Database(join(home, 'desktop.sqlite'));
  try {
    client.pragma('journal_mode = WAL');
    client.pragma('foreign_keys = OFF');
    const version = client.pragma('user_version', { simple: true });
    if (version > 11) throw new Error('이 앱보다 새로운 데이터베이스입니다. 앱을 업데이트해 주세요.');
    // Versioned DDL upgrades preserve the existing MVP database in place.
    client.transaction(() => {
      client.exec("CREATE TABLE IF NOT EXISTS projects (path TEXT PRIMARY KEY, opened_at INTEGER NOT NULL, data TEXT NOT NULL DEFAULT '{}')");
      if (!client.pragma('table_info(projects)').some(column => column.name === 'data')) {
        client.exec("ALTER TABLE projects ADD COLUMN data TEXT NOT NULL DEFAULT '{}'");
      }
      const columns = new Set(client.pragma('table_info(projects)').map(column => column.name));
      for (const name of ['session_count', 'created_at', 'last_modified', 'favorited_at', 'hidden_at']) {
        if (!columns.has(name)) client.exec(`ALTER TABLE projects ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 0`);
      }
      for (const name of ['alias', 'description']) {
        if (!columns.has(name)) client.exec(`ALTER TABLE projects ADD COLUMN ${name} TEXT`);
      }
      if (!columns.has('id')) client.exec('ALTER TABLE projects ADD COLUMN id INTEGER');
      if (!columns.has('project_id')) client.exec('ALTER TABLE projects ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL');
      if (!columns.has('sessions_expanded')) client.exec('ALTER TABLE projects ADD COLUMN sessions_expanded INTEGER NOT NULL DEFAULT 0');
      if (!columns.has('sort_order')) client.exec('ALTER TABLE projects ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
      const db = drizzle(client, { schema });
      if (version < 3) {
        for (const row of db.select().from(schema.projects).all()) {
          const data = row.data;
          db.update(schema.projects).set({
            sessionCount: data.sessionCount || 0, createdAt: data.createdAt ?? row.openedAt,
            lastModified: data.lastModified ?? row.openedAt, favoritedAt: data.favoritedAt || 0,
            hiddenAt: data.hiddenAt || 0, alias: data.alias || null, description: data.description || null,
          }).where(eq(schema.projects.path, row.path)).run();
        }
      }
      if (version < 4) {
        const rows = db.select().from(schema.projects).all();
        let nextId = Math.max(0, ...rows.map(row => Number.isSafeInteger(row.data.id) ? row.data.id : 0)) + 1;
        for (const row of rows) {
          const id = Number.isSafeInteger(row.data.id) ? row.data.id : nextId++;
          db.update(schema.projects).set({ id }).where(eq(schema.projects.path, row.path)).run();
        }
        client.exec("CREATE TABLE projects_v4 (id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL UNIQUE, opened_at INTEGER NOT NULL, session_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT 0, last_modified INTEGER NOT NULL DEFAULT 0, favorited_at INTEGER NOT NULL DEFAULT 0, hidden_at INTEGER NOT NULL DEFAULT 0, alias TEXT, description TEXT, data TEXT NOT NULL DEFAULT '{}')");
        client.exec('INSERT INTO projects_v4 SELECT id, path, opened_at, session_count, created_at, last_modified, favorited_at, hidden_at, alias, description, data FROM projects');
        client.exec('DROP TABLE projects; ALTER TABLE projects_v4 RENAME TO projects');
      }
      if (!client.pragma('table_info(projects)').some(column => column.name === 'project_id')) {
        client.exec('ALTER TABLE projects ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL');
      }
      if (!client.pragma('table_info(projects)').some(column => column.name === 'sessions_expanded')) {
        client.exec('ALTER TABLE projects ADD COLUMN sessions_expanded INTEGER NOT NULL DEFAULT 0');
      }
      if (!client.pragma('table_info(projects)').some(column => column.name === 'sort_order')) client.exec('ALTER TABLE projects ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
      if (version < 5) {
        const rows = db.select().from(schema.projects).all();
        const restored = connectPathParents(rows.map(row => ({ ...row, projectId: row.data.projectId ?? null })));
        validateProjectHierarchy(restored);
        for (const row of restored) db.update(schema.projects).set({ projectId: row.projectId }).where(eq(schema.projects.id, row.id)).run();
      }
      if (version < 7) {
        client.exec("CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL UNIQUE, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, src TEXT, title TEXT, custom_title TEXT, alias TEXT, created_at TEXT, last_timestamp TEXT, is_open INTEGER NOT NULL DEFAULT 0, activity TEXT NOT NULL DEFAULT 'idle', activity_updated_at INTEGER NOT NULL DEFAULT 0, source_synced_at INTEGER NOT NULL DEFAULT 0, source_mtime INTEGER, source_size INTEGER, data TEXT NOT NULL DEFAULT '{}')");
        client.exec('CREATE INDEX sessions_project_time ON sessions(project_id, last_timestamp); CREATE INDEX sessions_open_activity ON sessions(is_open, activity)');
      }
      if (version < 8) {
        client.exec('ALTER TABLE sessions ADD COLUMN favorited_at INTEGER NOT NULL DEFAULT 0');
        client.exec('CREATE INDEX sessions_favorited ON sessions(favorited_at)');
      }
      if (version < 9) {
        const rows = db.select().from(schema.projects).all().sort((a, b) => Number(b.favoritedAt > 0) - Number(a.favoritedAt > 0) || b.lastModified - a.lastModified || a.id - b.id);
        rows.forEach((row, sortOrder) => db.update(schema.projects).set({ sortOrder }).where(eq(schema.projects.id, row.id)).run());
      }
      if (version < 10) client.exec('CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL, session_id TEXT)');
      if (version < 11) client.exec('CREATE TABLE IF NOT EXISTS device_settings (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, values_json TEXT NOT NULL)');
      client.pragma('user_version = 11');
    }).immediate();
    client.pragma('foreign_keys = ON');
    if (client.pragma('foreign_key_check').length) throw new Error('프로젝트 관계의 외래키가 올바르지 않습니다.');
    return { db: drizzle(client, { schema }), close: () => client.close() };
  } catch (error) { client.close(); throw error; }
}
module.exports = { openDatabase };
