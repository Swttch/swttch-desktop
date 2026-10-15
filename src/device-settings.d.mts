export type ClockSettings = { display: 'time' | 'date-time'; hourCycle: '12' | '24'; seconds: boolean; weekday: boolean; dateFormat: 'long' | 'short'; timeZone: string };
export type DeviceSettings = { clock: ClockSettings; sidebar: { width: number; collapsed: boolean }; sidebarSections: { favorites: boolean; activeSessions: boolean; projects: boolean } };
export type SettingsPatch = { clock?: Partial<ClockSettings>; sidebar?: Partial<DeviceSettings['sidebar']>; sidebarSections?: Partial<DeviceSettings['sidebarSections']> };
export type SettingsRecord = { revision: number; values: DeviceSettings };
export function defaultSettings(): DeviceSettings;
export function mergeSettings(current: DeviceSettings, patch: SettingsPatch): DeviceSettings;
