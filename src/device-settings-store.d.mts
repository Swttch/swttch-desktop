import type { StoreApi } from 'zustand/vanilla';
import type { DeviceSettings, SettingsPatch, SettingsRecord } from './device-settings.mjs';
export type DeviceSettingsState = { values: DeviceSettings; revision: number; ready: boolean; error: string | null; receive(record: SettingsRecord): void; load(): Promise<void>; update(patch: SettingsPatch): Promise<void> };
export function createDeviceSettingsStore(transport: { load(): Promise<SettingsRecord>; save(patch: SettingsPatch): Promise<SettingsRecord>; onError(error: Error): void }): StoreApi<DeviceSettingsState>;
