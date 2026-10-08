const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer, request } = require('node:http');
const { createHash } = require('node:crypto');
const { mkdtempSync, mkdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createLocalService } = require('../src/local-service.cjs');

async function setup(t, allowedOrigins = []) {
  const home = mkdtempSync(join(tmpdir(), 'swttch-api-test-'));
  const project = join(home, '한글 project & space');
  mkdirSync(project);
  let pairingCount = 0;
  const upstream = createServer((req, res) => {
    if (req.url === '/internal/local-pair' && req.headers['x-ccg-token'] === 'private-token') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: `pair-${++pairingCount}` }));
    } else if (req.url.startsWith('/internal/')) { res.writeHead(401); res.end('unauthorized'); }
    else { res.setHeader('X-Frame-Options', 'SAMEORIGIN'); res.end('chat-app'); }
  });
  const backendRequests = [];
  const nestedSettings = new Map();
  let sessionRows = Array.from({ length: 35 }, (_, index) => ({ sessionId: 'session-' + index, title: 'Title ' + index, sessionDir: index === 34 ? join(project, 'nested') : project, createdAt: '2026-10-01T00:00:00Z', lastTimestamp: '2026-10-09T00:00:00Z', isSidechain: false, originalExtra: { preserved: true } }));
  const sockets = new Set();
  upstream.on('upgrade', (req, socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    if (req.headers['sec-websocket-protocol'] !== 'ccg-auth, private-token') { socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n'); return; }
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\nSec-WebSocket-Protocol: ccg-auth\r\n\r\n`);
    let pending = Buffer.alloc(0);
    socket.on('data', chunk => {
      pending = Buffer.concat([pending, chunk]);
      if (pending.length < 6) return;
      if ((pending[0] & 15) === 8) { socket.end(Buffer.from([0x88, 0])); return; }
      let length = pending[1] & 127;
      let offset = 2;
      if (length === 126) { if (pending.length < 8) return; length = pending.readUInt16BE(2); offset = 4; }
      if (pending.length < offset + 4 + length) return;
      const mask = pending.subarray(offset, offset + 4);
      const body = Buffer.from(pending.subarray(offset + 4, offset + 4 + length));
      for (let index = 0; index < body.length; index++) body[index] ^= mask[index % 4];
      const message = JSON.parse(body.toString());
      pending = pending.subarray(offset + 4 + length);
      backendRequests.push(message);
      let result = { status: 'ok' };
      if (message.type === 'DELETE_PROJECT') assert.equal(message.payload.path, project);
      else if (message.type === 'GET_SETTINGS') result.settings = { includeNestedSessions: nestedSettings.get(message.payload.workingDir) ?? true };
      else if (message.type === 'SAVE_SETTINGS') nestedSettings.set(message.payload.workingDir, message.payload.value);
      else if (message.type === 'GET_SESSIONS') {
        const offset = message.payload.offset || 0;
        const scopedRows = message.payload.includeNested ? sessionRows : sessionRows.filter(row => row.sessionDir === message.payload.workingDir);
        const limit = message.payload.limit || scopedRows.length;
        result = { sessions: scopedRows.slice(offset, offset + limit), total: scopedRows.length, nextOffset: Math.min(offset + limit, scopedRows.length), hasMore: offset + limit < scopedRows.length, scopeDirCount: message.payload.includeNested ? 2 : 1 };
      } else if (message.type === 'RENAME_SESSION') sessionRows.find(row => row.sessionId === message.payload.sessionId).title = message.payload.title;
      else if (message.type === 'DELETE_SESSION') sessionRows = sessionRows.filter(row => row.sessionId !== message.payload.sessionId);
      else assert.equal(message.type, 'MARK_SESSION_READ');
      const payload = Buffer.from(JSON.stringify({ type: 'ACK', payload: { requestId: message.requestId, ...result } }));
      let frame;
      if (payload.length < 126) frame = Buffer.from([0x81, payload.length]);
      else { frame = Buffer.alloc(4); frame[0] = 0x81; frame[1] = 126; frame.writeUInt16BE(payload.length, 2); }
      socket.write(Buffer.concat([frame, payload]));
    });
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const backend = { port: upstream.address().port, token: 'private-token', async start() {}, async stop() {} };
  const service = createLocalService({ home, backend, allowedOrigins, folderDialog: { async select() { return project; }, stop() {} } });
  const server = createServer((req, res) => service.middleware(req, res, () => res.end('shell')));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  service.bind(server);
  await service.start();
  t.after(async () => {
    await service.stop();
    for (const socket of sockets) socket.destroy();
    server.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
    rmSync(home, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  async function client() {
    const response = await fetch(`${base}/desktop-api/sessions`, { method: 'POST', headers: { 'x-swttch-client': 'web' } });
    assert.equal(response.status, 201);
    const { csrf } = await response.json();
    return { cookie: response.headers.get('set-cookie').split(';')[0], 'x-swttch-csrf': csrf, 'Content-Type': 'application/json' };
  }
  return { base, project, client, backendRequests, port: server.address().port };
}

test('common API validates directories, persists recents, and isolates browser projects', async t => {
  const { base, project, client } = await setup(t);
  const first = await client();
  const second = await client();
  let response = await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers: first, body: JSON.stringify({ path: '/missing-directory' }) });
  assert.equal(response.status, 400);
  response = await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers: first, body: JSON.stringify({ path: project }) });
  const opened = await response.json();
  assert.equal(opened.phase, 'chat');
  assert.equal(opened.project, project);
  assert.equal(new URL(opened.chatUrl, base).searchParams.get('workingDir'), project);
  assert.equal(opened.chatUrl.includes('private-token'), false);
  response = await fetch(`${base}/desktop-api/workspace`, { headers: second });
  const other = await response.json();
  assert.equal(other.project, null);
  assert.deepEqual(other.recent, [project]);
  response = await fetch(`${base}${opened.chatUrl}`, { headers: first });
  assert.equal(await response.text(), 'chat-app');
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  response = await fetch(`${base}/internal/local-pair`, { headers: first });
  assert.equal(response.status, 401); // The proxy never adds backend credentials for clients.
});

test('local API rejects missing sessions, forged origins, and mutations without CSRF', async t => {
  const { base, project, client } = await setup(t);
  assert.equal((await fetch(`${base}/desktop-api/workspace`)).status, 401);
  assert.equal((await fetch(`${base}/desktop-api/sessions`, { method: 'POST' })).status, 403);
  assert.equal((await fetch(`${base}/desktop-api/sessions`, { method: 'POST', headers: { 'x-swttch-client': 'web', Origin: 'https://evil.example' } })).status, 403);
  const headers = await client();
  delete headers['x-swttch-csrf'];
  assert.equal((await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers, body: JSON.stringify({ path: project }) })).status, 403);
  const validHeaders = await client();
  assert.equal((await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers: validHeaders, body: JSON.stringify({ path: '~invalid-relative-path' }) })).status, 400);
});

test('API permits the configured frontend origin and rejects other local ports', async t => {
  const { base, project, client } = await setup(t, ['http://localhost:3000']);
  const headers = { ...await client(), Origin: 'http://localhost:3000', 'Sec-Fetch-Site': 'same-site' };
  assert.equal((await fetch(`${base}/desktop-api/workspace`, {
    method: 'PUT', headers, body: JSON.stringify({ path: project }),
  })).status, 200);
  assert.equal((await fetch(`${base}/desktop-api/workspace`, {
    headers: { ...headers, Origin: 'http://localhost:3001' },
  })).status, 403);
});

test('REST project resources persist aliases and pins while enforcing CSRF and methods', async t => {
  const { base, project, client } = await setup(t);
  const headers = await client();
  await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers, body: JSON.stringify({ path: project }) });
  const resource = `${base}/desktop-api/projects/${encodeURIComponent((await (await fetch(base + '/desktop-api/projects', { headers })).json()).projects.find(item => item.path === project).id)}`;
  const updated = await fetch(resource, { method: 'PATCH', headers, body: JSON.stringify({ alias: '새 이름', description: '프로젝트 메모', favorite: true }) });
  assert.equal(updated.status, 200);
  const row = await updated.json();
  assert.equal(row.alias, '새 이름');
  assert.equal(row.description, '프로젝트 메모');
  assert.ok(row.favoritedAt > 0);
  const list = await (await fetch(`${base}/desktop-api/projects`, { headers })).json();
  assert.equal(list.projects[0].alias, '새 이름');
  assert.equal((await fetch(resource, { method: 'POST', headers, body: '{}' })).status, 405);
  assert.equal((await fetch(resource, { method: 'PATCH', headers: { cookie: headers.cookie }, body: '{}' })).status, 403);
  assert.equal((await fetch(resource, { method: 'PATCH', headers, body: '{"favorite":"yes"}' })).status, 400);
  const cleared = await fetch(resource, { method: 'PATCH', headers, body: JSON.stringify({ alias: '', description: '', favorite: false }) });
  assert.equal((await cleared.json()).favoritedAt, 0);
});

test('folder selections and project creation register a project without changing the workspace', async t => {
  const { base, project, client } = await setup(t);
  const headers = await client();
  const selected = await fetch(`${base}/desktop-api/folder-selections`, { method: 'POST', headers, body: '{}' });
  assert.equal(selected.status, 201);
  assert.equal((await selected.json()).path, project);
  const before = await (await fetch(`${base}/desktop-api/projects`, { headers })).json();
  assert.equal(before.projects.some(item => item.path === project), false);
  const invalid = await fetch(`${base}/desktop-api/projects`, { method: 'POST', headers, body: JSON.stringify({ path: project, alias: 123 }) });
  assert.equal(invalid.status, 400);
  assert.equal((await (await fetch(`${base}/desktop-api/projects`, { headers })).json()).projects.some(item => item.path === project), false);
  const created = await fetch(`${base}/desktop-api/projects`, { method: 'POST', headers, body: JSON.stringify({ path: project, alias: '  새 프로젝트  ', description: '  생성 시 설명  ' }) });
  assert.equal(created.status, 201);
  const saved = await created.json();
  assert.equal(saved.path, project);
  assert.equal(saved.alias, '새 프로젝트');
  assert.equal(saved.description, '생성 시 설명');
  assert.equal((await (await fetch(`${base}/desktop-api/workspace`, { headers })).json()).project, null);
  const detail = await fetch(`${base}/desktop-api/projects/${encodeURIComponent((await (await fetch(base + '/desktop-api/projects', { headers })).json()).projects.find(item => item.path === project).id)}`, { headers });
  assert.equal(detail.status, 200);
  const loaded = await detail.json();
  assert.equal(loaded.path, project);
  assert.equal(loaded.alias, '새 프로젝트');
  assert.equal(loaded.description, '생성 시 설명');
  assert.equal((await fetch(`${base}/desktop-api/folder-selections`, { method: 'POST', headers: { cookie: headers.cookie } })).status, 403);
  assert.equal((await fetch(`${base}/desktop-api/projects`, { method: 'POST', headers, body: '{"path":"relative"}' })).status, 400);
});

test('REST delete delegates transcript removal and hides the ORM row only after backend success', async t => {
  const { base, project, client } = await setup(t);
  const headers = await client();
  await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers, body: JSON.stringify({ path: project }) });
  const response = await fetch(`${base}/desktop-api/projects/${encodeURIComponent((await (await fetch(base + '/desktop-api/projects', { headers })).json()).projects.find(item => item.path === project).id)}`, { method: 'DELETE', headers });
  assert.equal(response.status, 204);
  const list = await (await fetch(`${base}/desktop-api/projects`, { headers })).json();
  assert.ok(list.projects[0].hiddenAt > 0);
  assert.equal((await (await fetch(`${base}/desktop-api/workspace`, { headers })).json()).project, null);
  assert.equal(require('node:fs').existsSync(project), true);
});

test('WebSocket proxy preserves original authenticated handshake and rejects foreign origins', async t => {
  const { port } = await setup(t);
  async function handshake(origin) {
    return new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port, path: '/ws?env=BROWSER', headers: {
        host: `127.0.0.1:${port}`, Origin: origin, Upgrade: 'websocket', Connection: 'Upgrade',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13',
        'Sec-WebSocket-Protocol': 'ccg-auth, private-token',
      } });
      req.on('upgrade', (response, socket) => { socket.destroy(); resolve(response.statusCode); });
      req.on('error', error => origin.includes('evil') ? resolve('rejected') : reject(error));
      req.end();
    });
  }
  assert.equal(await handshake(`http://127.0.0.1:${port}`), 101);
  assert.equal(await handshake('https://evil.example'), 'rejected');
});


test('session REST paging preserves raw entries and mutations resolve nested session directories', async t => {
  const { base, project, client, backendRequests } = await setup(t);
  const headers = await client();
  const created = await (await fetch(base + '/desktop-api/projects', { method: 'POST', headers, body: JSON.stringify({ path: project }) })).json();
  const listUrl = base + '/desktop-api/projects/' + created.id + '/sessions';
  mkdirSync(join(project, 'nested'));
  await fetch(base + '/desktop-api/projects', { method: 'POST', headers, body: JSON.stringify({ path: join(project, 'nested') }) });
  const first = await (await fetch(listUrl, { headers })).json();
  assert.equal(first.sessions.length, 30); assert.equal(first.hasMore, true); assert.equal(first.nextOffset, 30);
  assert.deepEqual(first.sessions[0].originalExtra, { preserved: true }); assert.equal(first.scopeDirCount, 2);
  assert.equal(backendRequests.at(-1).payload.includeNested, false);
  const last = await (await fetch(listUrl + '?offset=30', { headers })).json();
  assert.equal(last.sessions.length, 5); assert.equal(last.hasMore, false);
  assert.equal((await (await fetch(listUrl + '?limit=all', { headers })).json()).sessions.length, 35);
  assert.equal((await fetch(listUrl + '?offset=-1', { headers })).status, 400);
  const resource = listUrl + '/session-34';
  assert.equal((await fetch(resource, { method: 'PATCH', headers: { cookie: headers.cookie }, body: '{"title":"rename"}' })).status, 403);
  assert.equal((await fetch(resource, { method: 'PATCH', headers, body: '{"title":" "}' })).status, 400);
  assert.equal((await fetch(resource, { method: 'PATCH', headers, body: '{"title":"  Renamed  "}' })).status, 200);
  assert.equal(backendRequests.at(-1).type, 'RENAME_SESSION'); assert.equal(backendRequests.at(-1).payload.workingDir, join(project, 'nested')); assert.equal(backendRequests.at(-1).payload.title, 'Renamed');
  assert.equal((await fetch(resource + '/read-receipts', { method: 'POST', headers, body: '{}' })).status, 204);
  assert.equal(backendRequests.at(-1).type, 'MARK_SESSION_READ');
  assert.equal((await fetch(listUrl + '/missing', { method: 'DELETE', headers })).status, 404);
  assert.equal((await fetch(resource, { method: 'DELETE', headers })).status, 204);
  assert.equal(backendRequests.at(-1).type, 'DELETE_SESSION'); assert.equal(backendRequests.at(-1).payload.workingDir, join(project, 'nested'));
  assert.equal((await (await fetch(listUrl + '?limit=all', { headers })).json()).sessions.length, 34);
});


test('project session scope persists through the backend and lists only registered descendants', async t => {
  const { base, project, client, backendRequests } = await setup(t);
  const headers = await client();
  const createProject = async path => (await fetch(base + '/desktop-api/projects', { method: 'POST', headers, body: JSON.stringify({ path }) })).json();
  const parent = await createProject(project);
  const nested = join(project, 'nested'); mkdirSync(nested);
  const sibling = project + '-other'; mkdirSync(sibling);
  const child = await createProject(nested); await createProject(sibling);
  const parentResource = base + '/desktop-api/projects/' + parent.id;
  assert.equal((await fetch(parentResource, { method: 'PATCH', headers, body: '{"sessionsExpanded":"true"}' })).status, 400);
  assert.equal((await fetch(parentResource, { method: 'PATCH', headers: { cookie: headers.cookie }, body: '{"sessionsExpanded":true}' })).status, 403);
  const expanded = await (await fetch(parentResource, { method: 'PATCH', headers, body: '{"sessionsExpanded":true}' })).json();
  assert.equal(expanded.sessionsExpanded, true);
  assert.equal((await (await fetch(parentResource, { headers })).json()).sessionsExpanded, true);
  assert.equal((await (await fetch(base + '/desktop-api/projects/' + child.id, { headers })).json()).sessionsExpanded, false);
  const url = base + '/desktop-api/projects/' + parent.id + '/session-scope';
  const before = await (await fetch(url, { headers })).json();
  assert.equal(before.includeNestedSessions, true); assert.deepEqual(before.projects.map(row => row.id), [child.id]);
  assert.equal((await fetch(url, { method: 'PATCH', headers: { cookie: headers.cookie }, body: '{"includeNestedSessions":false}' })).status, 403);
  assert.equal((await fetch(url, { method: 'PATCH', headers, body: '{"includeNestedSessions":"false"}' })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', headers, body: '{}' })).status, 405);
  const saved = await (await fetch(url, { method: 'PATCH', headers, body: '{"includeNestedSessions":false}' })).json();
  assert.equal(saved.includeNestedSessions, false);
  const command = backendRequests.find(message => message.type === 'SAVE_SETTINGS');
  assert.deepEqual(command.payload, { key: 'includeNestedSessions', value: false, scope: 'project', workingDir: project });
  assert.equal((await (await fetch(url, { headers })).json()).includeNestedSessions, false);
  const listUrl = base + '/desktop-api/projects/' + parent.id + '/sessions?limit=all';
  const local = await (await fetch(listUrl, { headers })).json();
  assert.equal(local.sessions.length, 34); assert.equal(local.scopeDirCount, 1);
  await fetch(url, { method: 'PATCH', headers, body: '{"includeNestedSessions":true}' });
  assert.equal((await (await fetch(listUrl, { headers })).json()).sessions.length, 35);
  const childUrl = base + '/desktop-api/projects/' + child.id;
  assert.equal((await fetch(base + '/desktop-api/projects/' + parent.id, { method: 'PATCH', headers, body: JSON.stringify({ projectId: child.id }) })).status, 400);
  assert.equal((await fetch(childUrl, { method: 'PATCH', headers, body: '{"projectId":99999}' })).status, 400);
  await fetch(childUrl, { method: 'PATCH', headers, body: '{"projectId":null}' });
  assert.deepEqual((await (await fetch(url, { headers })).json()).projects, []);
  assert.equal((await (await fetch(listUrl, { headers })).json()).sessions.length, 34);
  // An explicit parent outside the folder hierarchy also determines session scope.
  const siblingProject = (await (await fetch(base + '/desktop-api/projects', { headers })).json()).projects.find(row => row.path === sibling);
  await fetch(childUrl, { method: 'PATCH', headers, body: JSON.stringify({ projectId: siblingProject.id }) });
  const siblingSessions = await (await fetch(base + '/desktop-api/projects/' + siblingProject.id + '/sessions?limit=all', { headers })).json();
  assert.deepEqual(siblingSessions.sessions.map(row => row.sessionId), ['session-34']);
});
