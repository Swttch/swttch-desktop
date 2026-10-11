import { useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { desktopApi } from './api';
import type { Project } from './desktop';
import { QUERY_KEY } from './query-client';
import { Tooltip } from './Tooltip';
import { uniqueSessions } from './session-utils';
import { SidebarSessionRow } from './SidebarSessionRow';

export function SidebarProject({ project, expanded, selected, disabled, ready, sessionId, search, onOpen, onToggle, onSession, onNewSession }: {
  project: Project; expanded: boolean; selected: boolean; disabled: boolean; ready: boolean; sessionId: string; search: string;
  onOpen: () => void; onToggle: () => void; onSession: (id: string, path: string) => void; onNewSession: () => void;
}) {
  const hasExpanded = useRef(expanded);
  if (expanded) hasExpanded.current = true;
  const sessions = useInfiniteQuery({ queryKey: [...QUERY_KEY.sessionList(String(project.id)), 'sidebar'], initialPageParam: 0,
    queryFn: ({ signal, pageParam }) => desktopApi.listSessions(String(project.id), signal, pageParam, false, 5),
    getNextPageParam: (last, _pages, offset) => last.hasMore && last.nextOffset > offset ? last.nextOffset : undefined,
    enabled: expanded && ready });
  const visible = uniqueSessions(sessions.data?.pages.flatMap(page => page.sessions) || []).filter(row => (row.title || '').toLowerCase().includes(search));
  const name = project.alias || project.path.split(/[\\/]/).filter(Boolean).pop() || project.path;
  const listId = `sidebar-project-${project.id}-sessions`;
  return <section className="mb-3">
    <div className={`flex items-center rounded-lg px-2 hover:bg-hover ${selected ? 'bg-selected' : ''}`}>
      <Tooltip content={expanded ? '세션 목록 접기' : '세션 목록 펼치기'} placement="right" delay={0}><button type="button" className="flex size-7 shrink-0 items-center justify-center rounded text-muted hover:bg-selected hover:text-foreground" disabled={disabled} aria-label={`${name} 세션 목록 ${expanded ? '접기' : '펼치기'}`} aria-expanded={expanded} aria-controls={listId} onClick={onToggle}>
        <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={expanded ? 'M3 7V5h6l2 2h10v3M3 10h18l-3 10H3z' : 'M3 7V5h6l2 2h10v13H3z'} /></svg>
      </button></Tooltip>
      <div className="min-w-0 flex-1"><Tooltip content={project.path}><button type="button" className="project-row px-1.5!" draggable={false} data-project-drag-handle={project.id} style={{ touchAction: "none", userSelect: "none" }} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" disabled={disabled} onClick={onOpen}><span className="truncate">{name}</span>{project.favoritedAt > 0 && <svg aria-label="고정됨" className="size-3 shrink-0 text-muted" viewBox="0 0 24 24" fill="currentColor"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" /></svg>}</button></Tooltip></div>
      <Tooltip content="새 채팅" delay={0}><button type="button" aria-label={`${name} 새 채팅`} className="icon-button size-6! shrink-0" disabled={disabled} onClick={onNewSession}><svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg></button></Tooltip>
    </div>
    <div className={`sidebar-session-collapse ${expanded ? 'is-expanded' : ''}`} aria-hidden={!expanded} inert={!expanded}><div className="min-h-0 overflow-hidden">{hasExpanded.current && <div id={listId} className="session-list pb-1">
      {sessions.isPending && <p className="list-note" role="status">대화 불러오는 중…</p>}
      {sessions.isError && <div className="list-note" role="alert">{sessions.error.message}<button className="mt-2 block underline underline-offset-4" onClick={() => void sessions.refetch()}>다시 불러오기</button></div>}
      {!sessions.isPending && !sessions.isError && visible.length === 0 && <p className="list-note">{search ? '검색 결과 없음' : '채팅 없음'}</p>}
      {visible.map(row => <SidebarSessionRow key={row.sessionId} session={row} projectId={project.id} selected={row.sessionId === sessionId} disabled={disabled} onOpen={() => onSession(row.sessionId, row.sessionDir)} />)}
      {sessions.hasNextPage && <button className="session-row text-muted!" disabled={sessions.isFetching} onClick={() => void sessions.fetchNextPage()}>{sessions.isFetchingNextPage ? '불러오는 중…' : '더 보기'}</button>}
    </div>}</div></div>
  </section>;
}
