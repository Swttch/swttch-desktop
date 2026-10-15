import { t, useShellTranslation } from '../i18n';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Project } from '../desktop';

import { DropSide, type ProjectMove } from './projectOrder';
import { SortableProjectList } from './SortableProjectList';

export function ProjectOrderList(props: {
  projects: Project[]; disabled: boolean; placeholder?: boolean; onMove: (move: ProjectMove) => void; children: (project: Project) => ReactNode;
}) { useShellTranslation();
  return props.placeholder ? <SortableProjectList {...props} /> : <PointerProjectList {...props} />;
}

function PointerProjectList({ projects, disabled, onMove, children }: {
  projects: Project[]; disabled: boolean; placeholder?: boolean; onMove: (move: ProjectMove) => void; children: (project: Project) => ReactNode;
}) { useShellTranslation();
  const root = useRef<HTMLDivElement | null>(null);
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const transitions = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    transitions.current.forEach(animation => animation.cancel());
    transitions.current = [];
    const next = new Map<string, { x: number; y: number }>();
    root.current?.querySelectorAll<HTMLElement>('[data-project-drop-id]').forEach(element => {
      const id = element.dataset.projectDropId || '';
      const rect = element.getBoundingClientRect();
      const previous = positions.current.get(id);
      next.set(id, { x: rect.x, y: rect.y });
      if (previous && !matchMedia('(prefers-reduced-motion: reduce)').matches && Math.abs(previous.y - rect.y) > 1) {
        transitions.current.push(element.animate([{ transform: `translate(${previous.x - rect.x}px, ${previous.y - rect.y}px)` }, { transform: 'translate(0, 0)' }], { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }));
      }
    });
    positions.current = next;
    return () => { transitions.current.forEach(animation => animation.cancel()); };
  }, [projects]);
  const [dragId, setDragId] = useState<number | null>(null);
  const [target, setTarget] = useState<ProjectMove | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const active = useRef<{ id: number; x: number; y: number; started: boolean; height: number } | null>(null);
  const dropTarget = useRef<ProjectMove | null>(null);
  const scrolling = useRef<{ element: HTMLElement; speed: number } | null>(null);
  const frame = useRef(0);
  const suppressClick = useRef(false);
  const stopScroll = () => { cancelAnimationFrame(frame.current); scrolling.current = null; };
  const clear = () => { active.current = null; dropTarget.current = null; setDragId(null); setTarget(null); stopScroll(); };
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') { clear(); setTimeout(() => { suppressClick.current = false; }, 0); } };
    window.addEventListener('keydown', cancel);
    return () => { window.removeEventListener('keydown', cancel); cancelAnimationFrame(frame.current); };
  }, []);
  const dragged = projects.find(project => project.id === dragId);
  const hint = target && dragged && target.favorite !== (dragged.favoritedAt > 0) ? target.favorite ? t("Pin") : t("Unpin") : t("Move here");
  function updateTarget(x: number, y: number) {
    const hit = document.elementFromPoint(x, y);
    const row = hit?.closest<HTMLElement>('[data-project-drop-id]');
    const group = hit?.closest<HTMLElement>('[data-project-drop-group]');
    let next: ProjectMove | null = null;
    if (row && active.current) {
      if (Number(row.dataset.projectDropId) === active.current.id && active.current.started) return;
      const handle = row.querySelector<HTMLElement>('[data-project-drag-handle]');
      const rect = (handle || row).getBoundingClientRect();
      next = { projectId: active.current.id, targetId: Number(row.dataset.projectDropId), side: y < rect.top + rect.height / 2 ? DropSide.Before : DropSide.After, favorite: row.dataset.projectFavorite === 'true' };
    } else if (group && active.current) {
      next = { projectId: active.current.id, targetId: group.dataset.projectFirst ? Number(group.dataset.projectFirst) : null, side: DropSide.Before, favorite: group.dataset.projectDropGroup === 'true' };
    }
    dropTarget.current = next; setTarget(next);
    let element = hit instanceof HTMLElement ? hit : hit?.parentElement || null;
    while (element && !(element.scrollHeight > element.clientHeight && /auto|scroll/.test(getComputedStyle(element).overflowY))) element = element.parentElement;
    stopScroll();
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const speed = y < rect.top + 40 ? -8 : y > rect.bottom - 40 ? 8 : 0;
    if (speed && next) {
      scrolling.current = { element, speed };
      const scroll = () => {
        const current = scrolling.current;
        if (!current) return;
        current.element.scrollTop += current.speed;
        // Re-evaluate the target as rows scroll beneath a stationary pointer.
        updateTarget(x, y);
      };
      frame.current = requestAnimationFrame(scroll);
    }
  }
  const line = (activeLine: boolean) => activeLine ? <div className="pointer-events-none absolute right-0 left-0 z-20 h-0.5 bg-dev-line"><span className="absolute right-1 bottom-1 rounded bg-chrome px-2 py-0.5 text-[11px] text-foreground">{hint}</span></div> : null;
  return <div ref={root} onPointerDown={event => {
    if (disabled || event.button !== 0 || !(event.target instanceof HTMLElement)) return;
    if (event.target.closest('[role="button"]')) return;
    const handle = event.target.closest<HTMLElement>('[data-project-drag-handle]');
    if (!handle) return;
    const id = Number(handle.dataset.projectDragHandle);
    if (!projects.some(project => project.id === id)) return;
    active.current = { id, x: event.clientX, y: event.clientY, started: false, height: handle.getBoundingClientRect().height };
  }} onPointerMove={event => {
    const current = active.current;
    if (!current || disabled) return;
    if (!current.started && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 5) return;
    if (!current.started) { current.started = true; suppressClick.current = true; setDragId(current.id); event.currentTarget.setPointerCapture(event.pointerId); }
    event.preventDefault(); setPointer({ x: event.clientX, y: event.clientY }); updateTarget(event.clientX, event.clientY);
  }} onPointerUp={event => {
    const current = active.current;
    if (current?.started) {
      event.preventDefault();
      const next = dropTarget.current;
      if (!disabled && next && next.targetId !== current.id) onMove(next);
    }
    clear();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setTimeout(() => { suppressClick.current = false; }, 0);
  }} onPointerCancel={clear} onLostPointerCapture={clear}
    onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }}
    onKeyDown={event => {
      if (disabled || !event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key) || !(event.target instanceof HTMLElement)) return;
      const handle = event.target.closest<HTMLElement>('[data-project-drag-handle]');
      const index = projects.findIndex(project => project.id === Number(handle?.dataset.projectDragHandle));
      const neighbor = projects[index + (event.key === 'ArrowUp' ? -1 : 1)];
      if (index < 0 || !neighbor) return;
      event.preventDefault(); onMove({ projectId: projects[index].id, targetId: neighbor.id, side: event.key === 'ArrowUp' ? DropSide.Before : DropSide.After, favorite: neighbor.favoritedAt > 0 });
    }}>
    {[true, false].map(favorite => {
      const rows = projects.filter(project => (project.favoritedAt > 0) === favorite);
      return <div key={String(favorite)}>
        {dragId !== null && !rows.length && <div data-project-drop-group={String(favorite)} className="relative h-4">
          {line(target?.targetId === null && target.favorite === favorite)}
        </div>}
        {rows.map(project => <div key={project.id} data-project-drop-id={project.id} data-project-favorite={String(favorite)} className={`relative ${dragId === project.id ? 'opacity-40 select-none' : ''}`}>
          {target?.targetId === project.id && target.side === DropSide.Before && line(true)}
          {children(project)}
          {target?.targetId === project.id && target.side === DropSide.After && line(true)}
        </div>)}
      </div>;
    })}
    {dragged && <div className="pointer-events-none fixed z-50 max-w-56 truncate rounded-lg border border-divider bg-chrome px-3 py-2 text-xs shadow-lg" style={{ left: pointer.x + 12, top: pointer.y + 12 }}>{dragged.alias || dragged.path.split(/[\\/]/).filter(Boolean).pop()}</div>}
    <span role="status" className="sr-only">{dragId !== null ? t("Reordering projects. Press Escape to cancel.") : ''}</span>
  </div>;
}
