import { SidebarSessions } from './SidebarSessions';
import { SidebarSection } from './SidebarSection';
import { SidebarSectionName } from './SidebarState';
import { SidebarResize, useSidebarWidth } from './SidebarResize';
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { DesktopPhase, type DesktopState, type Project } from './desktop';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, QUERY_KEY } from './query-client';
import { desktopApi } from './api';
import { ProjectOrderList } from './projects/ProjectOrderList';
import { moveProjects, type ProjectMove } from './projects/projectOrder';
import toast, { Toaster } from 'react-hot-toast';
import { Tooltip } from './Tooltip';
import { useMatch } from 'react-router';
import { AddProjectModal } from './AddProjectModal';
import { ProjectDetailPage } from './ProjectDetailPage';
import { PATH, replacePathParams } from './routes';
import { ProjectsPage } from './ProjectsPage';
import { useRouter } from './router';
import { sessionFrameUrl } from './session-view';
import { SidebarProject } from './SidebarProject';
import { readProjectSort, saveProjectSort, sortProjects, SortOrder } from './projects/projectSort';
import { StatusBar } from './StatusBar';
import { ProjectSwitcher } from './ProjectSwitcher';

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
  const sidebarWidth = useSidebarWidth();
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selectingForChat, setSelectingForChat] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(readProjectSort);
  const [sessionId, setSessionId] = useState('');
  const [, setSessionTitle] = useState('새 채팅');
  const [frameReadyUrl, setFrameReadyUrl] = useState('');
  const [frameFailure, setFrameFailure] = useState<{ url: string; message: string } | null>(null);
  const [accountInfo, setAccountInfo] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const frameCleanup = useRef<() => void>(() => {});
  const setFrame = useCallback((node: HTMLIFrameElement | null) => {
    if (frame.current !== node) frameCleanup.current();
    frame.current = node;
    if (node) node.dataset.requestedAt = String(Date.now());
  }, []);
  const inFlight = useRef(false);
  const ready = state.phase === DesktopPhase.Ready || state.phase === DesktopPhase.Chat;
  // CCG serves SAMEORIGIN framing headers. Preserve its route and every parameter
  // through the shell's existing proxy while the shared backend stays on 19836.
  // Each view owns its URL; workspace SSE must not switch embedded sessions.
  const [viewSessionUrl, setViewSessionUrl] = useState<string | null>(null);
  const restoredView = useRef(false);
  const savedViewSession = useRef('');
  const saveViewMutation = useMutation({ mutationFn: desktopApi.saveViewSession, scope: { id: 'workspace-view' }, retry: 3, retryDelay: 500 });
  const chat = Boolean(viewSessionUrl);
  const chatUrl = viewSessionUrl ? new URL(viewSessionUrl) : null;
  const activeProjectPath = chatUrl?.searchParams.get('workingDir') || state.project;
  const frameUrl = viewSessionUrl ? sessionFrameUrl(viewSessionUrl, window.location.origin) : undefined;
  const frameError = frameFailure && frameFailure.url === frameUrl ? frameFailure.message : '';
  const frameLoading = chat && (busy || frameReadyUrl !== frameUrl);
  const disabled = !ready || busy;

  const reorderMutation = useMutation({
    mutationFn: ({ rows, move }: { rows: Project[]; move: ProjectMove }) => desktopApi.reorderProjects(rows.map(project => project.id), move.projectId, move.favorite),
    onMutate: async ({ rows }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY.projects });
      const previous = queryClient.getQueryData<{ projects: Project[]; homeDir: string }>(QUERY_KEY.projects);
      if (previous) queryClient.setQueryData(QUERY_KEY.projects, { ...previous, projects: previous.projects.map(project => rows.find(row => row.id === project.id) || project) });
      const previousSort = sort; setSort(SortOrder.Manual); saveProjectSort(SortOrder.Manual);
      return { previous, previousSort };
    },
    onSuccess: next => queryClient.setQueryData(QUERY_KEY.projects, next),
    onError: (error, _, context) => {
      if (context?.previous) queryClient.setQueryData(QUERY_KEY.projects, context.previous);
      if (context) { setSort(context.previousSort); saveProjectSort(context.previousSort); }
      toast.error(error.message);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: QUERY_KEY.projects }),
  });
  function reorderProjects(move: ProjectMove) {
    if (reorderMutation.isPending) return;
    const rows = sortProjects((projectsQuery.data?.projects || state.projects).filter(project => !project.hiddenAt), sort);
    reorderMutation.mutate({ rows: moveProjects(rows, move), move });
  }
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
    queryClient.setQueryData(QUERY_KEY.workspace, next);
    queryClient.setQueryData<{ projects: Project[]; homeDir: string }>(QUERY_KEY.projects, previous => previous ? { ...previous, projects: next.projects } : previous);
    setError('');
  }, () => setError('로컬 서버 연결이 끊겼습니다. 새로고침해 주세요.')), []);
  useEffect(() => { void queryClient.invalidateQueries({ queryKey: QUERY_KEY.sessionLists }); void queryClient.invalidateQueries({ queryKey: QUERY_KEY.projectScopes }); }, [state.sessionsRevision]);
  useEffect(() => { void queryClient.invalidateQueries({ queryKey: QUERY_KEY.sessionLists }); }, [state.activityRevision]);
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
  useEffect(() => {
    if (!chat || !frameUrl || frameReadyUrl === frameUrl || frameError) return;
    const timer = setTimeout(() => setFrameFailure({ url: frameUrl, message: '대화를 불러오지 못했습니다. 다시 시도해 주세요.' }), 30_000);
    return () => clearTimeout(timer);
  }, [chat, frameUrl, frameReadyUrl, frameError]);
  useEffect(() => { if (searching) searchInput.current?.focus(); }, [searching]);
  useEffect(() => {
    if (!ready || restoredView.current || inFlight.current) return;
    restoredView.current = true;
    const project = state.projects.find(row => row.path === state.project);
    if (!project || !state.chatUrl) return;
    const id = new URL(state.chatUrl).pathname.split('/').pop();
    void perform(() => id && id !== 'new' ? desktopApi.openSession(id, project.id) : desktopApi.openNewSession(project.id));
  }, [ready, state.backendId]);
  useEffect(() => {
    if (!ready || !sessionId || savedViewSession.current === sessionId) return;
    savedViewSession.current = sessionId;
    saveViewMutation.mutate(sessionId, { onError: () => {
      if (savedViewSession.current === sessionId) savedViewSession.current = '';
      toast.error('마지막 대화를 저장하지 못했습니다.');
    } });
  }, [sessionId, state.sessionsRevision, ready]);
  function openView(path: string, id?: string) {
    const project = (projectsQuery.data?.projects || state.projects).find(row => row.path === path);
    if (!project) { toast.error('등록된 프로젝트를 찾을 수 없습니다.'); return; }
    void perform(() => id ? desktopApi.openSession(id, project.id) : desktopApi.openNewSession(project.id));
  }
  function bindFrame(loadedFrame: HTMLIFrameElement, requestedUrl: string) {
    if (loadedFrame !== frame.current) return;
    frameCleanup.current();
    const content = loadedFrame.contentWindow;
    if (!content) return;
    const requested = new URL(requestedUrl, window.location.origin);
    let initialized = false;
    let readinessTimer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (loadedFrame !== frame.current) return;
      const title = content.document.title;
      const directory = new URLSearchParams(content.location.search).get('workingDir');
      if (!directory || (!initialized && directory !== requested.searchParams.get('workingDir'))) return;
      if (content.location.pathname !== requested.pathname && !initialized) {
        if (requested.pathname !== PATH.NEW_SESSION && content.location.pathname === PATH.NEW_SESSION) {
          setFrameFailure({ url: requestedUrl, message: '선택한 세션을 불러오지 못했습니다. 프로젝트와 세션을 다시 확인해 주세요.' });
        }
        return;
      }
      // Existing-session bootstrap can show the empty new-chat screen until
      // SESSION_LOADED resolves. Keep the shell loading state until its title arrives.
      if (requested.pathname !== PATH.NEW_SESSION && (!title || title === 'Claude Code')) return;
      setSessionTitle(title && title !== 'Claude Code' ? title : '새 채팅');
      const match = /^\/sessions\/([^/]+)/.exec(content.location.pathname);
      setSessionId(match && match[1] !== 'new' ? match[1] : '');
      if (!initialized) loadedFrame.dataset.readyAt = String(Date.now());
      setFrameReadyUrl(requestedUrl);
      setFrameFailure(null);
      initialized = true;
      clearInterval(readinessTimer);
    };
    const keydown = (event: KeyboardEvent) => {
      if (!sidebarShortcut(event)) return;
      event.preventDefault(); event.stopPropagation(); setCollapsed(value => !value);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(content.document.head, { childList: true, characterData: true, subtree: true });
    // The webview may update its route after load without changing its title.
    if (!initialized) readinessTimer = setInterval(sync, 250);
    content.addEventListener('keydown', keydown, true);
    content.addEventListener('popstate', sync);
    frameCleanup.current = () => { clearInterval(readinessTimer); observer.disconnect(); content.removeEventListener('keydown', keydown, true); content.removeEventListener('popstate', sync); };
  }
  async function perform(action: () => Promise<DesktopState>) {
    if (inFlight.current) return;
    restoredView.current = true;
    inFlight.current = true; setError('');
    try {
      const next = await actionMutation.mutateAsync(action);
      setViewSessionUrl(next.chatUrl);
      router.push(PATH.HOME);
      setSelecting(false); void queryClient.invalidateQueries({ queryKey: QUERY_KEY.sessions(state.project) });
    }
    catch (cause) { const message = cause instanceof Error ? cause.message : '작업을 완료하지 못했습니다.'; setError(message); toast.error(message); }
    finally { inFlight.current = false;  }
  }
  function chooseProject(projectId: number) {
    const project = (projectsQuery.data?.projects || state.projects).find(row => row.id === projectId);
    if (!project?.sessionsExpanded) expandMutation.mutate({ id: projectId, expanded: true });
    router.push(replacePathParams(PATH.PROJECT, { projectId }));
  }
  function openProject() { setError(''); setSelectingForChat(false); setSelecting(true); }
  function newChat() {
    const path = detailProject?.path || activeProjectPath;
    if (path) openView(path);
    else { setSelectingForChat(true); setSelecting(true); }
  }
  const search = query.trim().toLowerCase();
  const visibleProjects = sortProjects((projectsQuery.data?.projects || state.projects).filter(project => project.hiddenAt === 0 && (`${project.path} ${project.alias || ''}`.toLowerCase().includes(search) || project.path === state.project)), sort);
  const sidebarHidden = collapsed || projectsPage;
  const switcherProjects = sortProjects((projectsQuery.data?.projects || state.projects).filter(project => !project.hiddenAt), sort);
  const selectedHeaderProject = detailProject || switcherProjects.find(project => project.path === activeProjectPath);
  const feedback = error || workspaceQuery.error?.message || (state.phase === DesktopPhase.Error || state.phase === DesktopPhase.Starting ? state.message : '');

  return <div style={{ '--sidebar-width': sidebarWidth.width + 'px' } as React.CSSProperties} className={`app h-dvh overflow-hidden bg-chrome text-foreground${window.desktopHost ? ' electron-host' : ''}`}>
    {selecting && <AddProjectModal onClose={() => setSelecting(false)} onAdded={id => {
      setSelecting(false);
      if (!selectingForChat) { chooseProject(id); return; }
      void queryClient.fetchQuery({ queryKey: [...QUERY_KEY.projects, String(id)], queryFn: ({ signal }) => desktopApi.project(String(id), signal) })
        .then(project => perform(() => desktopApi.openNewSession(project.id))).catch(error => toast.error(error.message));
    }} />}
    <Toaster position="bottom-right" toastOptions={{ duration: 4000, className: 'swttch-toast', style: { background: 'var(--color-navigation)', color: 'var(--color-foreground)', border: '1px solid var(--color-divider)', borderRadius: '12px', fontSize: '13px' } }} />
    <div className={`titlebar relative grid h-(--header-height) ${sidebarHidden ? 'sidebar-collapsed' : ''} before:pointer-events-none before:absolute before:top-0 before:left-0 before:h-[2px] before:w-full before:bg-dev-line`}>
      <header aria-label="상단바" className="titlebar-left col-span-2 flex min-w-0 items-center border-r border-divider pl-[calc(env(titlebar-area-x,0px)+0.75rem)]">
        <IconButton label="사이드바 표시/숨기기" icon={sidebarHidden ? IconName.SidebarCollapsed : IconName.Sidebar} shortcut="⇧⌘S" aria-expanded={!sidebarHidden} aria-controls="sidebar" aria-keyshortcuts="Meta+Shift+S Control+Shift+S" onClick={() => { if (projectsPage) { router.push(PATH.HOME); setCollapsed(false); } else setCollapsed(value => !value); }} />
        <div className="header-context flex min-w-0 flex-1 items-center pr-2" aria-label="상단바 중간 영역" aria-hidden={sidebarHidden} inert={sidebarHidden}>
          <ProjectSwitcher projects={switcherProjects} selected={selectedHeaderProject} disabled={disabled} onSelect={chooseProject} />
        </div>
        <div className={`shrink-0 items-center pr-1 ${sidebarHidden ? 'hidden' : 'flex'}`}>
          <IconButton label="새 채팅" icon={IconName.Plus} onClick={newChat} disabled={disabled} />
        </div>
      </header>
      <div aria-label="탭 영역" className="min-w-0" />
    </div>
    <div className={`shell-body grid h-[calc(100dvh-var(--header-height)-2rem)] min-h-0 ${sidebarHidden ? 'sidebar-collapsed' : ''}`}>
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
      <aside id="sidebar" className="relative min-h-0 overflow-hidden bg-navigation" aria-label="프로젝트·세션 목록" aria-hidden={sidebarHidden} inert={sidebarHidden}>
        <div className="sidebar-content">
        <div className="flex items-center justify-between px-5 pt-5 pb-3"><h1 className="text-xl font-semibold tracking-tight">Swttch</h1><IconButton label="목록 검색" icon={IconName.Search} aria-expanded={searching} onClick={() => { setSearching(value => !value); setQuery(''); }} /></div>
        <div className="px-3"><button className="navigation-row" onClick={newChat} disabled={disabled}><Icon name={IconName.Compose} /><span>새 채팅</span></button></div>
        {searching && <div className="px-4 py-2"><input ref={searchInput} className="field" aria-label="프로젝트·세션 검색" value={query} onChange={event => setQuery(event.target.value)} placeholder="프로젝트·세션 검색" /></div>}
        <div className="sidebar-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pt-6">
          <SidebarSessions favorites projects={projectsQuery.data?.projects || state.projects} ready={ready} disabled={disabled} sessionId={sessionId} search={search} onSession={(id, path) => openView(path, id)} />
          <SidebarSessions projects={projectsQuery.data?.projects || state.projects} ready={ready} disabled={disabled} sessionId={sessionId} search={search} onSession={(id, path) => openView(path, id)} />
          <SidebarSection name={SidebarSectionName.Projects} title="프로젝트" count={(projectsQuery.data?.projects || state.projects).filter(project => project.hiddenAt === 0).length} action={<IconButton label="프로젝트 추가" icon={IconName.Plus} onClick={() => void openProject()} disabled={disabled} />}>
          <ProjectOrderList projects={visibleProjects} disabled={disabled || reorderMutation.isPending} onMove={reorderProjects}>{project => <SidebarProject key={project.id} project={project} expanded={project.sessionsExpanded} selected={detailId ? String(project.id) === detailId : project.path === activeProjectPath} disabled={disabled || expandMutation.isPending || reorderMutation.isPending} ready={ready} sessionId={sessionId} search={search} onOpen={() => chooseProject(project.id)} onToggle={() => expandMutation.mutate({ id: project.id, expanded: !project.sessionsExpanded })} onSession={(id, path) => openView(path, id)} onNewSession={() => openView(project.path)} />}</ProjectOrderList>
          {state.projects.length === 0 && <button className="navigation-row text-muted" onClick={() => void openProject()} disabled={disabled}><Icon name={IconName.Plus} />프로젝트 열기</button>}
          {search && visibleProjects.length === 0 && <p className="list-note">검색 결과 없음</p>}
          </SidebarSection>
        </div>
        </div>
        <SidebarResize width={sidebarWidth.width} onResize={sidebarWidth.save} />
      </aside>
      <section className="workspace relative min-h-0 min-w-0 overflow-hidden bg-canvas" aria-label="작업 영역">
        <div id="viewport" className={`relative h-full w-full ${projectsPage || detailId ? 'hidden' : ''}`}>
          {chat && frameUrl && <iframe key={frameUrl} ref={setFrame} className="block size-full border-0" title="Swttch 채팅" src={frameUrl} onLoad={event => bindFrame(event.currentTarget, frameUrl)} />}
          {chat && (frameLoading || frameError) && <div className="absolute inset-0 grid place-items-center bg-canvas p-6">
            {frameError ? <div role="alert" className="text-center"><p className="text-sm text-muted">{frameError}</p><button className="secondary-button mt-4" disabled={disabled} onClick={() => { if (!chatUrl || !state.project) return; const id = /^\/sessions\/([^/]+)/.exec(chatUrl.pathname)?.[1]; openView(chatUrl.searchParams.get('workingDir') || '', id && id !== 'new' ? id : undefined); }}>다시 시도</button></div> : <div role="status" className="flex items-center gap-3 text-sm text-muted"><span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-divider border-t-foreground motion-reduce:animate-none" />대화를 불러오는 중…</div>}
          </div>}
          {!chat && <main className="welcome grid h-full place-items-center p-8"><div className="w-full max-w-sm text-center"><Icon name={IconName.Folder} className="mx-auto mb-5 size-8 text-muted" /><h2 className="mb-3 text-lg font-medium">프로젝트에서 시작하세요.</h2><p className="mb-6 text-sm leading-6 text-muted">프로젝트를 추가하고 에이전트와 작업을 시작하세요.</p><button className="primary-button" onClick={openProject} disabled={disabled}>프로젝트 추가</button><p className="mt-4 text-xs text-muted" role="status">{feedback}</p></div></main>}
          {chat && !selecting && error && <div className="connection-error" role="alert">{error}</div>}
        </div>
        {detailId && <ProjectDetailPage projectId={detailId} disabled={disabled} onChat={path => openView(path)} onSession={(sessionId, path) => openView(path, sessionId)} />}
        {projectsPage && <ProjectsPage onMove={reorderProjects} disabled={disabled || reorderMutation.isPending} onOpen={chooseProject} onAdd={() => void openProject()} sort={sort} onSort={order => { setSort(order); saveProjectSort(order); }} />}

      </section>
    </div>
    <StatusBar state={state} />
  </div>;
}
