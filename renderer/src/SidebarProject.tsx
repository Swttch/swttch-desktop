import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { desktopApi } from './api';
import type { Project } from './desktop';
import { QUERY_KEY } from './query-client';
import { Tooltip } from './Tooltip';
import { uniqueSessions } from './session-utils';

export function SidebarProject({ project, expanded, selected, disabled, sessionId, search, onOpen, onToggle, onSession }: {
  project: Project; expanded: boolean; selected: boolean; disabled: boolean; sessionId: string; search: string;
  onOpen: () => void; onToggle: () => void; onSession: (id: string, path: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const sessions = useQuery({ queryKey: [...QUERY_KEY.sessionList(String(project.id)), 'sidebar', showAll],
    queryFn: ({ signal }) => desktopApi.listSessions(String(project.id), signal, 0, showAll), enabled: expanded && !disabled });
  const visible = uniqueSessions(sessions.data?.sessions || []).filter(row => (row.title || '').toLowerCase().includes(search));
  const name = project.alias || project.path.split(/[\\/]/).filter(Boolean).pop() || project.path;
  const listId = `sidebar-project-${project.id}-sessions`;
  return <section className="mb-3">
    <div className={`flex items-center rounded-lg px-2 hover:bg-hover ${selected ? 'bg-selected' : ''}`}>
      <Tooltip content={expanded ? '세션 목록 접기' : '세션 목록 펼치기'} placement="right" delay={0}><button type="button" className="flex size-7 shrink-0 items-center justify-center rounded text-muted hover:bg-selected hover:text-foreground" disabled={disabled} aria-label={`${name} 세션 목록 ${expanded ? '접기' : '펼치기'}`} aria-expanded={expanded} aria-controls={listId} onClick={onToggle}>
        <svg aria-hidden="true" className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={expanded ? 'M3 7V5h6l2 2h10v3M3 10h18l-3 10H3z' : 'M3 7V5h6l2 2h10v13H3z'} /></svg>
      </button></Tooltip>
      <div className="min-w-0 flex-1"><Tooltip content={project.path}><button type="button" className="project-row px-1.5!" disabled={disabled} onClick={onOpen}><span className="truncate">{name}</span></button></Tooltip></div>
    </div>
    {expanded && <div id={listId} className="session-list pb-1">
      {sessions.isPending && <p className="list-note" role="status">대화 불러오는 중…</p>}
      {sessions.isError && <div className="list-note" role="alert">{sessions.error.message}<button className="mt-2 block underline underline-offset-4" onClick={() => void sessions.refetch()}>다시 불러오기</button></div>}
      {!sessions.isPending && !sessions.isError && visible.length === 0 && <p className="list-note">{search ? '검색 결과 없음' : '채팅 없음'}</p>}
      {!sessions.isError && (showAll ? visible : visible.slice(0, 5)).map(row => <Tooltip key={row.sessionId} content={row.title}><button className={`session-row ${row.sessionId === sessionId ? 'selected' : ''}`} disabled={disabled} onClick={() => onSession(row.sessionId, row.sessionDir)}>{row.title || '제목 없는 대화'}</button></Tooltip>)}
      {(visible.length > 5 || sessions.data?.hasMore) && <button className="session-row text-muted!" onClick={() => setShowAll(value => !value)}>{showAll ? '접기' : '더 보기'}</button>}
    </div>}
  </section>;
}
