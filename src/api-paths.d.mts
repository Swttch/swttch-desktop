export const API_PATH: {
  readonly SESSIONS: '/desktop-api/sessions';
  readonly WORKSPACE: '/desktop-api/workspace';
  readonly PROJECT: '/desktop-api/projects/:projectId';
  readonly FOLDER_SELECTIONS: '/desktop-api/folder-selections';
  readonly PROJECTS: '/desktop-api/projects';
  readonly PROJECT_SCOPE: '/desktop-api/projects/:projectId/session-scope';
  readonly PROJECT_SESSION: '/desktop-api/projects/:projectId/sessions/:sessionId';
  readonly SESSION_READS: '/desktop-api/projects/:projectId/sessions/:sessionId/read-receipts';
  readonly PROJECT_IMPORTS: '/desktop-api/project-imports';
  readonly PROJECT_SESSIONS: '/desktop-api/projects/:projectId/sessions';
  readonly BACKEND_RESTARTS: '/desktop-api/backend-restarts';
  readonly EVENTS: '/desktop-api/events';
};
