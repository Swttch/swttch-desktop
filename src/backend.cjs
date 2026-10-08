const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { createInterface } = require('node:readline');

class Backend {
  constructor({ runtime, home, executable = process.execPath, token = randomBytes(32).toString('hex'), onExit = () => {}, onLog = () => {} }) {
    this.runtime = runtime;
    this.home = home;
    this.executable = executable;
    this.onExit = onExit;
    this.onLog = onLog;
    this.child = null;
    this.port = null;
    this.token = token;
    this.pairCode = null;
  }

  start() {
    if (this.child) return Promise.reject(new Error('Backend is already running'));
    const entry = join(this.runtime, 'backend.mjs');
    const webview = this.webview || join(this.runtime, 'webview');
    if (!existsSync(entry) || !existsSync(join(webview, 'index.html'))) {
      return Promise.reject(new Error('채팅 실행 파일이 없습니다. runtime-build를 실행해 주세요.'));
    }
    this.pairCode = randomBytes(24).toString('hex');
    const child = spawn(this.executable, [entry], {
      cwd: this.runtime,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production', JETBRAINS_MODE: 'false',
        PORT: '0', CCG_BIND: '127.0.0.1', WEBVIEW_DIR: webview,
        CCG_AUTH_TOKEN: this.token, CCG_INITIAL_PAIR_CODE: this.pairCode,
        CCG_HOME: this.home, CCG_HOST_PID: String(process.pid),
        // This preview owns the process even while its project picker is shown.
        CCG_DISABLE_IDLE_SHUTDOWN: 'true',
      },
      windowsHide: true,
    });
    this.child = child;
    return new Promise((resolve, reject) => {
      let ready = false;
      const timeout = setTimeout(() => {
        reject(new Error('백엔드 준비 시간이 초과됐습니다. 다시 시도해 주세요.'));
        void this.stop();
      }, 30_000);
      const finish = () => clearTimeout(timeout);
      createInterface({ input: child.stdout }).on('line', line => {
        const match = /^PORT:(\d+)$/.exec(line);
        if (!match || ready) return;
        const port = Number(match[1]);
        if (port < 1 || port > 65535) return;
        this.port = port;
        ready = true;
        finish();
        resolve(port);
      });
      createInterface({ input: child.stderr }).on('line', line => {
        this.onLog(line.replaceAll(this.token, '[redacted]').replaceAll(this.pairCode, '[redacted]'));
      });
      child.once('error', error => { finish(); if (this.child === child) this.child = null; reject(error); });
      child.once('exit', (code, signal) => {
        finish();
        if (this.child === child) { this.child = null; this.port = null; }
        if (!ready) reject(new Error(`백엔드가 준비 전에 종료됐습니다 (${code ?? signal}).`));
        this.onExit(code, signal);
      });
    });
  }

  url(project) {
    if (!this.port) throw new Error('Backend is not ready');
    const url = new URL(`http://127.0.0.1:${this.port}/sessions/new`);
    url.searchParams.set('workingDir', project);
    url.searchParams.set('pair', this.pairCode);
    return url.href;
  }

  async stop() {
    const child = this.child;
    if (!child) return;
    await new Promise(resolve => {
      const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      child.kill('SIGTERM');
    });
  }
}

module.exports = { Backend };
