import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { DesktopPhase, type DesktopState, type Project } from './desktop';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, QUERY_KEY } from './query-client';
import { desktopApi } from './api';
import toast, { Toaster } from 'react-hot-toast';
import { Tooltip } from './Tooltip';
import { useMatch } from 'react-router';
import { AddProjectModal } from './AddProjectModal';
import { ProjectDetailPage } from './ProjectDetailPage';
import { PATH, replacePathParams } from './routes';
import { ProjectsPage } from './ProjectsPage';
import { useRouter } from './router';
import { SidebarProject } from './SidebarProject';
import { readProjectSort, saveProjectSort, sortProjects } from './projects/projectSort';

enum IconName { Folder, Chat, Sidebar, SidebarCollapsed, Plus, Home, History, Search, Refresh, Compose }
function Icon({ name, solid = false, className = '' }: { name: IconName; solid?: boolean; className?: string }) {
  return <svg className={`size-5 shrink-0 fill-none stroke-current ${className}`} viewBox="0 0 24 24" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === IconName.Folder && <path d="M3 7V5h6l2 2h10v13H3z" />}
    {name === IconName.Chat && <path d="M4 5h16v12H9l-5 3z" />}
    {name === IconName.Sidebar && <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></>}
    {name === IconName.SidebarCollapsed && <><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M7 8v8" /></>}
    {name === IconName.Plus && <path d="M12 5v14M5 12h14" />}
    {name === IconName.Home && solid && <path fill="currentColor" stroke="none" d="M2.5 10a1.5 1.5 0 0 1 .6-1.2l8-6.2a1.5 1.5 0 0 1 1.8 0l8 6.2a1.5 1.5 0 0 1-.9 2.7h-1V20a1 1 0 0 1-1 1h-4v-7h-4v7H6a1 1 0 0 1-1-1v-8.5H4a1.5 1.5 0 0 1-1.5-1.5Z" />}
    {name === IconName.Home && !solid && <><path d="m3 10 9-7 9 7v10H3z" /><path d="M9 20v-7h6v7" /></>}
    {name === IconName.History && <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l-3 3" /></>}
    {name === IconName.Search && <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>}
    {name === IconName.Refresh && <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5 8a8 8 0 0 1 13-3l2 2M4 17l2 2a8 8 0 0 0 13-3" /></>}
    {name === IconName.Compose && <><path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7" /><path d="m10 14 1-4L19 2l3 3-8 8z" /></>}
  </svg>;
}
function IconButton({ label, icon, shortcut, className = '', solid = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: IconName; shortcut?: string; solid?: boolean }) {
  return <Tooltip placement={className.includes('rail-button') ? 'right' : 'bottom-start'} delay={className.includes('rail-button') ? 0 : 300} content={<span className="flex items-center gap-3">{label}{shortcut && <kbd className="rounded-md bg-selected px-2 py-0.5 font-sans text-xs">{shortcut}</kbd>}</span>}>
    <button type="button" className={`icon-button ${className}`} aria-label={label} {...props}><Icon name={icon} solid={solid} /></button>
  </Tooltip>;
}
const basename = (path: string) => path.split(/[\\/]/).filter(Boolean).pop() || path;
const sidebarShortcut = (event: KeyboardEvent) => event.shiftKey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';

export function App() {
  const workspaceQuery = useQuery({ queryKey: QUERY_KEY.workspace, queryFn: ({ signal }) => desktopApi.state(signal) });
  const projectsQuery = useQuery({ queryKey: QUERY_KEY.projects, queryFn: ({ signal }) => desktopApi.projects(signal) });
  const state: DesktopState = workspaceQuery.data || { phase: DesktopPhase.Starting, message: '채팅 환경을 준비하고 있습니다.', project: null, recent: [], projects: [], chatUrl: null, backendId: '' };
  const actionMutation = useMutation({ mutationFn: (action: () => Promise<DesktopState>) => action(), onSuccess: next => queryClient.setQueryData(QUERY_KEY.workspace, next) });
  const router = useRouter();
  const projectsPage = Boolean(useMatch(PATH.PROJECTS));
  const detailMatch = useMatch(PATH.PROJECT);
  const routeProjectId = detailMatch?.params.projectId;
  const legacyProject = routeProjectId?.startsWith('/') ? state.projects.find(project => project.path === routeProjectId) : undefined;
  const detailId = legacyProject ? String(legacyProject.id) : routeProjectId;
  useEffect(() => {
    if (legacyProject) router.push(replacePathParams(PATH.PROJECT, { projectId: legacyProject.id }));
  }, [legacyProject?.id, router]);
  const detailProject = state.projects.find(project => String(project.id) === detailId);
  const projectNavigation = projectsPage || Boolean(detailId);
  const busy = actionMutation.isPending;
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(readProjectSort);
  const [sessionId, setSessionId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('새 채팅');
  const [accountInfo, setAccountInfo] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const frameCleanup = useRef<() => void>(() => {});
  const inFlight = useRef(false);
  const ready = state.phase === DesktopPhase.Ready || state.phase === DesktopPhase.Chat;
  const chat = state.phase === DesktopPhase.Chat;
  const disabled = !ready || busy;

  const expandMutation = useMutation({
    mutationFn: ({ id, expanded }: { id: number; expanded: boolean }) => desktopApi.updateProject(id, { sessionsExpanded: expanded }),
    onMutate: async ({ id, expanded }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY.projects });
      const previous = queryClient.getQueryData<{ projects: Project[]; homeDir: string }>(QUERY_KEY.projects);
      if (previous) queryClient.setQueryData(QUERY_KEY.projects, { ...previous, projects: previous.projects.map(project => project.id === id ? { ...project, sessionsExpanded: expanded } : project) });
      return { previous };
    },
    onError: (error, _, context) => { if (context?.previous) queryClient.setQueryData(QUERY_KEY.projects, context.previous); toast.error(error.message); },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY.projects }),
  });
  useEffect(() => desktopApi.subscribe(next => {
    queryClient.setQueryData(QUERY_KEY.workspace, next); void queryClient.invalidateQueries({ queryKey: QUERY_KEY.projects }); setError('');
  }, () => setError('로컬 서버 연결이 끊겼습니다. 새로고침해 주세요.')), []);
  useEffect(() => { void queryClient.invalidateQueries({ queryKey: QUERY_KEY.sessionLists }); void queryClient.invalidateQueries({ queryKey: QUERY_KEY.projectScopes }); }, [state.sessionsRevision]);
  useEffect(() => { if (state.project) void queryClient.invalidateQueries({ queryKey: QUERY_KEY.sessions(state.project) }); }, [state.project, sessionId, state.sessionsRevision]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!sidebarShortcut(event)) return;
      event.preventDefault(); event.stopPropagation();
      if (projectsPage) { router.push(PATH.HOME); setCollapsed(false); }
      else setCollapsed(value => !value);
    };
    window.addEventListener('keydown', keydown, true);
    return () => { window.removeEventListener('keydown', keydown, true); };
  }, [projectsPage, router]);
  useEffect(() => () => frameCleanup.current(), []);
  useEffect(() => { if (searching) searchInput.current?.focus(); }, [searching]);
  function bindFrame() {
    frameCleanup.current();
    const content = frame.current?.contentWindow;
    if (!content) return;
    const sync = () => {
      const title = content.document.title;
      setSessionTitle(title && title !== 'Claude Code' ? title : '새 채팅');
      const match = /^\/sessions\/([^/]+)/.exec(content.location.pathname);
      setSessionId(match && match[1] !== 'new' ? match[1] : '');
    };
    const keydown = (event: KeyboardEvent) => {
      if (!sidebarShortcut(event)) return;
      event.preventDefault(); event.stopPropagation(); setCollapsed(value => !value);
    };
    sync();
    const observer = new MutationObserver(sync);
    const title = content.document.querySelector('title');
    if (title) observer.observe(title, { childList: true, characterData: true, subtree: true });
    content.addEventListener('keydown', keydown, true);
    content.addEventListener('popstate', sync);
    frameCleanup.current = () => { observer.disconnect(); content.removeEventListener('keydown', keydown, true); content.removeEventListener('popstate', sync); };
  }
  async function perform(action: () => Promise<DesktopState>) {
    if (inFlight.current) return;
    inFlight.current = true; setError('');
    try { await actionMutation.mutateAsync(action); router.push(PATH.HOME); setSelecting(false); void queryClient.invalidateQueries({ queryKey: QUERY_KEY.sessions(state.project) }); }
    catch (cause) { const message = cause instanceof Error ? cause.message : '작업을 완료하지 못했습니다.'; setError(message); toast.error(message); }
    finally { inFlight.current = false;  }
  }
  function chooseProject(projectId: number) {
    const project = (projectsQuery.data?.projects || state.projects).find(row => row.id === projectId);
    if (!project?.sessionsExpanded) expandMutation.mutate({ id: projectId, expanded: true });
    router.push(replacePathParams(PATH.PROJECT, { projectId }));
  }
  function openProject() { setError(''); setSelecting(true); }
  function newChat() {
    router.push(PATH.HOME);
    if (state.project) void perform(() => desktopApi.openProject(state.project!));
    else void openProject();
  }
  const search = query.trim().toLowerCase();
  const visibleProjects = sortProjects((projectsQuery.data?.projects || state.projects).filter(project => project.hiddenAt === 0 && (`${project.path} ${project.alias || ''}`.toLowerCase().includes(search) || project.path === state.project)), sort);
  const sidebarHidden = collapsed || projectsPage;
  const feedback = error || workspaceQuery.error?.message || (state.phase === DesktopPhase.Error || state.phase === DesktopPhase.Starting ? state.message : '');

  return <div className={`app h-dvh overflow-hidden bg-chrome text-foreground${window.desktopHost ? ' electron-host' : ''}`}>
    {selecting && <AddProjectModal onClose={() => setSelecting(false)} onAdded={path => { setSelecting(false); chooseProject(path); }} />}
    <Toaster position="bottom-right" toastOptions={{ duration: 4000, className: 'swttch-toast', style: { background: 'var(--color-navigation)', color: 'var(--color-foreground)', border: '1px solid var(--color-divider)', borderRadius: '12px', fontSize: '13px' } }} />
    <header className="titlebar relative flex h-(--header-height) items-center gap-3 px-3 before:pointer-events-none before:absolute before:top-0 before:left-0 before:h-[2px] before:w-full before:bg-dev-line">
      <IconButton label="사이드바 표시/숨기기" icon={sidebarHidden ? IconName.SidebarCollapsed : IconName.Sidebar} shortcut="⇧⌘S" aria-expanded={!sidebarHidden} aria-controls="sidebar" aria-keyshortcuts="Meta+Shift+S Control+Shift+S" onClick={() => { if (projectsPage) { router.push(PATH.HOME); setCollapsed(false); } else setCollapsed(value => !value); }} />
      <div className="header-context flex min-w-0 flex-1 items-center gap-3">
        <Icon name={IconName.Folder} className="text-muted" />
        {detailProject ? <><span className="text-sm text-muted">프로젝트</span><span className="text-muted/40">/</span><span className="truncate text-sm font-medium">{detailProject.alias || basename(detailProject.path)}</span></> : projectsPage ? <span className="text-sm font-medium">프로젝트</span> : state.project ? <><Tooltip content={state.project}><span className="block max-w-48 truncate text-[13px] text-muted">{basename(state.project)}</span></Tooltip><span className="text-muted/40">/</span><span className="truncate text-sm font-medium">{sessionTitle}</span></> : <span className="text-sm font-medium">Swttch</span>}
      </div>
      <IconButton label="새 채팅" icon={IconName.Compose} onClick={newChat} disabled={disabled} />
      <IconButton label="프로젝트 폴더 열기" icon={IconName.Folder} onClick={() => void openProject()} disabled={disabled} />
    </header>
    <div className={`shell-body grid h-[calc(100dvh-var(--header-height))] min-h-0 ${sidebarHidden ? 'sidebar-collapsed' : ''}`}>
      <nav className="activity-rail flex flex-col items-center gap-3 py-3" aria-label="앱 메뉴">
        <IconButton label="홈" icon={IconName.Home} solid={!projectNavigation} className={`rail-button ${!projectNavigation ? 'rail-active' : ''}`} aria-current={!projectNavigation ? 'page' : undefined} onClick={() => { router.push(PATH.HOME); setSelecting(false); }} />
        <IconButton label="새 채팅" icon={IconName.Compose} className="rail-button" onClick={newChat} disabled={disabled} />
        <IconButton label="예약" icon={IconName.History} className="rail-button" onClick={() => toast('예약 기능은 준비 중입니다.')} />
        <span className="mt-1 w-6 border-t border-divider" />
        <IconButton label="프로젝트" icon={IconName.Folder} className={`rail-button ${projectNavigation ? 'rail-active' : ''}`} aria-current={projectNavigation ? 'page' : undefined} onClick={() => { router.push(PATH.PROJECTS); setSelecting(false);  }} />
        <div className="relative mt-auto">
          <Tooltip content="계정 상태" placement="right" delay={0}><button className="account-button" aria-label="계정 상태" aria-expanded={accountInfo} onClick={() => setAccountInfo(value => !value)}>S</button></Tooltip>
          {accountInfo && <div className="account-popover" role="status"><strong className="block text-sm font-medium">Swttch 계정</strong><p className="mt-2 text-xs leading-5 text-muted">앱 로그인과 기존 계정 연동은 준비 중입니다.</p></div>}
        </div>
      </nav>
      <aside id="sidebar" className="min-h-0 overflow-hidden bg-navigation" aria-label="프로젝트·세션 목록" aria-hidden={sidebarHidden} inert={sidebarHidden}>
        <div className="sidebar-content">
        <div className="flex items-center justify-between px-5 pt-5 pb-3"><h1 className="text-xl font-semibold tracking-tight">Swttch</h1><IconButton label="목록 검색" icon={IconName.Search} aria-expanded={searching} onClick={() => { setSearching(value => !value); setQuery(''); }} /></div>
        <div className="px-3"><button className="navigation-row" onClick={newChat} disabled={disabled}><Icon name={IconName.Compose} /><span>새 채팅</span></button></div>
        {searching && <div className="px-4 py-2"><input ref={searchInput} className="field" aria-label="프로젝트·세션 검색" value={query} onChange={event => setQuery(event.target.value)} placeholder="프로젝트·세션 검색" /></div>}
        <div className="sidebar-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pt-6">
          <div className="mb-2 flex items-center justify-between px-2"><h2 className="text-xs font-medium text-muted">프로젝트</h2><IconButton label="프로젝트 추가" icon={IconName.Plus} onClick={() => void openProject()} disabled={disabled} /></div>
          {visibleProjects.map(project => <SidebarProject key={project.id} project={project} expanded={project.sessionsExpanded} selected={detailId ? String(project.id) === detailId : project.path === state.project} disabled={disabled || expandMutation.isPending} sessionId={sessionId} search={search} onOpen={() => chooseProject(project.id)} onToggle={() => expandMutation.mutate({ id: project.id, expanded: !project.sessionsExpanded })} onSession={(id, path) => void perform(() => desktopApi.openSession(id, path))} />)}
          {state.projects.length === 0 && <button className="navigation-row text-muted" onClick={() => void openProject()} disabled={disabled}><Icon name={IconName.Plus} />프로젝트 열기</button>}
          {search && visibleProjects.length === 0 && <p className="list-note">검색 결과 없음</p>}
        </div>
        <div className="flex items-center gap-2 px-5 py-4 text-[11px] text-muted"><span className={`size-1.5 rounded-full ${ready ? 'bg-status' : 'bg-muted'}`} /><span role="status">{ready ? '로컬 연결됨' : state.phase === DesktopPhase.Error ? '연결 종료' : '연결 중'}</span>{state.phase === DesktopPhase.Error && <button className="ml-auto underline" disabled={busy} onClick={() => void perform(desktopApi.retry)}>재시도</button>}</div>
        </div>
      </aside>
      <section className="workspace relative min-h-0 min-w-0 overflow-hidden bg-canvas" aria-label="작업 영역">
        <div id="viewport" className={`relative h-full w-full ${projectsPage || detailId ? 'hidden' : ''}`}>
          {chat && state.chatUrl && <iframe ref={frame} className="block size-full border-0" title="Swttch 채팅" src={state.chatUrl} onLoad={bindFrame} />}
          {!chat && <main className="welcome grid h-full place-items-center p-8"><div className="w-full max-w-sm text-center"><Icon name={IconName.Folder} className="mx-auto mb-5 size-8 text-muted" /><h2 className="mb-3 text-lg font-medium">프로젝트에서 시작하세요.</h2><p className="mb-6 text-sm leading-6 text-muted">프로젝트를 추가하고 에이전트와 작업을 시작하세요.</p><button className="primary-button" onClick={openProject} disabled={disabled}>프로젝트 추가</button><p className="mt-4 text-xs text-muted" role="status">{feedback}</p></div></main>}
          {chat && !selecting && error && <div className="connection-error" role="alert">{error}</div>}
        </div>
        {detailId && <ProjectDetailPage projectId={detailId} disabled={disabled} onChat={path => void perform(() => desktopApi.openProject(path))} onSession={(sessionId, path) => void perform(() => desktopApi.openSession(sessionId, path))} />}
        {projectsPage && <ProjectsPage disabled={disabled} onOpen={chooseProject} onAdd={() => void openProject()} sort={sort} onSort={order => { setSort(order); saveProjectSort(order); }} />}

      </section>
    </div>
  </div>;
}
