import { QueryClient } from '@tanstack/react-query';

export const QUERY_KEY = {
  projectScopes: ['desktop', 'project-scope'] as const,
  projectScope: (projectId: string) => ['desktop', 'project-scope', projectId] as const,
  sessionLists: ['desktop', 'session-list'] as const,
  sessionList: (projectId: string) => ['desktop', 'session-list', projectId] as const,
  session: ['desktop', 'session'] as const,
  projects: ['desktop', 'projects'] as const,
  workspace: ['desktop', 'workspace'] as const,
  sessions: (projectPath: string | null) => ['desktop', 'sessions', projectPath] as const,
};
export const queryClient = new QueryClient({ defaultOptions: {
  queries: { staleTime: 5_000, retry: false }, mutations: { retry: false },
} });
