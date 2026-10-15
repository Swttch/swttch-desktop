export type ClockSettings = { display: 'time' | 'date-time'; hourCycle: '12' | '24'; seconds: boolean; weekday: boolean; dateFormat: 'long' | 'short'; timeZone: string };
export type GeneralSettings = { language: string; direction: 'auto' | 'ltr' | 'rtl' };
export type DeviceSettings = { general: GeneralSettings; clock: ClockSettings; sidebar: { width: number; collapsed: boolean }; sidebarSections: { favorites: boolean; activeSessions: boolean; projects: boolean } };
export type SettingsPatch = { general?: Partial<GeneralSettings>; clock?: Partial<ClockSettings>; sidebar?: Partial<DeviceSettings['sidebar']>; sidebarSections?: Partial<DeviceSettings['sidebarSections']> };
export type SettingsPropagation = { status: 'synced' | 'failed'; errors?: { key: string; message: string }[] };
export type SettingsRecord = { propagation?: SettingsPropagation; revision: number; values: DeviceSettings };
export function defaultSettings(): DeviceSettings;
export function mergeSettings(current: DeviceSettings, patch: SettingsPatch): DeviceSettings;
