import { createElement } from 'react';
import { SettingsPropagationNotice } from '../SettingsPropagationNotice';
import { readLegacySettings } from '../../../src/legacy-device-settings.mjs';
import { i18n } from '../../../src/interface-i18n.mjs';
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
  save: async patch => {
    const record = await queryClient.getMutationCache().build(queryClient, { mutationFn: (value: SettingsPatch) => desktopApi.updateSettings(value), retry: false }).execute(patch);
    if (record.propagation?.status === 'failed') {
      toast.error(createElement(SettingsPropagationNotice, { onRetry: () => {
        toast.dismiss('plugin-settings-propagation');
        void settingsStore.getState().update({ general: { ...settingsStore.getState().values.general } });
      } }), { id: 'plugin-settings-propagation', duration: Infinity });
    } else if (record.propagation?.status === 'synced') toast.dismiss('plugin-settings-propagation');
    return record;
  },
  onError: () => toast.error(i18n.t('settingsUnavailable')),
});
export const useSettingsStore = <T,>(selector: (state: DeviceSettingsState) => T) => useStore(settingsStore, selector);
export const updateSettings = (patch: SettingsPatch) => settingsStore.getState().update(patch);
