const { spawn } = require('node:child_process');
const { join } = require('node:path');

function createFolderDialog() {
  let child;
  let pending;
  return {
    select() {
      if (pending) return pending;
      pending = new Promise((resolve, reject) => {
        const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
        child = spawn(require('electron'), [join(__dirname, 'folder-picker.cjs')], { env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        let output = '';
        let settled = false;
        const finish = (error, path) => { if (settled) return; settled = true; clearTimeout(timer); pending = null; child = null; if (error) reject(error); else resolve(path); };
        const timer = setTimeout(() => { child?.kill(); finish(new Error('폴더 선택 시간이 초과됐습니다. 다시 시도해 주세요.')); }, 300000);
        child.stdout.on('data', chunk => { output += chunk; });
        child.stderr.on('data', () => {});
        child.once('error', () => finish(new Error('폴더 선택 창을 열지 못했습니다.')));
        child.once('exit', code => {
          try {
            if (code !== 0) throw new Error();
            const line = output.split('\n').find(line => line.startsWith('FOLDER_SELECTION:'));
            if (!line) throw new Error();
            finish(null, JSON.parse(line.slice('FOLDER_SELECTION:'.length)));
          } catch { finish(new Error('폴더 선택 창을 열지 못했습니다.')); }
        });
      });
      return pending;
    },
    stop() { child?.kill(); },
  };
}
module.exports = { createFolderDialog };
