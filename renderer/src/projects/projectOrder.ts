import type { Project } from '../desktop';

export enum DropSide { Before = 'before', After = 'after' }
export type ProjectMove = { projectId: number; targetId: number | null; side: DropSide; favorite: boolean };
export function moveProjects(projects: Project[], move: ProjectMove) {
  const moved = projects.find(project => project.id === move.projectId);
  if (!moved) return projects;
  const rows = projects.filter(project => project.id !== move.projectId);
  let index = move.targetId === null ? rows.findIndex(project => !project.favoritedAt) : rows.findIndex(project => project.id === move.targetId);
  if (index < 0) index = rows.length;
  else if (move.targetId !== null && move.side === DropSide.After) index++;
  rows.splice(index, 0, { ...moved, favoritedAt: move.favorite ? moved.favoritedAt || Date.now() : 0 });
  return rows.map((project, sortOrder) => ({ ...project, sortOrder }));
}
