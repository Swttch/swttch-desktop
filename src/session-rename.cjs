const { spawn } = require('node-pty');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

async function renameSessionWithCli({ uid, title, workingDir, src, binary = process.env.SWTTCH_CLAUDE_BIN || 'claude' }) {
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(uid)) throw new Error('세션 UID를 확인해 주세요.');
  if (!title.trim() || /[\r\n]/.test(title) || title.length > 512) throw new Error('세션 제목은 줄바꿈 없이 512자 이내로 입력해 주세요.');
  const { scanTail } = await import(pathToFileURL(join(__dirname, '../dist/session-source.mjs')).href);
  const target = title.trim();
  if ((await scanTail(src)).customTitle === target) return;
  const env = { ...process.env, TERM: 'xterm-256color', CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1' };
  delete env.CLAUDECODE;
  // This variable disables transcript metadata too, including --name.
  delete env.CLAUDE_CODE_SKIP_PROMPT_HISTORY;
  const args = ['--resume', uid, '--name', target, '--safe-mode', '--permission-mode', 'dontAsk', '--tools', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'];
  return new Promise((resolve, reject) => {
    let terminal;
    try { terminal = spawn(binary, args, { cwd: workingDir, env, name: 'xterm-256color', cols: 120, rows: 30 }); }
    catch (error) { reject(new Error('Claude CLI를 실행하지 못했습니다: ' + error.message)); return; }
    let renamed = false, failure, checking = false, output = '';
    const stop = () => { try { terminal.kill(process.platform === 'win32' ? undefined : 'SIGTERM'); } catch {} };
    // No prompt is ever written. Only terminal capability responses are sent.
    const data = terminal.onData(chunk => {
      if (chunk.includes('\x1b[6n')) terminal.write('\x1b[1;1R');
      if (chunk.includes('\x1b[c')) terminal.write('\x1b[?1;2c');
      output = (output + chunk).slice(-16000);
      const clean = output.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ' ').replace(/\s+/g, ' ');
      if (/Yes,? I trust this folder/i.test(clean)) { failure = new Error('이 프로젝트를 Claude CLI에서 먼저 열어 신뢰 여부를 확인해 주세요.'); stop(); }
    });
    const timer = setTimeout(() => { failure = new Error('CLI 이름 변경을 확인하지 못했습니다.'); stop(); }, 30000);
    const poll = setInterval(async () => {
      if (checking || renamed || failure) return;
      checking = true;
      try { if ((await scanTail(src)).customTitle === target) { renamed = true; stop(); } }
      catch (error) { failure = error; stop(); }
      finally { checking = false; }
    }, 100);
    terminal.onExit(async () => {
      clearTimeout(timer); clearInterval(poll); data.dispose();
      try {
        if (failure) throw failure;
        if (!renamed && (await scanTail(src)).customTitle !== target) throw new Error('CLI가 제목 변경을 저장하지 않았습니다.');
        resolve();
      } catch (error) { reject(error); }
    });
  });
}
module.exports = { renameSessionWithCli };
