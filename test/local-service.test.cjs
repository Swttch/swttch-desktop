const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer, request } = require('node:http');
const { createHash } = require('node:crypto');
const { mkdtempSync, mkdirSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createLocalService } = require('../src/local-service.cjs');

async function setup(t, allowedOrigins = [], registerProject = true, sourceConfig = () => ({}), seedSessions = true) {
  const home = mkdtempSync(join(tmpdir(), 'swttch-api-test-'));
  const project = join(home, '한글 project & space');
  mkdirSync(project);
  let pairingCount = 0;
  const upstream = createServer((req, res) => {
    if (req.url === '/internal/local-pair' && req.headers['x-ccg-token'] === 'private-token') {
      assert.equal(req.method, 'GET');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: `pair-${++pairingCount}` }));
    } else if (req.url.startsWith('/internal/')) { res.writeHead(401); res.end('unauthorized'); }
    else { res.setHeader('X-Frame-Options', 'SAMEORIGIN'); res.end('chat-app'); }
  });
  const backendRequests = [];
  const nestedSettings = new Map();
  let activeAccount = 'acc-11111111-1111-4111-8111-111111111111';
  const accountRows = [{ id: 'acc-11111111-1111-4111-8111-111111111111', emailAddress: 'one@example.test', displayName: 'One', futureField: { preserved: true } }, { id: 'acc-22222222-2222-4222-8222-222222222222', emailAddress: 'two@example.test', displayName: 'Two' }];
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
      if (message.type === 'GET_ACCOUNTS') result = { status: 'ok', accounts: accountRows.map(row => ({ ...row, active: row.id === activeAccount })), accountPools: [], activeEmail: accountRows.find(row => row.id === activeAccount).emailAddress };
      else if (message.type === 'GET_USAGE_REPORT') result = { status: 'ok', report: "Last 24h · 288 requests · 9 sessions\n75% of your usage was at >150k context\nTop skills: /worktree 3%\nLast 7d · 500 requests · 15 sessions\nTop MCP servers: claude-code-remote 1%", futureField: { preserved: true } };
      else if (message.type === 'SWITCH_ACCOUNT') { if (accountRows.some(row => row.id === message.payload.id)) activeAccount = message.payload.id; else result = { status: 'error', error: 'Not found' }; }
      else if (message.type === 'DELETE_PROJECT') assert.equal(message.payload.path, project);
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
  const service = createLocalService({ home, backend, allowedOrigins, accountUsage: { prepareAccount: async () => {}, invalidate() {}, read: async accounts => ({ accounts }) }, ...await sourceConfig(home), folderDialog: { async select() { return project; }, stop() {} } });
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
  if (registerProject) await fetch(base + '/desktop-api/projects', { method: 'POST', headers: await client(), body: JSON.stringify({ path: project, alias: '', description: '' }) });
  if (registerProject && seedSessions) {
    const headers = await client();
    const row = (await (await fetch(base + '/desktop-api/projects', { headers })).json()).projects.find(row => row.path === project);
    assert.equal((await fetch(base + '/desktop-api/projects/' + row.id + '/session-imports', { method: 'POST', headers, body: '{}' })).status, 201);
  }
  return { base, project, client, backendRequests, port: server.address().port };
}

