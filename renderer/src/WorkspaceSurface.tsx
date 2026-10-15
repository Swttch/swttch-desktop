import { t, useShellTranslation } from './i18n';
import { canExecuteWorkCommand } from './WorkPage';
import { hideAll } from 'tippy.js';
import { useMutation } from '@tanstack/react-query';
import { desktopApi } from './api';
import { Dropdown } from './Dropdown';
import { NewTabMenuContent } from './NewTabMenuContent';
import { DndProvider, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableTab, PanelDropZone, TabDropStrip } from './TabDrag';
import { forwardRef, lazy, Suspense, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { canActivateWorkspaceView, closeTabs, moveTab, moveTabToSplit, openTab, panels, resizeSplit, selectTab, splitPanel, stableViewOrder, updateTab, workspaceSnapshot, type WorkspaceRestoration, type WorkspaceSnapshot, type PanelDropEdge, type WorkspaceNode, type WorkspacePanel, type WorkspaceView } from '../../src/workspace-layout.mjs';
import { DesktopPhase, SessionActivity, type DesktopState } from './desktop';
import { WorkspaceTab } from './WorkspaceTab';
import { WorkspaceFrame } from './WorkspaceFrame';
import { activateTabAction, type DesktopTabAction } from './tab-action';
import { Tooltip } from './Tooltip';
import toast from 'react-hot-toast';
import { bindScopedShortcuts, neighboringPanel, type DesktopCommand } from '../../src/desktop-shortcuts.mjs';
import { macShortcuts, browserShortcuts } from './shortcut-platform';

const TerminalView = lazy(() => import('./TerminalView').then(module => ({ default: module.TerminalView })));

export interface WorkspaceSurfaceHandle { open: (url: string, projectId: number, projectPath: string, panelId?: string) => void; getActivePanel: () => string; getShortcuts: () => Promise<import('./tab-action').ShortcutRow[]> }
type Rect = { left: number; top: number; width: number; height: number };
type SurfaceProps = { state: DesktopState; browsing: boolean; pending: boolean; onRestored: (found: boolean) => void; onSelect: () => void; onActive: (tab: WorkspaceView | null) => void; onNew: (panelId: string, projectPath?: string) => void; onEmpty: () => void; onSidebar: () => void; onHelp: () => void; onSettings: () => void };

function PanelLeaf({ panel, active, browsing, pending, state, registerViewport, onActivate, onClose, onCloseOthers, onCloseRight, onSplit, onAction, onRename, onMove, onMoveEdge, onRefresh, onNewTerminal, onNew, renameTarget, favoriteTarget, onHandled }: { panel: WorkspacePanel; active: boolean; browsing: boolean; pending: boolean; state: DesktopState; registerViewport: (id: string, element: HTMLDivElement | null) => void; onActivate: (panel: string, tab: string) => void; onClose: (panel: string, ids: string[]) => void; onCloseOthers: (panel: string, tab: string) => void; onCloseRight: (panel: string, tab: string) => void; onSplit: (panel: string, tab: string, direction: 'columns' | 'rows') => void; onAction: (panel: string, tab: string, action: DesktopTabAction) => void; onRename: (tab: string, value: string) => void; onMove: (id: string, panel: string, index: number) => void; onMoveEdge: (id: string, panel: string, edge: PanelDropEdge) => void; onRefresh: (id: string) => void; onNewTerminal: (panel: string, path?: string) => void; onNew: (panel: string, path?: string) => void; renameTarget: string; favoriteTarget: string; onHandled: (kind: 'rename' | 'favorite') => void }) { useShellTranslation();
  const closeTabMenu = useRef<(() => void) | null>(null);
  const register = useCallback((element: HTMLDivElement | null) => registerViewport(panel.id, element), [panel.id, registerViewport]);
  useEffect(() => { document.querySelector<HTMLElement>(`[data-panel-id="${panel.id}"]`)?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [panel.activeTabId, browsing]);
  const current = panel.tabs.find(tab => tab.id === panel.activeTabId);
  return <section aria-label={t("Work panel")} data-panel-id={panel.id} data-active-panel={active || undefined} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
    <TabDropStrip panelId={panel.id} disabled={pending} onMove={onMove} active={active}>
      {panel.tabs.map((tab, index) => <DraggableTab key={tab.id} id={tab.id} disabled={pending}><WorkspaceTab tabId={tab.id} terminal={tab.kind === 'terminal'} projectId={tab.projectId} sessionId={tab.sessionId} renameRequested={renameTarget === tab.id} favoriteRequested={favoriteTarget === tab.id} onRequestHandled={onHandled} title={tab.title} customName={tab.customTitle} onRename={value => onRename(tab.id, value)} selected={!browsing && panel.activeTabId === tab.id} onRefresh={() => onRefresh(tab.id)} onMoveEdge={edge => onMoveEdge(tab.id, panel.id, edge)} canMoveEdge={panel.tabs.length > 1} running={state.sessionActivity?.activity[tab.sessionId] === SessionActivity.Running} pending={pending} onSelect={() => onActivate(panel.id, tab.id)} onClose={() => onClose(panel.id, [tab.id])} onAction={action => onAction(panel.id, tab.id, action)} onCloseOthers={() => onCloseOthers(panel.id, tab.id)} canCloseOthers={panel.tabs.length > 1} onCloseRight={() => onCloseRight(panel.id, tab.id)} canCloseRight={index < panel.tabs.length - 1} onSplit={direction => onSplit(panel.id, tab.id, direction)} /></DraggableTab>)}
      <Dropdown closeRef={closeTabMenu} content={<NewTabMenuContent pending={pending} onCreateTerminal={() => { closeTabMenu.current?.(); onNewTerminal(panel.id, current?.projectPath); }} onCreate={() => { closeTabMenu.current?.(); onNew(panel.id, current?.projectPath); }} />}><Tooltip content={t("Open new tab")} placement="bottom-start"><button type="button" aria-label={t("Open new tab")} disabled={pending} className="flex h-full w-8 shrink-0 items-center justify-center text-muted hover:bg-selected"><svg aria-hidden="true" className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg></button></Tooltip></Dropdown>
    </TabDropStrip>
    <div ref={register} className="relative min-h-0 min-w-0 flex-1" />
  </section>;
}

export const WorkspaceSurface = forwardRef<WorkspaceSurfaceHandle, SurfaceProps>(function WorkspaceSurface(props, ref) {
  const restore = useMutation({ mutationFn: desktopApi.restoreWorkspace });
  const started = useRef(false);
  const mutations = useRef(restore); mutations.current = restore;
  const ready = props.state.phase === DesktopPhase.Ready || props.state.phase === DesktopPhase.Chat;
  const supported = props.state.workspaceLayoutVersion === 1;
  useEffect(() => { if (ready && supported && !started.current) { started.current = true; mutations.current.mutate(); } }, [ready, supported]);
  const callback = useRef(props.onRestored); callback.current = props.onRestored;
  useEffect(() => { if (ready && !supported) callback.current(false); }, [ready, supported]);
  useEffect(() => { if (restore.isSuccess) callback.current(Boolean(restore.data)); }, [restore.isSuccess, restore.data]);
  if (ready && !supported) return <DndProvider backend={HTML5Backend}><WorkspaceSurfaceContent {...props} restored={null} ref={ref} /><p role="status" className="pointer-events-none absolute bottom-2 right-2 z-30 rounded bg-navigation px-3 py-2 text-xs text-muted">{t("Restart the local host to enable saving and restoring the workspace.")}</p></DndProvider>;
  if (restore.isError) return <div role="alert" className="p-6 text-sm text-muted">{t("Could not restore workspace:")}{restore.error.message}<button className="ms-3 underline" onClick={() => restore.mutate()}>{t("Try again")}</button></div>;
  if (!restore.isSuccess) return <p role="status" className="p-6 text-sm text-muted">{t("Restoring workspace…")}</p>;
  return <DndProvider backend={HTML5Backend}><WorkspaceSurfaceContent {...props} restored={restore.data} ref={ref} /></DndProvider>;
});
const WorkspaceSurfaceContent = forwardRef<WorkspaceSurfaceHandle, SurfaceProps & { restored: WorkspaceRestoration | null }>(function WorkspaceSurfaceContent(props, ref) {
  const dragging = useDragLayer(monitor => monitor.isDragging());
  const [layout, setLayout] = useState<WorkspaceNode>(() => props.restored?.layout || ({ kind: 'panel', id: crypto.randomUUID(), tabs: [], activeTabId: null }));
  const [activePanel, setActivePanel] = useState(() => props.restored?.activePanel || panels(layout)[0].id);
  const current = useRef({ layout, activePanel });
  current.current = { layout, activePanel };
  const root = useRef<HTMLDivElement>(null);
  const viewports = useRef(new Map<string, HTMLDivElement>());
  const focusHistory = useRef<string[]>(props.restored?.focusHistory || []);
  const revision = useRef(props.restored?.revision || 0);
  const restoringFocus = useRef(Boolean(props.restored));
  const blocked = useRef(false);
  const lastSaved = useRef(props.restored ? JSON.stringify(workspaceSnapshot(layout, activePanel, focusHistory.current)) : '');
  const save = useMutation({ scope: { id: 'workspace-layout' }, mutationFn: async ({ snapshot, terminalBindings }: { snapshot: WorkspaceSnapshot; terminalBindings: { tabId: string; terminalId: string }[] }) => {
    if (blocked.current) throw new Error(t("Resolve the save error, then reload the workspace."));
    try { const result = await desktopApi.saveWorkspace(snapshot, revision.current, terminalBindings); revision.current = result.revision; return result; }
    catch (error) { blocked.current = true; throw error; }
  }, onError: error => toast.error(`${t("Could not save workspace")}: ${error.message}`, { id: 'workspace-save-error', duration: 10000 }) });
  const persistence = useRef(save); persistence.current = save;
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const [renameTarget, setRenameTarget] = useState('');
  const [favoriteTarget, setFavoriteTarget] = useState('');
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const createTerminal = useMutation({ mutationFn: ({ projectId }: { projectId: number; panelId: string; splitDirection?: 'columns' | 'rows' }) => desktopApi.createTerminal(projectId), onSuccess: (data, variables) => {
    const tab: WorkspaceView = { id: crypto.randomUUID(), kind: 'terminal', terminalId: data.id, url: '', projectId: data.projectId, projectPath: data.projectPath, title: data.title, sessionId: '' };
    const snapshot = current.current;
    const target = panels(snapshot.layout).find(panel => panel.id === variables.panelId) || panels(snapshot.layout)[0];
    if (variables.splitDirection) {
      const pane = crypto.randomUUID(); setLayout(value => splitPanel(value, target.id, tab, variables.splitDirection!, pane, crypto.randomUUID())); setActivePanel(pane);
    } else { setLayout(value => openTab(value, target.id, tab)); setActivePanel(target.id); }
    callbacks.current.onSelect();
  }, onError: error => toast.error(error.message) });
  const allPanels = panels(layout);
  const mountOrder = useRef<string[]>([]);
  mountOrder.current = stableViewOrder(mountOrder.current, layout);
  const mountedViews = new Map(allPanels.flatMap(panel => panel.tabs.map(tab => [tab.id, { panel, tab }] as const)));
  const activeLeaf = allPanels.find(panel => panel.id === activePanel) || allPanels[0];
  const activeTab = activeLeaf.tabs.find(tab => tab.id === activeLeaf.activeTabId) || null;
  const callbacks = useRef(props); callbacks.current = props;
  useEffect(() => {
    if (activeTab) focusHistory.current = [activeTab.id, ...focusHistory.current.filter(id => id !== activeTab.id)];
    callbacks.current.onActive(activeTab);
  }, [activeTab]);
  useEffect(() => {
    if (props.state.workspaceLayoutVersion !== 1) return;
    const snapshot = workspaceSnapshot(layout, activePanel, focusHistory.current), serialized = JSON.stringify(snapshot);
    if (serialized === lastSaved.current || blocked.current) return;
    lastSaved.current = serialized;
    const terminalBindings = allPanels.flatMap(panel => panel.tabs.filter(tab => tab.terminalId).map(tab => ({ tabId: tab.id, terminalId: tab.terminalId! })));
    persistence.current.mutate({ snapshot, terminalBindings });
  }, [layout, activePanel]);
  const registerViewport = useCallback((id: string, element: HTMLDivElement | null) => { if (element) viewports.current.set(id, element); else viewports.current.delete(id); }, []);
  const registerFrame = useCallback((id: string, frame: HTMLIFrameElement | null) => { if (frame) frames.current.set(id, frame); else frames.current.delete(id); }, []);
  useLayoutEffect(() => {
    const measure = () => {
      if (!root.current) return;
      const bounds = root.current.getBoundingClientRect();
      const next: Record<string, Rect> = {};
      for (const [id, element] of viewports.current) {
        const box = element.getBoundingClientRect();
        next[id] = { left: box.left - bounds.left, top: box.top - bounds.top, width: box.width, height: box.height };
      }
      setRects(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    for (const element of viewports.current.values()) observer.observe(element);
    measure(); return () => observer.disconnect();
  }, [layout]);
  function activate(panelId: string, tabId: string) { restoringFocus.current = false; setActivePanel(panelId); setLayout(value => selectTab(value, panelId, tabId)); props.onSelect(); }
  useImperativeHandle(ref, () => ({
    getActivePanel: () => current.current.activePanel,
    getShortcuts: async () => {
      const pane = panels(current.current.layout).find(item => item.id === current.current.activePanel);
      const frame = pane?.activeTabId ? frames.current.get(pane.activeTabId) : undefined;
      return frame ? (await activateTabAction(frame, 'get-shortcuts')).shortcuts || [] : [];
    },
    open: (url, projectId, projectPath, requestedPanel) => {
      const existingId = /^\/sessions\/([^/]+)/.exec(new URL(url).pathname)?.[1];
      const snapshot = current.current;
      const existingPanel = existingId && existingId !== 'new' ? panels(snapshot.layout).find(panel => panel.tabs.some(tab => tab.sessionId === existingId && tab.projectPath === projectPath)) : undefined;
      if (existingPanel) { activate(existingPanel.id, existingPanel.tabs.find(tab => tab.sessionId === existingId && tab.projectPath === projectPath)!.id); return; }
      const target = panels(snapshot.layout).find(panel => panel.id === (requestedPanel || snapshot.activePanel)) || panels(snapshot.layout)[0];
      const tab: WorkspaceView = { id: crypto.randomUUID(), url, projectId, projectPath, title: t("New chat"), sessionId: existingId && existingId !== 'new' ? existingId : '' };
      setActivePanel(target.id); setLayout(value => openTab(value, target.id, tab));
    },
  }));
  function close(panelId: string, ids: string[]) {
    let next = closeTabs(layout, panelId, ids);
    const remaining = panels(next);
    const activeClosed = !!activeTab && ids.includes(activeTab.id);
    focusHistory.current = focusHistory.current.filter(id => remaining.some(panel => panel.tabs.some(tab => tab.id === id)));
    const previousId = activeClosed ? focusHistory.current[0] : activeTab?.id;
    const focused = remaining.find(panel => panel.tabs.some(tab => tab.id === previousId)) || remaining.find(panel => panel.id === activePanel) || remaining[0];
    if (previousId && focused.tabs.some(tab => tab.id === previousId)) next = selectTab(next, focused.id, previousId);
    setLayout(next); setActivePanel(focused.id);
    const selected = panels(next).find(panel => panel.id === focused.id)?.activeTabId;
    if (activeClosed && selected) focusView(selected);
    if (!remaining.some(panel => panel.tabs.length)) props.onEmpty();
  }

  const move = useCallback((id: string, targetPanel: string, index: number) => {
    const snapshot = current.current;
    const next = moveTab(snapshot.layout, id, targetPanel, index);
    if (next === snapshot.layout) return;
    setLayout(selectTab(next, targetPanel, id)); setActivePanel(targetPanel); callbacks.current.onSelect();
    focusView(id);
  }, []);
  const moveToEdge = useCallback((id: string, targetPanel: string, edge: PanelDropEdge) => {
    const snapshot = current.current;
    const target = panels(snapshot.layout).find(panel => panel.id === targetPanel);
    if (!target) return;
    if (edge === 'center') { move(id, targetPanel, target.tabs.length); return; }
    const createdPanel = crypto.randomUUID();
    const next = moveTabToSplit(snapshot.layout, id, targetPanel, edge, createdPanel, crypto.randomUUID());
    if (next === snapshot.layout) return;
    setLayout(next); setActivePanel(createdPanel); callbacks.current.onSelect(); focusView(id);
  }, [move]);
  function openTerminal(panelId: string, path?: string) {
    const project = props.state.projects.find(project => project.path === (path || props.state.project));
    if (!project) { toast(t("Select a project first.")); return; }
    createTerminal.mutate({ projectId: project.id, panelId });
  }
  function split(panelId: string, tabId: string, direction: 'columns' | 'rows') {
    const original = allPanels.find(panel => panel.id === panelId)?.tabs.find(tab => tab.id === tabId);
    if (!original) return;
    if (original.kind === 'terminal') { createTerminal.mutate({ projectId: original.projectId, panelId, splitDirection: direction }); return; }
    const url = new URL(original.url); url.searchParams.delete('pair');
    const tab = { ...original, id: crypto.randomUUID(), url: url.href };
    const pane = crypto.randomUUID();
    setLayout(value => splitPanel(value, panelId, tab, direction, pane, crypto.randomUUID())); setActivePanel(pane); props.onSelect();
    requestAnimationFrame(() => document.getElementById(`workspace-tab-${tab.id}`)?.focus());
  }
  function action(panelId: string, tabId: string, command: DesktopTabAction) {
    activate(panelId, tabId);
    const frame = frames.current.get(tabId);
    if (!frame) { toast.error(t("Load the chat view and try again.")); return; }
    void activateTabAction(frame, command).catch(error => toast.error(error.message));
  }
  const commands = useRef<(command: DesktopCommand, source?: string) => void>(() => {});
  commands.current = (command, source) => {
    if (!canExecuteWorkCommand(!props.browsing, command)) return;
    if (!source && document.querySelector('dialog[open]') && !['help', 'settings'].includes(command)) return;
    const snapshot = current.current;
    const leaves = panels(snapshot.layout);
    const pane = source ? leaves.find(item => item.tabs.some(tab => tab.id === source)) : leaves.find(item => item.id === snapshot.activePanel) || leaves[0];
    if (source && !pane) return;
    const tab = pane?.tabs.find(item => item.id === (source || pane.activeTabId));
    if (command === 'help') { props.onHelp(); return; }
    if (command === 'settings') { props.onSettings(); return; }
    if (command === 'sidebar') { props.onSidebar(); return; }
    if (command === 'new-tab') { if (pane) props.onNew(pane.id, tab?.projectPath); return; }
    if (!pane || !tab || props.pending) return;
    if (command === 'refresh') {
      if (tab.kind === 'terminal') document.querySelector(`[data-terminal-id="${tab.terminalId}"]`)?.dispatchEvent(new Event('terminal-refresh'));
      else frames.current.get(tab.id)?.contentWindow?.location.reload();
      return;
    }
    if (command.startsWith('move-')) {
      if (pane.tabs.length < 2) { toast(t("A panel needs at least two tabs to move one into a separate panel.")); return; }
      const edge: PanelDropEdge = command === 'move-left' ? 'left' : command === 'move-right' ? 'right' : command === 'move-up' ? 'top' : 'bottom';
      moveToEdge(tab.id, pane.id, edge); return;
    }
    if (command.startsWith('tab-')) {
      const index = pane.tabs.findIndex(item => item.id === tab.id);
      const next = pane.tabs[(index + (command === 'tab-left' ? -1 : 1) + pane.tabs.length) % pane.tabs.length];
      activate(pane.id, next.id); focusView(next.id); return;
    }
    if (command.startsWith('panel-')) {
      const target = neighboringPanel(rects, pane.id, command.slice(6));
      const next = leaves.find(item => item.id === target);
      if (next?.activeTabId) { activate(next.id, next.activeTabId); focusView(next.activeTabId); }
      return;
    }
    if (command === 'close') { close(pane.id, [tab.id]); return; }
    activate(pane.id, tab.id);
    if (command === 'rename') setRenameTarget(tab.id);
    if (command === 'favorite') setFavoriteTarget(tab.id);
    if (command === 'split-columns' || command === 'split-rows') split(pane.id, tab.id, command === 'split-columns' ? 'columns' : 'rows');
  };
  function handleViewFocus(panelId: string, interaction: boolean) {
    const snapshot = current.current;
    if ((!interaction && snapshot.activePanel !== panelId) || !canActivateWorkspaceView(restoringFocus.current, interaction)) {
      const selected = panels(snapshot.layout).find(panel => panel.id === snapshot.activePanel)?.activeTabId;
      requestAnimationFrame(() => { if (selected && current.current.activePanel === snapshot.activePanel) document.getElementById(`workspace-tab-${selected}`)?.focus(); });
      return;
    }
    restoringFocus.current = false;
    if (snapshot.activePanel !== panelId) setActivePanel(panelId);
  }
  function focusView(id: string) {
    requestAnimationFrame(() => {
      if (!panels(current.current.layout).some(pane => pane.activeTabId === id)) return;
      const frame = frames.current.get(id);
      if (frame?.contentWindow) frame.contentWindow.focus();
      else document.querySelector<HTMLTextAreaElement>(`[data-tab-view="${id}"] textarea`)?.focus();
    });
  }
  useEffect(() => bindScopedShortcuts(window, macShortcuts, command => commands.current(command), browserShortcuts), []);
  useEffect(() => { if (props.browsing) hideAll(); }, [props.browsing]);
  function metadata(id: string, title: string, sessionId: string, url: string) {
    setLayout(value => {
      const tab = panels(value).flatMap(panel => panel.tabs).find(tab => tab.id === id);
      return !tab || (tab.title === title && tab.sessionId === sessionId && tab.url === url) ? value : updateTab(value, id, { title, sessionId, url });
    });
  }
  function render(node: WorkspaceNode): React.ReactNode {
    if (node.kind === 'panel') return <PanelLeaf key={node.id} panel={node} active={node.id === activeLeaf.id} browsing={props.browsing} pending={props.pending || createTerminal.isPending} state={props.state} registerViewport={registerViewport} onActivate={activate} onClose={close} onCloseOthers={(pane, tab) => close(pane, node.tabs.filter(item => item.id !== tab).map(item => item.id))} onCloseRight={(pane, tab) => close(pane, node.tabs.slice(node.tabs.findIndex(item => item.id === tab) + 1).map(item => item.id))} onSplit={split} onAction={action} onMove={move} onMoveEdge={moveToEdge} onRefresh={id => commands.current('refresh', id)} onNewTerminal={openTerminal} onRename={(id, value) => setLayout(tree => updateTab(tree, id, { customTitle: value }))} renameTarget={renameTarget} favoriteTarget={favoriteTarget} onHandled={kind => kind === 'rename' ? setRenameTarget('') : setFavoriteTarget('')} onNew={(pane, path) => { setActivePanel(pane); props.onNew(pane, path); }} />;
    const columns = node.direction === 'columns';
    return <div key={node.id} data-split-direction={node.direction} className={`flex min-h-0 min-w-0 flex-1 ${columns ? 'flex-row' : 'flex-col'}`}>
      <div className="flex min-h-0 min-w-0" style={{ flex: `0 0 calc(${node.ratio * 100}% - 0.5px)` }}>{render(node.children[0])}</div>
      <div role="separator" aria-label={columns ? t("Resize horizontal panels") : t("Resize vertical panels")} aria-orientation={columns ? 'vertical' : 'horizontal'} aria-valuemin={15} aria-valuemax={85} aria-valuenow={Math.round(node.ratio * 100)} tabIndex={0} className={`relative pointer-events-auto z-20 shrink-0 touch-none bg-divider/60 hover:bg-blue-400/50 focus-visible:bg-blue-400/50 before:absolute before:content-[''] ${columns ? 'w-px cursor-col-resize before:inset-y-0 before:-inset-x-1' : 'h-px cursor-row-resize before:inset-x-0 before:-inset-y-1'}`} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const box = event.currentTarget.parentElement!.getBoundingClientRect(); const ratio = columns ? (event.clientX - box.left) / box.width : (event.clientY - box.top) / box.height; setLayout(value => resizeSplit(value, node.id, ratio)); }} onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)} onKeyDown={event => { if ((columns && ['ArrowLeft', 'ArrowRight'].includes(event.key)) || (!columns && ['ArrowUp', 'ArrowDown'].includes(event.key))) { event.preventDefault(); setLayout(value => resizeSplit(value, node.id, node.ratio + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -.05 : .05))); } }} />
      <div className="flex min-h-0 min-w-0 flex-1">{render(node.children[1])}</div>
    </div>;
  }
  return <div ref={root} data-tab-dragging={dragging || undefined} className="workspace-surface pointer-events-none absolute inset-x-0 z-10 flex" style={{ top: 'calc(-1 * var(--header-height))', height: 'calc(100% + var(--header-height))' }}>
    {render(layout)}
    {dragging && allPanels.map(panel => <div key={`drop-${panel.id}`} className="absolute z-30" style={rects[panel.id] || { width: 0, height: 0 }}><PanelDropZone panelId={panel.id} tabIds={panel.tabs.map(tab => tab.id)} disabled={props.pending} onMove={moveToEdge} /></div>)}
    {mountOrder.current.map(id => {
      const { panel, tab } = mountedViews.get(id)!;
      const box = rects[panel.id];
      const hidden = props.browsing || panel.activeTabId !== tab.id;
      return <div key={tab.id} data-tab-view={tab.id} data-workspace-corner={panel.id === allPanels[0].id || undefined} id={`viewport-${tab.id}`} role="tabpanel" aria-labelledby={`workspace-tab-${tab.id}`} className={`absolute overflow-hidden bg-canvas ${hidden ? 'hidden' : 'pointer-events-auto'}`} style={box || { width: 0, height: 0 }}>{tab.restoreError ? <div role="alert" className="p-6 text-sm text-muted">{t("Could not restore this tab:")}{tab.restoreError}<p className="mt-2">{t("Check the project and connection, then reopen the tab.")}</p></div> : tab.kind === 'terminal' ? <Suspense fallback={<p role="status" className="p-3 text-xs text-muted">{t("Loading terminal…")}</p>}><TerminalView tab={tab} onFocus={interaction => handleViewFocus(panel.id, interaction)} onTitle={title => setLayout(value => {
        const original = panels(value).flatMap(panel => panel.tabs).find(view => view.id === tab.id);
        return original?.title === title ? value : updateTab(value, tab.id, { title });
      })} /></Suspense> : <WorkspaceFrame tab={tab} hidden={hidden} register={registerFrame} onMetadata={metadata} onFocus={interaction => handleViewFocus(panel.id, interaction)} onShortcut={(id, command) => commands.current(command, id)} />}</div>;
    })}
  </div>;
});
