import { t, useShellTranslation } from './i18n';
import { useInfiniteQuery } from '@tanstack/react-query';
import { desktopApi } from './api';
import type { Project } from './desktop';
import { QUERY_KEY } from './query-client';
import { SidebarSessionRow } from './SidebarSessionRow';
import { SidebarSection } from './SidebarSection';
import { SidebarSectionName } from './SidebarState';

export function SidebarSessions({ favorites = false, ready, disabled, sessionId, search, onSession }: {
  favorites?: boolean; projects: Project[]; ready: boolean; disabled: boolean; sessionId: string; search: string; onSession: (id: string, path: string) => void;
}) { useShellTranslation();
  const sessions = useInfiniteQuery({
    queryKey: [...QUERY_KEY.sessionLists, favorites ? 'favorites' : 'active'],
    enabled: ready, initialPageParam: 0,
    queryFn: ({ signal, pageParam }) => (favorites ? desktopApi.favoriteSessions : desktopApi.activeSessions)(pageParam, signal),
    getNextPageParam: page => page.hasMore ? page.nextOffset : undefined,
  });
  const rows = (sessions.data?.pages.flatMap(page => page.rows) || []).filter(row => (row.session.title || '').toLowerCase().includes(search));
  return <SidebarSection name={favorites ? SidebarSectionName.Favorites : SidebarSectionName.ActiveSessions} title={favorites ? t("Favorites") : t("Active sessions")} count={sessions.data?.pages[0]?.total || 0}>
    {rows.map(({ session, projectId }) => <SidebarSessionRow key={session.sessionId} session={session} projectId={projectId} selected={session.sessionId === sessionId} disabled={disabled} onOpen={() => onSession(session.sessionId, session.sessionDir)} />)}
    {sessions.hasNextPage && <button className="session-row text-muted!" disabled={sessions.isFetchingNextPage} onClick={() => void sessions.fetchNextPage()}>{sessions.isFetchingNextPage ? t("Loading…") : t("Show more")}</button>}
    {!sessions.isPending && !sessions.isError && !rows.length && <p className="list-note">{favorites ? t("No favorites") : t("No active sessions")}</p>}
    {sessions.isPending && <p className="list-note" role="status">{favorites ? t("Loading favorites…") : t("Loading active sessions…")}</p>}
    {sessions.isError && <p className="list-note" role="alert">{sessions.error.message}<button className="ms-2 underline" onClick={() => void sessions.refetch()}>{t("Retry")}</button></p>}
  </SidebarSection>;
}