test('common API validates directories, persists recents, and isolates browser projects', async t => {
  const { base, project, client } = await setup(t);
  const first = await client();
  const second = await client();
  let response = await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers: first, body: JSON.stringify({ path: '/missing-directory' }) });
  assert.equal(response.status, 400);
  assert.equal((await fetch(base + '/desktop-api/workspace', { method: 'PUT', headers: first, body: JSON.stringify({ projectId: 999999 }) })).status, 400);
  response = await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers: first, body: JSON.stringify({ projectId: 1 }) });
  const opened = await response.json();
  assert.equal(opened.phase, 'chat');
  assert.equal(opened.project, project);
  assert.equal(new URL(opened.chatUrl, base).searchParams.get('workingDir'), project);
  assert.equal(new URL(opened.chatUrl).hostname, 'localhost');
  assert.equal(new URL(opened.chatUrl).pathname, '/sessions/new');
  assert.equal(opened.chatUrl.includes('private-token'), false);
  response = await fetch(`${base}/desktop-api/workspace`, { headers: second });
  const other = await response.json();
  assert.equal(other.project, null);
  assert.deepEqual(other.recent, [project]);
  response = await fetch(opened.chatUrl);
  assert.equal(await response.text(), 'chat-app');
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  response = await fetch(`${base}/internal/local-pair`, { headers: first });
  assert.equal(response.status, 401); // The proxy never adds backend credentials for clients.
  const sessionId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const existing = await (await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers: first, body: JSON.stringify({ projectId: 1, sessionId }) })).json();
  assert.equal(new URL(existing.chatUrl).pathname, '/sessions/' + sessionId);
  assert.equal(new URL(existing.chatUrl).searchParams.get('workingDir'), project);
});

test('local API rejects missing sessions, forged origins, and mutations without CSRF', async t => {
  const { base, project, client } = await setup(t);
  assert.equal((await fetch(`${base}/desktop-api/workspace`)).status, 401);
  assert.equal((await fetch(`${base}/desktop-api/sessions`, { method: 'POST' })).status, 403);
  assert.equal((await fetch(`${base}/desktop-api/sessions`, { method: 'POST', headers: { 'x-swttch-client': 'web', Origin: 'https://evil.example' } })).status, 403);
  const headers = await client();
  delete headers['x-swttch-csrf'];
  assert.equal((await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers, body: JSON.stringify({ projectId: 1 }) })).status, 403);
  const validHeaders = await client();
  assert.equal((await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers: validHeaders, body: JSON.stringify({ path: '~invalid-relative-path' }) })).status, 400);
});

test('API permits the configured frontend origin and rejects other local ports', async t => {
  const { base, project, client } = await setup(t, ['http://localhost:3000']);
  const headers = { ...await client(), Origin: 'http://localhost:3000', 'Sec-Fetch-Site': 'same-site' };
  assert.equal((await fetch(`${base}/desktop-api/workspace`, {
    method: 'PUT', headers, body: JSON.stringify({ projectId: 1 }),
  })).status, 200);
  assert.equal((await fetch(`${base}/desktop-api/workspace`, {
    headers: { ...headers, Origin: 'http://localhost:3001' },
  })).status, 403);
});

