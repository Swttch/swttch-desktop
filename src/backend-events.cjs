const { randomUUID } = require('node:crypto');

// A host transport subscription; business state still comes from the original backend.
function subscribeBackend(backend, onMessage) {
  let socket; let timer; let stopped = false;
  function connect() {
    if (stopped) return;
    socket = new WebSocket('ws://127.0.0.1:' + backend.port + '/ws?env=BROWSER', ['ccg-auth', backend.token]);
    const requestId = randomUUID();
    socket.onopen = () => socket.send(JSON.stringify({ type: 'GET_SESSION_ACTIVITY', payload: {}, requestId }));
    socket.onmessage = event => {
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'SESSION_ACTIVITY_CHANGED' || (message.type === 'ACK' && message.payload?.requestId === requestId)) onMessage('activity', message.payload);
      else if (message.type === 'SESSIONS_UPDATED' || message.type === 'SETTINGS_CHANGED' || message.type === 'CLAUDE_SETTINGS_CHANGED') onMessage('sessions', message.payload);
    };
    socket.onerror = () => socket.close();
    socket.onclose = () => { if (!stopped) timer = setTimeout(connect, 1000); };
  }
  connect();
  return () => { stopped = true; clearTimeout(timer); socket?.close(); };
}
module.exports = { subscribeBackend };
