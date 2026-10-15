import { settingsCopy as copy } from './locales/settings.ko.mjs';
import { PATH } from './paths.mjs';
const pending = (label, icon, group = copy.personal) => ({ label, icon, group, disabled: true, description: '' });
export const settingsItems = Object.freeze([
  { path: PATH.SETTINGS_GENERAL, label: copy.general, group: copy.personal, icon: 'settings', description: '시계 날짜 시간대 작업 화면' },
  pending(copy.notifications, 'bell'), pending(copy.importData, 'download'), pending(copy.profile, 'user'), pending(copy.appearance, 'sun'),
  { path: PATH.ACCOUNT_SETTINGS, label: copy.account, group: copy.personal, icon: 'account', description: '회원 프로필 로그인' },
  pending(copy.archivedChats, 'archive'), pending(copy.parentalControls, 'account'), pending(copy.trustedContact, 'account'), pending(copy.voiceStyle, 'voice'), pending(copy.storage, 'folder'), pending(copy.configuration, 'config'), pending(copy.personalization, 'gauge'), pending(copy.miniPets, 'pet'),
  { path: PATH.SETTINGS_SHORTCUTS, label: copy.shortcuts, group: copy.personal, icon: 'keyboard', description: '키보드 패널 탭 도움말' },
  { path: PATH.SETTINGS_PLAN, label: copy.planBilling, group: copy.personal, icon: 'gauge', description: '구독 플랜 결제' },
  pending(copy.dataControls, 'shield'),
  pending(copy.plugins, 'plugin', copy.integrations), pending(copy.passwords, 'key', copy.integrations), pending(copy.computerUse, 'computer', copy.integrations), pending(copy.computerHistory, 'history', copy.integrations), pending(copy.appshots, 'scan', copy.integrations), pending(copy.browser, 'browser', copy.integrations),
  { path: PATH.SETTINGS_AGENT, label: copy.chatSettings, group: copy.agentGroup, icon: 'agent', description: '외관 알림 연결 계정 모델 권한 실행 환경 Claude' },
  { path: PATH.SETTINGS_ABOUT, label: copy.about, group: copy.information, icon: 'info', description: 'Swttch 버전 실행 환경' },
]);
export function findSettings(query) {
  const words = query.trim().toLowerCase().split(/\s+/);
  return settingsItems.filter(item => words.every(word => `${item.label} ${item.group} ${item.description}`.toLowerCase().includes(word)));
}
export function resolveSettingsPath(path) {
  return settingsItems.some(item => item.path && item.path === path) ? path : PATH.SETTINGS_GENERAL;
}
export function isShellSettingsRequest(requestUrl) {
  const url = new URL(requestUrl, 'http://localhost');
  return (url.pathname === PATH.SETTINGS || url.pathname.startsWith(PATH.SETTINGS + '/')) && !url.searchParams.has('is_desktop') && !url.searchParams.has('workingDir') && !url.searchParams.has('pair');
}
