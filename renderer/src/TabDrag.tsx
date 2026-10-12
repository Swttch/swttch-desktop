import { useRef, useState, type ReactNode } from 'react';
import { useDrag, useDrop } from 'react-dnd';

const TAB_DRAG = 'swttch-workspace-tab';
type DraggedTab = { id: string };

export function DraggableTab({ id, disabled, children }: { id: string; disabled: boolean; children: ReactNode }) {
  const [{ dragging }, drag] = useDrag<DraggedTab, void, { dragging: boolean }>(() => ({
    type: TAB_DRAG, item: { id }, canDrag: !disabled,
    collect: monitor => ({ dragging: monitor.isDragging() }),
  }), [id, disabled]);
  return <div ref={element => { drag(element); }} data-drag-tab={id} className={`flex h-full shrink-0 select-none ${dragging ? 'opacity-40' : ''}`}>{children}</div>;
}

export function TabDropStrip({ panelId, disabled, children, onMove, active }: { panelId: string; disabled: boolean; children: ReactNode; onMove: (id: string, panel: string, index: number) => void; active: boolean }) {
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
  return <div ref={element => { strip.current = element; drop(element); }} role="tablist" aria-label="패널 탭" className={`relative pointer-events-auto flex h-(--header-height) shrink-0 items-stretch overflow-x-auto border-b border-divider bg-chrome ${active ? '' : 'opacity-85'}`}>
    {children}
    {over && <span aria-hidden="true" data-tab-drop-marker className="pointer-events-none absolute inset-y-1 w-px bg-foreground" style={{ left: marker }} />}
  </div>;
}
