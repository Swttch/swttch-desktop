import { interfaceLanguages } from './interface-languages.mjs';
export const defaultSettings = () => ({ general: { language: 'english', direction: 'auto' }, clock: { display: 'date-time', hourCycle: '12', seconds: false, weekday: true, dateFormat: 'long', timeZone: '' }, sidebar: { width: 224, collapsed: false }, sidebarSections: { favorites: true, activeSessions: true, projects: true } });
const validators = {
  general: { language: v => interfaceLanguages.some(item => item.value === v), direction: v => ['auto', 'ltr', 'rtl'].includes(v) },
  sidebarSections: { favorites: v => typeof v === 'boolean', activeSessions: v => typeof v === 'boolean', projects: v => typeof v === 'boolean' },
  clock: { display: v => ['time', 'date-time'].includes(v), hourCycle: v => ['12', '24'].includes(v), seconds: v => typeof v === 'boolean', weekday: v => typeof v === 'boolean', dateFormat: v => ['long', 'short'].includes(v), timeZone: v => { if (typeof v !== 'string') return false; try { new Intl.DateTimeFormat('en', { timeZone: v || undefined }); return true; } catch { return false; } } },
  sidebar: { width: v => Number.isFinite(v) && v >= 196 && v <= 480, collapsed: v => typeof v === 'boolean' },
};
export function mergeSettings(current, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Invalid settings patch');
  const next = structuredClone(current);
  for (const [group, fields] of Object.entries(patch)) {
    if (!Object.hasOwn(validators, group) || !fields || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('Invalid settings group');
    for (const [key, value] of Object.entries(fields)) {
      if (!Object.hasOwn(validators[group], key) || !validators[group][key](value)) throw new Error(`Invalid setting: ${group}.${key}`);
      next[group][key] = value;
    }
  }
  return next;
}
