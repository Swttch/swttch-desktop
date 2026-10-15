const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');

test('desktop supports the exact plugin interface languages and resolves explicit and automatic direction', async () => {
  const { interfaceLanguages, interfaceLocale, interfaceDirection } = await import('../src/interface-languages.mjs');
  const plugin = readFileSync(join(__dirname, '../../../webview/src/i18n/languageMap.ts'), 'utf8');
  const locales = [...plugin.match(/SUPPORTED_LOCALES = \[([^\]]+)/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(interfaceLanguages.map(item => item.locale), locales);
  assert.equal(interfaceLocale('korean'), 'ko');
  assert.equal(interfaceDirection('arabic', 'auto'), 'rtl');
  assert.equal(interfaceDirection('persian', 'ltr'), 'ltr');
  assert.equal(interfaceDirection('english', 'rtl'), 'rtl');
});

test('plugin values seed missing fields once, preserve independent desktop edits and survive reopening', async t => {
  const { openStore } = require('../src/store.cjs');
  const home = mkdtempSync(join(tmpdir(), 'swttch-interface-'));
  let store = openStore(home);
  t.after(() => { store.close(); rmSync(home, { recursive: true, force: true }); });
  assert.equal(store.settings.needsPluginSettings(), true);
  const plugin = { uiLanguage: 'japanese', uiDirection: 'rtl' };
  store.settings.seedPluginSettings(plugin);
  store.settings.initialize({ clock: { seconds: true } });
  assert.equal(store.settings.needsPluginSettings(), false);
  assert.equal(store.settings.read().values.general.language, 'japanese');
  assert.equal(store.settings.read().values.general.direction, 'rtl');
  store.settings.patch({ general: { language: 'french' } });
  store.close(); store = openStore(home);
  store.settings.seedPluginSettings({ uiLanguage: 'korean', uiDirection: 'ltr' });
  assert.deepEqual(store.settings.read().values.general, { language: 'french', direction: 'rtl' });
  assert.equal(store.settings.read().values.clock.seconds, true);
  assert.deepEqual(plugin, { uiLanguage: 'japanese', uiDirection: 'rtl' });
  assert.throws(() => store.settings.patch({ general: { language: 'unknown' } }));
  assert.throws(() => store.settings.patch({ general: { direction: 'unknown' } }));
});

test('an existing device record receives new plugin-backed fields without resetting other settings', async t => {
  const { openStore } = require('../src/store.cjs');
  const { deviceSettings } = require('../src/database/schema.cjs');
  const { openDatabase } = require('../src/database/connection.cjs');
  const home = mkdtempSync(join(tmpdir(), 'swttch-old-interface-'));
  const connection = openDatabase(home);
  connection.db.insert(deviceSettings).values({ id: 'device', revision: 5, values: { clock: { seconds: true }, general: { language: 'german', direction: null } } }).run();
  connection.close();
  const store = openStore(home);
  t.after(() => { store.close(); rmSync(home, { recursive: true, force: true }); });
  store.settings.seedPluginSettings({ uiLanguage: 'arabic', uiDirection: 'rtl' });
  const record = store.settings.read();
  assert.equal(record.values.general.language, 'german');
  assert.equal(record.values.general.direction, 'rtl');
  assert.equal(record.values.clock.seconds, true);
  const revision = record.revision;
  store.settings.seedPluginSettings({ uiLanguage: 'korean', uiDirection: 'ltr' });
  assert.equal(store.settings.read().revision, revision, 'no repeated migration or settings notification');
});

test('i18next resolves complete settings catalogs for every supported locale and notifies language subscribers', async () => {
  const { i18n } = await import('../src/interface-i18n.mjs');
  const { interfaceCatalogs } = await import('../src/interface-copy.mjs');
  const { interfaceLanguages } = await import('../src/interface-languages.mjs');
  const expected = Object.keys(interfaceCatalogs.en).sort();
  const seen = [];
  const listener = language => seen.push(language);
  i18n.on('languageChanged', listener);
  try {
    for (const { locale } of interfaceLanguages) {
      assert.deepEqual(Object.keys(interfaceCatalogs[locale]).sort(), expected, locale);
      await i18n.changeLanguage(locale);
      for (const key of expected) {
        assert.equal(typeof i18n.t(key), 'string');
        assert.notEqual(i18n.t(key), key, `${locale}: ${key}`);
      }
    }
    assert.ok(seen.includes('ar') && seen.includes('ko'));
  } finally { i18n.off('languageChanged', listener); await i18n.changeLanguage('en'); }
});
