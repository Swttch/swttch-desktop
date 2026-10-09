const { resolve, join } = require('node:path');
const { readFile } = require('node:fs/promises');
const root = resolve(__dirname, '..');
const plugin = resolve(root, '../..');
const esbuild = require(join(plugin, 'backend/node_modules/esbuild'));
const source = join(plugin, 'backend/src/core/features');
// Bundle the plugin's exact parser; expose its head scan only in this generated bundle.
esbuild.build({ stdin: { contents: `export { extractSessionInfo, scanTail, scanHead } from ${JSON.stringify(join(source, 'extractSessionInfo.ts'))}; export { getProjectSessionsPath } from ${JSON.stringify(join(source, 'getProjectSessionsPath.ts'))}; export { readSessionTitleOverrides } from ${JSON.stringify(join(source, 'sessionTitleOverrides.ts'))};`, resolveDir: root, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile: join(root, 'dist/session-source.mjs'),
  plugins: [{ name: 'expose-source-head', setup(build) { build.onLoad({ filter: /extractSessionInfo\.ts$/ }, async ({ path }) => ({ contents: await readFile(path, 'utf8') + '\nexport { scanHead };', loader: 'ts' })); } }],
}).catch(error => { console.error(error.message); process.exitCode = 1; });