test('REST project resources persist aliases and pins while enforcing CSRF and methods', async t => {
  const { base, project, client } = await setup(t);
  const headers = await client();
  await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers, body: JSON.stringify({ projectId: 1 }) });
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
  const { base, project, client } = await setup(t, [], false);
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
  await fetch(`${base}/desktop-api/workspace`, { method: 'PUT', headers, body: JSON.stringify({ projectId: 1 }) });
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
  await fetch(base + '/desktop-api/projects/' + created.id + '/session-imports', { method: 'POST', headers, body: '{"includeNested":true}' });
  const requestCount = backendRequests.length;
  const first = await (await fetch(listUrl + '?includeNested=true', { headers })).json();
  assert.equal(first.sessions.length, 30); assert.equal(first.hasMore, true); assert.equal(first.nextOffset, 30);
  assert.deepEqual(first.sessions[0].originalExtra, { preserved: true }); assert.equal(first.scopeDirCount, 2);
  assert.equal(backendRequests.at(-1).payload.includeNested, false);
  assert.equal(backendRequests.at(-1).payload.limit, 30);
  assert.equal(backendRequests.length, requestCount);
  const last = await (await fetch(listUrl + '?offset=30&includeNested=true', { headers })).json();
  assert.equal(last.sessions.length, 5); assert.equal(last.hasMore, false);
  assert.equal((await (await fetch(listUrl + '?limit=all&includeNested=true', { headers })).json()).sessions.length, 35);
  assert.equal((await fetch(listUrl + '?offset=-1', { headers })).status, 400);
  const resource = listUrl + '/session-34';
  assert.equal((await fetch(resource, { method: 'PATCH', headers: { cookie: headers.cookie }, body: '{"title":"rename"}' })).status, 403);
  assert.equal((await fetch(resource, { method: 'PATCH', headers, body: '{"title":" "}' })).status, 400);
  assert.equal((await fetch(resource, { method: 'PATCH', headers, body: '{"title":"  Renamed  "}' })).status, 400);
  assert.equal(backendRequests.some(row => row.type === 'RENAME_SESSION'), false);
  assert.equal((await fetch(resource + '/read-receipts', { method: 'POST', headers, body: '{}' })).status, 204);
  assert.equal(backendRequests.at(-1).type, 'MARK_SESSION_READ');
  assert.equal((await fetch(listUrl + '/missing', { method: 'DELETE', headers })).status, 404);
  assert.equal((await fetch(resource, { method: 'DELETE', headers })).status, 204);
  assert.equal(backendRequests.at(-1).type, 'DELETE_SESSION'); assert.equal(backendRequests.at(-1).payload.workingDir, join(project, 'nested'));
  assert.equal((await (await fetch(listUrl + '?limit=all&includeNested=true', { headers })).json()).sessions.length, 34);
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
  await fetch(base + '/desktop-api/projects/' + parent.id + '/session-imports', { method: 'POST', headers, body: '{"includeNested":true}' });
  const listUrl = base + '/desktop-api/projects/' + parent.id + '/sessions?limit=all';
  const local = await (await fetch(listUrl, { headers })).json();
  assert.equal(local.sessions.length, 34); assert.equal(local.scopeDirCount, 1);
  await fetch(url, { method: 'PATCH', headers, body: '{"includeNestedSessions":true}' });
  assert.equal((await (await fetch(listUrl + '&includeNested=true', { headers })).json()).sessions.length, 35);
  const childUrl = base + '/desktop-api/projects/' + child.id;
  assert.equal((await fetch(base + '/desktop-api/projects/' + parent.id, { method: 'PATCH', headers, body: JSON.stringify({ projectId: child.id }) })).status, 400);
  assert.equal((await fetch(childUrl, { method: 'PATCH', headers, body: '{"projectId":99999}' })).status, 400);
  await fetch(childUrl, { method: 'PATCH', headers, body: '{"projectId":null}' });
  assert.deepEqual((await (await fetch(url, { headers })).json()).projects, []);
  assert.equal((await (await fetch(listUrl, { headers })).json()).sessions.length, 34);
  // An explicit parent outside the folder hierarchy also determines session scope.
  const siblingProject = (await (await fetch(base + '/desktop-api/projects', { headers })).json()).projects.find(row => row.path === sibling);
  await fetch(childUrl, { method: 'PATCH', headers, body: JSON.stringify({ projectId: siblingProject.id }) });
  const siblingSessions = await (await fetch(base + '/desktop-api/projects/' + siblingProject.id + '/sessions?limit=all&includeNested=true', { headers })).json();
  assert.deepEqual(siblingSessions.sessions.map(row => row.sessionId), ['session-34']);
});

