const { openDatabase } = require('./database/connection.cjs');
const { ProjectRepository } = require('./database/project.repository.cjs');
const { SessionRepository } = require('./database/session.repository.cjs');

function openStore(home) {
  const connection = openDatabase(home);
  const projects = new ProjectRepository(connection.db);
  return {
    sessionRepository: new SessionRepository(connection.db),
    recent: () => projects.recent(),
    projects: () => projects.all(),
    hasProject: path => Boolean(projects.findByPath(path)),
    updateProject: (path, fields) => projects.update(path, fields),
    createProject: (path, fields) => projects.create(path, fields),
    remember: path => projects.remember(path),
    migrateProjects: source => projects.migrate(source),
    close: connection.close,
  };
}
module.exports = { openStore };
