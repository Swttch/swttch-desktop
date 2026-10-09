const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, writeFile, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { openStore } = require('../src/store.cjs');
const { createSessionSourceSync, displayTitle } = require('../src/session-source-sync.cjs');

test('source sync reuses plugin titles, preserves alias files and settles missing sources independently', async () => {
  const home = await mkdtemp(join(tmpdir(), 'swttch-source-sync-'));
  const source = join(home, 'sources'); await mkdir(source);
  const store = openStore(home);
  try {
    const project = store.createProject(home, {}), uid = '12345678-1234-4234-8234-123456789abc', missing = '12345678-1234-4234-8234-123456789abd';
    const src = join(source, uid + '.jsonl');
    const rows = [{ type: 'user', timestamp: '2026-10-01T00:00:00Z', sessionId: uid, message: { role: 'user', content: 'Original prompt' } }, { type: 'custom-title', customTitle: 'CLI title', sessionId: uid }];
    await writeFile(src, rows.map(JSON.stringify).join('\n') + '\n');
    const aliases = join(source, '.claude-code-gui-session-titles.json'), aliasContent = JSON.stringify({ [uid]: 'Plugin alias', untouched: 'Keep' }); await writeFile(aliases, aliasContent);
    store.sessionRepository.upsert(uid, { projectId: project.id, data: { sessionId: uid, extra: 'preserved' } });
    store.sessionRepository.upsert(missing, { projectId: project.id, customTitle: 'Previous' });
    const parser = await import(pathToFileURL(join(__dirname, '../dist/session-source.mjs')).href);
    const sync = createSessionSourceSync({ repository: store.sessionRepository, projects: store.projects, reader: async () => ({ ...parser, getProjectSessionsPath: async () => source }) });
    store.sessionRepository.syncActivity({ open: [uid], activity: { [uid]: 'running' } });
    const result = await sync.syncSessionSource(uid);
    assert.equal(result.title, 'Original prompt'); assert.equal(result.customTitle, 'CLI title'); assert.equal(result.alias, 'Plugin alias'); assert.equal(displayTitle(result), 'Plugin alias');
    assert.equal(result.src, src); assert.equal(result.isOpen, true); assert.equal(result.activity, 'running'); assert.equal(result.data.extra, 'preserved'); assert.ok(result.sourceSyncedAt);
    await writeFile(src, rows.concat({ type: 'custom-title', customTitle: 'Changed CLI title', sessionId: uid }).map(JSON.stringify).join('\n') + '\n');
    const settled = await sync.syncSessionSources([uid, missing]);
    assert.equal(settled[0].status, 'fulfilled'); assert.equal(settled[0].value.customTitle, 'Changed CLI title'); assert.equal(settled[1].status, 'rejected');
    assert.equal(store.sessionRepository.find(missing).customTitle, 'Previous');
    assert.equal(await readFile(aliases, 'utf8'), aliasContent);
    const bulk = await sync.syncAllSessionSources(); assert.equal(bulk.length, 2); assert.equal(bulk.filter(row => row.status === 'fulfilled').length, 1);
    store.sessionRepository.syncActivity({ open: [], activity: {} }); assert.equal(store.sessionRepository.find(uid).isOpen, false);
  } finally { store.close(); await rm(home, { recursive: true, force: true }); }
});

test('active DB query paginates, excludes closed/hidden projects and preserves unchanged activity timestamps', async () => {
  const home = await mkdtemp(join(tmpdir(), 'swttch-active-db-')), store = openStore(home);
  try {
    const project = store.createProject(home, {});
    for (let index = 0; index < 7; index++) store.sessionRepository.upsert('active-' + index, { projectId: project.id, lastTimestamp: '2026-10-0' + (index + 1), data: { extra: 'keep' } });
    const snapshot = { open: Array.from({ length: 6 }, (_, index) => 'active-' + index), activity: { 'active-0': 'running' } };
    store.sessionRepository.syncActivity(snapshot);
    const before = store.sessionRepository.find('active-0').activityUpdatedAt;
    await new Promise(resolve => setTimeout(resolve, 5));
    store.sessionRepository.syncActivity(snapshot);
    assert.equal(store.sessionRepository.find('active-0').activityUpdatedAt, before);
    const first = store.sessionRepository.active();
    assert.equal(first.rows.length, 5); assert.equal(first.hasMore, true);
    assert.equal(store.sessionRepository.active(first.nextOffset).rows.length, 1);
    assert.equal(first.rows[0].session.uid, 'active-5');
    store.sessionRepository.syncActivity({ ...snapshot, activity: { 'active-0': 'awaiting' } });
    assert.equal(store.sessionRepository.active().rows[0].session.uid, 'active-0');
    assert.equal(store.sessionRepository.find('active-0').activity, 'awaiting');
    store.sessionRepository.syncActivity({ open: [], activity: {} });
    assert.equal(store.sessionRepository.active().rows.length, 0);
  } finally { store.close(); await rm(home, { recursive: true, force: true }); }
});
