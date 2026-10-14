const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

test('build entry point uses pnpm from any directory and forwards arguments to every command', t => {
  const fixture = mkdtempSync(join(tmpdir(), 'desktop-package-manager-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  writeFileSync(join(fixture, 'pnpm'), `#!${process.execPath}\nprocess.stdout.write(JSON.stringify({ args: process.argv.slice(2), electronMode: process.env.ELECTRON_RUN_AS_NODE ?? null }));\n`, { mode: 0o755 });
  writeFileSync(join(fixture, 'npm'), '#!/bin/bash\necho "Unexpected npm invocation" >&2\nexit 99\n', { mode: 0o755 });
  const root = resolve(__dirname, '..');
  const commands = {
    install: ['install'], build: ['run', 'build'], 'runtime-build': ['run', 'runtime:build'],
    test: ['test'], dev: ['run', 'dev:browser'], 'dev-electron': ['run', 'dev'],
    serve: ['run', 'serve'], start: ['start'],
  };
  for (const [command, args] of Object.entries(commands)) {
    const result = spawnSync('bash', [join(root, 'scripts/build.sh'), command, '--example', 'value with spaces'], {
      cwd: fixture, encoding: 'utf8',
      env: { ...process.env, PATH: fixture + ':' + process.env.PATH, ELECTRON_RUN_AS_NODE: '1' },
    });
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
    assert.deepEqual(JSON.parse(result.stdout), {
      args: ['--dir', root, ...args, '--example', 'value with spaces'],
      electronMode: command === 'start' ? null : '1',
    });
  }
});

test('installation accepts pnpm and rejects other package managers with the supported command', () => {
  const script = resolve(__dirname, '../scripts/check-package-manager.cjs');
  for (const manager of ['pnpm/10.30.1 npm/? node/v24.3.0', 'npm/11.4.2', 'yarn/1.22.22']) {
    const result = spawnSync(process.execPath, [script], {
      encoding: 'utf8', env: { ...process.env, npm_config_user_agent: manager },
    });
    assert.equal(result.status, manager.startsWith('pnpm/') ? 0 : 1, result.stderr);
    if (!manager.startsWith('pnpm/')) assert.match(result.stderr, /pnpm install/);
  }
});
