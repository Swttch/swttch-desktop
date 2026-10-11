const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { Backend } = require('../src/backend.cjs');
const { openStore } = require('../src/store.cjs');
const { getControlToken } = require('../src/launcher-auth.cjs');
const { createServer } = require('node:http');
const { sessionUrl } = require('../src/session-url.cjs');

function fixture(t, source) {
  const path = mkdtempSync(join(tmpdir(), 'swttch-desktop-test-'));
  t.after(() => rmSync(path, { recursive: true, force: true }));
  mkdirSync(join(path, 'webview'));
  writeFileSync(join(path, 'webview/index.html'), '<html></html>');
  if (source) writeFileSync(join(path, 'backend.mjs'), source);
  return path;
}

test('SQLite persists and deduplicates recent project paths', t => {
  const path = fixture(t);
  const first = openStore(path);
  first.remember('/work/한글 project');
  first.remember('/work/한글 project');
  first.close();
  const second = openStore(path);
  assert.deepEqual(second.recent(), ['/work/한글 project']);
  second.close();
});

test('control identity survives host restarts and differs across app data roots', t => {
  const first = fixture(t);
  const second = fixture(t);
  assert.equal(getControlToken(first), getControlToken(first));
  assert.notEqual(getControlToken(first), getControlToken(second));
  assert.equal(require('node:fs').statSync(join(first, 'auth-secret')).mode & 0o777, 0o600);
  const secret = require('node:fs').readFileSync(join(first, 'auth-secret'), 'utf8');
  assert.equal(getControlToken(first), require('node:crypto').createHmac('sha256', secret).update('ccg-auth').digest('hex'));
});

test('launcher reads split readiness, encodes project, and terminates owned child', async t => {
  const path = fixture(t, `
    if (process.env.PORT !== '12345' || process.env.CCG_BIND !== '127.0.0.1') process.exit(2);
    process.stdout.write('PORT:');
    setTimeout(() => process.stdout.write('12345\\n'), 20);
    setInterval(() => {}, 1000);
    process.on('SIGTERM', () => process.exit(0));
  `);
  const backend = new Backend({ runtime: path, home: path, port: 12345, token: 'test-token' });
  t.after(() => backend.stop());
  assert.equal(await backend.start(), 12345);
  const child = backend.child;
  await assert.rejects(backend.start(), /실행 중인 채팅 서버/);
  assert.equal(backend.child, child);
  const url = new URL(backend.url('/work/한글 & project'));
  assert.equal(url.searchParams.get('workingDir'), '/work/한글 & project');
  assert.equal(url.searchParams.has('pair'), true);
  assert.equal(url.href.includes(backend.token), false);
  await backend.stop();
  assert.equal(child.exitCode, 0);
  assert.equal(backend.child, null);
});

test('missing runtime and early child exit produce recoverable launch failures', async t => {
  const path = fixture(t);
  const backend = new Backend({ runtime: path, home: path, port: 12346, token: 'test-token' });
  await assert.rejects(backend.start(), /실행 파일/);
  writeFileSync(join(path, 'backend.mjs'), 'process.exit(3)');
  await assert.rejects(backend.start(), /준비 전에 종료/);
  assert.equal(backend.child, null);
});

