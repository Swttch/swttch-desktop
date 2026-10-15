import { t, useShellTranslation } from './i18n';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import tippy from 'tippy.js';
import { SessionActivity } from './desktop';
import { ACTIVITY_LABEL } from './SessionStatus';
import { Tooltip } from './Tooltip';
export enum TabFilter { Open = "Open tabs", Closed = "Closed tab" }
export const STATUS_FILTERS = [SessionActivity.Awaiting, SessionActivity.Running, SessionActivity.Done];
export function SessionFilters({ statuses, tabs, counts, onStatus, onTab, onClear }: {
  statuses: SessionActivity[]; tabs: TabFilter[]; counts: Record<string, number>;
  onStatus: (value: SessionActivity) => void; onTab: (value: TabFilter) => void; onClear: () => void;
}) { useShellTranslation();
  const anchor = useRef<HTMLButtonElement>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!anchor.current) return;
    const element = document.createElement('div'); setContainer(element);
    const instance = tippy(anchor.current, { content: element, trigger: 'click', interactive: true, appendTo: () => document.body, placement: 'bottom-end', theme: 'swttch', arrow: false, maxWidth: 280, onShow: () => { anchor.current?.setAttribute('aria-expanded', 'true'); }, onHide: () => { anchor.current?.setAttribute('aria-expanded', 'false'); } });
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && instance.state.isVisible) { instance.hide(); anchor.current?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => { instance.destroy(); document.removeEventListener('keydown', escape); };
  }, []);
  const option = (label: string, checked: boolean, onClick: () => void) => <button key={label} role="menuitemcheckbox" aria-checked={checked} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm hover:bg-hover" onClick={onClick}><span className="w-3">{checked ? '✓' : ''}</span><span className="flex-1">{t(label)}</span><span className="text-xs text-muted">{counts[label] || 0}</span></button>;
  return <><Tooltip content={t("Session filter")} delay={0}><button ref={anchor} aria-label={t("Session filter")} aria-haspopup="menu" aria-expanded="false" className={`icon-button ${statuses.length || tabs.length ? 'bg-selected text-foreground' : ''}`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M6 12h12M9 18h6" /></svg></button></Tooltip>{container && createPortal(<div role="menu" aria-label={t("Session filter")} className="w-56 py-1"><p className="px-3 py-2 text-xs text-muted">{t("Activity status")}</p>{STATUS_FILTERS.map(status => option(ACTIVITY_LABEL[status], statuses.includes(status), () => onStatus(status)))}<div className="my-2 border-t border-divider" /><p className="px-3 py-2 text-xs text-muted">{t("Tab")}</p>{Object.values(TabFilter).map(tab => option(tab, tabs.includes(tab), () => onTab(tab)))}<div className="my-2 border-t border-divider" /><button role="menuitem" className="w-full rounded-md px-3 py-2 text-start text-sm hover:bg-hover" onClick={onClear}>{t("Reset filters")}</button></div>, container)}</>;
}