test('desktop rename uses the CLI adapter, syncs the source into ORM, and leaves legacy aliases intact', async t => {
  const fs = require('node:fs/promises');
  const { pathToFileURL } = require('node:url');
  let aliasFile, calls = [];
  const { base, client, backendRequests } = await setup(t, [], true, async home => {
    const source = join(home, 'source'); await fs.mkdir(source);
    const src = join(source, 'session-0.jsonl');
    await fs.writeFile(src, JSON.stringify({ type: 'user', timestamp: '2026-10-01T00:00:00Z', message: { role: 'user', content: 'Original title' } }) + '\n');
    aliasFile = join(source, '.claude-code-gui-session-titles.json'); await fs.writeFile(aliasFile, '{"session-0":"Legacy alias"}');
    const parser = await import(pathToFileURL(join(__dirname, '../dist/session-source.mjs')).href);
    return { sourceReader: async () => ({ ...parser, getProjectSessionsPath: async () => source }), renameSession: async args => { calls.push(args); await fs.appendFile(args.src, JSON.stringify({ type: 'custom-title', customTitle: args.title, sessionId: args.uid }) + '\n'); } };
  });
  const headers = await client(), resource = base + '/desktop-api/projects/1/sessions/session-0';
  const response = await fetch(resource, { method: 'PATCH', headers, body: '{"title":" Renamed via CLI "}' });
  assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.session.customTitle, 'Renamed via CLI'); assert.equal(result.session.alias, 'Legacy alias'); assert.equal(result.session.title, 'Original title');
  assert.equal(calls.length, 1); assert.equal(calls[0].uid, 'session-0'); assert.ok(result.session.sourceSyncedAt);
  assert.equal(backendRequests.some(row => row.type === 'RENAME_SESSION'), false);
  assert.equal(await fs.readFile(aliasFile, 'utf8'), '{"session-0":"Legacy alias"}');
  const syncUrl = base + '/desktop-api/session-source-syncs';
  assert.equal((await fetch(syncUrl, { method: 'POST', headers: { cookie: headers.cookie }, body: '{}' })).status, 403);
  const batch = await (await fetch(syncUrl, { method: 'POST', headers, body: '{"uids":["session-0","missing"]}' })).json();
  assert.deepEqual(batch.results.map(row => row.status), ['fulfilled', 'rejected']);
  const bulk = await (await fetch(syncUrl, { method: 'POST', headers, body: '{}' })).json(); assert.equal(bulk.results.length, 34); assert.equal(bulk.results.filter(row => row.status === 'fulfilled').length, 1);
});

test('active sessions REST reads DB only and backend activity hydrates missing rows before subsequent queries', async t => {
  let publish;
  const { base, client, backendRequests } = await setup(t, [], true, () => ({
    subscribe(_backend, callback) { publish = callback; return () => {}; },
  }), false);
  const headers = await client();
  const before = backendRequests.length;
  let response = await fetch(base + '/desktop-api/active-sessions', { headers });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).rows.length, 0);
  assert.equal(backendRequests.length, before);
  const projectResponse = await fetch(base + '/desktop-api/projects', { headers });
  const project = (await projectResponse.json()).projects[0];
  const uid = 'session-0';
  publish('activity', { open: [uid], activity: { [uid]: 'running' } });
  for (let attempt = 0; attempt < 50; attempt++) {
    response = await fetch(base + '/desktop-api/active-sessions', { headers });
    if ((await response.json()).rows[0]?.session.sessionId === uid) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal((await (await fetch(base + '/desktop-api/active-sessions', { headers })).json()).rows[0].session.sessionId, uid);
  // This UID was never fetched by a UI list. Event hydration must discover it.
  publish('activity', { open: ['session-32'], activity: { 'session-32': 'awaiting' } });
  let hydrated;
  for (let attempt = 0; attempt < 50; attempt++) {
    hydrated = await (await fetch(base + '/desktop-api/active-sessions', { headers })).json();
    if (hydrated.rows[0]?.session.sessionId === 'session-32') break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(hydrated.rows[0].session.sessionId, 'session-32');
  assert.equal(hydrated.rows[0].session.originalExtra.preserved, true);
  const queriesBefore = backendRequests.filter(row => row.type === 'GET_SESSIONS').length;
  await fetch(base + '/desktop-api/active-sessions?offset=0&limit=5', { headers });
  assert.equal(backendRequests.filter(row => row.type === 'GET_SESSIONS').length, queriesBefore);
  publish('activity', { open: [], activity: {} });
  response = await fetch(base + '/desktop-api/active-sessions', { headers });
  assert.equal((await response.json()).rows.length, 0);
  assert.equal((await fetch(base + '/desktop-api/active-sessions?offset=-1', { headers })).status, 400);
});