test('launcher attaches only to an authenticated existing backend and never stops its process', async t => {
  let authenticated = false;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/version') return res.end('{"version":"0.34.0"}');
    authenticated = req.headers['x-ccg-token'] === 'test-token';
    res.writeHead(authenticated ? 200 : 401); res.end('{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const port = server.address().port;
  const rejected = new Backend({ runtime: '/missing-runtime', token: 'wrong-token', port });
  await assert.rejects(rejected.start(), /인증/);
  assert.equal(rejected.port, null);
  const backend = new Backend({ runtime: '/missing-runtime', token: 'test-token', port });
  assert.equal(await backend.start(), port);
  assert.equal(authenticated, true); assert.equal(backend.child, null);
  await backend.stop();
  assert.equal((await fetch(`http://127.0.0.1:${port}/version`)).status, 200);
});

test('session URLs always retain absolute workingDir for new and existing sessions on the fixed webview port', () => {
  const path = '/work/한글 & project';
  const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  for (const sessionId of [undefined, id]) {
    const url = new URL(sessionUrl(path, sessionId, 'single-use-code'));
    assert.equal(url.origin, 'http://localhost:19836');
    assert.equal(url.pathname, sessionId ? '/sessions/' + id : '/sessions/new');
    assert.equal(url.searchParams.get('workingDir'), path);
    assert.equal(url.searchParams.get('pair'), 'single-use-code');
  }
  for (const path of [undefined, '', ' ', 'relative/path']) assert.throws(() => sessionUrl(path, undefined, 'code'), /workingDir/);
  assert.throws(() => sessionUrl('/work', undefined, ''), /인증/);
});

test('desktop workspace survives service origins without storing authentication codes', t => {
  const home = fixture(t);
  let store = openStore(home);
  const project = store.createProject('/work/restore');
  const uid = '20a9df36-6ab1-421b-ab66-cc1d5b0c3413';
  store.saveWorkspace(project.id, uid); store.close();
  store = openStore(home);
  assert.deepEqual(store.workspace(), { id: 'desktop', projectId: project.id, sessionId: uid });
  store.close();
});

test('two hosts can synchronize SQLite activity concurrently without snapshot write failures', async t => {
  const { Worker } = require('node:worker_threads');
  const home = fixture(t), store = openStore(home);
  for (let index = 0; index < 50; index++) store.sessionRepository.upsert('uid-' + index, { title: 'Original title' });
  store.close();
  const gate = new SharedArrayBuffer(4);
  const source = `
    const {workerData, parentPort} = require('node:worker_threads');
    const store = require(workerData.module).openStore(workerData.home);
    const gate = new Int32Array(workerData.gate);
    Atomics.add(gate, 0, 1); Atomics.notify(gate, 0);
    while (Atomics.load(gate, 0) < 2) Atomics.wait(gate, 0, 1, 1000);
    for (let i = 0; i < 100; i++) store.sessionRepository.syncActivity({ open: ['uid-' + i % 50], activity: { ['uid-' + i % 50]: 'running' } });
    store.close(); parentPort.postMessage('ok');
  `;
  const workers = [0, 1].map(() => new Worker(source, { eval: true, workerData: { home, gate, module: require.resolve('../src/store.cjs') } }));
  t.after(() => Promise.all(workers.map(worker => worker.terminate())));
  await Promise.all(workers.map(worker => new Promise((resolve, reject) => { worker.on('error', reject); worker.on('exit', code => code ? reject(new Error('worker exit ' + code)) : resolve()); })));
  const reopened = openStore(home);
  assert.equal(reopened.sessionRepository.all().length, 50);
  assert.equal(reopened.sessionRepository.find('uid-0').title, 'Original title');
  reopened.close();
});

test('host shutdown closes upgraded WebSocket clients without waiting for their tabs', async t => {
  const { startHost } = require('../src/host.cjs');
  const { createHash } = require('node:crypto');
  const home = fixture(t), sockets = new Set();
  const upstream = createServer();
  upstream.on('upgrade', (req, socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  t.after(() => { for (const socket of sockets) socket.destroy(); upstream.close(); });
  const backend = { token: 'test-token', port: upstream.address().port, async start() {}, async stop() {} };
  const host = await startHost({ port: 0, home, backend, subscribe: () => () => {} });
  const client = new WebSocket('ws://127.0.0.1:' + host.port + '/ws');
  client.onerror = () => {};
  await new Promise((resolve, reject) => { client.onopen = resolve; client.onerror = reject; });
  await Promise.race([host.stop(), new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('upgraded client blocked shutdown')), 2000); timer.unref(); })]);
});
