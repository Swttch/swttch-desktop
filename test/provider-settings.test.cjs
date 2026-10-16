const { test } = require("node:test");
const assert = require("node:assert/strict");
test("Claude provider menu has its own route and preserves the legacy agent route", async () => {
  const { PATH } = await import("../src/paths.mjs");
  const { getSettingsItems, resolveSettingsPath } = await import("../src/settings-navigation.mjs");
  const { settingsCopy } = await import("../src/locales/settings.ko.mjs");
  const item = getSettingsItems(settingsCopy).find(row => row.path === "/settings/providers/claude-code");
  assert.ok(item);
  assert.equal(item.group, "프로바이더");
  assert.equal(item.label, "Claude Code");
  assert.equal(item.icon, "claude");
  assert.equal(resolveSettingsPath(PATH.SETTINGS_AGENT), PATH.SETTINGS_AGENT);
});
test("provider fields distinguish raw scope, inherited values and project shadowing", async () => {
  const { providerField } = await import("../src/provider-settings.mjs");
  const data = { settings: { fastMode: false }, effectiveSettings: { fastMode: true, language: "korean" }, overrides: ["fastMode"] };
  assert.deepEqual(providerField(data, "global", "fastMode", false), { value: false, inherited: false, shadowed: true });
  assert.deepEqual(providerField(data, "project", "language", ""), { value: "korean", inherited: true, shadowed: false });
  assert.equal(providerField(data, "project", "fastMode", true).value, false);
});
test('provider enum choices follow the CLI catalog and preserve a stored custom model', async () => {
  const { providerModelOptions, providerEffortOptions } = await import('../src/provider-settings.mjs');
  const models = [{ value: 'sonnet', displayName: 'Sonnet', supportedEffortLevels: ['low', 'high'] }, { value: 'custom-opus', displayName: 'Opus', supportedEffortLevels: ['medium', 'max'] }];
  assert.deepEqual(providerModelOptions(models, 'my-model', 'Default'), [{ value: '', label: 'Default' }, { value: 'sonnet', label: 'Sonnet' }, { value: 'custom-opus', label: 'Opus' }, { value: 'my-model', label: 'my-model' }]);
  assert.deepEqual(providerEffortOptions(models, 'sonnet', 'Auto'), [{ value: '', label: 'Auto' }, { value: 'low', label: 'low' }, { value: 'high', label: 'high' }]);
  assert.deepEqual(providerEffortOptions(models, 'missing', 'Auto'), [{ value: '', label: 'Auto' }]);
});
