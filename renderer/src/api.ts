import type { DesktopState, SessionListEntry, Project } from './desktop';
import { API_PATH } from '../../src/api-paths.mjs';
import { replacePathParams } from './routes';
import { queryClient, QUERY_KEY } from './query-client';

function connect() {
  return queryClient.ensureQueryData({
    queryKey: QUERY_KEY.session, staleTime: Infinity, gcTime: Infinity,
    queryFn: async () => {
      const response = await fetch(API_PATH.SESSIONS, { method: 'POST', headers: { 'x-swttch-client': 'web' } });
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
async function request<T>(path: string, method: string, body?: object, signal?: AbortSignal): Promise<T> {
  const { csrf } = await connect();
  const response = await fetch(path, { method, signal,
    headers: { 'Content-Type': 'application/json', 'x-swttch-csrf': csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401) queryClient.removeQueries({ queryKey: QUERY_KEY.session });
    const result = await response.json() as { error: string };
    throw new Error(result.error || '작업을 완료하지 못했습니다.');
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export const desktopApi = {
  selectFolder: () => request<{ path: string | null }>(API_PATH.FOLDER_SELECTIONS, 'POST', {}),
  createProject: (project: { path: string; alias: string; description: string }) => request<Project>(API_PATH.PROJECTS, 'POST', project),
  project: (projectId: string, signal?: AbortSignal) => request<Project>(replacePathParams(API_PATH.PROJECT, { projectId }), 'GET', undefined, signal),
  projects: (signal?: AbortSignal) => request<{ projects: Project[]; homeDir: string }>(API_PATH.PROJECTS, 'GET', undefined, signal),
  updateProject: (projectId: number, fields: { favorite?: boolean; alias?: string; description?: string }) => request<Project>(replacePathParams(API_PATH.PROJECT, { projectId }), 'PATCH', fields),
  deleteProject: (projectId: number) => request<void>(replacePathParams(API_PATH.PROJECT, { projectId }), 'DELETE'),
  state: (signal?: AbortSignal) => request<DesktopState>(API_PATH.WORKSPACE, 'GET', undefined, signal),
  openProject: (path: string) => request<DesktopState>(API_PATH.WORKSPACE, 'PUT', { path }),
  openSession: (sessionId: string, path: string) => request<DesktopState>(API_PATH.WORKSPACE, 'PUT', { path, sessionId }),
  listSessions: async (projectId: string, signal?: AbortSignal) => {
    const result = await request<{ sessions: SessionListEntry[]; hasMore: boolean; total: number; serviceError?: { reason: string } }>(replacePathParams(API_PATH.PROJECT_SESSIONS, { projectId }), 'GET', undefined, signal);
    if (result.serviceError) throw new Error(result.serviceError.reason);
    return result;
  },
  migrateProjects: () => request<{ imported: number; enriched: number; unchanged: number; total: number; state: DesktopState }>(API_PATH.PROJECT_IMPORTS, 'POST', {}),
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
