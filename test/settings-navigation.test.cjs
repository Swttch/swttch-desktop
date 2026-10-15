const { test } = require("node:test");
const assert = require("node:assert/strict");
test("settings deep links belong to the shell while paired agent settings stay embedded", async () => {
  const { isShellSettingsRequest } = await import("../src/settings-navigation.mjs");
  for (const path of ["/settings", "/settings/general", "/settings/account", "/settings/unknown"]) assert.equal(isShellSettingsRequest(path), true);
  assert.equal(isShellSettingsRequest("/settings/general?is_desktop=1&pair=test"), false);
  assert.equal(isShellSettingsRequest("/sessions/new"), false);
  assert.equal(isShellSettingsRequest("/settings-other"), false);
});
test("search discovers categories and unknown or stale entries resolve to general", async () => {
  const { settingsItems, findSettings, resolveSettingsPath } = await import("../src/settings-navigation.mjs");
  assert.equal(resolveSettingsPath("/settings"), "/settings/general");
  assert.equal(resolveSettingsPath("/settings/unknown"), "/settings/general");
  assert.equal(resolveSettingsPath("/settings/account"), "/settings/account");
  assert.deepEqual(findSettings("  시계  ").map(item => item.path), ["/settings/general"]);
  assert.equal(findSettings("존재하지않는설정").length, 0);
  assert.equal(findSettings("").length, settingsItems.length);
});
test("embedded account settings remain embedded after pairing has been consumed", async () => {
  const { isShellSettingsRequest } = await import("../src/settings-navigation.mjs");
  assert.equal(isShellSettingsRequest("/settings/account?workingDir=%2Fproject&pair=test"), false);
  assert.equal(isShellSettingsRequest("/settings/account?workingDir=%2Fproject"), false);
});
test('production host serves settings deep links and proxies agent settings', async t => {
  const { mkdtempSync, rmSync } = require('node:fs');
  const { join } = require('node:path');
  const { tmpdir } = require('node:os');
  const { createServer } = require('node:http');
  const { startHost } = require('../src/host.cjs');
  const home = mkdtempSync(join(tmpdir(), 'swttch-settings-'));
  const upstream = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('agent-settings'); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const backend = { token: 'fixture', port: upstream.address().port, async start() {}, async stop() {} };
  const host = await startHost({ port: 0, home, backend, subscribe: () => () => {} });
  t.after(async () => { await host.stop(); await new Promise(resolve => upstream.close(resolve)); rmSync(home, { recursive: true, force: true }); });
  for (const path of ['/settings', '/settings/general', '/settings/shortcuts', '/settings/account']) {
    const response = await fetch(`http://127.0.0.1:${host.port}${path}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="root"/);
  }
  const frame = await fetch(`http://127.0.0.1:${host.port}/settings/general?workingDir=%2Fproject&is_desktop=1`);
  assert.equal(frame.status, 200);
  assert.equal(await frame.text(), 'agent-settings');
});
test('reference navigation exposes unfinished categories without making them navigable', async () => {
  const { settingsItems, resolveSettingsPath, findSettings } = await import('../src/settings-navigation.mjs');
  for (const label of ['알림', '가져오기', '프로필', '모양', '자녀 보호', '음성 스타일', '저장 공간', '구성', '플러그인', '비밀번호', '컴퓨터 사용', '컴퓨터 기록', '앱샷']) {
    const item = settingsItems.find(item => item.label === label);
    assert.ok(item, `Missing visible category: ${label}`);
    assert.equal(item.disabled, true);
    assert.equal(item.path, undefined);
  }
  assert.equal(settingsItems.find(item => item.path === '/settings/general').group, '개인');
  assert.equal(findSettings('플러그인')[0].disabled, true);
  assert.equal(resolveSettingsPath('/settings/notifications'), '/settings/general');
});
