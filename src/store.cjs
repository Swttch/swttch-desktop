const { eq } = require('drizzle-orm');
const { workspaces } = require('./database/schema.cjs');
const { openDatabase } = require('./database/connection.cjs');
const { ProjectRepository } = require('./database/project.repository.cjs');
const { SessionRepository } = require('./database/session.repository.cjs');

function openStore(home) {
  const connection = openDatabase(home);
  const projects = new ProjectRepository(connection.db);
  return {
    sessionRepository: new SessionRepository(connection.db),
    workspace: () => connection.db.select().from(workspaces).where(eq(workspaces.id, 'desktop')).get(),
    saveWorkspace: (projectId, sessionId) => connection.db.insert(workspaces).values({ id: 'desktop', projectId, sessionId: sessionId || null }).onConflictDoUpdate({ target: workspaces.id, set: { projectId, sessionId: sessionId || null } }).run(),
    recent: () => projects.recent(),
    projects: () => projects.all(),
    hasProject: path => Boolean(projects.findByPath(path)),
    reorderProjects: (ids, id, favorite) => projects.reorder(ids, id, favorite),
    updateProject: (path, fields) => projects.update(path, fields),
    createProject: (path, fields) => projects.create(path, fields),
    remember: path => projects.remember(path),
    migrateProjects: source => projects.migrate(source),
    close: connection.close,
  };
}
module.exports = { openStore };
