const { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell } = require('electron');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const { join } = require('node:path');
const { homedir } = require('node:os');
const { mkdirSync } = require('node:fs');

app.setName('Swttch');
const home = process.env.SWTTCH_DESKTOP_HOME || join(homedir(), '.swttch');
mkdirSync(home, { recursive: true, mode: 0o700 });
app.setPath('userData', join(home, 'browser'));
let window;
let host;
let quitting = false;
let confirming = false;

async function startLocalHost() {
  // Use the same Node runtime/ABI as the browser host and its SQLite driver.
  host = spawn(process.env.SWTTCH_NODE_EXECUTABLE || 'node', [join(__dirname, 'host.cjs')], {
    env: { ...process.env, SWTTCH_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  host.stderr.pipe(process.stderr);
  return new Promise((resolve, reject) => {
    let ready = false;
    const timer = setTimeout(() => { host.kill(); reject(new Error('Local service startup timed out')); }, 30000);
    createInterface({ input: host.stdout }).on('line', line => {
      const match = /^DESKTOP_PORT:(\d+)$/.exec(line);
      if (match) { ready = true; clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
    });
    host.once('error', error => { clearTimeout(timer); reject(error); });
    host.once('exit', () => {
      clearTimeout(timer);
      if (quitting) return;
      reject(new Error('Local service exited'));
      if (ready && window && !window.isDestroyed()) void recoverLocalHost();
    });
  });
}

async function recoverLocalHost() {
  const answer = await dialog.showMessageBox(window, {
    message: '로컬 서버 연결이 종료됐습니다.',
    detail: '서버를 다시 실행하고 마지막 대화를 엽니다. 중단된 에이전트 작업은 자동으로 재개하지 않습니다.',
    buttons: ['종료', '다시 연결'], defaultId: 1, cancelId: 0,
  });
  if (quitting) return;
  if (answer.response !== 1) { app.quit(); return; }
  try { await window.loadURL(await startLocalHost()); }
  catch (error) { dialog.showErrorBox('로컬 서버를 시작하지 못했습니다.', error.message); }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { window?.restore(); window?.focus(); });
  app.whenReady().then(async () => {
    const url = process.env.SWTTCH_RENDERER_URL || await startLocalHost();
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(url)) throw new Error('Unsupported local host URL');
    window = new BrowserWindow({
      width: 1120, height: 800, minWidth: 680, minHeight: 520, icon: join(__dirname, '..', 'assets', 'app-icon.png'), title: 'Swttch', titleBarStyle: 'hiddenInset',
      ...(process.platform === 'darwin' ? { titleBarOverlay: true } : {}),
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#1a1a1a' : '#ffffff',
      webPreferences: { preload: join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true },
    });
    window.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//.test(url)) void shell.openExternal(url); return { action: 'deny' }; });
    window.webContents.on('will-navigate', (event, target) => { if (new URL(target).origin !== url) event.preventDefault(); });
    ipcMain.handle('host:select-directory', async event => {
      if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Invalid IPC sender');
      const result = await dialog.showOpenDialog(window, { properties: ['openDirectory'], buttonLabel: '프로젝트 열기' });
      return result.canceled ? null : result.filePaths[0];
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ label: 'Swttch', submenu: [{ role: 'about' }, { role: 'quit' }] }] : []),
      { role: 'editMenu' }, { label: '보기', submenu: [{ role: 'toggleDevTools' }, { role: 'togglefullscreen' }] },
    ]));
    window.on('close', event => {
      if (!quitting) { event.preventDefault(); app.quit(); }
    });
    await window.loadURL(url);
  }).catch(error => { console.error(error.message); host?.kill(); app.exit(1); });
}
app.on('before-quit', event => {
  if (quitting) return;
  event.preventDefault();
  if (confirming) return;
  confirming = true;
  void (async () => {
    if (window && !window.isDestroyed()) {
      const answer = await dialog.showMessageBox(window, {
        message: 'Swttch를 종료할까요?',
        detail: host ? '이 앱의 로컬 서버를 종료합니다. 앱이 실행한 채팅 서버와 해당 작업도 중단되며, 별도로 실행한 채팅 서버는 유지됩니다.' : '대화 화면을 닫습니다. 로컬 개발 서버는 실행 주체에서 관리합니다.',
        buttons: ['계속 작업', '종료'], defaultId: 0, cancelId: 0,
      });
      if (answer.response !== 1) { confirming = false; return; }
    }
    quitting = true;
    if (host && host.exitCode === null && host.signalCode === null) {
      await new Promise(resolve => {
        const timer = setTimeout(() => host.kill('SIGKILL'), 6000);
        host.once('exit', () => { clearTimeout(timer); resolve(); });
        host.kill('SIGTERM');
      });
    }
    app.exit(0);
  })();
});
app.on('window-all-closed', () => app.quit());
