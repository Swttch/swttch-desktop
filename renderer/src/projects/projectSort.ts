import type { Project } from '../desktop';

export enum SortOrder { Recent = 'recent', Created = 'created' }
const SORT_KEY = 'claude-code-gui:project-selector:sort-order';
export function readProjectSort() {
  try { return localStorage.getItem(SORT_KEY) === SortOrder.Created ? SortOrder.Created : SortOrder.Recent; }
  catch { return SortOrder.Recent; }
}
export function saveProjectSort(order: SortOrder) {
  try { localStorage.setItem(SORT_KEY, order); } catch { /* Display preference only. */ }
}
export function sortProjects(projects: Project[], order: SortOrder) {
  return [...projects].sort((a, b) => Number(b.favoritedAt > 0) - Number(a.favoritedAt > 0)
    || (order === SortOrder.Created ? b.createdAt - a.createdAt : b.lastModified - a.lastModified)
    || a.id - b.id);
}
