const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { createHash } = require('node:crypto');
const { backendRequest } = require('../src/backend-request.cjs');

test('session adapter forwards original backend payload and field names without loss', async t => {
  const server = createServer();
  const sockets = new Set();
  let forwarded;
  const original = { sessions: [{ sessionId: 'session-1', sessionDir: '/project', title: '원본 제목', createdAt: '2026-10-09', futureMetadata: { keep: true } }], total: 1, hasMore: false, nextOffset: 1, scopeDirCount: 1, futurePageField: ['keep'] };
  server.on('upgrade', (req, socket) => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
    assert.equal(req.headers['sec-websocket-protocol'], 'ccg-auth, test-token');
    const accept = createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\nSec-WebSocket-Protocol: ccg-auth\r\n\r\n`);
    let pending = Buffer.alloc(0);
    socket.on('data', chunk => {
      pending = Buffer.concat([pending, chunk]);
      if (pending.length < 6) return;
      if ((pending[0] & 15) === 8) { socket.end(Buffer.from([0x88, 0])); return; }
      let length = pending[1] & 127;
      let offset = 2;
      if (length === 126) { if (pending.length < 8) return; length = pending.readUInt16BE(2); offset = 4; }
      if (pending.length < offset + 4 + length) return;
      const mask = pending.subarray(offset, offset + 4);
      const body = Buffer.from(pending.subarray(offset + 4, offset + 4 + length));
      for (let index = 0; index < body.length; index++) body[index] ^= mask[index % 4];
      forwarded = JSON.parse(body.toString());
      pending = pending.subarray(offset + 4 + length);
      const payload = Buffer.from(JSON.stringify({ type: 'ACK', payload: { ...original, requestId: forwarded.requestId } }));
      const header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(payload.length, 2);
      socket.write(Buffer.concat([header, payload]));
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  const result = await backendRequest({ port: server.address().port, token: 'test-token' }, 'GET_SESSIONS', { workingDir: '/project', limit: 30 });
  assert.equal(forwarded.type, 'GET_SESSIONS');
  assert.deepEqual(forwarded.payload, { workingDir: '/project', limit: 30 });
  assert.deepEqual(result, { ...original, requestId: forwarded.requestId });
});
