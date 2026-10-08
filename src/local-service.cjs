const { randomBytes, createHash } = require('node:crypto');
const { request } = require('node:http');
const { mkdirSync, appendFileSync, statSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { homedir } = require('node:os');
const { API_PATH } = require('./api-paths.mjs');
const { PATH } = require('./paths.mjs');
const { Backend } = require('./backend.cjs');
const { createFolderDialog } = require('./folder-dialog.cjs');
const { projectDescendants } = require('./database/project-hierarchy.cjs');
const { openStore } = require('./store.cjs');
const { getControlToken } = require('./launcher-auth.cjs');
const { subscribeBackend } = require('./backend-events.cjs');
const { backendRequest } = require('./backend-request.cjs');

function createLocalService({ home = process.env.SWTTCH_DESKTOP_HOME || join(homedir(), '.swttch'), backend: suppliedBackend, allowedOrigins = [], folderDialog: suppliedFolderDialog } = {}) {
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const store = openStore(home);
  const folderDialog = suppliedFolderDialog || createFolderDialog();
  const sessions = new Map();
  const streams = new Map();
  const boundServers = new WeakSet();
  let phase = 'starting';
  let message = '채팅 환경을 준비하고 있습니다.';
  let port;
  let starting;
  let stopping = false;
  let unsubscribeBackend = () => {};
  let sessionActivity = { activity: {}, open: [] };
  let sessionsRevision = 0;
  const pluginRoot = resolve(__dirname, '../../..');
  const backend = suppliedBackend || new Backend({
    runtime: process.env.SWTTCH_RUNTIME_DIR || join(pluginRoot, 'backend/dist'), home, token: getControlToken(home),
    onLog: line => appendFileSync(join(home, 'desktop-backend.log'), `${line}\n`),
    onExit: () => {
      if (stopping || starting) return;
      phase = 'error'; message = '채팅 연결이 종료됐습니다. 다시 연결해 주세요.';
      broadcast();
    },
  });
  if (!suppliedBackend && !process.env.SWTTCH_RUNTIME_DIR) backend.webview = join(pluginRoot, 'webview/dist');

  const state = session => ({
    phase: phase === 'ready' && session.project ? 'chat' : phase,
    message, project: session.project, chatUrl: phase === 'ready' ? session.chatUrl : null,
    recent: store.recent(), projects: store.projects(),
    sessionActivity, sessionsRevision,
    backendId: createHash('sha256').update(backend.token).digest('hex'),
  });
  function broadcast() {
    for (const [response, session] of streams) response.write(`data: ${JSON.stringify(state(session))}\n\n`);
  }
  function start() {
    if (starting) return starting;
    unsubscribeBackend(); sessionActivity = { activity: {}, open: [] };
    phase = 'starting'; message = '채팅 환경을 준비하고 있습니다.';
    for (const session of sessions.values()) { session.project = null; session.chatUrl = null; }
    broadcast();
    starting = (async () => {
      try {
        await backend.stop();
        await backend.start();
        phase = 'ready'; message = '프로젝트를 선택해 시작하세요.';
        if (!suppliedBackend) unsubscribeBackend = subscribeBackend(backend, (type, payload) => {
          if (type === 'activity') sessionActivity = payload;
          else sessionsRevision++;
          broadcast();
        });
      } catch (error) { phase = 'error'; message = error.message; }
      finally { starting = null; broadcast(); }
    })();
    return starting;
  }
  function json(response, code, body) {
    response.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(body));
  }
  function allowed(req) {
    const expected = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!expected.includes(req.headers.host)) return false;
    if (req.headers['sec-fetch-site'] === 'cross-site') return false;
    if (req.headers.origin && ![...expected.map(host => `http://${host}`), ...allowedOrigins].includes(req.headers.origin)) return false;
    return true;
  }
  const cookieName = () => `swttch-desktop-${port}`;
  function getSession(req) {
    const cookie = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName()}=`));
    return cookie ? sessions.get(cookie.slice(cookieName().length + 1)) : null;
  }
  async function readBody(req) {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 8192) throw new Error('요청이 너무 큽니다.');
    }
    return JSON.parse(body || '{}');
  }

  async function getProjectSessions(project, offset = 0, limit) {
    const settings = await backendRequest(backend, 'GET_SETTINGS', { workingDir: project.path });
    if (settings.status === 'error') throw new Error(settings.error || '설정을 불러오지 못했습니다.');
    const children = settings.settings?.includeNestedSessions === true
      ? projectDescendants(store.projects(), project.id).filter(row => !row.hiddenAt) : [];
    if (!children.length) return backendRequest(backend, 'GET_SESSIONS', {
      workingDir: project.path, includeNested: false, offset, ...(limit === undefined ? {} : { limit }),
    });
    // DB association determines scope; the reused backend still owns session I/O.
    const pages = await Promise.all([project, ...children].map(row => backendRequest(backend, 'GET_SESSIONS', { workingDir: row.path, includeNested: false })));
    const failed = pages.find(page => page.status === 'error' || page.serviceError);
    if (failed) throw new Error(failed.error || failed.serviceError || '세션을 불러오지 못했습니다.');
    const entries = new Map();
    for (const page of pages) for (const row of page.sessions || []) entries.set(row.sessionId, row);
    const rows = [...entries.values()].sort((a, b) => (Date.parse(b.lastTimestamp || b.createdAt) || 0) - (Date.parse(a.lastTimestamp || a.createdAt) || 0));
    const sessions = rows.slice(offset, limit === undefined ? undefined : offset + limit);
    const nextOffset = offset + sessions.length;
    return { ...pages[0], sessions, total: rows.length, hasMore: nextOffset < rows.length, nextOffset, scopeDirCount: children.length + 1 };
  }

  async function api(req, res) {
    if (!allowed(req)) return json(res, 403, { error: 'Forbidden origin' });
    const path = new URL(req.url, `http://${req.headers.host}`).pathname;
    let session = getSession(req);
    if (path === API_PATH.SESSIONS && req.method === 'POST') {
      // A custom header prevents cross-origin forms/no-cors requests from bootstrapping.
      if (req.headers['x-swttch-client'] !== 'web') return json(res, 403, { error: 'Missing client header' });
      if (!session) {
        const id = randomBytes(32).toString('hex');
        session = { csrf: randomBytes(24).toString('hex'), project: null, chatUrl: null };
        sessions.set(id, session);
        res.setHeader('Set-Cookie', `${cookieName()}=${id}; HttpOnly; SameSite=Strict; Path=/`);
      }
      return json(res, 201, { csrf: session.csrf, state: state(session) });
    }
    if (!session) return json(res, 401, { error: '앱 연결이 만료됐습니다. 새로고침해 주세요.' });
    if (path === API_PATH.EVENTS && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      streams.set(res, session);
      res.write(`data: ${JSON.stringify(state(session))}\n\n`);
      const timer = setInterval(() => res.write(': heartbeat\n\n'), 15000);
      res.on('close', () => { clearInterval(timer); streams.delete(res); });
      return;
    }
    if (path === API_PATH.WORKSPACE && req.method === 'GET') return json(res, 200, state(session));
    if (path === API_PATH.FOLDER_SELECTIONS || (path === API_PATH.PROJECTS && req.method !== 'GET')) {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Method not allowed' }); }
      if (req.headers['x-swttch-csrf'] !== session.csrf) return json(res, 403, { error: 'Invalid request token' });
      try {
        if (path === API_PATH.FOLDER_SELECTIONS) return json(res, 201, { path: await folderDialog.select() });
        const body = await readBody(req);
        if (typeof body.path !== 'string' || !require('node:path').isAbsolute(body.path)) throw new Error('프로젝트 폴더를 선택해 주세요.');
        const absolute = resolve(body.path);
        if (!statSync(absolute).isDirectory()) throw new Error('파일이 아닌 폴더를 선택해 주세요.');
        const fields = {};
        for (const key of ['alias', 'description']) {
          if (body[key] !== undefined && typeof body[key] !== 'string') throw new Error('이름과 설명은 문자열이어야 합니다.');
          if (body[key] !== undefined) fields[key] = body[key].trim() || null;
        }
        const project = store.createProject(absolute, fields); sessionsRevision++; broadcast();
        return json(res, 201, project);
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    const scopeMatch = /^\/desktop-api\/projects\/([^/]+)\/session-scope$/.exec(path);
    if (scopeMatch) {
      if (!['GET', 'PATCH'].includes(req.method)) { res.setHeader('Allow', 'GET, PATCH'); return json(res, 405, { error: 'Method not allowed' }); }
      if (req.method === 'PATCH' && req.headers['x-swttch-csrf'] !== session.csrf) return json(res, 403, { error: 'Invalid request token' });
      try {
        if (phase !== 'ready') throw new Error('채팅 환경이 아직 준비되지 않았습니다.');
        const projects = store.projects();
        const project = projects.find(row => String(row.id) === decodeURIComponent(scopeMatch[1]) && !row.hiddenAt);
        if (!project) return json(res, 404, { error: '등록되지 않은 프로젝트입니다.' });
        if (req.method === 'PATCH') {
          const body = await readBody(req);
          if (typeof body.includeNestedSessions !== 'boolean') throw new Error('하위 프로젝트 포함 여부를 확인해 주세요.');
          const saved = await backendRequest(backend, 'SAVE_SETTINGS', { key: 'includeNestedSessions', value: body.includeNestedSessions, scope: 'project', workingDir: project.path });
          if (saved.status === 'error') throw new Error(saved.error || '설정을 저장하지 못했습니다.');
          sessionsRevision++; broadcast();
        }
        const settings = await backendRequest(backend, 'GET_SETTINGS', { workingDir: project.path });
        if (settings.status === 'error') throw new Error(settings.error || '설정을 불러오지 못했습니다.');
        const children = projectDescendants(projects, project.id).filter(row => !row.hiddenAt);
        return json(res, 200, { includeNestedSessions: settings.settings?.includeNestedSessions === true, projects: children });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    const projectSessionMatch = /^\/desktop-api\/projects\/([^/]+)\/sessions$/.exec(path);
    if (path === API_PATH.PROJECTS && req.method === 'GET') return json(res, 200, { projects: store.projects(), homeDir: homedir() });
    if (projectSessionMatch && req.method === 'GET') {
      try {
        if (phase !== 'ready') throw new Error('채팅 환경이 아직 준비되지 않았습니다.');
        const project = store.projects().find(project => String(project.id) === decodeURIComponent(projectSessionMatch[1]));
        if (!project) return json(res, 404, { error: '등록되지 않은 프로젝트입니다.' });
        const params = new URL(req.url, 'http://localhost').searchParams;
        const offset = Number(params.get('offset') || 0);
        const limit = params.get('limit') === 'all' ? undefined : Number(params.get('limit') || 30);
        if (!Number.isSafeInteger(offset) || offset < 0 || (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100))) throw new Error('페이지 범위를 확인해 주세요.');
        return json(res, 200, await getProjectSessions(project, offset, limit));
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    const sessionResource = /^\/desktop-api\/projects\/([^/]+)\/sessions\/([^/]+)(\/read-receipts)?$/.exec(path);
    if (sessionResource) {
      const method = sessionResource[3] ? 'POST' : 'PATCH, DELETE';
      if (!(sessionResource[3] ? ['POST'] : ['PATCH', 'DELETE']).includes(req.method)) { res.setHeader('Allow', method); return json(res, 405, { error: 'Method not allowed' }); }
      if (req.headers['x-swttch-csrf'] !== session.csrf) return json(res, 403, { error: 'Invalid request token' });
      try {
        if (phase !== 'ready') throw new Error('채팅 환경이 아직 준비되지 않았습니다.');
        const project = store.projects().find(project => String(project.id) === decodeURIComponent(sessionResource[1]));
        if (!project) return json(res, 404, { error: '등록되지 않은 프로젝트입니다.' });
        const sessionId = decodeURIComponent(sessionResource[2]);
        if (!/^[a-zA-Z0-9-]+$/.test(sessionId)) throw new Error('세션 ID를 확인해 주세요.');
        const page = await getProjectSessions(project);
        const row = page.sessions?.find(row => row.sessionId === sessionId);
        if (!row) return json(res, 404, { error: '이 프로젝트에 없는 세션입니다.' });
        const body = req.method === 'PATCH' ? await readBody(req) : {};
        if (req.method === 'PATCH' && (typeof body.title !== 'string' || !body.title.trim())) throw new Error('세션 이름을 입력해 주세요.');
        const type = sessionResource[3] ? 'MARK_SESSION_READ' : req.method === 'PATCH' ? 'RENAME_SESSION' : 'DELETE_SESSION';
        const result = await backendRequest(backend, type, { sessionId, workingDir: row.sessionDir || project.path, ...(body.title ? { title: body.title.trim() } : {}) });
        if (result.status === 'error') throw new Error(result.error || '세션을 변경하지 못했습니다.');
        if (req.method === 'DELETE') for (const client of sessions.values()) {
          if (client.chatUrl?.split('?')[0] === '/sessions/' + sessionId) { client.project = null; client.chatUrl = null; }
        }
        if (!sessionResource[3]) sessionsRevision++;
        broadcast();
        if (req.method === 'PATCH') return json(res, 200, result);
        res.writeHead(204); res.end(); return;
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    const projectMatch = /^\/desktop-api\/projects\/([^/]+)$/.exec(path);
    if (projectMatch) {
      if (!['GET', 'PATCH', 'DELETE'].includes(req.method)) { res.setHeader('Allow', 'GET, PATCH, DELETE'); return json(res, 405, { error: 'Method not allowed' }); }
      if (req.method !== 'GET' && req.headers['x-swttch-csrf'] !== session.csrf) return json(res, 403, { error: 'Invalid request token' });
      try {
        const project = store.projects().find(project => String(project.id) === decodeURIComponent(projectMatch[1]));
        if (!project) return json(res, 404, { error: '등록되지 않은 프로젝트입니다.' });
        const projectPath = project.path;
        if (req.method === 'GET') return json(res, 200, store.projects().find(project => project.path === projectPath));
        if (req.method === 'PATCH') {
          const body = await readBody(req);
          const fields = {};
          for (const key of ['alias', 'description']) {
            if (body[key] !== undefined) {
              if (typeof body[key] !== 'string') throw new Error('프로젝트 정보를 확인해 주세요.');
              fields[key] = body[key].trim() || null;
            }
          }
          if (body.projectId !== undefined) {
            if (body.projectId !== null && (!Number.isSafeInteger(body.projectId) || body.projectId < 1)) throw new Error('부모 프로젝트 ID를 확인해 주세요.');
            fields.projectId = body.projectId;
          }
          if (body.sessionsExpanded !== undefined) {
            if (typeof body.sessionsExpanded !== 'boolean') throw new Error('세션 목록 펼침 상태를 확인해 주세요.');
            fields.sessionsExpanded = body.sessionsExpanded;
          }
          if (body.favorite !== undefined) {
            if (typeof body.favorite !== 'boolean') throw new Error('고정 상태를 확인해 주세요.');
            fields.favoritedAt = body.favorite ? Date.now() : 0;
          }
          if (!Object.keys(fields).length) throw new Error('수정할 프로젝트 정보가 없습니다.');
          store.updateProject(projectPath, fields);
          if (fields.projectId !== undefined) sessionsRevision++;
          broadcast();
          return json(res, 200, store.projects().find(project => project.path === projectPath));
        }
        if (phase !== 'ready') throw new Error('채팅 환경이 아직 준비되지 않았습니다.');
        const result = await backendRequest(backend, 'DELETE_PROJECT', { path: projectPath });
        if (result.status === 'error') throw new Error(result.error || '프로젝트를 삭제하지 못했습니다.');
        store.updateProject(projectPath, { hiddenAt: Date.now(), sessionCount: 0, favoritedAt: 0 });
        sessionsRevision++;
        for (const client of sessions.values()) {
          if (client.project === projectPath) { client.project = null; client.chatUrl = null; }
        }
        broadcast();
        res.writeHead(204); res.end(); return;
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    const expectedMethod = path === API_PATH.WORKSPACE ? 'PUT' : [API_PATH.PROJECT_IMPORTS, API_PATH.BACKEND_RESTARTS].includes(path) ? 'POST' : null;
    if (!expectedMethod) return json(res, 404, { error: 'Not found' });
    if (req.method !== expectedMethod) { res.setHeader('Allow', expectedMethod); return json(res, 405, { error: 'Method not allowed' }); }
    if (req.headers['x-swttch-csrf'] !== session.csrf) return json(res, 403, { error: 'Invalid request token' });
    try {
      if (path === API_PATH.PROJECT_IMPORTS) {
        const report = store.migrateProjects(join(homedir(), '.claude-code-gui'));
        sessionsRevision++;
        broadcast();
        return json(res, 201, { ...report, state: state(session) });
      }
      if (path === API_PATH.WORKSPACE) {
        if (phase !== 'ready') throw new Error('채팅 환경이 아직 준비되지 않았습니다.');
        const body = await readBody(req);
        if (typeof body.path !== 'string' || !body.path.trim()) throw new Error('프로젝트 폴더 경로를 입력해 주세요.');
        const input = body.path.trim();
        const absolute = resolve(input === '~' ? homedir() : input.startsWith('~/') ? join(homedir(), input.slice(2)) : input);
        if (!require('node:path').isAbsolute(input) && input !== '~' && !input.startsWith('~/')) throw new Error('절대 경로 또는 ~/로 시작하는 경로를 입력해 주세요.');
        let folder;
        try { folder = statSync(absolute); } catch { throw new Error('프로젝트 폴더를 찾을 수 없습니다. 경로를 확인해 주세요.'); }
        if (!folder.isDirectory()) throw new Error('파일이 아닌 프로젝트 폴더를 선택해 주세요.');
        // Fresh codes support independent browser clients and cleared browser storage.
        const response = await fetch(`http://127.0.0.1:${backend.port}/internal/local-pair`, { headers: { 'x-ccg-token': backend.token } });
        if (!response.ok) throw new Error('채팅 연결을 준비하지 못했습니다. 다시 시도해 주세요.');
        const { code } = await response.json();
        if (typeof code !== 'string' || !code) throw new Error('채팅 인증 코드를 받지 못했습니다.');
        if (body.sessionId !== undefined && (typeof body.sessionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.sessionId))) throw new Error('올바른 세션을 선택해 주세요.');
        const url = new URL(body.sessionId ? `/sessions/${body.sessionId}` : '/sessions/new', `http://${req.headers.host}`);
        url.searchParams.set('workingDir', absolute);
        url.searchParams.set('pair', code);
        session.project = absolute;
        session.chatUrl = url.pathname + url.search;
        store.remember(absolute);
        broadcast();
        return json(res, 200, state(session));
      }
      if (path === API_PATH.BACKEND_RESTARTS) { await start(); return json(res, 200, state(session)); }
      return json(res, 404, { error: 'Not found' });
    } catch (error) { return json(res, 400, { error: error.message }); }
  }

  function proxy(req, res) {
    if (!allowed(req)) return json(res, 403, { error: 'Forbidden origin' });
    if (!backend.port) return json(res, 503, { error: 'Backend unavailable' });
    const headers = { ...req.headers, host: `127.0.0.1:${backend.port}` };
    delete headers.cookie;
    const upstream = request({ host: '127.0.0.1', port: backend.port, path: req.url, method: req.method, headers }, response => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) json(res, 502, { error: 'Backend disconnected' }); else res.destroy(); });
    req.on('aborted', () => upstream.destroy());
    req.pipe(upstream);
  }
  function upgrade(req, socket, head) {
    const path = new URL(req.url, `http://${req.headers.host}`).pathname;
    if (!['/ws', '/logs', '/rpc'].includes(path)) return; // Vite owns its own HMR upgrade.
    if (!allowed(req) || !backend.port) { socket.destroy(); return; }
    const headers = { ...req.headers, host: `127.0.0.1:${backend.port}` };
    delete headers.cookie;
    const upstream = request({ host: '127.0.0.1', port: backend.port, path: req.url, headers });
    upstream.on('upgrade', (response, peer, peerHead) => {
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`);
      if (head.length) peer.write(head);
      if (peerHead.length) socket.write(peerHead);
      peer.on('error', () => socket.destroy());
      socket.on('error', () => peer.destroy());
      socket.on('close', () => peer.destroy());
      peer.pipe(socket); socket.pipe(peer);
    });
    upstream.on('response', response => { socket.end(`HTTP/1.1 ${response.statusCode} Rejected\r\nConnection: close\r\n\r\n`); response.resume(); });
    upstream.on('error', () => socket.destroy());
    upstream.end();
  }
  function middleware(req, res, next) {
    const path = req.url.split('?')[0];
    if (path.startsWith('/desktop-api/')) { void api(req, res).catch(() => json(res, 500, { error: 'Local service failure' })); return; }
    if (path === PATH.HOME || (path === PATH.PROJECTS || path.startsWith(PATH.PROJECTS + '/')) || path === '/index.html' || ['/src/', '/@', '/node_modules/', '/desktop-assets/'].some(prefix => path.startsWith(prefix))) return next();
    proxy(req, res);
  }
  return {
    home, start, middleware,
    bind(server) { port = server.address().port; if (!boundServers.has(server)) { boundServers.add(server); server.on('upgrade', upgrade); } },
    async stop() {
      stopping = true; unsubscribeBackend(); folderDialog.stop();
      for (const res of streams.keys()) res.end();
      streams.clear();
      if (starting) await starting;
      await backend.stop(); store.close();
    },
  };
}
module.exports = { createLocalService };
