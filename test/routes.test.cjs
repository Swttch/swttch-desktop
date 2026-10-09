const { test } = require('node:test');
const assert = require('node:assert/strict');

test('path parameters are encoded, repeated consistently, and missing values rejected', async () => {
  const { replacePathParams } = await import('../renderer/src/routes.ts');
  assert.equal(replacePathParams('/projects/:id/sessions/:sessionId/:id', { id: '한글 /?', sessionId: 42 }), '/projects/%ED%95%9C%EA%B8%80%20%2F%3F/sessions/42/%ED%95%9C%EA%B8%80%20%2F%3F');
  assert.throws(() => replacePathParams('/projects/:id', {}), /Missing path parameter/);
  assert.throws(() => replacePathParams('/projects/:id', { id: '' }), /Missing path parameter/);
});

test('session paths belong to embedded views rather than shell routes', async () => {
  const { PATH } = await import('../src/paths.mjs');
  assert.equal(PATH.SESSIONS, '/sessions');
  assert.equal(PATH.NEW_SESSION, '/sessions/new');
  assert.equal(PATH.SESSION, '/sessions/:sessionId');
});

test('embedded sessions use the shell proxy origin and preserve all session parameters', async () => {
  const { sessionFrameUrl } = await import('../renderer/src/session-view.ts');
  for (const path of ['/sessions/new', '/sessions/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']) {
    const source = new URL(path, 'http://localhost:19836');
    source.searchParams.set('workingDir', '/projects/한글 & 폴더');
    source.searchParams.set('pair', 'single-use-test');
    const frame = new URL(sessionFrameUrl(source.href, 'http://localhost:3000'));
    assert.equal(frame.origin, 'http://localhost:3000');
    assert.equal(frame.pathname, source.pathname);
    assert.equal(frame.search, source.search);
    assert.equal(new URL(sessionFrameUrl(source.href, 'http://localhost:3030')).origin, 'http://localhost:3030');
  }
  assert.throws(() => sessionFrameUrl('http://localhost:19836/sessions/new', 'http://localhost:3000'), /workingDir/);
});
