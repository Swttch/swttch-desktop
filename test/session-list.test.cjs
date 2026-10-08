const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Module } = require('node:module');
const ts = require('typescript');
const filename = join(__dirname, '../renderer/src/session-utils.ts');
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleUnderTest = new Module(filename); moduleUnderTest._compile(compiled, filename);
const { sessionGroup, SessionGroup, searchSessions, sessionOrigin, uniqueSessions, relativeTime } = moduleUnderTest.exports;
const row = (id, title, date = '2026-10-09T00:00:00Z', sidechain = false) => ({ sessionId: id, title, sessionDir: '/project/nested', createdAt: date, lastTimestamp: null, isSidechain: sidechain });
test('session search uses regex on original title, ID and directory with literal fallback', () => {
  const rows = [row('abc-123', 'Build [draft]'), row('def-456', 'Review')];
  assert.equal(searchSessions(rows, 'build|review').length, 2);
  assert.equal(searchSessions(rows, 'ABC-123')[0].title, 'Build [draft]');
  assert.equal(searchSessions(rows, 'nested').length, 2);
  assert.equal(searchSessions(rows, '[')[0].sessionId, 'abc-123');
  assert.equal(searchSessions(rows, '^Build')[0].sessionId, 'abc-123');
});
test('date grouping uses local midnight for today and yesterday, then elapsed intervals', () => {
  const now = new Date(2026, 9, 9, 14);
  assert.equal(sessionGroup(new Date(2026, 9, 9, 0), now), SessionGroup.Today);
  assert.equal(sessionGroup(new Date(2026, 9, 8, 0), now), SessionGroup.Yesterday);
  assert.equal(sessionGroup(new Date(now.getTime() - 7 * 86400000), now), SessionGroup.Week);
  assert.equal(sessionGroup(new Date(now.getTime() - 30 * 86400000), now), SessionGroup.Month);
  assert.equal(sessionGroup(new Date('invalid'), now), SessionGroup.Older);
});
test('merged origin labels include the anchor, nested relative path and full outside paths', () => {
  assert.equal(sessionOrigin('/project', '/project'), 'project');
  assert.equal(sessionOrigin('/project/packages/app', '/project/'), 'packages/app');
  assert.equal(sessionOrigin('/project-other', '/project'), '/project-other');
  assert.equal(sessionOrigin('C:\\project\\nested', 'C:\\project'), 'nested');
});
test('pages deduplicate IDs, hide sidechains, sort latest and retain raw fields', () => {
  const rows = [row('old', 'Old', '2026-01-01'), row('new', 'New'), row('side', 'Side', undefined, true), { ...row('old', 'Renamed', '2026-01-01'), originalExtra: true }];
  const result = uniqueSessions(rows);
  assert.deepEqual(result.map(item => item.sessionId), ['new', 'old']); assert.equal(result[1].title, 'Renamed'); assert.equal(result[1].originalExtra, true);
  assert.equal(relativeTime(new Date(0), 59 * 1000), '방금'); assert.equal(relativeTime(new Date(0), 60 * 60 * 1000), '1시간');
});
