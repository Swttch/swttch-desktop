import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { closeTabs, openTab, panels, resizeSplit, selectTab, splitPanel, updateTab, type WorkspaceNode, type WorkspacePanel, type WorkspaceView } from '../../src/workspace-layout.mjs';
import { SessionActivity, type DesktopState } from './desktop';
import { WorkspaceTab } from './WorkspaceTab';
import { WorkspaceFrame } from './WorkspaceFrame';
import { activateTabAction, type DesktopTabAction } from './tab-action';
import { Tooltip } from './Tooltip';
import toast from 'react-hot-toast';

export interface WorkspaceSurfaceHandle { open: (url: string, projectId: number, projectPath: string, panelId?: string) => void; getActivePanel: () => string }
type Rect = { left: number; top: number; width: number; height: number };
type SurfaceProps = { state: DesktopState; browsing: boolean; pending: boolean; onSelect: () => void; onActive: (tab: WorkspaceView | null) => void; onNew: (panelId: string, projectPath?: string) => void; onEmpty: () => void; onSidebar: () => void };

function PanelLeaf({ panel, active, browsing, pending, state, registerViewport, onActivate, onClose, onCloseOthers, onCloseRight, onSplit, onAction, onRename, onNew }: { panel: WorkspacePanel; active: boolean; browsing: boolean; pending: boolean; state: DesktopState; registerViewport: (id: string, element: HTMLDivElement | null) => void; onActivate: (panel: string, tab: string) => void; onClose: (panel: string, ids: string[]) => void; onCloseOthers: (panel: string, tab: string) => void; onCloseRight: (panel: string, tab: string) => void; onSplit: (panel: string, tab: string, direction: 'columns' | 'rows') => void; onAction: (panel: string, tab: string, action: DesktopTabAction) => void; onRename: (tab: string, value: string) => void; onNew: (panel: string, path?: string) => void }) {
  const register = useCallback((element: HTMLDivElement | null) => registerViewport(panel.id, element), [panel.id, registerViewport]);
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => { strip.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [panel.activeTabId, browsing]);
  const current = panel.tabs.find(tab => tab.id === panel.activeTabId);
  return <section aria-label="작업 패널" data-panel-id={panel.id} data-active-panel={active || undefined} className="relative flex min-h-0 min-w-0 flex-1 flex-col">
    <div ref={strip} role="tablist" aria-label="패널 탭" className={`pointer-events-auto flex h-(--header-height) shrink-0 items-stretch overflow-x-auto border-b border-divider bg-chrome ${active ? '' : 'opacity-85'}`}>
      {panel.tabs.map((tab, index) => <WorkspaceTab key={tab.id} tabId={tab.id} title={tab.title} customName={tab.customTitle} onRename={value => onRename(tab.id, value)} selected={!browsing && panel.activeTabId === tab.id} running={state.sessionActivity?.activity[tab.sessionId] === SessionActivity.Running} pending={pending} onSelect={() => onActivate(panel.id, tab.id)} onClose={() => onClose(panel.id, [tab.id])} onAction={action => onAction(panel.id, tab.id, action)} onCloseOthers={() => onCloseOthers(panel.id, tab.id)} canCloseOthers={panel.tabs.length > 1} onCloseRight={() => onCloseRight(panel.id, tab.id)} canCloseRight={index < panel.tabs.length - 1} onSplit={direction => onSplit(panel.id, tab.id, direction)} />)}
      <Tooltip content="새 채팅" placement="bottom-start"><button type="button" aria-label="패널 새 채팅" disabled={pending} className="flex h-full w-8 shrink-0 items-center justify-center text-muted hover:bg-selected" onClick={() => onNew(panel.id, current?.projectPath)}><svg aria-hidden="true" className="size-4 fill-none stroke-current" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 5v14M5 12h14" /></svg></button></Tooltip>
    </div>
    <div ref={register} className="relative min-h-0 min-w-0 flex-1" />
  </section>;
}

