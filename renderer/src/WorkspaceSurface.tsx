import { canExecuteWorkCommand } from './WorkPage';
import { hideAll } from 'tippy.js';
import { Dropdown } from './Dropdown';
import { NewTabMenuContent } from './NewTabMenuContent';
import { DndProvider, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableTab, PanelDropZone, TabDropStrip } from './TabDrag';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { closeTabs, moveTab, moveTabToSplit, openTab, panels, resizeSplit, selectTab, splitPanel, updateTab, type PanelDropEdge, type WorkspaceNode, type WorkspacePanel, type WorkspaceView } from '../../src/workspace-layout.mjs';
import { SessionActivity, type DesktopState } from './desktop';
import { WorkspaceTab } from './WorkspaceTab';
import { WorkspaceFrame } from './WorkspaceFrame';
import { activateTabAction, type DesktopTabAction } from './tab-action';
import { Tooltip } from './Tooltip';
import toast from 'react-hot-toast';
import { bindScopedShortcuts, neighboringPanel, type DesktopCommand } from '../../src/desktop-shortcuts.mjs';
import { macShortcuts, browserShortcuts } from './shortcut-platform';

export interface WorkspaceSurfaceHandle { open: (url: string, projectId: number, projectPath: string, panelId?: string) => void; getActivePanel: () => string; getShortcuts: () => Promise<import('./tab-action').ShortcutRow[]> }
type Rect = { left: number; top: number; width: number; height: number };
type SurfaceProps = { state: DesktopState; browsing: boolean; pending: boolean; onSelect: () => void; onActive: (tab: WorkspaceView | null) => void; onNew: (panelId: string, projectPath?: string) => void; onEmpty: () => void; onSidebar: () => void; onHelp: () => void; onSettings: () => void };

