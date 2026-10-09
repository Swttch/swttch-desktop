import { useInfiniteQuery } from '@tanstack/react-query';
import { desktopApi } from './api';
import type { Project } from './desktop';
import { QUERY_KEY } from './query-client';
import { SidebarSessionRow } from './SidebarSessionRow';
import { SidebarSection } from './SidebarSection';
import { SidebarSectionName } from './SidebarState';

export function ActiveSessions({ ready, disabled, sessionId, search, onSession }: {
  projects: Project[]; ready: boolean; disabled: boolean; sessionId: string; search: string; onSession: (id: string, path: string) => void;
}) {
  const sessions = useInfiniteQuery({
    queryKey: [...QUERY_KEY.sessionLists, 'active'],
    enabled: ready, initialPageParam: 0,
    queryFn: ({ signal, pageParam }) => desktopApi.activeSessions(pageParam, signal),
    getNextPageParam: page => page.hasMore ? page.nextOffset : undefined,
  });
  const rows = (sessions.data?.pages.flatMap(page => page.rows) || []).filter(row => (row.session.title || '').toLowerCase().includes(search));
  return <SidebarSection name={SidebarSectionName.ActiveSessions} title="활성 세션">
    {rows.map(({ session, projectId }) => <SidebarSessionRow key={session.sessionId} session={session} projectId={projectId} selected={session.sessionId === sessionId} disabled={disabled} onOpen={() => onSession(session.sessionId, session.sessionDir)} />)}
    {sessions.hasNextPage && <button className="session-row text-muted!" disabled={sessions.isFetchingNextPage} onClick={() => void sessions.fetchNextPage()}>{sessions.isFetchingNextPage ? '불러오는 중…' : '더 보기'}</button>}
    {!sessions.isPending && !sessions.isError && !rows.length && <p className="list-note">활성 세션 없음</p>}
    {sessions.isPending && <p className="list-note" role="status">활성 세션 불러오는 중…</p>}
    {sessions.isError && <p className="list-note" role="alert">{sessions.error.message}<button className="ml-2 underline" onClick={() => void sessions.refetch()}>재시도</button></p>}
  </SidebarSection>;
}
