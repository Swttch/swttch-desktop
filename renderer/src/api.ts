import type { DesktopState, SessionListEntry, SessionPage, Project, ProjectSessionScope } from './desktop';
import { API_PATH } from '../../src/api-paths.mjs';
import { replacePathParams } from './routes';
import { queryClient, QUERY_KEY } from './query-client';
import type { ProviderUsage } from './provider-usage';
import type { AccountsResult, AccountListItem } from '../../../../webview/src/shared/account';

function connect() {
  return queryClient.ensureQueryData({
    queryKey: QUERY_KEY.session, staleTime: Infinity, gcTime: Infinity,
    queryFn: async () => {
      const response = await fetch(API_PATH.SESSIONS, { method: 'POST', headers: { 'x-swttch-client': window.desktopHost ? 'desktop' : 'web' } });
      if (!response.ok) throw new Error('로컬 앱 서비스에 연결하지 못했습니다. 새로고침해 주세요.');
      const result = await response.json() as { csrf: string; state: DesktopState };
      if (localStorage.getItem('swttch-backend-id') !== result.state.backendId) {
        localStorage.removeItem('ccg-auth-token');
        localStorage.setItem('swttch-backend-id', result.state.backendId);
      }
      return result;
    },
  });
}
async function request<T>(path: string, method: string, body?: object, signal?: AbortSignal, reconnect = true): Promise<T> {
  const { csrf } = await connect();
  const response = await fetch(path, { method, signal,
    headers: { 'Content-Type': 'application/json', 'x-swttch-csrf': csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401 && reconnect && !signal?.aborted) {
      queryClient.removeQueries({ queryKey: QUERY_KEY.session });
      return request<T>(path, method, body, signal, false);
    }
    const result = await response.json() as { error: string };
    throw new Error(result.error || '작업을 완료하지 못했습니다.');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export const desktopApi = {
  createTerminal: (projectId: number) => request<{ id: string; projectId: number; projectPath: string; title: string }>(API_PATH.TERMINALS, 'POST', { projectId }),
  terminalInput: (terminalId: string, data: string) => request<void>(replacePathParams(API_PATH.TERMINAL_INPUT, { terminalId }), 'POST', { data }),
  resizeTerminal: (terminalId: string, cols: number, rows: number) => request<void>(replacePathParams(API_PATH.TERMINAL, { terminalId }), 'PATCH', { cols, rows }),
  closeTerminal: (terminalId: string) => request<void>(replacePathParams(API_PATH.TERMINAL, { terminalId }), 'DELETE'),
  accountUsage: (signal?: AbortSignal) => request<{ accounts: (AccountListItem & ProviderUsage)[] }>(API_PATH.ACCOUNT_USAGE, 'GET', undefined, signal),
  refreshAccountUsage: (accountId?: string) => request<{ accounts: (AccountListItem & ProviderUsage)[] }>(API_PATH.ACCOUNT_USAGE_REFRESHES, 'POST', accountId ? { accountId } : {}),
  usageReport: (signal?: AbortSignal) => request<{ status: string; report: string | null; error?: string }>(API_PATH.USAGE_REPORT, 'GET', undefined, signal),
  refreshUsageReport: () => request<{ status: string; report: string | null; error?: string }>(API_PATH.USAGE_REPORT_REFRESHES, 'POST', {}),
  accounts: (signal?: AbortSignal) => request<AccountsResult>(API_PATH.ACCOUNTS, 'GET', undefined, signal),
  switchAccount: (id: string) => request<AccountsResult>(API_PATH.ACTIVE_ACCOUNT, 'PUT', { id }),
  accountView: (path: string) => request<{ url: string }>(API_PATH.ACCOUNT_VIEWS, 'POST', { path }),
  providerUsage: (signal?: AbortSignal) => request<ProviderUsage>(API_PATH.PROVIDER_USAGE, 'GET', undefined, signal),
  refreshProviderUsage: () => request<ProviderUsage>(API_PATH.PROVIDER_USAGE_REFRESHES, 'POST', {}),
  activeSessions: (offset: number, signal?: AbortSignal) => request<{ rows: { session: SessionListEntry; projectId: number }[]; total: number; hasMore: boolean; nextOffset: number }>(API_PATH.ACTIVE_SESSIONS + '?offset=' + offset + '&limit=5', 'GET', undefined, signal),
  favoriteSessions: (offset: number, signal?: AbortSignal) => request<{ rows: { session: SessionListEntry; projectId: number }[]; total: number; hasMore: boolean; nextOffset: number }>(API_PATH.FAVORITE_SESSIONS + '?offset=' + offset + '&limit=5', 'GET', undefined, signal),
  importSessions: (projectId: string, includeNested: boolean) => request<{ imported: number }>(replacePathParams(API_PATH.PROJECT_SESSION_IMPORTS, { projectId }), 'POST', { includeNested }),
  syncSessionSources: (uids?: string[]) => request<{ results: { uid: string; status: string; error?: string }[] }>(API_PATH.SESSION_SOURCE_SYNCS, 'POST', uids === undefined ? {} : { uids }),
  projectScope: (projectId: string, signal?: AbortSignal) => request<ProjectSessionScope>(replacePathParams(API_PATH.PROJECT_SCOPE, { projectId }), 'GET', undefined, signal),
  updateProjectScope: (projectId: string, includeNestedSessions: boolean) => request<ProjectSessionScope>(replacePathParams(API_PATH.PROJECT_SCOPE, { projectId }), 'PATCH', { includeNestedSessions }),
  selectFolder: () => request<{ path: string | null }>(API_PATH.FOLDER_SELECTIONS, 'POST', {}),
  createProject: (project: { path: string; alias: string; description: string }) => request<Project>(API_PATH.PROJECTS, 'POST', project),
  project: (projectId: string, signal?: AbortSignal) => request<Project>(replacePathParams(API_PATH.PROJECT, { projectId }), 'GET', undefined, signal),
  projects: (signal?: AbortSignal) => request<{ projects: Project[]; homeDir: string }>(API_PATH.PROJECTS, 'GET', undefined, signal),
  reorderProjects: (projectIds: number[], projectId: number, favorite: boolean) => request<{ projects: Project[]; homeDir: string }>(API_PATH.PROJECT_ORDER, "PUT", { projectIds, projectId, favorite }),
  updateProject: (projectId: number, fields: { projectId?: number | null; sessionsExpanded?: boolean; favorite?: boolean; alias?: string; description?: string }) => request<Project>(replacePathParams(API_PATH.PROJECT, { projectId }), 'PATCH', fields),
  deleteProject: (projectId: number) => request<void>(replacePathParams(API_PATH.PROJECT, { projectId }), 'DELETE'),
  state: (signal?: AbortSignal) => request<DesktopState>(API_PATH.WORKSPACE, 'GET', undefined, signal),
  openNewSession: (projectId: number) => request<DesktopState>(API_PATH.WORKSPACE, 'PUT', { projectId }),
  openSession: (sessionId: string, projectId: number) => request<DesktopState>(API_PATH.WORKSPACE, 'PUT', { projectId, sessionId }),
  listSessions: async (projectId: string, signal?: AbortSignal, offset = 0, all = false, limit = 30, includeNested = false) => {
    const result = await request<SessionPage>(replacePathParams(API_PATH.PROJECT_SESSIONS, { projectId }) + '?offset=' + offset + '&limit=' + (all ? 'all' : limit) + '&includeNested=' + includeNested, 'GET', undefined, signal);
    if (result.serviceError) throw new Error(result.serviceError.reason);
    return result;
  },
  session: (projectId: string, sessionId: string, signal?: AbortSignal) => request<{ session: import('./desktop').SessionListEntry }>(replacePathParams(API_PATH.PROJECT_SESSION, { projectId, sessionId }), 'GET', undefined, signal),
  favoriteSession: (projectId: string, sessionId: string, favorite: boolean) => request<{ session: import('./desktop').SessionListEntry }>(replacePathParams(API_PATH.PROJECT_SESSION, { projectId, sessionId }), 'PATCH', { favorite }),
  renameSession: (projectId: string, sessionId: string, title: string) => request(replacePathParams(API_PATH.PROJECT_SESSION, { projectId, sessionId }), 'PATCH', { title }),
  deleteSession: (projectId: string, sessionId: string) => request<void>(replacePathParams(API_PATH.PROJECT_SESSION, { projectId, sessionId }), 'DELETE'),
  markSessionRead: (projectId: string, sessionId: string) => request<void>(replacePathParams(API_PATH.SESSION_READS, { projectId, sessionId }), 'POST', {}),
  migrateProjects: () => request<{ imported: number; enriched: number; unchanged: number; total: number; state: DesktopState }>(API_PATH.PROJECT_IMPORTS, 'POST', {}),
  settingsView: () => request<{ url: string }>(API_PATH.SETTINGS_VIEWS, 'POST', {}),
  saveViewSession: (body: { sessionId: string; projectId: number }) => request<DesktopState>(API_PATH.WORKSPACE, 'PATCH', body),
  closeView: () => request<DesktopState>(API_PATH.WORKSPACE, 'DELETE'),
  retry: () => request<DesktopState>(API_PATH.BACKEND_RESTARTS, 'POST', {}),
  subscribe(callback: (state: DesktopState) => void, onError: () => void) {
    let disposed = false;
    let events: EventSource | null = null;
    void connect().then(() => {
      if (disposed) return;
      events = new EventSource(API_PATH.EVENTS);
      events.onmessage = event => { if (!disposed) callback(JSON.parse(event.data) as DesktopState); };
      events.onerror = () => { if (!disposed) onError(); };
    }).catch(() => { if (!disposed) onError(); });
    return () => { disposed = true; events?.close(); };
  },
};
