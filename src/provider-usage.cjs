// Credentials remain inside the SDK. Only provider profile/usage payloads leave Node.
function createProviderUsage({ loadSdk = () => import('@swttch/extend-kit/battery'), now = Date.now, resolveCredentials, resolveUsage } = {}) {
  let snapshot;
  let expiresAt = 0;
  let pending;
  let revision = 0;
  const failure = error => {
    const code = error.code || 'unavailable';
    const messages = {
      token_expired: 'Claude 로그인을 갱신한 뒤 다시 시도해 주세요.',
      credentials_not_found: 'Claude CLI에 로그인한 뒤 다시 시도해 주세요.',
      rate_limited: '사용량 조회 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.',
      forbidden: '사용량 API 접근이 거부됐습니다. 네트워크와 계정 권한을 확인해 주세요.',
      server_error: 'Claude 서비스에서 응답하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      api_key: 'API 키 인증에서는 구독 계정의 사용 한도를 조회할 수 없습니다.',
    };
    return { code, message: messages[code] || '계정 정보를 조회하지 못했습니다. Claude 로그인과 네트워크를 확인해 주세요.', ...(error.details?.retryAfterSec && { retryAfterSec: error.details.retryAfterSec }) };
  };
  async function read({ refresh = false } = {}) {
    if (pending) return pending;
    if (snapshot && now() < expiresAt && (!refresh || now() - snapshot.checkedAt < 10_000 || snapshot.errors.profile?.code === 'rate_limited' || snapshot.errors.usage?.code === 'rate_limited')) return snapshot;
    const currentRevision = revision;
    const request = (async () => {
      let result;
      try {
        const sdk = await loadSdk();
        if (!resolveCredentials && process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_CODE_OAUTH_TOKEN) throw Object.assign(new Error(), { code: 'api_key' });
        const credentials = resolveCredentials ? await resolveCredentials(sdk) : await sdk.getCredentials();
        if (sdk.isTokenExpired(credentials)) throw Object.assign(new Error(), { code: 'token_expired' });
        const client = new sdk.ClaudeCodeClient(sdk.getAccessToken(credentials));
        const profilePromise = client.oauth.getProfile();
        const [profile, usage] = await Promise.allSettled([profilePromise, resolveUsage ? resolveUsage(client, profilePromise) : client.oauth.getUsage()]);
        result = {
          profile: profile.status === 'fulfilled' ? profile.value : null,
          usage: usage.status === 'fulfilled' ? usage.value : null,
          errors: { profile: profile.status === 'rejected' ? failure(profile.reason) : null, usage: usage.status === 'rejected' ? failure(usage.reason) : null },
        };
      } catch (error) {
        result = { profile: null, usage: null, errors: { profile: failure(error), usage: failure(error) } };
      }
      if (revision !== currentRevision) return read();
      snapshot = { ...result, checkedAt: now() };
      const retry = Math.max(result.errors.profile?.retryAfterSec || 0, result.errors.usage?.retryAfterSec || 0);
      expiresAt = now() + Math.max(60_000, retry * 1000);
      return snapshot;
    })().finally(() => { if (pending === request) pending = null; });
    pending = request;
    return pending;
  }
  return { read, invalidate() { revision++; snapshot = null; expiresAt = 0; pending = null; } };
}
module.exports = { createProviderUsage };
