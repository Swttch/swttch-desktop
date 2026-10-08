const { test } = require('node:test');
const assert = require('node:assert/strict');

test('path parameters are encoded, repeated consistently, and missing values rejected', async () => {
  const { replacePathParams } = await import('../renderer/src/routes.ts');
  assert.equal(replacePathParams('/projects/:id/sessions/:sessionId/:id', { id: '한글 /?', sessionId: 42 }), '/projects/%ED%95%9C%EA%B8%80%20%2F%3F/sessions/42/%ED%95%9C%EA%B8%80%20%2F%3F');
  assert.throws(() => replacePathParams('/projects/:id', {}), /Missing path parameter/);
  assert.throws(() => replacePathParams('/projects/:id', { id: '' }), /Missing path parameter/);
});
