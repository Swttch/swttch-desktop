import { t, useShellTranslation } from './i18n';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import tippy from 'tippy.js';
import type { Project } from './desktop';
import { useRouter } from './router';
import { PATH, replacePathParams } from './routes';
import { sessionOrigin } from './session-utils';
import { Tooltip } from './Tooltip';
export function FolderTreeIcon() { useShellTranslation();
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 3v13h5M4 8h5M10 5h4l2 2h5v6H10zM10 16h4l2 2h5v4H10z" /></svg>;
}
export function NestedProjectsMenu({ projects, root, disabled }: { projects: Project[]; root: string; disabled: boolean }) { useShellTranslation();
  const anchor = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (!anchor.current) return;
    const element = document.createElement('div'); setContainer(element);
    const instance = tippy(anchor.current, { content: element, trigger: 'click', interactive: true, appendTo: () => document.body, theme: 'swttch', placement: 'bottom-end', arrow: false, maxWidth: 420,
      onShow: () => anchor.current?.setAttribute('aria-expanded', 'true'), onHide: () => anchor.current?.setAttribute('aria-expanded', 'false'),
    });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && instance.state.isVisible) { instance.hide(); anchor.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => { instance.destroy(); document.removeEventListener('keydown', escape); };
  }, []);
  const sorted = [...projects].sort((a, b) => a.path.localeCompare(b.path));
  return <><Tooltip content={t("Show subprojects")} delay={0}><button ref={anchor} className="secondary-button flex items-center gap-2 px-2! text-xs" disabled={disabled} aria-label={t("Subprojects: {{count}}", { count: projects.length })} aria-haspopup="menu" aria-expanded="false"><FolderTreeIcon /><span className="tabular-nums">{projects.length}</span><svg aria-hidden="true" width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="m2 4 4 4 4-4" /></svg></button></Tooltip>{container && createPortal(<div role="menu" aria-label={t("Subprojects")} className="max-h-[min(24rem,60vh)] w-[min(24rem,calc(100vw-3rem))] overflow-y-auto py-1"><p className="px-2 py-2 text-xs text-muted">{t("Subproject ·")}{projects.length}{t("items")}</p>{sorted.length ? sorted.map(project => <button key={project.id} role="menuitem" className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-start hover:bg-hover" onClick={() => router.push(replacePathParams(PATH.PROJECT, { projectId: project.id }))}><span className="mt-0.5 shrink-0"><FolderTreeIcon /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm">{project.alias || project.path.split(/[\\/]/).filter(Boolean).pop()}</span><span className="mt-1 block truncate text-xs text-muted">{sessionOrigin(project.path, root)}</span></span></button>) : <p className="px-2 py-4 text-sm text-muted">{t("No registered subprojects.")}</p>}</div>, container)}</>;
}
