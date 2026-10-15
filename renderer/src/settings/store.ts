import { readLegacySettings } from '../../../src/legacy-device-settings.mjs';
import { settingsCopy } from '../../../src/locales/settings.ko.mjs';
import { useStore } from 'zustand';
import toast from 'react-hot-toast';
import { createDeviceSettingsStore, type DeviceSettingsState } from '../../../src/device-settings-store.mjs';
import { type SettingsPatch } from '../../../src/device-settings.mjs';
import { desktopApi } from '../api';
import { queryClient } from '../query-client';

export const settingsStore = createDeviceSettingsStore({
  load: async () => {
    const record = await queryClient.fetchQuery({ queryKey: ['desktop', 'settings'], queryFn: desktopApi.settings, staleTime: 0 });
    return record.revision ? record : desktopApi.updateSettings(readLegacySettings(localStorage), true);
  },
  save: patch => queryClient.getMutationCache().build(queryClient, { mutationFn: (value: SettingsPatch) => desktopApi.updateSettings(value), retry: false }).execute(patch),
  onError: () => toast.error(settingsCopy.settingsUnavailable),
});
export const useSettingsStore = <T,>(selector: (state: DeviceSettingsState) => T) => useStore(settingsStore, selector);
export const updateSettings = (patch: SettingsPatch) => settingsStore.getState().update(patch);
