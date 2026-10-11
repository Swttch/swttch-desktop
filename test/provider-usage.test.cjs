const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { createProviderUsage } = require('../src/provider-usage.cjs');

test('SDK HTTP transport preserves provider fields, merges concurrent reads and honors rate-limit cooldown', async t => {
  const sdk = await import('@swttch/extend-kit/battery');
  let calls = 0;
  let time = 1_000_000;
  let limited = false;
  const usage = { five_hour: { utilization: 13, resets_at: null }, limits: [{ kind: 'new_model', percent: 2, original: { preserved: true } }], future_window: { original: true } };
  const server = createServer((req, res) => {
    calls++;
    assert.equal(req.headers.authorization, 'Bearer test-only-token');
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/oauth/usage' && limited) { res.writeHead(429, { 'Retry-After': '120' }); res.end('{}'); }
    else res.end(JSON.stringify(req.url === '/api/oauth/usage' ? usage : { account: { display_name: 'Test' }, future_profile_field: true }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const reader = createProviderUsage({ now: () => time, loadSdk: async () => ({ ...sdk,
    getCredentials: async () => ({ claudeAiOauth: { accessToken: 'test-only-token', expiresAt: Infinity } }),
    ClaudeCodeClient: class extends sdk.ClaudeCodeClient { constructor(token) { super(token, { baseUrl }); } },
  }) });
  const [first, second] = await Promise.all([reader.read(), reader.read()]);
  assert.equal(first, second);
  assert.equal(calls, 2);
  assert.deepEqual(first.usage, usage);
  assert.equal(first.profile.future_profile_field, true);
  assert.ok(!JSON.stringify(first).includes('test-only-token'));
  await reader.read({ refresh: true });
  assert.equal(calls, 2);
  time += 61_000;
  limited = true;
  const result = await reader.read();
  assert.equal(result.errors.usage.code, 'rate_limited');
  assert.equal(result.errors.usage.retryAfterSec, 120);
  assert.equal(result.profile.account.display_name, 'Test');
  assert.equal(result.usage, null);
  time += 61_000;
  await reader.read({ refresh: true });
  assert.equal(calls, 4);
  time += 60_000;
  limited = false;
  assert.deepEqual((await reader.read()).usage, usage);
  assert.equal(calls, 6);
});

test('credential failure returns a safe recovery message without exposing credentials or stderr', async () => {
  const reader = createProviderUsage({ loadSdk: async () => ({ getCredentials: async () => { throw new Error('secret-token and private keychain output'); } }) });
  const result = await reader.read();
  assert.equal(result.profile, null);
  assert.equal(result.usage, null);
  assert.ok(!JSON.stringify(result).includes('secret-token'));
  assert.match(result.errors.usage.message, /로그인/);
});
