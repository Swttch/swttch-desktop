const { join, isAbsolute } = require('node:path');
const { readFileSync } = require('node:fs');

function readOptional(file) {
  try { return readFileSync(file, 'utf8'); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function readLegacyProjects(source) {
  const rows = new Map();
  const entityFile = join(source, 'entities/project/projects.entity.jsonl');
  const entityText = readOptional(entityFile);
  for (const [index, line] of (entityText || '').split('\n').entries()) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); } catch { throw new Error(`프로젝트 파일 ${index + 1}행을 읽지 못했습니다.`); }
    if (!row || typeof row.path !== 'string' || !isAbsolute(row.path)) throw new Error(`프로젝트 파일 ${index + 1}행의 경로가 올바르지 않습니다.`);
    if (rows.has(row.path)) throw new Error('원본 프로젝트 파일에 중복 경로가 있습니다.');
    rows.set(row.path, row);
  }
  if (entityText === null) throw new Error('~/.claude-code-gui에서 프로젝트 엔티티 JSONL을 찾지 못했습니다.');
  return [...rows.values()];
}

module.exports = { readLegacyProjects };