export const WorkspaceSurface = forwardRef<WorkspaceSurfaceHandle, SurfaceProps>(function WorkspaceSurface(props, ref) {
  const [layout, setLayout] = useState<WorkspaceNode>(() => ({ kind: 'panel', id: crypto.randomUUID(), tabs: [], activeTabId: null }));
  const [activePanel, setActivePanel] = useState(() => panels(layout)[0].id);
  const current = useRef({ layout, activePanel });
  current.current = { layout, activePanel };
  const root = useRef<HTMLDivElement>(null);
  const viewports = useRef(new Map<string, HTMLDivElement>());
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const [rects, setRects] = useState<Record<string, Rect>>({});
  const allPanels = panels(layout);
  const activeLeaf = allPanels.find(panel => panel.id === activePanel) || allPanels[0];
  const activeTab = activeLeaf.tabs.find(tab => tab.id === activeLeaf.activeTabId) || null;
  const callbacks = useRef(props); callbacks.current = props;
  useEffect(() => { callbacks.current.onActive(activeTab); }, [activeTab]);
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
    const next = closeTabs(layout, panelId, ids);
    const remaining = panels(next);
    setLayout(next);
    if (!remaining.some(panel => panel.id === activePanel)) setActivePanel(remaining[0].id);
    if (!remaining.some(panel => panel.tabs.length)) props.onEmpty();
  }
  function split(panelId: string, tabId: string, direction: 'columns' | 'rows') {
    const original = allPanels.find(panel => panel.id === panelId)?.tabs.find(tab => tab.id === tabId);
    if (!original) return;
    const url = new URL(original.url); url.searchParams.delete('pair');
    const tab = { ...original, id: crypto.randomUUID(), url: url.href };
    const pane = crypto.randomUUID();
    setLayout(value => splitPanel(value, panelId, tab, direction, pane, crypto.randomUUID())); setActivePanel(pane); props.onSelect();
  }
  function action(panelId: string, tabId: string, command: DesktopTabAction) {
    activate(panelId, tabId);
    const frame = frames.current.get(tabId);
    if (!frame) { toast.error('채팅 화면을 불러온 뒤 다시 시도해 주세요.'); return; }
    void activateTabAction(frame, command).catch(error => toast.error(error.message));
  }
  function metadata(id: string, title: string, sessionId: string, url: string) {
    setLayout(value => {
      const tab = panels(value).flatMap(panel => panel.tabs).find(tab => tab.id === id);
      return !tab || (tab.title === title && tab.sessionId === sessionId && tab.url === url) ? value : updateTab(value, id, { title, sessionId, url });
    });
  }
  function render(node: WorkspaceNode): React.ReactNode {
    if (node.kind === 'panel') return <PanelLeaf key={node.id} panel={node} active={node.id === activeLeaf.id} browsing={props.browsing} pending={props.pending} state={props.state} registerViewport={registerViewport} onActivate={activate} onClose={close} onCloseOthers={(pane, tab) => close(pane, node.tabs.filter(item => item.id !== tab).map(item => item.id))} onCloseRight={(pane, tab) => close(pane, node.tabs.slice(node.tabs.findIndex(item => item.id === tab) + 1).map(item => item.id))} onSplit={split} onAction={action} onRename={(id, value) => setLayout(tree => updateTab(tree, id, { customTitle: value }))} onNew={(pane, path) => { setActivePanel(pane); props.onNew(pane, path); }} />;
    const columns = node.direction === 'columns';
    return <div key={node.id} data-split-direction={node.direction} className={`flex min-h-0 min-w-0 flex-1 ${columns ? 'flex-row' : 'flex-col'}`}>
      <div className="flex min-h-0 min-w-0" style={{ flex: `0 0 calc(${node.ratio * 100}% - 2px)` }}>{render(node.children[0])}</div>
      <div role="separator" aria-label={columns ? '좌우 패널 크기 조절' : '상하 패널 크기 조절'} aria-orientation={columns ? 'vertical' : 'horizontal'} aria-valuemin={15} aria-valuemax={85} aria-valuenow={Math.round(node.ratio * 100)} tabIndex={0} className={`pointer-events-auto z-20 shrink-0 touch-none bg-divider hover:bg-muted focus-visible:bg-muted ${columns ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}`} onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const box = event.currentTarget.parentElement!.getBoundingClientRect(); const ratio = columns ? (event.clientX - box.left) / box.width : (event.clientY - box.top) / box.height; setLayout(value => resizeSplit(value, node.id, ratio)); }} onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)} onKeyDown={event => { if ((columns && ['ArrowLeft', 'ArrowRight'].includes(event.key)) || (!columns && ['ArrowUp', 'ArrowDown'].includes(event.key))) { event.preventDefault(); setLayout(value => resizeSplit(value, node.id, node.ratio + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -.05 : .05))); } }} />
      <div className="flex min-h-0 min-w-0 flex-1">{render(node.children[1])}</div>
    </div>;
  }
  return <div ref={root} className="workspace-surface pointer-events-none absolute inset-x-0 z-10 flex" style={{ top: 'calc(-1 * var(--header-height))', height: 'calc(100% + var(--header-height))' }}>
    {render(layout)}
    {allPanels.flatMap(panel => panel.tabs.map(tab => {
      const box = rects[panel.id];
      const hidden = props.browsing || panel.activeTabId !== tab.id;
      return <div key={tab.id} data-tab-view={tab.id} id={`viewport-${tab.id}`} role="tabpanel" aria-labelledby={`workspace-tab-${tab.id}`} className={`absolute overflow-hidden bg-canvas ${hidden ? 'hidden' : 'pointer-events-auto'}`} style={box || { width: 0, height: 0 }}><WorkspaceFrame tab={tab} hidden={hidden} register={registerFrame} onMetadata={metadata} onFocus={() => { if (current.current.activePanel !== panel.id) setActivePanel(panel.id); }} onSidebar={props.onSidebar} /></div>;
    }))}
  </div>;
});
