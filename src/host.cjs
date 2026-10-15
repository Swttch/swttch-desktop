const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const { resolve, join, extname } = require('node:path');
const { createLocalService } = require('./local-service.cjs');

const { isShellSettingsRequest } = require('./settings-navigation.mjs');
const { PATH } = require('./paths.mjs');
const { API_PORT } = require('./ports.cjs');

async function startHost({ port = API_PORT, home, allowedOrigins = [], backend, subscribe } = {}) {
  const service = createLocalService({ home, allowedOrigins, backend, subscribe });
  const renderer = resolve(__dirname, '../renderer/dist');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
  const server = createServer((req, res) => service.middleware(req, res, async () => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      const file = isShellSettingsRequest(req.url) || path === PATH.HOME || (path === PATH.PROJECTS || path.startsWith(PATH.PROJECTS + '/')) || path === '/index.html' ? join(renderer, 'index.html') : resolve(renderer, '.' + decodeURIComponent(path));
      if (!file.startsWith(renderer + '/') || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end(); return; }
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('셸 빌드 파일이 없습니다. build를 실행해 주세요.'); }
  }));
  const connections = new Set();
  server.on('connection', socket => { connections.add(socket); socket.on('close', () => connections.delete(socket)); });
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  } catch (error) { await service.stop(); throw error; }
  service.bind(server);
  void service.start();
  return {
    port: server.address().port,
    async stop() { await service.stop(); for (const socket of connections) socket.destroy(); await new Promise(resolve => server.close(resolve)); },
  };
}
module.exports = { startHost };
if (require.main === module) {
  let host;
  let stopping = false;
  startHost({ port: Number(process.env.SWTTCH_PORT || API_PORT) }).then(result => {
    host = result;
    console.log(`DESKTOP_PORT:${host.port}`);
  }).catch(error => { console.error(error.message); process.exit(1); });
  const stop = async () => { if (stopping) return; stopping = true; await host?.stop(); process.exit(0); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
