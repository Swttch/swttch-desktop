const { existsSync, chmodSync } = require('node:fs');
const { join } = require('node:path');
// node-pty's packaged macOS spawn helper must be executable after installation.
if (process.platform === 'darwin') {
  const helper = join(__dirname, '../node_modules/node-pty/prebuilds', process.platform + '-' + process.arch, 'spawn-helper');
  if (existsSync(helper)) chmodSync(helper, 0o755);
}
