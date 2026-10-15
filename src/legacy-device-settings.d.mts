import type { SettingsPatch } from './device-settings.mjs';
export function readLegacySettings(storage: Pick<Storage, 'getItem'>): SettingsPatch;