test('session migration is explicit, paged and repeatable; list GET stays DB-only and exposes event-driven state', async t => {
  let publish;
  const { base, project, client, backendRequests } = await setup(t, [], true, () => ({ subscribe(_backend, callback) { publish = callback; return () => {}; } }), false);
  const headers = await client();
  const owner = (await (await fetch(base + '/desktop-api/projects', { headers })).json()).projects.find(row => row.path === project);
  const listUrl = base + '/desktop-api/projects/' + owner.id + '/sessions';
  const importUrl = base + '/desktop-api/projects/' + owner.id + '/session-imports';
  const before = backendRequests.length;
  assert.equal((await (await fetch(listUrl, { headers })).json()).total, 0);
  assert.equal(backendRequests.length, before);
  assert.equal((await fetch(importUrl, { method: 'POST', headers: { cookie: headers.cookie }, body: '{}' })).status, 403);
  assert.equal((await fetch(importUrl, { method: 'POST', headers, body: '{"includeNested":"yes"}' })).status, 400);
  for (let attempt = 0; attempt < 2; attempt++) {
    const imported = await (await fetch(importUrl, { method: 'POST', headers, body: '{}' })).json();
    assert.equal(imported.imported, 34);
  }
  const after = backendRequests.length;
  const first = await (await fetch(listUrl + '?limit=5', { headers })).json();
  assert.equal(first.sessions.length, 5); assert.equal(first.total, 34); assert.equal(first.hasMore, true);
  assert.equal((await (await fetch(listUrl + '?limit=all', { headers })).json()).sessions.length, 34);
  assert.equal(backendRequests.length, after);
  publish('activity', { open: ['session-0'], activity: { 'session-0': 'running' } });
  let entries = (await (await fetch(listUrl + '?limit=all', { headers })).json()).sessions;
  assert.equal(entries.find(row => row.sessionId === 'session-0').isOpen, true);
  assert.equal(entries.find(row => row.sessionId === 'session-0').activity, 'running');
  publish('activity', { open: ['session-0'], activity: { 'session-0': 'done' } });
  entries = (await (await fetch(listUrl + '?limit=all', { headers })).json()).sessions;
  assert.equal(entries.find(row => row.sessionId === 'session-0').activity, 'done');
  publish('sessions', { action: 'delete', session: { sessionId: 'session-0' } });
  for (let attempt = 0; attempt < 50; attempt++) {
    entries = (await (await fetch(listUrl + '?limit=all', { headers })).json()).sessions;
    if (!entries.some(row => row.sessionId === 'session-0')) break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(entries.some(row => row.sessionId === 'session-0'), false);
});

test('session favorites are DB-only mutations, retain source metadata, and paginate with total counts', async t => {
  const { base, client, backendRequests } = await setup(t);
  const headers = await client(), root = base + '/desktop-api/projects/1/sessions/';
  const before = backendRequests.length;
  assert.equal((await fetch(root + 'session-0', { method: 'PATCH', headers: { cookie: headers.cookie }, body: '{"favorite":true}' })).status, 403);
  assert.equal((await fetch(root + 'session-0', { method: 'PATCH', headers, body: '{"favorite":"true"}' })).status, 400);
  assert.equal((await fetch(root + 'missing', { method: 'PATCH', headers, body: '{"favorite":true}' })).status, 404);
  for (let index = 0; index < 6; index++) assert.equal((await fetch(root + 'session-' + index, { method: 'PATCH', headers, body: '{"favorite":true}' })).status, 200);
  const first = await (await fetch(base + '/desktop-api/favorite-sessions', { headers })).json();
  assert.equal(first.total, 6); assert.equal(first.rows.length, 5); assert.equal(first.hasMore, true);
  const last = await (await fetch(base + '/desktop-api/favorite-sessions?offset=5', { headers })).json();
  assert.equal(last.rows.length, 1); assert.equal(last.total, 6); assert.equal(last.hasMore, false);
  assert.equal(first.rows[0].session.originalExtra.preserved, true);
  const original = await (await fetch(root + 'session-0', { method: 'PATCH', headers, body: '{"favorite":true}' })).json();
  const repeated = await (await fetch(root + 'session-0', { method: 'PATCH', headers, body: '{"favorite":true}' })).json();
  assert.equal(original.session.favoritedAt, repeated.session.favoritedAt);
  assert.equal(backendRequests.length, before);
  assert.equal((await fetch(root + 'session-0', { method: 'PATCH', headers, body: '{"favorite":false}' })).status, 200);
  assert.equal((await (await fetch(base + '/desktop-api/favorite-sessions', { headers })).json()).total, 5);
});

test('project order REST enforces CSRF, validates full membership and atomically changes pin and order', async t => {
  const { base, client } = await setup(t);
  const headers = await client();
  const project = (await (await fetch(base + '/desktop-api/projects', { headers })).json()).projects[0];
  const payload = { projectIds: [project.id], projectId: project.id, favorite: true };
  assert.equal((await fetch(base + '/desktop-api/project-order', { method: 'PUT', headers: { ...headers, 'x-swttch-csrf': 'bad' }, body: JSON.stringify(payload) })).status, 403);
  assert.equal((await fetch(base + '/desktop-api/project-order', { method: 'POST', headers, body: JSON.stringify(payload) })).status, 405);
  const response = await fetch(base + '/desktop-api/project-order', { method: 'PUT', headers, body: JSON.stringify(payload) });
  assert.equal(response.status, 200);
  const saved = (await response.json()).projects;
  assert.ok(saved[0].favoritedAt > 0); assert.equal(saved[0].sortOrder, 0);
  assert.equal((await fetch(base + '/desktop-api/project-order', { method: 'PUT', headers, body: JSON.stringify({ ...payload, projectIds: [project.id, project.id], favorite: false }) })).status, 400);
  assert.deepEqual((await (await fetch(base + '/desktop-api/projects', { headers })).json()).projects, saved);
});

test('provider usage REST requires app authentication and protects refreshes with CSRF', async t => {
  const reads = [];
  const snapshot = { profile: { account: { display_name: 'Test' } }, usage: { future: { preserved: true } }, errors: { profile: null, usage: null }, checkedAt: 123 };
  const { base, client } = await setup(t, [], false, () => ({ providerUsage: { async read(options) { reads.push(options); return snapshot; } } }), false);
  const path = base + '/desktop-api/provider-usage';
  const refreshPath = base + '/desktop-api/provider-usage-refreshes';
  assert.equal((await fetch(path)).status, 401);
  const headers = await client();
  assert.deepEqual(await (await fetch(path, { headers })).json(), snapshot);
  assert.equal((await fetch(path, { method: 'POST', headers })).status, 405);
  assert.equal((await fetch(refreshPath, { method: 'POST', headers: { cookie: headers.cookie } })).status, 403);
  assert.equal((await fetch(path, { headers: { ...headers, Origin: 'https://foreign.test' } })).status, 403);
  assert.deepEqual(await (await fetch(refreshPath, { method: 'POST', headers })).json(), snapshot);
  assert.deepEqual(reads, [{ refresh: false }, { refresh: true }]);
});

test('account dropdown API reuses CCG switching, preserves original accounts and protects account actions', async t => {
  let invalidations = 0;
  const { base, client, backendRequests } = await setup(t, [], false, () => ({ providerUsage: { invalidate() { invalidations++; } } }), false);
  const headers = await client();
  const list = base + '/desktop-api/accounts';
  const active = base + '/desktop-api/active-account';
  assert.equal((await fetch(list)).status, 401);
  const accounts = await (await fetch(list, { headers })).json();
  assert.deepEqual(accounts.accounts[0].futureField, { preserved: true });
  assert.equal(accounts.accounts[0].active, true);
  assert.equal((await fetch(active, { method: 'PUT', headers: { cookie: headers.cookie }, body: '{"id":"acc-22222222-2222-4222-8222-222222222222"}' })).status, 403);
  assert.equal((await fetch(active, { method: 'PUT', headers, body: '{"id":"not-an-account"}' })).status, 400);
  assert.equal((await fetch(active, { method: 'PUT', headers: { ...headers, Origin: 'https://foreign.test' }, body: '{"id":"acc-22222222-2222-4222-8222-222222222222"}' })).status, 403);
  const switched = await (await fetch(active, { method: 'PUT', headers, body: '{"id":"acc-22222222-2222-4222-8222-222222222222"}' })).json();
  assert.equal(switched.accounts.find(row => row.id === 'acc-22222222-2222-4222-8222-222222222222').active, true);
  assert.equal(invalidations, 1);
  assert.equal(backendRequests.filter(row => row.type === 'SWITCH_ACCOUNT').length, 1);
  assert.equal((await fetch(active, { method: 'PUT', headers, body: '{"id":"acc-33333333-3333-4333-8333-333333333333"}' })).status, 502);
  const viewPath = base + '/desktop-api/account-views';
  assert.equal((await fetch(viewPath, { method: 'POST', headers, body: '{"path":"https://foreign.test/"}' })).status, 400);
  for (const path of ['/switch-account', '/settings/account']) {
    const view = await (await fetch(viewPath, { method: 'POST', headers, body: JSON.stringify({ path }) })).json();
    const url = new URL(view.url, base);
    assert.equal(url.pathname, path);
    assert.ok(url.searchParams.get('workingDir'));
    assert.match(url.searchParams.get('pair'), /^pair-/);
    assert.ok(!view.url.includes('private-token'));
  }
});

test('usage contribution API preserves raw CLI output, uses workspace scope and protects forced refreshes', async t => {
  const { base, project, client, backendRequests } = await setup(t, [], true, () => ({}), false);
  const headers = await client();
  await fetch(base + '/desktop-api/workspace', { method: 'PUT', headers, body: '{"projectId":1}' });
  const url = base + '/desktop-api/usage-report';
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { method: 'POST', headers })).status, 405);
  const result = await (await fetch(url + '?workingDir=/not-allowed', { headers })).json();
  assert.match(result.report, /Last 24h · 288 requests · 9 sessions/);
  assert.deepEqual(result.futureField, { preserved: true });
  assert.deepEqual(backendRequests.find(row => row.type === 'GET_USAGE_REPORT').payload, { force: false, workingDir: project });
  const refresh = base + '/desktop-api/usage-report-refreshes';
  assert.equal((await fetch(refresh, { method: 'POST', headers: { cookie: headers.cookie } })).status, 403);
  assert.equal((await fetch(refresh, { method: 'POST', headers: { ...headers, Origin: 'https://foreign.test' } })).status, 403);
  assert.equal((await fetch(refresh, { method: 'POST', headers })).status, 200);
  assert.deepEqual(backendRequests.filter(row => row.type === 'GET_USAGE_REPORT').map(row => row.payload.force), [false, true]);
});

