const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { openStore } = require('../src/store.cjs');

function fixture(t) {
  const home = mkdtempSync(join(tmpdir(), 'swttch-projects-'));
  const source = join(home, 'legacy');
  mkdirSync(join(source, 'entities/project'), { recursive: true });
  const file = join(source, 'entities/project/projects.entity.jsonl');
  t.after(() => rmSync(home, { recursive: true, force: true }));
  return { home, source, file };
}

test('entity migration preserves all original fields, is repeatable, and does not treat imports as recent opens', t => {
  const { home, source, file } = fixture(t);
  const original = Array.from({ length: 8 }, (_, id) => ({ id, path: `/projects/${id}`, alias: `별칭 ${id}`, description: '메모', hiddenAt: id === 7 ? 123 : 0, favoritedAt: 456, futureField: { intact: true } }));
  const text = original.map(row => JSON.stringify(row)).join('\n');
  writeFileSync(file, text);
  const store = openStore(home);
  store.remember('/projects/0');
  assert.deepEqual(store.migrateProjects(source), { imported: 7, enriched: 1, unchanged: 0, total: 8 });
  assert.equal(store.projects().length, 8);
  assert.deepEqual(store.recent(), ['/projects/0']);
  for (const row of original) {
    const saved = store.projects().find(project => project.path === row.path);
    for (const key of Object.keys(row)) assert.deepEqual(saved[key], row[key]);
  }
  assert.deepEqual(store.migrateProjects(source), { imported: 0, enriched: 0, unchanged: 8, total: 8 });
  assert.equal(readFileSync(file, 'utf8'), text);
  store.close();
  const reopened = openStore(home);
  assert.equal(reopened.projects().length, 8);
  reopened.close();
});

test('invalid JSONL does not partially import and projects.json alone is not a source', t => {
  const { home, source, file } = fixture(t);
  const store = openStore(home);
  writeFileSync(file, '{"path":"/valid"}\nnot-json');
  assert.throws(() => store.migrateProjects(source), /2행/);
  assert.deepEqual(store.projects(), []);
  rmSync(file);
  writeFileSync(join(source, 'projects.json'), '{"favoritePaths":["/ignored"]}');
  assert.throws(() => store.migrateProjects(source), /엔티티 JSONL/);
  assert.deepEqual(store.projects(), []);
  store.close();
});

test('version 1 database upgrades without losing previously opened projects', t => {
  const { home } = fixture(t);
  const db = new DatabaseSync(join(home, 'desktop.sqlite'));
  db.exec("CREATE TABLE projects(path TEXT PRIMARY KEY, opened_at INTEGER NOT NULL); INSERT INTO projects VALUES('/existing', 123); PRAGMA user_version=1;");
  db.close();
  const store = openStore(home);
  assert.deepEqual(store.recent(), ['/existing']);
  assert.equal(store.projects()[0].path, '/existing');
  store.remember('/new');
  assert.equal(store.projects().length, 2);
  store.close();
});

test('version 3 upgrades preserve source IDs and keep generated IDs stable after reopening', t => {
  const { home } = fixture(t);
  const db = new DatabaseSync(join(home, 'desktop.sqlite'));
  db.exec("CREATE TABLE projects(path TEXT PRIMARY KEY, opened_at INTEGER NOT NULL, data TEXT NOT NULL); PRAGMA user_version=3;");
  const insert = db.prepare('INSERT INTO projects VALUES(?, ?, ?)');
  insert.run('/imported', 1, JSON.stringify({ id: 42, path: '/imported', futureField: 'preserved' }));
  insert.run('/without-id', 2, '{}');
  db.close();
  const store = openStore(home);
  const original = store.projects();
  assert.equal(original.find(row => row.path === '/imported').id, 42);
  assert.equal(original.find(row => row.path === '/imported').futureField, 'preserved');
  const generated = original.find(row => row.path === '/without-id').id;
  assert.ok(generated > 42);
  const created = store.createProject('/created');
  assert.ok(created.id > generated);
  store.close();
  const reopened = openStore(home);
  assert.equal(reopened.projects().find(row => row.path === '/without-id').id, generated);
  assert.equal(reopened.projects().find(row => row.path === '/created').id, created.id);
  reopened.close();
});