function PanelLeaf({ panel, active, browsing, pending, state, registerViewport, onActivate, onClose, onCloseOthers, onCloseRight, onSplit, onAction, onRename, onMove, onMoveEdge, onRefresh, onNew, renameTarget, favoriteTarget, onHandled }: { panel: WorkspacePanel; active: boolean; browsing: boolean; pending: boolean; state: DesktopState; registerViewport: (id: string, element: HTMLDivElement | null) => void; onActivate: (panel: string, tab: string) => void; onClose: (panel: string, ids: string[]) => void; onCloseOthers: (panel: string, tab: string) => void; onCloseRight: (panel: string, tab: string) => void; onSplit: (panel: string, tab: string, direction: 'columns' | 'rows') => void; onAction: (panel: string, tab: string, action: DesktopTabAction) => void; onRename: (tab: string, value: string) => void; onMove: (id: string, panel: string, index: number) => void; onMoveEdge: (id: string, panel: string, edge: PanelDropEdge) => void; onRefresh: (id: string) => void; onNew: (panel: string, path?: string) => void; renameTarget: string; favoriteTarget: string; onHandled: (kind: 'rename' | 'favorite') => void }) {
  const closeTabMenu = useRef<(() => void) | null>(null);
  const register = useCallback((element: HTMLDivElement | null) => registerViewport(panel.id, element), [panel.id, registerViewport]);
  useEffect(() => { document.querySelector<HTMLElement>(`[data-panel-id="${panel.id}"]`)?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [panel.activeTabId, browsing]);
  const current = panel.tabs.find(tab => tab.id === panel.activeTabId);
  return <section aria-label="작업 패널" data-panel-id={panel.id} data-active-panel={active || undefined} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
    <TabDropStrip panelId={panel.id} disabled={pending} onMove={onMove} active={active}>
      {panel.tabs.map((tab, index) => <DraggableTab key={tab.id} id={tab.id} disabled={pending}><WorkspaceTab tabId={tab.id} projectId={tab.projectId} sessionId={tab.sessionId} renameRequested={renameTarget === tab.id} favoriteRequested={favoriteTarget === tab.id} onRequestHandled={onHandled} title={tab.title} customName={tab.customTitle} onRename={value => onRename(tab.id, value)} selected={!browsing && panel.activeTabId === tab.id} onRefresh={() => onRefresh(tab.id)} onMoveEdge={edge => onMoveEdge(tab.id, panel.id, edge)} canMoveEdge={panel.tabs.length > 1} running={state.sessionActivity?.activity[tab.sessionId] === SessionActivity.Running} pending={pending} onSelect={() => onActivate(panel.id, tab.id)} onClose={() => onClose(panel.id, [tab.id])} onAction={action => onAction(panel.id, tab.id, action)} onCloseOthers={() => onCloseOthers(panel.id, tab.id)} canCloseOthers={panel.tabs.length > 1} onCloseRight={() => onCloseRight(panel.id, tab.id)} canCloseRight={index < panel.tabs.length - 1} onSplit={direction => onSplit(panel.id, tab.id, direction)} /></DraggableTab>)}
      <Dropdown closeRef={closeTabMenu} content={<NewTabMenuContent pending={pending} onCreate={() => { closeTabMenu.current?.(); onNew(panel.id, current?.projectPath); }} />}><Tooltip content="새 탭 열기" placement="bottom-start"><button type="button" aria-label="새 탭 열기" disabled={pending} className="flex h-full w-8 shrink-0 items-center justify-center text-muted hover:bg-selected"><svg aria-hidden="true" className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg></button></Tooltip></Dropdown>
    </TabDropStrip>
    <div ref={register} className="relative min-h-0 min-w-0 flex-1" />
  </section>;
}

export const WorkspaceSurface = forwardRef<WorkspaceSurfaceHandle, SurfaceProps>(function WorkspaceSurface(props, ref) {
  return <DndProvider backend={HTML5Backend}><WorkspaceSurfaceContent {...props} ref={ref} /></DndProvider>;
});
const WorkspaceSurfaceContent = forwardRef<WorkspaceSurfaceHandle, SurfaceProps>(function WorkspaceSurfaceContent(props, ref) {
  const dragging = useDragLayer(monitor => monitor.isDragging());
  const [layout, setLayout] = useState<WorkspaceNode>(() => ({ kind: 'panel', id: crypto.randomUUID(), tabs: [], activeTabId: null }));
  const [activePanel, setActivePanel] = useState(() => panels(layout)[0].id);
  const current = useRef({ layout, activePanel });
  current.current = { layout, activePanel };
  const root = useRef<HTMLDivElement>(null);
  const viewports = useRef(new Map<string, HTMLDivElement>());
  const focusHistory = useRef<string[]>([]);
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const [renameTarget, setRenameTarget] = useState('');
  const [favoriteTarget, setFavoriteTarget] = useState('');
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const allPanels = panels(layout);
  const activeLeaf = allPanels.find(panel => panel.id === activePanel) || allPanels[0];
  const activeTab = activeLeaf.tabs.find(tab => tab.id === activeLeaf.activeTabId) || null;
  const callbacks = useRef(props); callbacks.current = props;
  useEffect(() => {
    if (activeTab) focusHistory.current = [activeTab.id, ...focusHistory.current.filter(id => id !== activeTab.id)];
    callbacks.current.onActive(activeTab);
  }, [activeTab]);
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
  function activate(panelId: string, tabId: string) { setActivePanel(panelId); setLayout(value => selectTab(value, panelId, tabId)); props.onSelect(); }
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
      const tab: WorkspaceView = { id: crypto.randomUUID(), url, projectId, projectPath, title: '새 채팅', sessionId: existingId && existingId !== 'new' ? existingId : '' };
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
  function split(panelId: string, tabId: string, direction: 'columns' | 'rows') {
    const original = allPanels.find(panel => panel.id === panelId)?.tabs.find(tab => tab.id === tabId);
    if (!original) return;
    const url = new URL(original.url); url.searchParams.delete('pair');
    const tab = { ...original, id: crypto.randomUUID(), url: url.href };
    const pane = crypto.randomUUID();
    setLayout(value => splitPanel(value, panelId, tab, direction, pane, crypto.randomUUID())); setActivePanel(pane); props.onSelect();
    requestAnimationFrame(() => document.getElementById(`workspace-tab-${tab.id}`)?.focus());
  }
  function action(panelId: string, tabId: string, command: DesktopTabAction) {
    activate(panelId, tabId);
    const frame = frames.current.get(tabId);
    if (!frame) { toast.error('채팅 화면을 불러온 뒤 다시 시도해 주세요.'); return; }
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
    if (command === 'refresh') { frames.current.get(tab.id)?.contentWindow?.location.reload(); return; }
    if (command.startsWith('move-')) {
      if (pane.tabs.length < 2) { toast('같은 패널에 탭이 두 개 이상 있을 때 분리해서 이동할 수 있습니다.'); return; }
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
  function focusView(id: string) {
    requestAnimationFrame(() => { if (panels(current.current.layout).some(pane => pane.activeTabId === id)) frames.current.get(id)?.contentWindow?.focus(); });
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
    if (node.kind === 'panel') return <PanelLeaf key={node.id} panel={node} active={node.id === activeLeaf.id} browsing={props.browsing} pending={props.pending} state={props.state} registerViewport={registerViewport} onActivate={activate} onClose={close} onCloseOthers={(pane, tab) => close(pane, node.tabs.filter(item => item.id !== tab).map(item => item.id))} onCloseRight={(pane, tab) => close(pane, node.tabs.slice(node.tabs.findIndex(item => item.id === tab) + 1).map(item => item.id))} onSplit={split} onAction={action} onMove={move} onMoveEdge={moveToEdge} onRefresh={id => commands.current('refresh', id)} onRename={(id, value) => setLayout(tree => updateTab(tree, id, { customTitle: value }))} renameTarget={renameTarget} favoriteTarget={favoriteTarget} onHandled={kind => kind === 'rename' ? setRenameTarget('') : setFavoriteTarget('')} onNew={(pane, path) => { setActivePanel(pane); props.onNew(pane, path); }} />;
    const columns = node.direction === 'columns';
    return <div key={node.id} data-split-direction={node.direction} className={`flex min-h-0 min-w-0 flex-1 ${columns ? 'flex-row' : 'flex-col'}`}>
      <div className="flex min-h-0 min-w-0" style={{ flex: `0 0 calc(${node.ratio * 100}% - 0.5px)` }}>{render(node.children[0])}</div>
      <div role="separator" aria-label={columns ? '좌우 패널 크기 조절' : '상하 패널 크기 조절'} aria-orientation={columns ? 'vertical' : 'horizontal'} aria-valuemin={15} aria-valuemax={85} aria-valuenow={Math.round(node.ratio * 100)} tabIndex={0} className={`relative pointer-events-auto z-20 shrink-0 touch-none bg-divider/60 hover:bg-blue-400/50 focus-visible:bg-blue-400/50 before:absolute before:content-[''] ${columns ? 'w-px cursor-col-resize before:inset-y-0 before:-inset-x-1' : 'h-px cursor-row-resize before:inset-x-0 before:-inset-y-1'}`} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const box = event.currentTarget.parentElement!.getBoundingClientRect(); const ratio = columns ? (event.clientX - box.left) / box.width : (event.clientY - box.top) / box.height; setLayout(value => resizeSplit(value, node.id, ratio)); }} onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)} onKeyDown={event => { if ((columns && ['ArrowLeft', 'ArrowRight'].includes(event.key)) || (!columns && ['ArrowUp', 'ArrowDown'].includes(event.key))) { event.preventDefault(); setLayout(value => resizeSplit(value, node.id, node.ratio + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -.05 : .05))); } }} />
      <div className="flex min-h-0 min-w-0 flex-1">{render(node.children[1])}</div>
    </div>;
  }
  return <div ref={root} data-tab-dragging={dragging || undefined} className="workspace-surface pointer-events-none absolute inset-x-0 z-10 flex" style={{ top: 'calc(-1 * var(--header-height))', height: 'calc(100% + var(--header-height))' }}>
    {render(layout)}
    {dragging && allPanels.map(panel => <div key={`drop-${panel.id}`} className="absolute z-30" style={rects[panel.id] || { width: 0, height: 0 }}><PanelDropZone panelId={panel.id} tabIds={panel.tabs.map(tab => tab.id)} disabled={props.pending} onMove={moveToEdge} /></div>)}
    {allPanels.flatMap(panel => panel.tabs.map(tab => {
      const box = rects[panel.id];
      const hidden = props.browsing || panel.activeTabId !== tab.id;
      return <div key={tab.id} data-tab-view={tab.id} data-workspace-corner={panel.id === allPanels[0].id || undefined} id={`viewport-${tab.id}`} role="tabpanel" aria-labelledby={`workspace-tab-${tab.id}`} className={`absolute overflow-hidden bg-canvas ${hidden ? 'hidden' : 'pointer-events-auto'}`} style={box || { width: 0, height: 0 }}><WorkspaceFrame tab={tab} hidden={hidden} register={registerFrame} onMetadata={metadata} onFocus={() => { if (current.current.activePanel !== panel.id) setActivePanel(panel.id); }} onShortcut={(id, command) => commands.current(command, id)} /></div>;
    }))}
  </div>;
});