test('all saved-account usage refreshes validate membership and CSRF while preserving fields', async t => {
  const calls = [];
  const { base, client } = await setup(t, [], false, () => ({ accountUsage: { prepareAccount: async () => {}, invalidate() {}, async read(accounts, options) { calls.push(options); return { accounts: accounts.map(account => ({ ...account, usage: { futureField: true } })) }; } } }), false);
  const headers = await client();
  const path = base + '/desktop-api/account-usage';
  assert.equal((await fetch(path)).status, 401);
  const result = await (await fetch(path, { headers })).json();
  assert.equal(result.accounts.length, 2);
  assert.equal(result.accounts[1].active, false);
  assert.equal(result.accounts[1].usage.futureField, true);
  const refresh = base + '/desktop-api/account-usage-refreshes';
  assert.equal((await fetch(refresh, { method: 'POST', headers: { cookie: headers.cookie } })).status, 403);
  assert.equal((await fetch(refresh, { method: 'POST', headers, body: '{"accountId":"acc-missing"}' })).status, 400);
  assert.equal((await fetch(refresh, { method: 'POST', headers, body: '{"accountId":"acc-22222222-2222-4222-8222-222222222222"}' })).status, 200);
  assert.equal((await fetch(refresh, { method: 'POST', headers, body: '{}' })).status, 200);
  assert.deepEqual(calls.map(call => call.refresh), [false, true, true]);
});

