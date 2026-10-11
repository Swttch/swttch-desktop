const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const Database = require('better-sqlite3');
const { openStore } = require('../src/store.cjs');

function fixture(t) {
  const home = mkdtempSync(join(tmpdir(), 'swttch-order-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  return home;
}
const ordered = store => store.projects().filter(row => !row.hiddenAt).sort((a, b) => Number(b.favoritedAt > 0) - Number(a.favoritedAt > 0) || a.sortOrder - b.sortOrder).map(row => row.path);

test('project order and pin transitions persist atomically; invalid/stale lists leave data intact', t => {
  const home = fixture(t);
  let store = openStore(home);
  const a = store.createProject('/a'); const b = store.createProject('/b'); const c = store.createProject('/c');
  store.reorderProjects([c.id, a.id, b.id], c.id, true);
  assert.deepEqual(ordered(store), ['/c', '/a', '/b']);
  assert.ok(store.projects().find(row => row.id === c.id).favoritedAt > 0);
  const saved = store.projects();
  for (const ids of [[a.id, c.id, b.id], [c.id, a.id, a.id], [c.id, a.id], [c.id, a.id, 999]]) assert.throws(() => store.reorderProjects(ids, a.id, false));
  assert.deepEqual(store.projects(), saved);
  store.reorderProjects([a.id, c.id, b.id], c.id, false);
  assert.deepEqual(ordered(store), ['/a', '/c', '/b']);
  store.remember('/b');
  assert.deepEqual(ordered(store), ['/a', '/c', '/b']);
  store.close(); store = openStore(home);
  assert.deepEqual(ordered(store), ['/a', '/c', '/b']);
  store.createProject('/new'); assert.deepEqual(ordered(store), ['/a', '/c', '/b', '/new']);
  store.updateProject('/b', { favoritedAt: 12 });
  store.updateProject('/c', { favoritedAt: 13 });
  assert.deepEqual(ordered(store), ['/b', '/c', '/a', '/new']);
  store.updateProject('/b', { favoritedAt: 0 });
  assert.deepEqual(ordered(store), ['/c', '/b', '/a', '/new']);
  store.close();
});

test('v8 migration initializes order from current recent sort without losing metadata', t => {
  const home = fixture(t);
  const store = openStore(home);
  store.createProject('/old', { lastModified: 1, alias: 'keep' });
  store.createProject('/recent', { lastModified: 20 });
  store.createProject('/pinned', { lastModified: 2, favoritedAt: 10 });
  store.close();
  const db = new Database(join(home, 'desktop.sqlite'));
  db.exec('ALTER TABLE projects DROP COLUMN sort_order; PRAGMA user_version=8;'); db.close();
  const upgraded = openStore(home);
  assert.deepEqual(ordered(upgraded), ['/pinned', '/recent', '/old']);
  assert.equal(upgraded.projects().find(row => row.path === '/old').alias, 'keep');
  upgraded.close();
});

test('filtered moves retain hidden-from-search neighbors and pin boundary placement', async () => {
  const { transformSync } = require(join(__dirname, '../../../backend/node_modules/esbuild'));
  const source = readFileSync(join(__dirname, '../renderer/src/projects/projectOrder.ts'), 'utf8');
  const { code } = transformSync(source, { loader: 'ts', format: 'esm' });
  const { moveProjects, DropSide } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  const rows = [
    { id: 1, favoritedAt: 1, sortOrder: 0 },
    { id: 2, favoritedAt: 1, sortOrder: 1 },
    { id: 3, favoritedAt: 0, sortOrder: 2 },
    { id: 4, favoritedAt: 0, sortOrder: 3 },
    { id: 5, favoritedAt: 0, sortOrder: 4 },
  ];
  const moved = moveProjects(rows, { projectId: 5, targetId: 3, side: DropSide.Before, favorite: false });
  assert.deepEqual(moved.map(row => row.id), [1, 2, 5, 3, 4]);
  const pinned = moveProjects(rows, { projectId: 5, targetId: 1, side: DropSide.Before, favorite: true });
  assert.deepEqual(pinned.map(row => row.id), [5, 1, 2, 3, 4]);
  assert.ok(pinned[0].favoritedAt > 0);
  const unpinned = moveProjects(rows, { projectId: 2, targetId: 3, side: DropSide.Before, favorite: false });
  assert.deepEqual(unpinned.map(row => row.id), [1, 2, 3, 4, 5]);
  assert.equal(unpinned[1].favoritedAt, 0);
  assert.deepEqual(rows.map(row => row.sortOrder), [0, 1, 2, 3, 4]);
});
