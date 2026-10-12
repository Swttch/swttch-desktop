import { projectDragActivationConstraints } from '../../../src/project-drag-activation.mjs';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { DragDropProvider, DragOverlay, PointerSensor, KeyboardSensor, useDroppable } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { move } from '@dnd-kit/helpers';
import type { Project } from '../desktop';
import { DropSide, type ProjectMove } from './projectOrder';

const sensors = [PointerSensor.configure({
  activationConstraints: projectDragActivationConstraints,
  preventActivation: event => !(event.target instanceof Element) || !event.target.closest('[data-project-drag-handle]') || Boolean(event.target.closest('[role="button"]')),
}), KeyboardSensor];

function SortableProject({ project, index, disabled, reducedMotion, hint, children }: {
  project: Project; index: number; disabled: boolean; reducedMotion: boolean; hint: string; children: ReactNode;
}) {
  const handle = useRef<HTMLElement | null>(null);
  const { ref, isDragSource } = useSortable({
    id: project.id, index, group: 'projects', type: 'project', accept: 'project', disabled, handle,
    transition: reducedMotion ? null : { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', idle: true },
  });
  const bind = useCallback((element: HTMLDivElement | null) => {
    handle.current = element?.querySelector<HTMLElement>('[data-project-drag-handle]') || null;
    ref(element);
  }, [ref]);
  return <div ref={bind}
    data-project-drop-id={project.id} className={`relative rounded-lg ${isDragSource ? 'border border-dashed border-muted/50 bg-selected/40' : ''}`}>
    <div className={isDragSource ? 'invisible' : ''}>{children}</div>
    {isDragSource && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted">{hint}</div>}
  </div>;
}

function EmptyPinSlot({ favorite }: { favorite: boolean }) {
  const { ref, isDropTarget } = useDroppable({ id: favorite ? 'pin-zone' : 'unpin-zone', type: 'project', accept: 'project' });
  return <div ref={ref} className={`flex h-7 items-center justify-center rounded border border-dashed text-xs ${isDropTarget ? 'border-muted bg-selected text-foreground' : 'border-divider text-muted'}`}>{favorite ? '여기에 놓으면 고정' : '여기에 놓으면 고정 해제'}</div>;
}

export function SortableProjectList({ projects, disabled, onMove, children }: {
  projects: Project[]; disabled: boolean; onMove: (move: ProjectMove) => void; children: (project: Project) => ReactNode;
}) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [preview, setPreview] = useState<number[] | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const lastMove = useRef<ProjectMove | null>(null);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  const ids = preview || projects.map(project => project.id);
  const rows = ids.flatMap(id => { const project = projects.find(project => project.id === id); return project ? [project] : []; });
  const dragged = projects.find(project => project.id === dragId);
  const hint = dragged && favorite !== (dragged.favoritedAt > 0) ? favorite ? '고정' : '고정 해제' : '여기에 이동';
  return <DragDropProvider sensors={sensors}
    onDragStart={event => {
      const id = Number(event.operation.source?.id);
      const project = projects.find(row => row.id === id);
      if (!project) return;
      setDragId(id); setFavorite(project.favoritedAt > 0); lastMove.current = null;
    }}
    onDragOver={event => {
      const id = Number(event.operation.source?.id);
      const zone = event.operation.target?.id;
      if (zone === 'pin-zone' || zone === 'unpin-zone') {
        const pin = zone === 'pin-zone';
        const next = (preview || projects.map(project => project.id)).filter(row => row !== id);
        next.splice(pin ? 0 : next.length, 0, id);
        lastMove.current = { projectId: id, targetId: null, side: DropSide.Before, favorite: pin };
        setFavorite(pin); setPreview(next); return;
      }
      const target = projects.find(project => project.id === Number(event.operation.target?.id));
      if (!target || target.id === id) return;
      const current = preview || projects.map(project => project.id);
      const next = move(current, event);
      const side = next.indexOf(id) < next.indexOf(target.id) ? DropSide.Before : DropSide.After;
      lastMove.current = { projectId: id, targetId: target.id, side, favorite: target.favoritedAt > 0 };
      setFavorite(target.favoritedAt > 0); setPreview(next);
    }}
    onDragEnd={event => {
      const result = lastMove.current;
      setDragId(null); setPreview(null); lastMove.current = null;
      if (!event.canceled && event.operation.target && result && !disabled) onMove(result);
    }}>
    <div onKeyDown={event => {
      if (disabled || !event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key) || !(event.target instanceof Element)) return;
      const handle = event.target.closest<HTMLElement>('[data-project-drag-handle]');
      const index = projects.findIndex(project => project.id === Number(handle?.dataset.projectDragHandle));
      const neighbor = projects[index + (event.key === 'ArrowUp' ? -1 : 1)];
      if (index < 0 || !neighbor) return;
      event.preventDefault(); onMove({ projectId: projects[index].id, targetId: neighbor.id, side: event.key === 'ArrowUp' ? DropSide.Before : DropSide.After, favorite: neighbor.favoritedAt > 0 });
    }}>
      {dragId !== null && !projects.some(project => project.favoritedAt > 0) && <EmptyPinSlot favorite />}
      {rows.map((project, index) => <SortableProject key={project.id} project={project} index={index} disabled={disabled} reducedMotion={reducedMotion} hint={hint}>{children(project)}</SortableProject>)}
      {dragId !== null && projects.every(project => project.favoritedAt > 0) && <EmptyPinSlot favorite={false} />}
    </div>
    <DragOverlay dropAnimation={reducedMotion ? null : { duration: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {source => {
        const project = projects.find(project => project.id === Number(source.id));
        return project ? <div inert aria-hidden="true" className="pointer-events-none rounded-lg border border-divider bg-navigation shadow-lg">{children(project)}</div> : null;
      }}
    </DragOverlay>
    <span role="status" className="sr-only">{dragged ? `${dragged.alias || dragged.path} 이동 중. ${hint}. Esc로 취소할 수 있습니다.` : ''}</span>
  </DragDropProvider>;
}
