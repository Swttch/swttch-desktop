const { eq } = require('drizzle-orm');
const { deviceSettings } = require('./schema.cjs');
const { defaultSettings, mergeSettings } = require('../device-settings.mjs');
const { missingPluginSettings, settingsWithPluginDefaults } = require('../plugin-settings-migration.mjs');
class SettingsRepository {
  constructor(db, pluginSettings = {}) { this.db = db; this.pluginSettings = pluginSettings; }
  needsPluginSettings() {
    const row = this.db.select().from(deviceSettings).where(eq(deviceSettings.id, 'device')).get();
    return Object.keys(missingPluginSettings(row?.values || {}, {})).length > 0;
  }
  seedPluginSettings(pluginSettings) {
    this.pluginSettings = pluginSettings;
    return this.db.transaction(tx => {
      const row = tx.select().from(deviceSettings).where(eq(deviceSettings.id, 'device')).get();
      if (!row) return;
      const patch = missingPluginSettings(row.values, pluginSettings);
      if (!Object.keys(patch).length) return;
      const values = settingsWithPluginDefaults(row.values, pluginSettings);
      tx.update(deviceSettings).set({ revision: row.revision + 1, values }).where(eq(deviceSettings.id, 'device')).run();
    }, { behavior: 'immediate' });
  }
  read() {
    const row = this.db.select().from(deviceSettings).where(eq(deviceSettings.id, 'device')).get();
    return row ? { revision: row.revision, values: settingsWithPluginDefaults(row.values, this.pluginSettings) } : { revision: 0, values: mergeSettings(defaultSettings(), missingPluginSettings({}, this.pluginSettings)) };
  }
  initialize(patch) { return this.write(patch, true); }
  patch(patch) { return this.write(patch, false); }
  write(patch, initialize) {
    return this.db.transaction(tx => {
      const repository = new SettingsRepository(tx, this.pluginSettings);
      const current = repository.read();
      if (initialize && current.revision) return current;
      const next = { revision: current.revision + 1, values: mergeSettings(current.values, patch) };
      tx.insert(deviceSettings).values({ id: 'device', ...next }).onConflictDoUpdate({ target: deviceSettings.id, set: next }).run();
      return next;
    }, { behavior: 'immediate' });
  }
}
module.exports = { SettingsRepository };
