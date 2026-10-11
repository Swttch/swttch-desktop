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
const { sessionUrl } = require('./session-url.cjs');
const { displayTitle, createSessionSourceSync } = require('./session-source-sync.cjs');
const { renameSessionWithCli } = require('./session-rename.cjs');

function createLocalService({ home = process.env.SWTTCH_DESKTOP_HOME || join(homedir(), '.swttch'), backend: suppliedBackend, allowedOrigins = [], folderDialog: suppliedFolderDialog, sourceReader, renameSession = renameSessionWithCli, subscribe = subscribeBackend } = {}) {
  mkdirSync(home, { recursive: true, mode: 0o700 });
  const store = openStore(home);
  const sourceSync = createSessionSourceSync({ repository: store.sessionRepository, projects: store.projects, reader: sourceReader });
  store.sessionRepository.syncActivity({ open: [], activity: {} });
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
  let activityRevision = 0;
  let hydration;
  let hydrationRequested = false;
  async function discoverSessionUids(missing) {
        for (const project of store.projects()) {
          if (!missing.size || stopping) break;
          let offset = 0;
          do {
            const page = await backendRequest(backend, 'GET_SESSIONS', { workingDir: project.path, includeNested: false, offset, limit: 30 });
            if (page.status === 'error' || page.serviceError) throw new Error(page.error || '활성 세션 정보를 불러오지 못했습니다.');
            const rows = (page.sessions || []).filter(row => missing.has(row.sessionId));
            await sourceSync.discover(rows);
            for (const row of rows) if (store.sessionRepository.find(row.sessionId)?.projectId) missing.delete(row.sessionId);
            if (!missing.size || !page.hasMore || page.nextOffset <= offset) break;
            offset = page.nextOffset;
          } while (!stopping);
        }
  }
  async function hydrateOpenSessions() {
    hydrationRequested = true;
    if (hydration) return hydration;
    hydration = (async () => {
      while (hydrationRequested && !stopping) {
        hydrationRequested = false;
        const missing = new Set(sessionActivity.open.filter(uid => !store.sessionRepository.find(uid)?.projectId));
        await discoverSessionUids(missing);
        if (!stopping) { store.sessionRepository.syncActivity(sessionActivity); activityRevision++; broadcast(); }
      }
    })().catch(error => appendFileSync(join(home, 'desktop-backend.log'), `Active session sync: ${error.message}
`)).finally(() => { hydration = null; });
    return hydration;
  }
  const imports = new Map();
  function projectScope(project, includeNested) {
    return [project, ...(includeNested ? projectDescendants(store.projects(), project.id).filter(row => !row.hiddenAt) : [])];
  }
  const sessionEntry = ({ session, project }) => ({ ...session.data, sessionId: session.uid, sessionDir: project.path, title: displayTitle(session), createdAt: session.createdAt, lastTimestamp: session.lastTimestamp, isOpen: session.isOpen, activity: session.activity, favoritedAt: session.favoritedAt });
  function importProjectSessions(project, includeNested = false) {
    const key = project.id + ':' + includeNested;
    if (imports.has(key)) return imports.get(key);
    const promise = (async () => {
      let imported = 0;
      for (const item of projectScope(project, includeNested)) {
        let offset = 0;
        do {
          if (stopping) break;
          const page = await backendRequest(backend, 'GET_SESSIONS', { workingDir: item.path, includeNested: false, offset, limit: 30 });
          if (page.status === 'error' || page.serviceError) throw new Error(page.error || page.serviceError?.reason || '세션을 가져오지 못했습니다.');
          await sourceSync.discover(page.sessions || []);
          imported += (page.sessions || []).length;
          if (!page.hasMore || page.nextOffset <= offset) break;
          offset = page.nextOffset;
        } while (!stopping);
      }
      return { imported };
    })().finally(() => {
      imports.delete(key);
      if (!stopping) { store.sessionRepository.syncActivity(sessionActivity); sessionsRevision++; broadcast(); }
    });
    imports.set(key, promise);
    return promise;
  }
  let sessionEventSync = Promise.resolve();
  function syncSessionEvent(payload) {
    sessionEventSync = sessionEventSync.then(async () => {
      if (stopping) return;
      const uid = payload?.session?.sessionId;
      if (uid && payload.action === 'delete') store.sessionRepository.remove(uid);
      else if (uid && store.sessionRepository.find(uid)?.projectId) await sourceSync.syncSessionSource(uid);
      else if (uid) {
        // The started event can precede transcript creation; the later upsert retries discovery.
        await discoverSessionUids(new Set([uid]));
      }
    }).catch(error => appendFileSync(join(home, 'desktop-backend.log'), `Session event sync: ${error.message}
`)).finally(() => {
      if (!stopping) { store.sessionRepository.syncActivity(sessionActivity); sessionsRevision++; broadcast(); }
    });
  }
  const pluginRoot = resolve(__dirname, '../../..');
  const backend = suppliedBackend || new Backend({
    runtime: process.env.SWTTCH_RUNTIME_DIR || join(pluginRoot, 'backend/dist'), home, token: getControlToken(),
    onLog: line => appendFileSync(join(home, 'desktop-backend.log'), `${line}\n`),
    onExit: () => {
      if (stopping || starting) return;
      unsubscribeBackend();
      phase = 'error'; message = '채팅 연결이 종료됐습니다. 다시 연결해 주세요.';
      broadcast();
    },
  });
  if (!suppliedBackend && !process.env.SWTTCH_RUNTIME_DIR) backend.webview = join(pluginRoot, 'webview/dist');

  const state = session => ({
    phase: phase === 'ready' && session.project ? 'chat' : phase,
    message, project: session.project, chatUrl: phase === 'ready' ? session.chatUrl : null,
    recent: store.recent(), projects: store.projects(),
    sessionActivity, sessionsRevision, activityRevision,
    backendId: createHash('sha256').update(backend.token).digest('hex'),
  });
  function broadcast() {
    for (const [response, session] of streams) response.write(`data: ${JSON.stringify(state(session))}\n\n`);
  }
  function start() {
    if (starting) return starting;
    unsubscribeBackend(); sessionActivity = { activity: {}, open: [] };
    store.sessionRepository.syncActivity(sessionActivity); activityRevision++;
    phase = 'starting'; message = '채팅 환경을 준비하고 있습니다.';
    broadcast();
    starting = (async () => {
      try {
        await backend.start();
        phase = 'ready'; message = '프로젝트를 선택해 시작하세요.';
        if (!suppliedBackend || subscribe !== subscribeBackend) unsubscribeBackend = subscribe(backend, (type, payload) => {
          if (type === 'connection') {
            phase = payload.connected ? 'ready' : 'error';
            message = payload.connected ? '프로젝트를 선택해 시작하세요.' : '채팅 연결이 끊겼습니다. 재연결 중입니다. 서버가 종료됐다면 재시도를 선택해 주세요.';
          }
          else if (type === 'activity') { sessionActivity = payload; store.sessionRepository.syncActivity(payload); activityRevision++; void hydrateOpenSessions(); }
          else { syncSessionEvent(payload); void hydrateOpenSessions(); }
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

  async function api(req, res) {
    if (!allowed(req)) return json(res, 403, { error: 'Forbidden origin' });
    const path = new URL(req.url, `http://${req.headers.host}`).pathname;
    let session = getSession(req);
    if (path === API_PATH.SESSIONS && req.method === 'POST') {
      // A custom header prevents cross-origin forms/no-cors requests from bootstrapping.
      if (!['web', 'desktop'].includes(req.headers['x-swttch-client'])) return json(res, 403, { error: 'Missing client header' });
      if (!session) {
        const id = randomBytes(32).toString('hex');
        const persist = req.headers['x-swttch-client'] === 'desktop';
        const saved = persist ? store.workspace() : null;
        const project = saved && store.projects().find(row => row.id === saved.projectId && !row.hiddenAt);
        session = { csrf: randomBytes(24).toString('hex'), persist, project: project?.path || null, chatUrl: project ? sessionUrl(project.path, saved.sessionId || undefined, 'restore', backend.targetPort || backend.port) : null };
        sessions.set(id, session);
        res.setHeader('Set-Cookie', `${cookieName()}=${id}; HttpOnly; SameSite=Strict; Path=/`);
      }
      return json(res, 201, { csrf: session.csrf, state: state(session) });
    }
    if (!session) return json(res, 401, { error: '앱 연결이 만료됐습니다. 새로고침해 주세요.' });
    if ([API_PATH.ACTIVE_SESSIONS, API_PATH.FAVORITE_SESSIONS].includes(path) && req.method === 'GET') {
      const params = new URL(req.url, 'http://localhost').searchParams;
      const offset = Number(params.get('offset') || 0), limit = Number(params.get('limit') || 5);
      if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) return json(res, 400, { error: '페이지 범위를 확인해 주세요.' });
      const page = path === API_PATH.ACTIVE_SESSIONS ? store.sessionRepository.active(offset, limit) : store.sessionRepository.favorites(offset, limit);
      return json(res, 200, { ...page, rows: page.rows.map(({ session, project }) => ({ projectId: project.id, session: sessionEntry({ session, project }) })) });
    }
    if (path === API_PATH.SESSION_SOURCE_SYNCS) {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Method not allowed' }); }
      if (req.headers['x-swttch-csrf'] !== session.csrf) return json(res, 403, { error: 'Invalid request token' });
      try {
        const body = await readBody(req);
        if (body.uids !== undefined && (!Array.isArray(body.uids) || body.uids.some(uid => typeof uid !== 'string'))) throw new Error('세션 UID 목록을 확인해 주세요.');
        const uids = body.uids === undefined ? store.sessionRepository.all().map(row => row.uid) : [...new Set(body.uids)];
        const results = body.uids === undefined ? await sourceSync.syncAllSessionSources() : await sourceSync.syncSessionSources(uids);
        sessionsRevision++; broadcast();
        return json(res, 201, { results: results.map((result, index) => result.status === 'fulfilled' ? { uid: uids[index], status: result.status, session: result.value } : { uid: uids[index], status: result.status, error: result.reason.message }) });
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
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
    const importMatch = /^\/desktop-api\/projects\/([^/]+)\/session-imports$/.exec(path);
    if (importMatch) {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(res, 405, { error: 'Method not allowed' }); }
      if (req.headers['x-swttch-csrf'] !== session.csrf) return json(res, 403, { error: 'Invalid request token' });
      try {
        if (phase !== 'ready') throw new Error('세션 환경이 아직 준비되지 않았습니다.');
        const project = store.projects().find(row => String(row.id) === decodeURIComponent(importMatch[1]));
        if (!project) return json(res, 404, { error: '등록되지 않은 프로젝트입니다.' });
        const body = await readBody(req);
        if (body.includeNested !== undefined && typeof body.includeNested !== 'boolean') throw new Error('하위 프로젝트 포함 여부를 확인해 주세요.');
        return json(res, 201, await importProjectSessions(project, body.includeNested === true));
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    const projectSessionMatch = /^\/desktop-api\/projects\/([^/]+)\/sessions$/.exec(path);
    if (path === API_PATH.PROJECTS && req.method === 'GET') return json(res, 200, { projects: store.projects(), homeDir: homedir() });
    if (projectSessionMatch && req.method === 'GET') {
      try {
        const project = store.projects().find(project => String(project.id) === decodeURIComponent(projectSessionMatch[1]));
        if (!project) return json(res, 404, { error: '등록되지 않은 프로젝트입니다.' });
        const params = new URL(req.url, 'http://localhost').searchParams;
        const offset = Number(params.get('offset') || 0);
        const limit = params.get('limit') === 'all' ? undefined : Number(params.get('limit') || 30);
        if (!Number.isSafeInteger(offset) || offset < 0 || (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100))) throw new Error('페이지 범위를 확인해 주세요.');
        const scope = projectScope(project, params.get('includeNested') === 'true');
        const page = store.sessionRepository.list(scope.map(row => row.id), offset, limit ?? null);
        return json(res, 200, { ...page, rows: undefined, sessions: page.rows.map(sessionEntry) });
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
        const savedSession = store.sessionRepository.find(sessionId);
        const owner = store.projects().find(item => item.id === savedSession?.projectId);
        const row = savedSession && owner && projectScope(project, true).some(item => item.id === owner.id) ? sessionEntry({ session: savedSession, project: owner }) : null;
        if (!row) return json(res, 404, { error: '이 프로젝트에 없는 세션입니다.' });
        const body = req.method === 'PATCH' ? await readBody(req) : {};
        if (req.method === 'PATCH' && body.favorite !== undefined) {
          if (typeof body.favorite !== 'boolean' || body.title !== undefined) throw new Error('즐겨찾기 여부를 확인해 주세요.');
          const saved = store.sessionRepository.setFavorite(sessionId, body.favorite);
          sessionsRevision++; broadcast();
          return json(res, 200, { session: sessionEntry({ session: saved, project: owner }) });
        }
        if (req.method === 'PATCH' && (typeof body.title !== 'string' || !body.title.trim())) throw new Error('세션 이름을 입력해 주세요.');
        if (req.method === 'PATCH') {
          await sourceSync.discover([row]);
          const source = await sourceSync.syncSessionSource(sessionId);
          await renameSession({ uid: sessionId, title: body.title.trim(), workingDir: row.sessionDir || project.path, src: source.src });
          const synced = await sourceSync.syncSessionSource(sessionId);
          sessionsRevision++; broadcast();
          return json(res, 200, { status: 'ok', session: synced });
        }
        const type = sessionResource[3] ? 'MARK_SESSION_READ' : 'DELETE_SESSION';
        const result = await backendRequest(backend, type, { sessionId, workingDir: row.sessionDir || project.path });
        if (result.status === 'error') throw new Error(result.error || '세션을 변경하지 못했습니다.');
        if (req.method === 'DELETE') store.sessionRepository.remove(sessionId);
        if (req.method === 'DELETE') for (const client of sessions.values()) {
          if (client.chatUrl && new URL(client.chatUrl).pathname === '/sessions/' + sessionId) { client.project = null; client.chatUrl = null; }
        }
        if (!sessionResource[3]) sessionsRevision++;
        broadcast();
        if (req.method === 'PATCH') return json(res, 200, result);
        res.writeHead(204); res.end(); return;
      } catch (error) { return json(res, 400, { error: error.message }); }
    }
    if (path === API_PATH.PROJECT_ORDER) {
      if (req.method !== 'PUT') { res.setHeader('Allow', 'PUT'); return json(res, 405, { error: 'Method not allowed' }); }
      if (req.headers['x-swttch-csrf'] !== session.csrf) return json(res, 403, { error: 'Invalid request token' });
      try {
        const body = await readBody(req);
        store.reorderProjects(body.projectIds, body.projectId, body.favorite);
        broadcast();
        return json(res, 200, { projects: store.projects(), homeDir: homedir() });
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
    if (path === API_PATH.WORKSPACE && req.method === 'PATCH') {
      if (req.headers['x-swttch-csrf'] !== session.csrf) return json(res, 403, { error: 'Invalid request token' });
      const body = await readBody(req);
      if (typeof body.sessionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.sessionId)) return json(res, 400, { error: '올바른 세션을 선택해 주세요.' });
      const project = store.projects().find(row => row.path === session.project && !row.hiddenAt);
      const row = store.sessionRepository.find(body.sessionId);
      if (!project || !row || row.projectId !== project.id) return json(res, 400, { error: '현재 프로젝트의 세션을 선택해 주세요.' });
      const url = new URL(session.chatUrl); url.pathname = PATH.SESSION.replace(':sessionId', body.sessionId); session.chatUrl = url.href;
      if (session.persist) store.saveWorkspace(project.id, body.sessionId);
      return json(res, 200, state(session));
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
        if (!Number.isSafeInteger(body.projectId) || body.projectId < 1) throw new Error('프로젝트 ID를 확인해 주세요.');
        const project = store.projects().find(row => row.id === body.projectId && row.hiddenAt === 0);
        if (!project) throw new Error('등록되지 않은 프로젝트입니다.');
        const absolute = project.path;
        let folder;
        try { folder = statSync(absolute); } catch { throw new Error('프로젝트 폴더를 찾을 수 없습니다. 경로를 확인해 주세요.'); }
        if (!folder.isDirectory()) throw new Error('파일이 아닌 프로젝트 폴더를 선택해 주세요.');
        // Fresh codes support independent browser clients and cleared browser storage.
        const response = await fetch(`http://127.0.0.1:${backend.port}/internal/local-pair`, { headers: { 'x-ccg-token': backend.token } });
        if (!response.ok) throw new Error('채팅 연결을 준비하지 못했습니다. 다시 시도해 주세요.');
        const { code } = await response.json();
        if (typeof code !== 'string' || !code) throw new Error('채팅 인증 코드를 받지 못했습니다.');
        if (body.sessionId !== undefined && (typeof body.sessionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.sessionId))) throw new Error('올바른 세션을 선택해 주세요.');
        session.project = absolute;
        session.chatUrl = sessionUrl(absolute, body.sessionId, code, backend.port);
        store.remember(absolute);
        if (session.persist) store.saveWorkspace(project.id, body.sessionId);
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
      if (hydration) await hydration;
      await Promise.allSettled([...imports.values(), sessionEventSync]);
      await backend.stop(); store.close();
    },
  };
}
module.exports = { createLocalService };
