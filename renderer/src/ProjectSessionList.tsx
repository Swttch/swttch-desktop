import { DeleteSessionDialog } from './DeleteSessionDialog';
import { ACTIVITY_LABEL } from "./SessionStatus";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { desktopApi } from './api';
import { SessionActivity, type SessionListEntry, type SessionPage } from './desktop';
import { QUERY_KEY } from './query-client';
import { Tooltip } from './Tooltip';
import { GROUPS, searchSessions, sessionDate, sessionGroup, uniqueSessions } from './session-utils';
import { SessionRow } from './SessionRow';
import { SessionFilters, STATUS_FILTERS, TabFilter } from './SessionFilters';
export enum SessionScope { Local = '로컬', Web = '웹' }
const toggle = <T,>(values: T[], value: T) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
export function ProjectSessionList({ projectId, path, disabled, includeNested, onSession }: { projectId: string; path: string; disabled: boolean; includeNested: boolean; onSession: (id: string, path: string) => void }) {
  const client = useQueryClient(), scroll = useRef<HTMLDivElement>(null), search = useRef<HTMLInputElement>(null);
  const [scope, setScope] = useState(SessionScope.Local), [query, setQuery] = useState(''), [statuses, setStatuses] = useState<SessionActivity[]>([]), [tabs, setTabs] = useState<TabFilter[]>([]), [activeOnly, setActiveOnly] = useState(false), [highlight, setHighlight] = useState(-1), [deleting, setDeleting] = useState<SessionListEntry | null>(null);
  const searching = Boolean(query.trim()), enabled = !disabled && scope === SessionScope.Local;
  const key = [...QUERY_KEY.sessionList(projectId), includeNested] as const;
  const pages = useInfiniteQuery({ queryKey: [...key, 'pages'], initialPageParam: 0, queryFn: ({ signal, pageParam }) => desktopApi.listSessions(projectId, signal, pageParam, false, 30, includeNested), getNextPageParam: (last, _pages, offset) => last.hasMore && last.nextOffset > offset ? last.nextOffset : undefined, enabled: enabled && !searching });
  const all = useQuery({ queryKey: [...key, 'all'], queryFn: ({ signal }) => desktopApi.listSessions(projectId, signal, 0, true, 30, includeNested), enabled: enabled && searching });
  const workspace = useQuery({ queryKey: QUERY_KEY.workspace, queryFn: ({ signal }) => desktopApi.state(signal) });
  const activity = workspace.data?.sessionActivity?.activity || {}, opened = workspace.data?.sessionActivity?.open || [];
  const rows = useMemo(() => uniqueSessions(searching ? all.data?.sessions || [] : pages.data?.pages.flatMap(page => page.sessions) || []), [searching, all.data, pages.data]);
  const searched = useMemo(() => searchSessions(rows, query), [rows, query]);
  const counts: Record<string, number> = {};
  for (const row of searched) { const open = row.isOpen ?? opened.includes(row.sessionId), status = row.activity ?? activity[row.sessionId] ?? SessionActivity.Idle; const label = open ? TabFilter.Open : TabFilter.Closed; counts[label] = (counts[label] || 0) + 1; if (open && status !== SessionActivity.Idle) counts[ACTIVITY_LABEL[status]] = (counts[ACTIVITY_LABEL[status]] || 0) + 1; }
  const activeCount = STATUS_FILTERS.reduce((sum, status) => sum + (counts[ACTIVITY_LABEL[status]] || 0), 0);
  const visible = searched.filter(row => { const open = row.isOpen ?? opened.includes(row.sessionId), status = row.activity ?? activity[row.sessionId] ?? SessionActivity.Idle; return (!activeOnly || open && status !== SessionActivity.Idle) && (!statuses.length || open && statuses.includes(status)) && (!tabs.length || tabs.includes(open ? TabFilter.Open : TabFilter.Closed)); });
  const refresh = useCallback(() => { void client.invalidateQueries({ queryKey: QUERY_KEY.sessionList(projectId) }); }, [client, projectId]);
  const migration = useMutation({ mutationFn: () => desktopApi.importSessions(projectId, includeNested), onSuccess: result => { void client.invalidateQueries({ queryKey: QUERY_KEY.sessionLists }); toast.success(`${result.imported}개 세션을 동기화했습니다.`); }, onError: error => toast.error(error.message) });
  const migrate = migration.mutate;
  const rename = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => desktopApi.renameSession(projectId, id, title),
    onMutate: async ({ id, title }) => {
      await client.cancelQueries({ queryKey: key });
      const previousPages = client.getQueryData<InfiniteData<SessionPage>>([...key, 'pages']);
      const previousAll = client.getQueryData<SessionPage>([...key, 'all']);
      const update = (page: SessionPage) => ({ ...page, sessions: page.sessions.map(row => row.sessionId === id ? { ...row, title } : row) });
      if (previousPages) client.setQueryData([...key, 'pages'], { ...previousPages, pages: previousPages.pages.map(update) });
      if (previousAll) client.setQueryData([...key, 'all'], update(previousAll));
      return { previousPages, previousAll };
    },
    onError: (error, _variables, context) => {
      if (context?.previousPages) client.setQueryData([...key, 'pages'], context.previousPages);
      if (context?.previousAll) client.setQueryData([...key, 'all'], context.previousAll);
      toast.error(error.message);
    },
    onSettled: refresh,
  });
  const remove = useMutation({ mutationFn: (id: string) => desktopApi.deleteSession(projectId, id), onSuccess: () => { setDeleting(null); refresh(); toast.success('세션을 삭제했습니다.'); } });
  const read = useMutation({ mutationFn: (id: string) => desktopApi.markSessionRead(projectId, id) });
  const openRow = (row: SessionListEntry) => { if (disabled) return; read.mutate(row.sessionId); onSession(row.sessionId, row.sessionDir || path); };
  const more = useCallback(() => { const element = scroll.current; if (element && element.clientHeight > 0 && element.scrollHeight - element.scrollTop - element.clientHeight < 200 && enabled && !searching && pages.hasNextPage && !pages.isFetching && !pages.isFetchNextPageError) void pages.fetchNextPage(); }, [enabled, searching, pages.hasNextPage, pages.isFetching, pages.isFetchNextPageError, pages.fetchNextPage]);
  useEffect(() => { more(); const element = scroll.current; if (!element) return; const observer = new ResizeObserver(more); observer.observe(element); return () => observer.disconnect(); }, [more, rows.length]);
  useEffect(() => { search.current?.focus(); }, []);
  useEffect(() => { setHighlight(-1); }, [query, scope, statuses, tabs, activeOnly]);
  useEffect(() => { if (highlight >= visible.length) setHighlight(visible.length - 1); }, [highlight, visible.length]);
  useEffect(() => { const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'p' && scope === SessionScope.Local && !document.querySelector('dialog[open]')) { event.preventDefault(); if (!migration.isPending) migrate(); } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, [scope, migrate, migration.isPending]);
  const result = searching ? all : pages;
  const scopeCount = searching ? all.data?.scopeDirCount : pages.data?.pages[0]?.scopeDirCount;
  const merged = scopeCount === undefined ? rows.some(row => row.sessionDir !== path) : scopeCount > 1;
  const selected = workspace.data?.chatUrl?.split('?')[0].split('/').pop();
  return <section aria-label="세션 목록" className="mt-6 flex min-h-0 flex-1 flex-col" onKeyDown={event => {
    if (event.target instanceof HTMLElement && (event.target.closest('[role=menu]') || event.target.closest('dialog') || event.target.getAttribute('aria-label') === '세션 이름')) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setHighlight(index => event.key === 'ArrowDown' ? Math.min(index + 1, visible.length - 1) : Math.max(index - 1, 0)); }
    if (event.key === 'Enter' && highlight >= 0 && visible[highlight] && event.target === search.current) { event.preventDefault(); openRow(visible[highlight]); }
  }}>
    <div className="flex items-center gap-2 border-b border-divider pb-3"><div role="tablist" aria-label="세션 위치" className="flex gap-1">{Object.values(SessionScope).map(value => <button key={value} role="tab" aria-selected={scope === value} className={`rounded-md px-3 py-1.5 text-sm ${scope === value ? 'bg-selected' : 'text-muted hover:bg-hover'}`} onClick={() => setScope(value)}>{value}</button>)}</div><span className="flex-1" /><Tooltip content="세션 가져오기 및 새로고침 (⇧⌘P / Ctrl+Shift+P)" delay={0}><button aria-label="세션 새로고침" disabled={disabled || scope !== SessionScope.Local || result.isFetching || migration.isPending} className="icon-button" onClick={() => migrate()}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={result.isFetching || migration.isPending ? 'animate-spin' : ''}><path d="M20 7a9 9 0 1 0 1 7M20 3v5h-5" /></svg></button></Tooltip></div>
    {scope === SessionScope.Web ? <p className="py-12 text-center text-sm text-muted">웹 세션 없음</p> : <>
      <div className="my-3 flex items-center gap-2"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-divider bg-navigation px-3"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted"><circle cx="10" cy="10" r="7" /><path d="m15 15 6 6" /></svg><input ref={search} aria-label="세션 검색" placeholder="세션 검색" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="검색 지우기" className="text-muted" onClick={() => { setQuery(''); search.current?.focus(); }}>×</button>}</div><Tooltip content="활동 중인 세션만 표시" delay={0}><button aria-label="활동 중인 세션만 표시" aria-pressed={activeOnly} className={`secondary-button px-3! text-xs ${activeOnly ? 'bg-selected!' : ''}`} onClick={() => setActiveOnly(value => !value)}>활동 {activeCount}</button></Tooltip><SessionFilters statuses={statuses} tabs={tabs} counts={counts} onStatus={value => setStatuses(previous => toggle(previous, value))} onTab={value => setTabs(previous => toggle(previous, value))} onClear={() => { setStatuses([]); setTabs([]); setActiveOnly(false); }} /></div>
      <div ref={scroll} className="min-h-0 flex-1 overflow-y-auto pb-4" onScroll={more}>
        {disabled ? <p role="status" className="py-8 text-sm text-muted">로컬 서비스에 연결하는 중…</p> : result.isPending ? <p role="status" className="py-8 text-sm text-muted">세션 불러오는 중…</p> : result.isError && !rows.length ? <div role="alert" className="py-8 text-sm text-muted">{result.error.message}<button className="ml-3 underline" onClick={refresh}>재시도</button></div> : <>
          {GROUPS.map(group => { const entries = visible.filter(row => sessionGroup(sessionDate(row)) === group); return entries.length ? <div key={group}><h3 className="px-2 pb-2 pt-5 text-xs text-muted">{group}</h3>{entries.map(row => <SessionRow key={row.sessionId} session={row} projectId={Number(projectId)} root={path} merged={merged} opened={row.isOpen ?? opened.includes(row.sessionId)} activity={row.activity ?? activity[row.sessionId] ?? SessionActivity.Idle} selected={selected === row.sessionId} highlighted={visible[highlight]?.sessionId === row.sessionId} busy={disabled || rename.isPending || remove.isPending} onOpen={() => openRow(row)} onRename={title => rename.mutate({ id: row.sessionId, title })} onDelete={() => { remove.reset(); setDeleting(row); }} />)}</div> : null; })}
          {!visible.length && <p className="py-12 text-center text-sm text-muted">{query.trim() ? '검색 결과가 없습니다.' : statuses.length || tabs.length || activeOnly ? '필터에 맞는 세션이 없습니다.' : '아직 세션이 없습니다. 새 채팅으로 작업을 시작하세요.'}</p>}
          {result.isError && rows.length > 0 && <p role="alert" className="mt-4 text-sm text-red-400">{result.error.message}<button className="ml-3 underline" onClick={refresh}>재시도</button></p>}
          {!searching && pages.hasNextPage && <button className="secondary-button mt-4 w-full" disabled={pages.isFetching} onClick={() => void pages.fetchNextPage()}>{pages.isFetchingNextPage ? '추가 세션 불러오는 중…' : '더 보기'}</button>}
        </>}
      </div>
    </>}{deleting && <DeleteSessionDialog session={deleting} pending={remove.isPending} error={remove.error?.message} onDelete={() => remove.mutate(deleting.sessionId)} onClose={() => { if (!remove.isPending) setDeleting(null); }} />}
  </section>;
}
