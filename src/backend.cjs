const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { createInterface } = require('node:readline');
const { WEBVIEW_PORT } = require('./ports.cjs');
const { getControlToken } = require('./launcher-auth.cjs');
const { sessionUrl } = require('./session-url.cjs');

class Backend {
  constructor({ runtime, home, executable = process.execPath, token = getControlToken(), port = WEBVIEW_PORT, onExit = () => {}, onLog = () => {} }) {
    this.runtime = runtime;
    this.home = home;
    this.executable = executable;
    this.onExit = onExit;
    this.onLog = onLog;
    this.child = null;
    this.port = null;
    this.token = token;
    this.pairCode = null;
    this.targetPort = port;
  }

  async start() {
    let existing;
    try { existing = await fetch(`http://127.0.0.1:${this.targetPort}/version`, { signal: AbortSignal.timeout(1500) }); }
    catch (error) {
      if (error.cause?.code !== 'ECONNREFUSED') throw new Error('고정 웹뷰 포트의 백엔드 상태를 확인하지 못했습니다.');
    }
    if (existing) {
      let version;
      try { version = await existing.json(); } catch { /* Foreign server. */ }
      if (!existing.ok || typeof version?.version !== 'string') throw new Error('고정 웹뷰 포트를 다른 서비스가 사용 중입니다.');
      const status = await fetch(`http://127.0.0.1:${this.targetPort}/internal/status`, { headers: { 'x-ccg-token': this.token }, signal: AbortSignal.timeout(1500) });
      if (!status.ok) throw new Error('실행 중인 CCG 백엔드의 인증을 확인하지 못했습니다.');
      this.port = this.targetPort;
      return this.port;
    }
    if (this.child) throw new Error('실행 중인 채팅 서버에 연결하지 못했습니다. 잠시 후 다시 연결해 주세요.');
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
        PORT: String(this.targetPort), CCG_BIND: '127.0.0.1', WEBVIEW_DIR: webview,
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
        if (port !== this.targetPort) { finish(); reject(new Error('백엔드가 고정 웹뷰 포트에서 시작되지 않았습니다.')); void this.stop(); return; }
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
    return sessionUrl(project, undefined, this.pairCode, this.port);
  }

  async stop() {
    const child = this.child;
    if (!child) { this.port = null; return; }
    await new Promise(resolve => {
      const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      child.kill('SIGTERM');
    });
  }
}

module.exports = { Backend };
