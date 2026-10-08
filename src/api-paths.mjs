export const API_PATH = Object.freeze({
  SESSIONS: '/desktop-api/sessions',
  WORKSPACE: '/desktop-api/workspace',
  FOLDER_SELECTIONS: '/desktop-api/folder-selections',
  PROJECTS: '/desktop-api/projects',
  PROJECT: '/desktop-api/projects/:projectId',
  PROJECT_SCOPE: '/desktop-api/projects/:projectId/session-scope',
  PROJECT_SESSION: '/desktop-api/projects/:projectId/sessions/:sessionId',
  SESSION_READS: '/desktop-api/projects/:projectId/sessions/:sessionId/read-receipts',
  PROJECT_IMPORTS: '/desktop-api/project-imports',
  PROJECT_SESSIONS: '/desktop-api/projects/:projectId/sessions',
  BACKEND_RESTARTS: '/desktop-api/backend-restarts',
  EVENTS: '/desktop-api/events',
});
