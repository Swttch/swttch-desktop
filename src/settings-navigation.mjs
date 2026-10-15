import { settingsCopy as copy } from './locales/settings.ko.mjs';
import { PATH } from './paths.mjs';
export function getSettingsItems(copy) {
const pending = (label, icon, group = copy.personal) => ({ label, icon, group, disabled: true, description: '' });
return Object.freeze([
  { path: PATH.SETTINGS_GENERAL, label: copy.general, group: copy.personal, icon: 'settings', description: `${copy.clockDisplay} ${copy.dateTime} ${copy.clockTimeZone} ${copy.workspace}` },
  pending(copy.notifications, 'bell'), pending(copy.importData, 'download'), pending(copy.profile, 'user'), pending(copy.appearance, 'sun'),
  { path: PATH.ACCOUNT_SETTINGS, label: copy.account, group: copy.personal, icon: 'account', description: `${copy.profile} ${copy.scordiMember}` },
  pending(copy.archivedChats, 'archive'), pending(copy.parentalControls, 'account'), pending(copy.trustedContact, 'account'), pending(copy.voiceStyle, 'voice'), pending(copy.storage, 'folder'), pending(copy.configuration, 'config'), pending(copy.personalization, 'gauge'), pending(copy.miniPets, 'pet'),
  { path: PATH.SETTINGS_SHORTCUTS, label: copy.shortcuts, group: copy.personal, icon: 'keyboard', description: `${copy.shortcuts} ${copy.help}` },
  { path: PATH.SETTINGS_PLAN, label: copy.planBilling, group: copy.personal, icon: 'gauge', description: copy.planBilling },
  pending(copy.dataControls, 'shield'),
  pending(copy.plugins, 'plugin', copy.integrations), pending(copy.passwords, 'key', copy.integrations), pending(copy.computerUse, 'computer', copy.integrations), pending(copy.computerHistory, 'history', copy.integrations), pending(copy.appshots, 'scan', copy.integrations), pending(copy.browser, 'browser', copy.integrations),
  { path: PATH.SETTINGS_AGENT, label: copy.chatSettings, group: copy.agentGroup, icon: 'agent', description: `${copy.appearance} ${copy.notifications} ${copy.agentAccounts} Claude` },
  { path: PATH.SETTINGS_ABOUT, label: copy.about, group: copy.information, icon: 'info', description: `Swttch ${copy.version} ${copy.runtime}` },
]);
}
export const settingsItems = getSettingsItems(copy);
export function findSettings(query, catalog = copy) {
  const words = query.trim().toLowerCase().split(/\s+/);
  return getSettingsItems(catalog).filter(item => words.every(word => `${item.label} ${item.group} ${item.description}`.toLowerCase().includes(word)));
}
export function resolveSettingsPath(path) {
  return settingsItems.some(item => item.path && item.path === path) ? path : PATH.SETTINGS_GENERAL;
}
export function isShellSettingsRequest(requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  return (url.pathname === PATH.SETTINGS || url.pathname.startsWith(PATH.SETTINGS + '/')) && !url.searchParams.has('is_desktop') && !url.searchParams.has('workingDir') && !url.searchParams.has('pair');
}
