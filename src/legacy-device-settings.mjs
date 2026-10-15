import { defaultSettings, mergeSettings } from './device-settings.mjs';

export function readLegacySettings(storage) {
  const patch = {};
  const read = key => { try { return storage.getItem(key); } catch { return null; } };
  for (const [group, key] of [['clock', 'swttch-status-clock-settings'], ['sidebarSections', 'swttch-sidebar-sections-v1']]) {
    let fields;
    try { fields = JSON.parse(read(key) || '{}'); } catch { continue; }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) continue;
    if (group === 'clock' && !fields.display && read('swttch-status-clock-display') === 'time') fields.display = 'time';
    for (const [name, value] of Object.entries(fields)) {
      const candidate = { [group]: { ...patch[group], [name]: value } };
      try { mergeSettings(defaultSettings(), candidate); patch[group] = candidate[group]; } catch { /* Preserve valid fields and ignore obsolete or malformed values. */ }
    }
  }
  const width = Number(read('swttch-sidebar-width'));
  if (Number.isFinite(width) && width > 0) patch.sidebar = { width: Math.max(196, Math.min(480, width)) };
  return patch;
}
