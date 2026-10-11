import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const sources = ['src', 'src/database'].flatMap(directory =>
  readdirSync(directory).filter(file => file.endsWith('.cjs')).map(file => `${directory}/${file}`),
);
for (const source of [...sources, 'scripts/dev.mjs']) {
  const result = spawnSync(process.execPath, ['--check', source], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
