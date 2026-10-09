const { randomBytes, createHmac } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { homedir } = require('node:os');

function getControlToken(home = process.env.XDG_CONFIG_HOME || join(homedir(), '.claude-code-gui')) {
  require('node:fs').mkdirSync(home, { recursive: true, mode: 0o700 });
  const path = join(home, 'auth-secret');
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
  return createHmac('sha256', secret).update('ccg-auth').digest('hex');
}
module.exports = { getControlToken };
