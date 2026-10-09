import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export enum SidebarSectionName { ActiveSessions = 'activeSessions', Projects = 'projects' }
const STORAGE_KEY = 'swttch-sidebar-sections-v1';
const defaults = { [SidebarSectionName.ActiveSessions]: true, [SidebarSectionName.Projects]: true };
type Sections = typeof defaults;
const SidebarState = createContext<{ expanded: Sections; toggle: (section: SidebarSectionName) => void } | null>(null);
function readSections(): Sections {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<Sections> | null;
    return { activeSessions: typeof saved?.activeSessions === 'boolean' ? saved.activeSessions : true, projects: typeof saved?.projects === 'boolean' ? saved.projects : true };
  } catch { return defaults; }
}
export function SidebarStateProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(readSections);
  const toggle = useCallback((section: SidebarSectionName) => setExpanded(previous => ({ ...previous, [section]: !previous[section] })), []);
  const value = useMemo(() => ({ expanded, toggle }), [expanded, toggle]);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded)); } catch { /* Keep the in-memory preference when storage is unavailable. */ } }, [expanded]);
  useEffect(() => {
    const update = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) setExpanded(readSections()); };
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);
  return <SidebarState.Provider value={value}>{children}</SidebarState.Provider>;
}
export function useSidebarState() {
  const state = useContext(SidebarState);
  if (!state) throw new Error('SidebarStateProvider is missing');
  return state;
}
