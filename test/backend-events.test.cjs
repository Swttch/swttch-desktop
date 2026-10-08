const { test } = require('node:test');
const assert = require('node:assert/strict');
const { subscribeBackend } = require('../src/backend-events.cjs');
test('backend subscription forwards activity, refresh events and recovers without leaking after disposal', t => {
  const original = global.WebSocket, sockets = [], received = [];
  class Socket {
    constructor(url, protocols) { this.url = url; this.protocols = protocols; sockets.push(this); }
    send(body) { this.sent = JSON.parse(body); }
    close() { this.closed = true; this.onclose?.(); }
  }
  global.WebSocket = Socket;
  t.after(() => { global.WebSocket = original; });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const stop = subscribeBackend({ port: 12345, token: 'test-token' }, (type, payload) => received.push({ type, payload }));
  const first = sockets[0]; first.onopen();
  assert.equal(first.sent.type, 'GET_SESSION_ACTIVITY');
  assert.deepEqual(first.protocols, ['ccg-auth', 'test-token']);
  const activity = { activity: { 'session-1': 'running' }, open: ['session-1'], originalExtra: true };
  first.onmessage({ data: JSON.stringify({ type: 'ACK', payload: { requestId: first.sent.requestId, ...activity } }) });
  assert.deepEqual(received[0].payload.open, activity.open);
  first.onmessage({ data: JSON.stringify({ type: 'SESSION_ACTIVITY_CHANGED', payload: activity }) });
  assert.deepEqual(received[1], { type: 'activity', payload: activity });
  first.onmessage({ data: JSON.stringify({ type: 'SESSIONS_UPDATED', payload: { action: 'rename' } }) });
  assert.equal(received[2].type, 'sessions');
  first.close(); t.mock.timers.tick(1000);
  assert.equal(sockets.length, 2);
  stop(); t.mock.timers.tick(2000);
  assert.equal(sockets.length, 2); assert.equal(sockets[1].closed, true);
});
