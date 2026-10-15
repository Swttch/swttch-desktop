const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { openStore } = require('../src/store.cjs');

test('device settings survive reopening, merge independent changes and reject invalid patches atomically', t => {
  const home = mkdtempSync(join(tmpdir(), 'swttch-settings-'));
  let store = openStore(home);
  t.after(() => { store.close(); rmSync(home, { recursive: true, force: true }); });
  assert.ok(store.settings, 'the local backend must own a device settings repository');
  assert.equal(store.settings.read().revision, 0);
  const first = store.settings.patch({ clock: { seconds: true }, sidebar: { width: 300 } });
  assert.equal(first.revision, 1);
  store.settings.patch({ clock: { hourCycle: '24' } });
  assert.throws(() => store.settings.patch({ clock: { seconds: false }, sidebar: { width: -1 } }));
  assert.throws(() => store.settings.patch({ clock: { futureKey: true } }));
  assert.throws(() => store.settings.patch({ clock: { timeZone: 'Bad/Zone' } }));
  store.close(); store = openStore(home);
  assert.deepEqual(store.settings.read().values.clock, { display: 'date-time', hourCycle: '24', seconds: true, weekday: true, dateFormat: 'long', timeZone: '' });
  assert.equal(store.settings.read().values.sidebar.width, 300);
  assert.equal(store.settings.read().revision, 2);
  const migrated = store.settings.initialize({ clock: { seconds: false } });
  assert.equal(migrated.values.clock.seconds, true, 'legacy client settings must never overwrite existing device settings');
});

test('the global settings store preserves newer pending edits, ignores stale notifications and rolls back only failed writes', async () => {
  const { createDeviceSettingsStore } = await import('../src/device-settings-store.mjs');
  const { defaultSettings, mergeSettings } = await import('../src/device-settings.mjs');
  let confirmed = { revision: 1, values: defaultSettings() };
  const writes = [], errors = [];
  const store = createDeviceSettingsStore({
    load: async () => confirmed,
    save: patch => new Promise((resolve, reject) => writes.push({ patch, resolve, reject })),
    onError: error => errors.push(error.message),
  });
  await store.getState().load();
  const first = store.getState().update({ clock: { seconds: true } });
  const second = store.getState().update({ sidebar: { width: 350 } });
  assert.equal(store.getState().values.clock.seconds, true);
  assert.equal(store.getState().values.sidebar.width, 350);
  await new Promise(resolve => setImmediate(resolve));
  confirmed = { revision: 2, values: mergeSettings(confirmed.values, { clock: { seconds: true } }) };
  store.getState().receive(confirmed);
  assert.equal(store.getState().values.sidebar.width, 350, 'SSE must preserve pending local edits');
  writes[0].resolve(confirmed);
  await first;
  await new Promise(resolve => setImmediate(resolve));
  writes[1].reject(new Error('disk full'));
  await second;
  assert.equal(store.getState().values.clock.seconds, true);
  assert.equal(store.getState().values.sidebar.width, 224);
  store.getState().receive({ revision: 1, values: defaultSettings() });
  assert.equal(store.getState().values.clock.seconds, true);
  assert.deepEqual(errors, ['disk full']);
});

test('legacy migration preserves valid groups even when another legacy value is malformed', async () => {
  const { readLegacySettings } = await import('../src/legacy-device-settings.mjs');
  const values = new Map([
    ['swttch-status-clock-settings', '{broken'],
    ['swttch-sidebar-width', '320'],
    ['swttch-sidebar-sections-v1', JSON.stringify({ favorites: false, projects: true, injected: true })],
  ]);
  const migrated = readLegacySettings({ getItem: key => values.get(key) || null });
  assert.deepEqual(migrated.sidebar, { width: 320 });
  assert.deepEqual(migrated.sidebarSections, { favorites: false, projects: true });
  values.set('swttch-status-clock-settings', JSON.stringify({ seconds: true, timeZone: 'Invalid/Zone', extra: 'ignored' }));
  assert.deepEqual(readLegacySettings({ getItem: key => values.get(key) || null }).clock, { seconds: true });
});
