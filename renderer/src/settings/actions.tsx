import { createContext, useContext } from 'react';
export const SettingsActionsContext = createContext<{ onReturn(): void; onHelp(): void; onSidebar(): void } | null>(null);
export function useSettingsActions() {
  const actions = useContext(SettingsActionsContext);
  if (!actions) throw new Error('Settings actions provider is missing');
  return actions;
}
