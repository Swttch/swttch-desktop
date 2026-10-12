const { join, dirname, basename } = require('node:path');
const { stat } = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

const sourceReader = () => import(pathToFileURL(join(__dirname, '../dist/session-source.mjs')).href);
const displayTitle = row => row.customTitle || row.alias || row.title || 'No title';

function createSessionSourceSync({ repository, projects, reader = sourceReader }) {
  const pending = new Map();
  async function sync(uid) {
    if (uid !== basename(uid) || !/^[a-zA-Z0-9-]+$/.test(uid)) throw new Error('세션 UID를 확인해 주세요.');
    const row = repository.find(uid);
    if (!row) throw new Error('등록되지 않은 세션입니다.');
    const project = projects().find(project => project.id === row.projectId);
    if (!project) throw new Error('세션의 프로젝트를 찾지 못했습니다.');
    const api = await reader();
    const src = join(await api.getProjectSessionsPath(project.path), uid + '.jsonl');
    const before = await stat(src);
    const [info, head, tail, aliases] = await Promise.all([api.extractSessionInfo(src), api.scanHead(src), api.scanTail(src), api.readSessionTitleOverrides(dirname(src))]);
    const after = await stat(src);
    if (before.mtimeMs !== after.mtimeMs || before.size !== after.size) throw new Error('세션 소스가 읽는 중 변경되었습니다. 다시 소스 싱크해 주세요.');
    return repository.upsert(uid, { src, title: head.summary ?? tail.summary ?? head.title ?? null,
      customTitle: tail.customTitle ?? head.customTitle ?? null, alias: aliases[uid] || null,
      createdAt: info.createdAt, lastTimestamp: info.lastTimestamp, sourceMtime: Math.round(after.mtimeMs), sourceSize: after.size,
      sourceSyncedAt: Date.now(), data: { ...row.data, sourceInfo: info, sourceHead: head, sourceTail: tail },
    });
  }
  function syncSessionSource(uid) {
    if (pending.has(uid)) return pending.get(uid);
    const promise = sync(uid); pending.set(uid, promise);
    const clear = () => { if (pending.get(uid) === promise) pending.delete(uid); };
    promise.then(clear, clear);
    return promise;
  }
  const syncSessionSources = uids => Promise.allSettled([...new Set(uids)].map(syncSessionSource));
  async function syncAllSessionSources() {
    const rows = repository.all(), results = [];
    for (let offset = 0; offset < rows.length; offset += 16) results.push(...await syncSessionSources(rows.slice(offset, offset + 16).map(row => row.uid)));
    return results;
  }
  async function discover(entries) {
    for (const entry of entries) {
      const project = projects().find(project => project.path === entry.sessionDir);
      if (!project) continue;
      const previous = repository.find(entry.sessionId);
      repository.upsert(entry.sessionId, { projectId: project.id, data: { ...previous?.data, ...entry },
        createdAt: entry.createdAt, lastTimestamp: entry.lastTimestamp,
        ...(!previous ? { title: entry.title } : {}),
      });
    }
    await syncSessionSources(entries.map(entry => entry.sessionId).filter(uid => repository.find(uid)));
    return entries.map(entry => { const row = repository.find(entry.sessionId); return row?.sourceSyncedAt ? { ...entry, title: displayTitle(row) } : entry; });
  }
  return { syncSessionSource, syncSessionSources, syncAllSessionSources, discover };
}
module.exports = { createSessionSourceSync, displayTitle };
