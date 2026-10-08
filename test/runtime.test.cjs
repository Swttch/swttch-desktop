const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { Backend } = require('../src/backend.cjs');
const { openStore } = require('../src/store.cjs');
const { getControlToken } = require('../src/launcher-auth.cjs');

function fixture(t, source) {
  const path = mkdtempSync(join(tmpdir(), 'swttch-desktop-test-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  mkdirSync(join(path, 'webview'));
  writeFileSync(join(path, 'webview/index.html'), '<html></html>');
  if (source) writeFileSync(join(path, 'backend.mjs'), source);
  return path;
}

test('SQLite persists and deduplicates recent project paths', t => {
  const path = fixture(t);
  const first = openStore(path);
  first.remember('/work/한글 project');
  first.remember('/work/한글 project');
  first.close();
  const second = openStore(path);
  assert.deepEqual(second.recent(), ['/work/한글 project']);
  second.close();
});

test('control identity survives host restarts and differs across app data roots', t => {
  const first = fixture(t);
  const second = fixture(t);
  assert.equal(getControlToken(first), getControlToken(first));
  assert.notEqual(getControlToken(first), getControlToken(second));
  assert.equal(require('node:fs').statSync(join(first, 'runtime-secret')).mode & 0o777, 0o600);
});

test('launcher reads split readiness, encodes project, and terminates owned child', async t => {
  const path = fixture(t, `
    if (process.env.PORT !== '0' || process.env.CCG_BIND !== '127.0.0.1') process.exit(2);
    process.stdout.write('PORT:');
    setTimeout(() => process.stdout.write('12345\\n'), 20);
    setInterval(() => {}, 1000);
    process.on('SIGTERM', () => process.exit(0));
  `);
  const backend = new Backend({ runtime: path, home: path });
  t.after(() => backend.stop());
  assert.equal(await backend.start(), 12345);
  const child = backend.child;
  const url = new URL(backend.url('/work/한글 & project'));
  assert.equal(url.searchParams.get('workingDir'), '/work/한글 & project');
  assert.equal(url.searchParams.has('pair'), true);
  assert.equal(url.href.includes(backend.token), false);
  await backend.stop();
  assert.equal(child.exitCode, 0);
  assert.equal(backend.child, null);
});

test('missing runtime and early child exit produce recoverable launch failures', async t => {
  const path = fixture(t);
  const backend = new Backend({ runtime: path, home: path });
  await assert.rejects(backend.start(), /실행 파일/);
  writeFileSync(join(path, 'backend.mjs'), 'process.exit(3)');
  await assert.rejects(backend.start(), /준비 전에 종료/);
  assert.equal(backend.child, null);
});
