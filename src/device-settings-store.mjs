import { createStore } from 'zustand/vanilla';
import { defaultSettings, mergeSettings } from './device-settings.mjs';

// Rebase optimistic writes over the newest confirmed backend snapshot.
export function createDeviceSettingsStore({ load, save, onError }) {
  let confirmed = { revision: -1, values: defaultSettings() };
  const pending = [];
  let loading;
  let chain = Promise.resolve();
  const store = createStore((set, get) => {
    const publish = () => set({ values: pending.reduce((values, item) => mergeSettings(values, item.patch), confirmed.values), revision: confirmed.revision });
    return {
      values: defaultSettings(), revision: -1, ready: false, error: null,
      receive(record) { if (record.revision <= confirmed.revision) return; confirmed = record; publish(); set({ ready: true, error: null }); },
      load() {
        if (!loading) loading = load().then(record => { get().receive(record); }).catch(error => { set({ error: error.message }); onError(error); loading = undefined; });
        return loading;
      },
      update(patch) {
        mergeSettings(get().values, patch);
        const item = { patch };
        pending.push(item); publish();
        chain = chain.then(async () => {
          try {
            await get().load();
            if (!get().ready) throw new Error('Settings are unavailable');
            const record = await save(patch);
            get().receive(record);
          } catch (error) { set({ error: error.message }); onError(error); }
          finally { pending.splice(pending.indexOf(item), 1); publish(); }
        });
        return chain;
      },
    };
  });
  return store;
}
