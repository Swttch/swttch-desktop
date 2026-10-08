const { randomUUID } = require('node:crypto');

// Transport adapter only: preserve the original backend payload without reshaping.
function backendRequest(backend, type, payload) {
  return new Promise((resolve, reject) => {
    const requestId = randomUUID();
    const socket = new WebSocket(`ws://127.0.0.1:${backend.port}/ws?env=BROWSER`, ['ccg-auth', backend.token]);
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close();
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('채팅 백엔드 요청 시간이 초과됐습니다.')), 15000);
    socket.onopen = () => socket.send(JSON.stringify({ type, payload, requestId }));
    socket.onerror = () => finish(new Error('채팅 백엔드에 연결하지 못했습니다.'));
    socket.onclose = () => { if (!settled) finish(new Error('채팅 백엔드 연결이 종료됐습니다.')); };
    socket.onmessage = event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.payload?.requestId !== requestId) return;
      if (message.type === 'ERROR') finish(new Error(message.payload.error || '채팅 백엔드 요청을 처리하지 못했습니다.'));
      else if (message.type === 'ACK') finish(null, message.payload);
    };
  });
}
module.exports = { backendRequest };
