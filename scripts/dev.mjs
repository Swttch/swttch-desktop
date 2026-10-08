import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { startHost } = require('../src/host.cjs');
const { FRONTEND_PORT, API_PORT } = require('../src/ports.cjs');
const root = fileURLToPath(new URL('..', import.meta.url));
let api;
let server;
let child;
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  await server?.close();
  await api?.stop();
  process.exitCode = code;
}
try {
  api = await startHost({ port: API_PORT, allowedOrigins: [
    `http://127.0.0.1:${FRONTEND_PORT}`, `http://localhost:${FRONTEND_PORT}`,
  ] });
  server = await createServer({ configFile: fileURLToPath(new URL('../renderer/vite.config.mjs', import.meta.url)) });
  await server.listen();
  console.log(`API: http://localhost:${api.port}`);
  server.printUrls();
  if (process.argv.includes('--electron')) {
    const env = { ...process.env, SWTTCH_RENDERER_URL: `http://127.0.0.1:${FRONTEND_PORT}` };
    delete env.ELECTRON_RUN_AS_NODE;
    child = spawn(require('electron'), [root], { env, stdio: 'inherit' });
    child.once('error', error => { console.error(error.message); void stop(1); });
    child.once('exit', code => { void stop(code || 0); });
  }
  process.on('SIGINT', () => { void stop(); });
  process.on('SIGTERM', () => { void stop(); });
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Development startup failed');
  await stop(1);
}
