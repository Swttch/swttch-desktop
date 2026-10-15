const { eq } = require('drizzle-orm');
const { deviceSettings } = require('./schema.cjs');
const { defaultSettings, mergeSettings } = require('../device-settings.mjs');
class SettingsRepository {
  constructor(db) { this.db = db; }
  read() {
    const row = this.db.select().from(deviceSettings).where(eq(deviceSettings.id, 'device')).get();
    return row ? { revision: row.revision, values: mergeSettings(defaultSettings(), row.values) } : { revision: 0, values: defaultSettings() };
  }
  initialize(patch) { return this.write(patch, true); }
  patch(patch) { return this.write(patch, false); }
  write(patch, initialize) {
    return this.db.transaction(tx => {
      const repository = new SettingsRepository(tx);
      const current = repository.read();
      if (initialize && current.revision) return current;
      const next = { revision: current.revision + 1, values: mergeSettings(current.values, patch) };
      tx.insert(deviceSettings).values({ id: 'device', ...next }).onConflictDoUpdate({ target: deviceSettings.id, set: next }).run();
      return next;
    }, { behavior: 'immediate' });
  }
}
module.exports = { SettingsRepository };
