const { randomBytes, createHmac } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

function getControlToken(home) {
  const path = join(home, 'runtime-secret');
  let secret;
  try { secret = readFileSync(path, 'utf8').trim(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const fresh = randomBytes(32).toString('hex');
    try { writeFileSync(path, fresh, { flag: 'wx', mode: 0o600 }); secret = fresh; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      secret = readFileSync(path, 'utf8').trim();
    }
  }
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new Error('로컬 런타임 인증 파일을 읽을 수 없습니다.');
  return createHmac('sha256', secret).update('swttch-desktop-control-channel').digest('hex');
}
module.exports = { getControlToken };
