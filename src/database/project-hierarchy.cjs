const { relative, isAbsolute, sep } = require('node:path');
function validateProjectHierarchy(rows) {
  const parents = new Map(rows.map(row => [row.id, row.projectId ?? null]));
  for (const row of rows) {
    const visited = new Set([row.id]);
    let parent = row.projectId ?? null;
    while (parent !== null) {
      if (!Number.isSafeInteger(parent) || parent < 1 || !parents.has(parent)) throw new Error('부모 프로젝트가 존재하지 않습니다.');
      if (visited.has(parent)) throw new Error('프로젝트 소속 관계가 순환할 수 없습니다.');
      visited.add(parent); parent = parents.get(parent);
    }
  }
}
function projectDescendants(rows, id) {
  const children = new Map();
  for (const row of rows) {
    if (row.projectId === null || row.projectId === undefined) continue;
    const group = children.get(row.projectId) || [];
    group.push(row); children.set(row.projectId, group);
  }
  const result = [], queue = [...(children.get(id) || [])], visited = new Set([id]);
  for (let index = 0; index < queue.length; index++) {
    const row = queue[index];
    if (visited.has(row.id)) continue;
    visited.add(row.id); result.push(row); queue.push(...(children.get(row.id) || []));
  }
  return result;
}
function connectPathParents(rows) {
  return rows.map(row => {
    if (row.projectId !== null && row.projectId !== undefined) return row;
    const ancestors = rows.filter(parent => {
      if (parent.id === row.id) return false;
      const suffix = relative(parent.path, row.path);
      return suffix && suffix !== '..' && !suffix.startsWith('..' + sep) && !isAbsolute(suffix);
    }).sort((a, b) => b.path.length - a.path.length);
    return { ...row, projectId: ancestors[0]?.id ?? null };
  });
}
module.exports = { validateProjectHierarchy, projectDescendants, connectPathParents };
