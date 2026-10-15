import packageInfo from '../package.json' with { type: 'json' };
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import ports from '../src/ports.cjs';
import { isShellSettingsRequest } from '../src/settings-navigation.mjs';
import { PATH } from '../src/paths.mjs';
const { FRONTEND_PORT, API_PORT } = ports;

export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  define: { __SWTTCH_VERSION__: JSON.stringify(packageInfo.version) },
  plugins: [react(), tailwindcss(), ...(command === 'serve' ? [{
    name: 'local-development-csp',
    transformIndexHtml(html) {
      return html
        .replace("script-src 'self';", "script-src 'self' 'unsafe-inline';")
        .replace("default-src 'self';", `default-src 'self'; connect-src 'self' ws://127.0.0.1:${FRONTEND_PORT} ws://localhost:${FRONTEND_PORT};`);
    },
  }] : [])],
  server: {
    host: '127.0.0.1', port: FRONTEND_PORT, strictPort: true,
    proxy: {
      // Keep shell/Vite modules local; forward API, embedded chat assets and sockets.
      [`^/(?!${PATH.PROJECTS.slice(1)}(?:/|\\?|$)|\\?|$|index\\.html(?:\\?|$)|src/|@|node_modules/|desktop-assets/)`]: {
        target: `http://127.0.0.1:${API_PORT}`, changeOrigin: true, ws: true, bypass: req => isShellSettingsRequest(req.url) ? '/index.html' : undefined,
      },
    },
  },
  build: { outDir: 'dist', assetsDir: 'desktop-assets', emptyOutDir: true },
}));
