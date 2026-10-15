import { t, useShellTranslation } from './i18n';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from './query-client';
import { SidebarSectionName, useSidebarState } from './SidebarState';

export function SidebarSection({ name, title, count, action, children }: { name: SidebarSectionName; title: string; count: number; action?: ReactNode; children: ReactNode }) { useShellTranslation();
  const { expanded, toggle } = useSidebarState(), open = expanded[name], id = `sidebar-section-${name}`;
  const queryClient = useQueryClient();
  const toggleSection = () => {
    toggle(name);
    if (open) return;
    if (name === SidebarSectionName.Projects) {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY.projects });
    } else {
      void queryClient.invalidateQueries({ queryKey: [...QUERY_KEY.sessionLists, name === SidebarSectionName.Favorites ? 'favorites' : 'active'], exact: true });
    }
  };
  return <section aria-label={title} className="mb-5">
    <div className="mb-2 flex items-center justify-between px-2">
      <h2 className="text-xs font-medium text-muted"><button type="button" aria-expanded={open} aria-controls={id} aria-label={`${title} ${open ? t("Collapse") : t("Expand")}`} onClick={toggleSection} className="flex items-center gap-1 rounded py-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-blue-400">
        <span>{title}</span><span className="tabular-nums">{count}</span><svg aria-hidden="true" className={`size-3 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-90' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 4 4 4-4 4" /></svg>
      </button></h2>{action}
    </div>
    <div id={id} className={`sidebar-session-collapse ${open ? 'is-expanded' : ''}`} aria-hidden={!open} inert={!open}><div className="min-h-0 overflow-hidden">{children}</div></div>
  </section>;
}
