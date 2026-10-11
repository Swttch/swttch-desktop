const { pathToFileURL } = require('node:url');
const { join } = require('node:path');
const { createProviderUsage } = require('./provider-usage.cjs');

const loadStore = () => import(pathToFileURL(join(__dirname, '../dist/session-source.mjs')).href);
const authError = () => Object.assign(new Error('저장 계정에 다시 로그인해 주세요.'), { code: 'token_expired' });

function createAccountUsage({ store = loadStore, loadSdk = () => import('@swttch/extend-kit/battery'), fetchToken = fetch, now = Date.now, activeUsage } = {}) {
  const readers = new Map();
  const successful = new Map();
  const renewing = new Map();
  async function fetchUsage(client, id) {
    const source = await store();
    const retryAt = source.readCooldownUntil?.(id, now());
    if (retryAt) throw Object.assign(new Error(), { code: 'rate_limited', details: { retryAfterSec: Math.ceil((retryAt - now()) / 1000) } });
    try {
      const usage = await client.oauth.getUsage();
      source.writeUsageSnapshot?.(id, usage, now());
      source.clearCooldown?.(id);
      return usage;
    } catch (error) {
      if (error.code === 'rate_limited') source.armCooldown?.(id, error.details?.retryAfterSec, now());
      throw error;
    }
  }
  async function fetchLiveUsage(client, profilePromise) {
    const profile = await profilePromise;
    const source = await store();
    const registry = await source.readRegistry();
    const account = Object.values(registry.accounts).find(row => row.emailAddress === profile.account.email);
    return account ? fetchUsage(client, account.id) : client.oauth.getUsage();
  }
  async function savedCredentials(id, sdk) {
    const source = await store();
    const snapshot = await source.readSnapshot(id);
    if (!snapshot) throw authError();
    const credentials = JSON.parse(snapshot.credentials);
    if (typeof credentials.claudeAiOauth?.accessToken !== 'string' || !credentials.claudeAiOauth.accessToken.trim()) throw authError();
    if (!sdk.isTokenExpired(credentials)) return credentials;
    if (typeof credentials.claudeAiOauth.refreshToken !== 'string' || !credentials.claudeAiOauth.refreshToken) throw authError();
    if (renewing.has(id)) return renewing.get(id);
    const promise = (async () => {
      // Claude Code's production OAuth refresh contract; do not rotate the live
      // login slot while reading a saved account. Tokens never leave Node.
      const response = await fetchToken('https://platform.claude.com/v1/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000), redirect: 'error',
        body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: credentials.claudeAiOauth.refreshToken,
          client_id: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',
          ...(credentials.claudeAiOauth.scopes?.length && { scope: credentials.claudeAiOauth.scopes.join(' ') }) }),
      });
      if (!response.ok) {
        if (response.status === 429) throw Object.assign(new Error(), { code: 'rate_limited', details: { retryAfterSec: Number(response.headers.get('retry-after')) || 60 } });
        if (response.status >= 500) throw Object.assign(new Error(), { code: 'server_error' });
        throw authError();
      }
      const result = await response.json();
      if (typeof result.access_token !== 'string' || !Number.isFinite(result.expires_in) || result.expires_in <= 0) throw authError();
      const latest = await source.readSnapshot(id);
      if (!latest || latest.credentials !== snapshot.credentials) throw Object.assign(new Error('계정 인증 정보가 변경됐습니다. 다시 조회해 주세요.'), { code: 'unavailable' });
      const updated = { ...credentials, claudeAiOauth: { ...credentials.claudeAiOauth,
        accessToken: result.access_token, refreshToken: result.refresh_token || credentials.claudeAiOauth.refreshToken,
        expiresAt: now() + result.expires_in * 1000,
        ...(typeof result.scope === 'string' && { scopes: result.scope.split(' ').filter(Boolean) }),
      } };
      await source.writeSnapshot(id, { ...snapshot, credentials: JSON.stringify(updated) });
      return updated;
    })().finally(() => { renewing.delete(id); });
    renewing.set(id, promise);
    return promise;
  }
  async function prepareAccount(id) { return savedCredentials(id, await loadSdk()); }
  async function read(accounts, { refresh = false, accountId } = {}) {
    return { accounts: await Promise.all(accounts.map(async account => {
      let entry = readers.get(account.id);
      if (!entry || entry.active !== account.active) {
        entry = { active: account.active, reader: createProviderUsage({ loadSdk, now,
          ...(account.active ? {} : { resolveCredentials: sdk => savedCredentials(account.id, sdk) }),
          resolveUsage: client => fetchUsage(client, account.id),
        }) };
        readers.set(account.id, entry);
      }
      const reader = account.active && activeUsage ? activeUsage : entry.reader;
      const data = await reader.read({ refresh: refresh && (!accountId || accountId === account.id) });
      if (data.profile?.account?.email && data.profile.account.email !== account.emailAddress) {
        reader.invalidate();
        const error = { code: 'account_changed', message: '계정이 변경됐습니다. 다시 조회해 주세요.' };
        return { ...account, profile: null, usage: null, checkedAt: data.checkedAt, errors: { profile: error, usage: error } };
      }
      if (data.usage) successful.set(account.id, { email: account.emailAddress, data });
      const previous = successful.get(account.id);
      if (!data.usage) {
        const fallback = previous?.email === account.emailAddress ? { usage: previous.data.usage, cachedAt: previous.data.checkedAt } : (await store()).readUsageSnapshot?.(account.id, { now: now() });
        if (fallback) return { ...account, ...data, usage: fallback.usage, usageStale: true, checkedAt: fallback.cachedAt, attemptedAt: data.checkedAt };
      }
      return { ...account, ...data, usageStale: false };
    })) };
  }
  return { read, prepareAccount, fetchLiveUsage, invalidate() { for (const entry of readers.values()) entry.reader.invalidate(); readers.clear(); } };
}
module.exports = { createAccountUsage };
