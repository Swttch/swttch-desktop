import { settingsStore, useSettingsStore, updateSettings } from './settings/store';

export enum SidebarSectionName { Favorites = 'favorites', ActiveSessions = 'activeSessions', Projects = 'projects' }
export function useSidebarState() {
  const expanded = useSettingsStore(state => state.values.sidebarSections);
  const toggle = (section: SidebarSectionName) => { void updateSettings({ sidebarSections: { [section]: !settingsStore.getState().values.sidebarSections[section] } }); };
  return { expanded, toggle };
}