test('session metadata reads preserve fields and settings views enforce CSRF and fixed routes', async t => {
  const { base, client } = await setup(t);
  const headers = await client();
  const response = await fetch(base + '/desktop-api/projects/1/sessions/session-0', { headers });
  assert.equal(response.status, 200);
  const metadata = await response.json();
  assert.deepEqual(metadata.session.originalExtra, { preserved: true });
  assert.equal(metadata.session.favoritedAt, 0);
  assert.equal((await fetch(base + '/desktop-api/settings-views', { method: 'POST', headers: { ...headers, 'x-swttch-csrf': 'wrong' }, body: '{}' })).status, 403);
  const settings = await fetch(base + '/desktop-api/settings-views', { method: 'POST', headers, body: JSON.stringify({ path: 'https://other.example/' }) });
  assert.equal(settings.status, 201);
  const url = new URL((await settings.json()).url, base);
  assert.equal(url.origin, base);
  assert.equal(url.pathname, '/settings/general');
  assert.equal(url.searchParams.get('top_bar_display'), 'F');
  assert.ok(url.searchParams.get('pair'));
});

test('desktop clients restore their view while browser clients remain isolated', async t => {
  const { base, project, client } = await setup(t);
  async function desktop() {
    const res = await fetch(base + '/desktop-api/sessions', { method: 'POST', headers: { 'x-swttch-client': 'desktop' } });
    const body = await res.json();
    return { state: body.state, headers: { cookie: res.headers.get('set-cookie').split(';')[0], 'x-swttch-csrf': body.csrf, 'Content-Type': 'application/json' } };
  }
  const first = await desktop(), uid = '20a9df36-6ab1-421b-ab66-cc1d5b0c3413';
  assert.equal((await fetch(base + '/desktop-api/workspace', { method: 'PUT', headers: first.headers, body: JSON.stringify({ projectId: 1, sessionId: uid }) })).status, 200);
  const restored = await desktop();
  assert.equal(restored.state.project, project);
  assert.equal(new URL(restored.state.chatUrl).pathname, '/sessions/' + uid);
  assert.equal((await (await fetch(base + '/desktop-api/workspace', { headers: await client() })).json()).project, null);
  assert.equal((await fetch(base + '/desktop-api/workspace', { method: 'PATCH', headers: first.headers, body: JSON.stringify({ sessionId: 'wrong' }) })).status, 400);
  assert.equal((await fetch(base + '/desktop-api/workspace', { method: 'DELETE', headers: { ...first.headers, 'x-swttch-csrf': 'wrong' } })).status, 403);
  assert.equal((await (await fetch(base + '/desktop-api/workspace', { headers: first.headers })).json()).chatUrl !== null, true);
  const closed = await fetch(base + '/desktop-api/workspace', { method: 'DELETE', headers: first.headers });
  assert.equal(closed.status, 200);
  assert.equal((await closed.json()).chatUrl, null);
  assert.equal((await desktop()).state.chatUrl, null);
  assert.equal((await (await fetch(base + '/desktop-api/workspace', { headers: restored.headers })).json()).chatUrl !== null, true);
});
