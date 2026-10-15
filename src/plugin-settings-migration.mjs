import { defaultSettings, mergeSettings } from './device-settings.mjs';
// Add future counterparts here. Presence in the stored desktop record, not a
// revision number or a default value, decides whether a field may be imported.
const bindings = [
  { group: 'general', key: 'language', pluginKey: 'uiLanguage' },
  { group: 'general', key: 'direction', pluginKey: 'uiDirection' },
];
export function missingPluginSettings(stored, plugin) {
  const patch = {};
  for (const { group, key, pluginKey } of bindings) {
    if (stored?.[group]?.[key] !== undefined && stored[group][key] !== null) continue;
    const fallback = defaultSettings()[group][key];
    let value = plugin?.[pluginKey] ?? fallback;
    try { mergeSettings(defaultSettings(), { [group]: { [key]: value } }); } catch { value = fallback; }
    (patch[group] ??= {})[key] = value;
  }
  return patch;
}
export function settingsWithPluginDefaults(stored, plugin) {
  const values = structuredClone(stored || {});
  for (const [group, fields] of Object.entries(missingPluginSettings(values, plugin))) values[group] = { ...values[group], ...fields };
  return mergeSettings(defaultSettings(), values);
}
