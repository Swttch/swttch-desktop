const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const { join } = require('node:path');
const { eq } = require('drizzle-orm');
const schema = require('./schema.cjs');

function openDatabase(home) {
  const client = new Database(join(home, 'desktop.sqlite'));
  try {
    client.pragma('journal_mode = WAL');
    const version = client.pragma('user_version', { simple: true });
    if (version > 4) throw new Error('이 앱보다 새로운 데이터베이스입니다. 앱을 업데이트해 주세요.');
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
      client.pragma('user_version = 4');
    })();
    return { db: drizzle(client, { schema }), close: () => client.close() };
  } catch (error) { client.close(); throw error; }
}
module.exports = { openDatabase };
