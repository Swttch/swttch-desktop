const { isAbsolute } = require('node:path');
const { PATH } = require('./paths.mjs');
const { WEBVIEW_PORT } = require('./ports.cjs');

function sessionUrl(workingDir, sessionId, pairCode, port = WEBVIEW_PORT) {
  if (typeof workingDir !== 'string' || !workingDir.trim() || !isAbsolute(workingDir)) throw new Error('세션 URL에는 절대 경로 workingDir가 필요합니다.');
  if (sessionId !== undefined && !/^[a-f0-9-]{36}$/i.test(sessionId)) throw new Error('올바른 세션을 선택해 주세요.');
  if (typeof pairCode !== 'string' || !pairCode) throw new Error('세션 인증 코드를 받지 못했습니다.');
  const url = new URL(sessionId ? PATH.SESSION.replace(':sessionId', encodeURIComponent(sessionId)) : PATH.NEW_SESSION, `http://localhost:${port}`);
  url.searchParams.set('workingDir', workingDir);
  url.searchParams.set('pair', pairCode);
  url.searchParams.set('top_bar_display', 'F');
  return url.href;
}
module.exports = { sessionUrl };
