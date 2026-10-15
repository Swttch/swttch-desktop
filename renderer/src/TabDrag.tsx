import { t, useShellTranslation } from './i18n';
import { panelDropEdge, type PanelDropEdge } from '../../src/workspace-layout.mjs';
import { useRef, useState, type ReactNode } from 'react';
import { useDrag, useDrop } from 'react-dnd';

const TAB_DRAG = 'swttch-workspace-tab';
type DraggedTab = { id: string };

export function DraggableTab({ id, disabled, children }: { id: string; disabled: boolean; children: ReactNode }) { useShellTranslation();
  const [{ dragging }, drag] = useDrag<DraggedTab, void, { dragging: boolean }>(() => ({
    type: TAB_DRAG, item: { id }, canDrag: !disabled,
    collect: monitor => ({ dragging: monitor.isDragging() }),
  }), [id, disabled]);
  return <div ref={element => { drag(element); }} data-drag-tab={id} className={`flex h-full shrink-0 select-none ${dragging ? 'opacity-40' : ''}`}>{children}</div>;
}

export function TabDropStrip({ panelId, disabled, children, onMove, active }: { panelId: string; disabled: boolean; children: ReactNode; onMove: (id: string, panel: string, index: number) => void; active: boolean }) { useShellTranslation();
  const strip = useRef<HTMLDivElement>(null);
  const insertion = useRef(0);
  const [marker, setMarker] = useState(0);
  const [{ over }, drop] = useDrop<DraggedTab, void, { over: boolean }>(() => ({
    accept: TAB_DRAG, canDrop: () => !disabled,
    hover: (_item, monitor) => {
      const element = strip.current, point = monitor.getClientOffset();
      if (!element || !point) return;
      const bounds = element.getBoundingClientRect();
      if (point.x < bounds.left + 24) element.scrollLeft -= 12;
      if (point.x > bounds.right - 24) element.scrollLeft += 12;
      const tabs = Array.from(element.querySelectorAll<HTMLElement>('[data-drag-tab]'));
      const index = tabs.findIndex(tab => { const box = tab.getBoundingClientRect(); return point.x < box.left + box.width / 2; });
      insertion.current = index < 0 ? tabs.length : index;
      const next = tabs[insertion.current];
      const last = tabs[tabs.length - 1];
      setMarker(next ? next.offsetLeft : last ? last.offsetLeft + last.offsetWidth : 0);
    },
    drop: (item, monitor) => { if (!monitor.didDrop()) onMove(item.id, panelId, insertion.current); },
    collect: monitor => ({ over: monitor.isOver({ shallow: true }) && monitor.canDrop() }),
  }), [panelId, disabled, onMove]);
  return <div ref={element => { strip.current = element; drop(element); }} role="tablist" aria-label={t("Panel tabs")} className={`relative pointer-events-auto flex h-(--header-height) shrink-0 items-stretch overflow-x-auto bg-chrome ${active ? '' : 'opacity-85'}`}>
    {children}
    {over && <span aria-hidden="true" data-tab-drop-marker className="pointer-events-none absolute inset-y-1 w-px bg-foreground" style={{ left: marker }} />}
  </div>;
}

export function PanelDropZone({ panelId, tabIds, disabled, onMove }: { panelId: string; tabIds: string[]; disabled: boolean; onMove: (id: string, panel: string, edge: PanelDropEdge) => void }) { useShellTranslation();
  const area = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<PanelDropEdge>('center');
  const edgeAt = (point: { x: number; y: number } | null) => {
    const box = area.current?.getBoundingClientRect();
    return box && point ? panelDropEdge(point.x - box.left, point.y - box.top, box.width, box.height) : 'center';
  };
  const [{ over }, drop] = useDrop<DraggedTab, void, { over: boolean }>(() => ({
    accept: TAB_DRAG,
    canDrop: (item, monitor) => !disabled && (!tabIds.includes(item.id) || (tabIds.length > 1 && edgeAt(monitor.getClientOffset()) !== 'center')),
    hover: (_item, monitor) => setEdge(edgeAt(monitor.getClientOffset())),
    drop: (item, monitor) => { if (!monitor.didDrop()) onMove(item.id, panelId, edgeAt(monitor.getClientOffset())); },
    collect: monitor => ({ over: monitor.isOver({ shallow: true }) && monitor.canDrop() }),
  }), [panelId, tabIds, disabled, onMove]);
  const preview = { left: edge === 'right' ? '50%' : '0%', top: edge === 'bottom' ? '50%' : '0%',
    width: edge === 'left' || edge === 'right' ? '50%' : '100%', height: edge === 'top' || edge === 'bottom' ? '50%' : '100%' };
  return <div ref={element => { area.current = element; drop(element); }} data-panel-drop-zone={panelId} className="pointer-events-auto absolute inset-0 z-30">
    <div aria-hidden="true" data-panel-drop-preview={over ? edge : undefined} className={`pointer-events-none absolute bg-selected/65 transition-[left,top,width,height,opacity] duration-150 ease-out motion-reduce:transition-none ${over ? 'opacity-100' : 'opacity-0'}`} style={preview} />
  </div>;
}
