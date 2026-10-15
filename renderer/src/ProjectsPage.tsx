import { t, useShellTranslation } from './i18n';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { desktopApi } from './api';
import { ProjectOrderList } from './projects/ProjectOrderList';
import type { ProjectMove } from './projects/projectOrder';
import { queryClient, QUERY_KEY } from './query-client';
import { ProjectDialog } from './ProjectDialog';
import { Tooltip } from './Tooltip';
import type { Project } from './desktop';
import { projectBadgeStyle, projectInitials } from './projects/projectBadge';
import { SortOrder, sortProjects } from './projects/projectSort';

const nameOf = (project: Project) => project.alias || project.path.split(/[\\/]/).filter(Boolean).pop() || project.path;
const realNameOf = (project: Project) => project.path.split(/[\\/]/).filter(Boolean).pop() || project.path;
const abbreviate = (path: string, home: string) => path === home ? '~' : path.startsWith(home + '/') ? '~' + path.slice(home.length) : path;

function MarqueePath({ text }: { text: string }) { useShellTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const span = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);
  useEffect(() => {
    const measure = () => setDistance(Math.max(0, (span.current?.scrollWidth || 0) - (ref.current?.clientWidth || 0)));
    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    measure(); return () => observer.disconnect();
  }, [text]);
  return <div ref={ref} className="project-marquee overflow-hidden text-[0.7692rem] text-muted group-hover:text-foreground"><span ref={span} className="inline-block whitespace-nowrap" style={{ '--scroll-distance': `${distance ? distance + 16 : 0}px`, '--scroll-duration': `${Math.max(2, (distance + 16) / 50)}s` } as CSSProperties}>{text}</span></div>;
}
function Star({ filled }: { filled: boolean }) { useShellTranslation();
  return <svg aria-hidden="true" className="size-3.5" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.56.56 0 011.04 0l2.13 4.98 5.4.46c.5.04.7.66.32.99l-4.1 3.56 1.23 5.28c.11.49-.42.87-.85.61L12 16.6l-4.65 2.78c-.43.26-.96-.12-.85-.61l1.23-5.28-4.1-3.56a.56.56 0 01.32-.99l5.4-.46 2.13-4.98z" /></svg>;
}
function ProjectRow({ project, home, active, disabled, onOpen, onPin, onEdit, onDelete }: { project: Project; home: string; active: boolean; disabled: boolean; onOpen: () => void; onPin: () => void; onEdit: () => void; onDelete: () => void }) { useShellTranslation();
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: 'nearest' }); }, [active]);
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector('button')?.focus();
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !menuRef.current?.contains(event.target) && !menuButton.current?.contains(event.target)) setMenu(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setMenu(false); menuButton.current?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); };
  }, [menu]);
  const pinned = project.favoritedAt > 0;
  return <div ref={ref} data-active={active || undefined} className={`group relative flex items-start rounded-lg transition-colors ${active ? 'bg-hover' : 'hover:bg-hover'}`}>
    <button aria-label={`${t("Open project")}: ${nameOf(project)}`} disabled={disabled} draggable={false} data-project-drag-handle={project.id} style={{ touchAction: "none", userSelect: "none" }} aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-2.5 text-start">
      <span aria-hidden="true" style={projectBadgeStyle(project.path)} className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded text-xs font-semibold">{projectInitials(nameOf(project))}</span>
      <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-1"><span className="truncate text-sm font-medium">{nameOf(project)}</span>
        {project.description && <Tooltip content={project.description}><span tabIndex={0} aria-label={t("Show description")} className="rounded p-1 text-muted hover:text-foreground"><svg className="size-3.5" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 5h16v12H9l-5 3z" /></svg></span></Tooltip>}
        <Tooltip content={pinned ? t("Unpin") : t("Pin to top")}><span role="button" aria-disabled={disabled} tabIndex={disabled ? -1 : 0} aria-pressed={pinned} aria-label={pinned ? t("Unpin") : t("Pin to top")} onClick={event => { event.stopPropagation(); if (!disabled) onPin(); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); if (!disabled) onPin(); } }} className={`rounded p-1 hover:text-foreground ${pinned ? 'text-dev-line' : 'text-muted opacity-0 focus:opacity-100 group-hover:opacity-100 group-data-[active]:opacity-100'}`}><Star filled={pinned} /></span></Tooltip>
      </span>{project.sessionCount > 0 && <span className="shrink-0 text-xs text-muted">{t("Session")}{project.sessionCount}{t("items")}</span>}</span><MarqueePath text={abbreviate(project.path, home)} /></span>
    </button>
    <div className="relative shrink-0 self-center"><Tooltip content={t("Show more")}><button ref={menuButton} disabled={disabled} aria-label={`${nameOf(project)} ${t("Show more")}`} aria-haspopup="menu" aria-expanded={menu} className={`me-1 rounded p-1.5 text-muted hover:bg-selected hover:text-foreground ${menu ? '' : 'opacity-0 focus:opacity-100 group-hover:opacity-100 group-data-[active]:opacity-100'}`} onClick={() => setMenu(value => !value)}><svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg></button></Tooltip>
      {menu && <div ref={menuRef} role="menu" className="absolute top-full right-0 z-20 mt-1 w-48 rounded-lg border border-divider bg-chrome py-1 shadow-lg"><button role="menuitem" className="project-menu-item" onClick={() => { setMenu(false); onEdit(); }}>{t("Edit project")}</button><button role="menuitem" className="project-menu-item" onClick={() => { setMenu(false); void navigator.clipboard.writeText(project.path).then(() => toast.success(t("Path copied"))).catch(() => toast.error(t("Could not copy path"))); }}>{t("Copy path")}</button><div className="my-1 border-t border-divider" /><button role="menuitem" className="project-menu-item text-red-400!" onClick={() => { setMenu(false); onDelete(); }}>{t("Delete")}</button></div>}
    </div>
  </div>;
}
export function ProjectsPage({ disabled, onOpen, onAdd, sort, onSort, onMove }: { disabled: boolean; onOpen: (projectId: number) => void; onAdd: () => void; sort: SortOrder; onSort: (sort: SortOrder) => void; onMove: (move: ProjectMove) => void }) { useShellTranslation();
  const projectQuery = useQuery({ queryKey: QUERY_KEY.projects, queryFn: ({ signal }) => desktopApi.projects(signal) });
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: QUERY_KEY.projects }); void queryClient.invalidateQueries({ queryKey: QUERY_KEY.workspace }); };
  const importMutation = useMutation({ mutationFn: desktopApi.migrateProjects, onSuccess: result => { queryClient.setQueryData(QUERY_KEY.workspace, result.state); refresh(); toast.success(t("Projects: {{imported}} added · {{enriched}} enriched · {{unchanged}} unchanged", result)); }, onError: error => toast.error(error.message) });
  const updateMutation = useMutation({ mutationFn: ({ id, fields }: { id: number; fields: { favorite?: boolean; alias?: string; description?: string } }) => desktopApi.updateProject(id, fields),
    onMutate: async ({ id, fields }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY.projects });
      const previous = queryClient.getQueryData<{ projects: Project[]; homeDir: string }>(QUERY_KEY.projects);
      if (previous && fields.favorite !== undefined) queryClient.setQueryData(QUERY_KEY.projects, { ...previous, projects: previous.projects.map(project => project.id === id ? { ...project, favoritedAt: fields.favorite ? Date.now() : 0 } : project) });
      return { previous };
    },
    onSuccess: (_, variables) => { if (variables.fields.favorite === undefined) { setEditing(null); toast.success(t("Project updated")); } },
    onError: (error, _, context) => { if (context?.previous) queryClient.setQueryData(QUERY_KEY.projects, context.previous); toast.error(error.message); }, onSettled: refresh,
  });
  const deleteMutation = useMutation({ mutationFn: desktopApi.deleteProject, onSuccess: () => { setDeleting(null); refresh(); toast.success(t("Project deleted")); }, onError: error => toast.error(error.message) });
  const needle = query.trim().toLowerCase();
  const home = projectQuery.data?.homeDir || '';
  const projects = (projectQuery.data?.projects || []).filter(project => project.hiddenAt === 0);
  const visible = sortProjects(projects.filter(project => [realNameOf(project), nameOf(project), project.path, abbreviate(project.path, home)].some(text => text.toLowerCase().includes(needle))), sort);
  useEffect(() => { setActiveIndex(index => index < visible.length ? index : 0); }, [visible.length]);
  useEffect(() => { if (projects.length) search.current?.focus(); }, [projects.length]);
  const pending = disabled || importMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  return <main className="projects-page flex h-full min-h-0 flex-col bg-canvas">
    <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col px-6 pt-6">
      <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-36 flex-1"><svg aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg><input ref={search} className="w-full rounded bg-transparent py-2 pe-3 ps-9 text-sm outline-none placeholder:text-muted" aria-label={t("Search projects")} placeholder={t("Search projects")} value={query} onChange={event => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={event => { if (!visible.length || pending) return; if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length); } if (event.key === 'Enter') { event.preventDefault(); onOpen(visible[activeIndex]?.id || visible[0].id); } }} /></div>
        <div role="group" aria-label={t("Sort order")} className="flex rounded-lg bg-navigation p-0.5">{[SortOrder.Recent, SortOrder.Created, SortOrder.Manual].map(order => <button key={order} aria-pressed={sort === order} className={`rounded-md px-3 py-1.5 text-xs ${sort === order ? 'bg-selected text-foreground' : 'text-muted hover:text-foreground'}`} onClick={() => onSort(order)}>{order === SortOrder.Recent ? t("Recently used") : order === SortOrder.Created ? t("Date created") : t("Custom order")}</button>)}</div>
        <button className="secondary-button shrink-0 rounded!" disabled={pending} onClick={onAdd}>{t("Add project")}</button>
      </div><div className="mt-3 border-t border-divider" />
      <div className="flex justify-end py-2"><button className="text-xs text-muted underline underline-offset-4 hover:text-foreground" disabled={pending} onClick={() => importMutation.mutate()}>{t("Import existing projects")}</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto py-3 pe-3">
        {projectQuery.isPending ? <p role="status" className="py-10 text-center text-sm text-muted">{t("Loading projects…")}</p> : projectQuery.isError ? <div role="alert" className="py-10 text-center"><p className="text-sm text-red-400">{t("Could not load projects")}</p><button className="mt-3 text-xs underline" onClick={() => void projectQuery.refetch()}>{t("Retry")}</button></div> : projects.length === 0 ? <div className="mx-auto max-w-md py-10 text-center"><p className="mb-4 text-sm text-muted">{t("No projects available")}</p><button className="w-full rounded-lg border border-dashed border-divider py-2.5 text-sm text-muted hover:text-foreground" disabled={pending} onClick={onAdd}>{t("+ Add project")}</button></div> : visible.length === 0 ? <p className="py-10 text-center text-sm text-muted">{t("No matching projects")}</p> : <ProjectOrderList placeholder projects={visible} disabled={pending} onMove={onMove}>{project => <ProjectRow key={project.path} project={project} home={home} active={visible[activeIndex]?.id === project.id} disabled={pending} onOpen={() => onOpen(project.id)} onPin={() => updateMutation.mutate({ id: project.id, fields: { favorite: project.favoritedAt === 0 } })} onEdit={() => setEditing(project)} onDelete={() => setDeleting(project)} />}</ProjectOrderList>}
      </div>
    </div>
    {(editing || deleting) && <ProjectDialog key={(editing || deleting)!.path} project={(editing || deleting)!} deleting={Boolean(deleting)} pending={updateMutation.isPending || deleteMutation.isPending} onClose={() => { setEditing(null); setDeleting(null); }} onSave={(alias, description) => { if (editing) updateMutation.mutate({ id: editing.id, fields: { alias, description } }); }} onDelete={() => { if (deleting) deleteMutation.mutate(deleting.id); }} />}
  </main>;
}
