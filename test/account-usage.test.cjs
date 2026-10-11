const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAccountUsage } = require('../src/account-usage.cjs');

test('saved account refreshes independently without swapping the live account or leaking credentials', async () => {
  const snapshots = new Map([['acc-secondary', { credentials: JSON.stringify({ extra: 'preserved', claudeAiOauth: { accessToken: 'expired-secondary', refreshToken: 'private-refresh', expiresAt: 0, scopes: ['user:profile'], futureAuthField: true } }), oauthAccount: { emailAddress: 'secondary@example.test' } }]]);
  let refreshes = 0;
  const live = { claudeAiOauth: { accessToken: 'live-primary', expiresAt: 99_999 } };
  const sdk = {
    getCredentials: async () => live, isTokenExpired: credentials => credentials.claudeAiOauth.expiresAt < 1000,
    getAccessToken: credentials => credentials.claudeAiOauth.accessToken,
    ClaudeCodeClient: class { constructor(token) { this.oauth = {
      getProfile: async () => ({ account: { email: token === 'live-primary' ? 'primary@example.test' : 'secondary@example.test' } }),
      getUsage: async () => ({ five_hour: { utilization: token === 'live-primary' ? 10 : 20, resets_at: null }, futureBucket: { preserved: true } }),
    }; } },
  };
  const service = createAccountUsage({ now: () => 1000, loadSdk: async () => sdk, store: async () => ({ readSnapshot: async id => snapshots.get(id), writeSnapshot: async (id, snapshot) => snapshots.set(id, snapshot) }), fetchToken: async (url, options) => {
    refreshes++;
    assert.equal(url, 'https://platform.claude.com/v1/oauth/token');
    assert.equal(JSON.parse(options.body).refresh_token, 'private-refresh');
    return { ok: true, json: async () => ({ access_token: 'renewed-secondary', refresh_token: 'rotated-private-refresh', expires_in: 3600 }) };
  } });
  const accounts = [{ id: 'acc-primary', active: true, emailAddress: 'primary@example.test' }, { id: 'acc-secondary', active: false, emailAddress: 'secondary@example.test' }];
  const result = await service.read(accounts, { refresh: true });
  assert.equal(refreshes, 1);
  assert.equal(live.claudeAiOauth.accessToken, 'live-primary');
  assert.equal(result.accounts[0].usage.five_hour.utilization, 10);
  assert.equal(result.accounts[1].usage.five_hour.utilization, 20);
  assert.deepEqual(result.accounts[1].usage.futureBucket, { preserved: true });
  const updated = JSON.parse(snapshots.get('acc-secondary').credentials);
  assert.equal(updated.extra, 'preserved');
  assert.equal(updated.claudeAiOauth.futureAuthField, true);
  assert.equal(updated.claudeAiOauth.refreshToken, 'rotated-private-refresh');
  assert.ok(!JSON.stringify(result).includes('private-refresh'));
  assert.ok(!JSON.stringify(result).includes('renewed-secondary'));
  await service.read(accounts);
  assert.equal(refreshes, 1);
});

test('a failed saved-account renewal does not replace it with cached or other-account usage', async () => {
  const service = createAccountUsage({ store: async () => ({ readSnapshot: async () => null }), loadSdk: async () => ({ getCredentials: async () => { throw new Error('private secret'); } }) });
  const result = await service.read([{ id: 'acc-missing', active: false, emailAddress: 'missing@example.test' }]);
  assert.equal(result.accounts[0].usage, null);
  assert.equal(result.accounts[0].errors.usage.code, 'token_expired');
  assert.ok(!JSON.stringify(result).includes('private secret'));
});

test('active account shares the existing provider reader instead of duplicating SDK requests', async () => {
  let reads = 0;
  let sdkLoads = 0;
  const service = createAccountUsage({ loadSdk: async () => { sdkLoads++; throw new Error('should not load'); }, activeUsage: { async read() { reads++; return { profile: { account: { email: 'primary@example.test' } }, usage: { five_hour: { utilization: 12, resets_at: null } }, errors: { profile: null, usage: null }, checkedAt: 123 }; } } });
  const result = await service.read([{ id: 'acc-primary', active: true, emailAddress: 'primary@example.test' }]);
  assert.equal(reads, 1);
  assert.equal(sdkLoads, 0);
  assert.equal(result.accounts[0].usage.five_hour.utilization, 12);
});

test('provider errors retain only the same saved-account successful value with an explicit stale timestamp', async () => {
  let limited = false;
  const activeUsage = { async read() { return { profile: { account: { email: 'primary@example.test' } }, usage: limited ? null : { five_hour: { utilization: 12, resets_at: null } }, errors: { profile: null, usage: limited ? { code: 'rate_limited', message: 'Wait' } : null }, checkedAt: limited ? 200 : 100 }; } };
  const service = createAccountUsage({ activeUsage });
  const accounts = [{ id: 'acc-primary', active: true, emailAddress: 'primary@example.test' }];
  await service.read(accounts);
  limited = true;
  const row = (await service.read(accounts, { refresh: true })).accounts[0];
  assert.equal(row.usage.five_hour.utilization, 12);
  assert.equal(row.usageStale, true);
  assert.equal(row.checkedAt, 100);
  assert.equal(row.attemptedAt, 200);
  assert.equal(row.errors.usage.code, 'rate_limited');
});

test('live SDK quota respects the original per-account cooldown without making another provider request', async () => {
  let calls = 0;
  const service = createAccountUsage({ now: () => 1000, store: async () => ({ readRegistry: async () => ({ accounts: { primary: { id: 'acc-primary', emailAddress: 'primary@example.test' } } }), readCooldownUntil: () => 5000 }) });
  await assert.rejects(service.fetchLiveUsage({ oauth: { getUsage: async () => { calls++; } } }, Promise.resolve({ account: { email: 'primary@example.test' } })), error => error.code === 'rate_limited' && error.details.retryAfterSec === 4);
  assert.equal(calls, 0);
});

test('a persisted successful snapshot remains visible after a host restart with a refresh error', async () => {
  const service = createAccountUsage({ activeUsage: { read: async () => ({ profile: { account: { email: 'primary@example.test' } }, usage: null, checkedAt: 200, errors: { usage: { code: 'rate_limited', message: 'Wait' }, profile: null } }) }, store: async () => ({ readUsageSnapshot: () => ({ usage: { five_hour: { utilization: 12, resets_at: null }, future: true }, cachedAt: 100 }) }) });
  const row = (await service.read([{ id: 'acc-primary', active: true, emailAddress: 'primary@example.test' }])).accounts[0];
  assert.equal(row.usage.five_hour.utilization, 12);
  assert.equal(row.usage.future, true);
  assert.equal(row.checkedAt, 100);
  assert.equal(row.usageStale, true);
});

test('an account switch overlapping a read returns a row-level mismatch instead of exposing another account usage', async () => {
  let invalidations = 0;
  const service = createAccountUsage({ activeUsage: { read: async () => ({ profile: { account: { email: 'other@example.test' } }, usage: { five_hour: { utilization: 90, resets_at: null } }, checkedAt: 200, errors: { profile: null, usage: null } }), invalidate() { invalidations++; } } });
  const row = (await service.read([{ id: 'acc-primary', active: true, emailAddress: 'primary@example.test' }])).accounts[0];
  assert.equal(row.profile, null);
  assert.equal(row.usage, null);
  assert.equal(row.errors.usage.code, 'account_changed');
  assert.equal(invalidations, 1);
});
