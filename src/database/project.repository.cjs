const { eq, gt, desc, asc } = require('drizzle-orm');
const { projects } = require('./schema.cjs');
const { validateProjectHierarchy, projectDescendants, connectPathParents } = require('./project-hierarchy.cjs');
const { readLegacyProjects } = require('./import-projects.cjs');

class ProjectRepository {
  constructor(db) { this.db = db; }
  findByPath(path, db = this.db) {
    return db.select().from(projects).where(eq(projects.path, path)).get();
  }
  descendants(id) { return projectDescendants(this.all(), id); }
  validateParent(id, projectId) {
    const rows = this.all();
    if (projectId !== null && !rows.some(row => row.id === projectId && !row.hiddenAt)) throw new Error('부모 프로젝트가 존재하지 않습니다.');
    validateProjectHierarchy(rows.map(row => row.id === id ? { ...row, projectId } : row));
  }
  recent() {
    return this.db.select({ path: projects.path }).from(projects).where(gt(projects.openedAt, 0)).orderBy(desc(projects.openedAt)).limit(5).all().map(row => row.path);
  }
  all() {
    return this.db.select().from(projects).orderBy(desc(projects.openedAt), asc(projects.path)).all().map(row => ({
      path: row.path, alias: row.alias, description: row.description, favoritedAt: row.favoritedAt, hiddenAt: row.hiddenAt,
      createdAt: row.createdAt, lastModified: row.lastModified, sessionCount: row.sessionCount, ...row.data, id: row.id, projectId: row.projectId, sessionsExpanded: row.sessionsExpanded,
    }));
  }
  create(path, fields = {}) {
    return this.db.transaction(tx => {
      const now = Date.now();
      const existing = this.findByPath(path, tx);
      if (fields.projectId !== undefined && existing) this.validateParent(existing.id, fields.projectId);
      if (existing) {
        tx.update(projects).set({ ...fields, hiddenAt: 0, data: { ...existing.data, ...fields, hiddenAt: 0 } }).where(eq(projects.path, path)).run();
      } else {
        tx.insert(projects).values({ path, openedAt: 0, createdAt: now, lastModified: now, ...fields, data: fields }).run();
      }
      const row = this.findByPath(path, tx);
      if (!existing && fields.projectId !== undefined) this.validateParent(row.id, fields.projectId);
      if (!existing && fields.projectId === undefined) {
        const connected = connectPathParents(tx.select().from(projects).all()).find(candidate => candidate.id === row.id);
        tx.update(projects).set({ projectId: connected.projectId }).where(eq(projects.id, row.id)).run();
        row.projectId = connected.projectId;
      }
      return { path: row.path, alias: row.alias, description: row.description, favoritedAt: row.favoritedAt, hiddenAt: row.hiddenAt,
        createdAt: row.createdAt, lastModified: row.lastModified, sessionCount: row.sessionCount, ...row.data, id: row.id, projectId: row.projectId, sessionsExpanded: row.sessionsExpanded };
    });
  }
  remember(path) {
    const openedAt = Date.now();
    if (!this.findByPath(path)) this.create(path);
    return this.db.insert(projects).values({ path, openedAt, createdAt: openedAt, lastModified: openedAt }).onConflictDoUpdate({ target: projects.path, set: { openedAt } }).run();
  }
  update(path, fields) {
    const existing = this.findByPath(path);
    if (!existing) throw new Error('등록되지 않은 프로젝트입니다.');
    if (fields.projectId !== undefined) this.validateParent(existing.id, fields.projectId);
    return this.db.update(projects).set({ ...fields, data: { ...existing.data, ...fields } }).where(eq(projects.path, path)).run();
  }
  migrate(source) {
    const rows = readLegacyProjects(source);
    return this.db.transaction(tx => {
      let imported = 0; let enriched = 0; let unchanged = 0;
      const inferredPaths = new Set();
      for (const row of rows) {
        const existing = this.findByPath(row.path, tx);
        const values = { ...(Number.isSafeInteger(row.id) ? { id: row.id } : {}), sessionCount: row.sessionCount || 0, createdAt: row.createdAt || 0, lastModified: row.lastModified || 0, favoritedAt: row.favoritedAt || 0, hiddenAt: row.hiddenAt || 0, alias: row.alias || null, description: row.description || null, data: row };
        if (!existing) { inferredPaths.add(row.path); tx.insert(projects).values({ path: row.path, openedAt: 0, ...values }).run(); imported++; }
        else if (Object.keys(existing.data).length === 0) { inferredPaths.add(row.path); tx.update(projects).set(values).where(eq(projects.path, row.path)).run(); enriched++; }
        else unchanged++;
      }
      const saved = tx.select().from(projects).all();
      const inferred = connectPathParents(saved.map(row => ({ id: row.id, path: row.path, projectId: inferredPaths.has(row.path) ? row.data.projectId ?? null : row.projectId })));
      const relations = inferred.map(row => inferredPaths.has(row.path) ? row : { ...row, projectId: saved.find(existing => existing.id === row.id).projectId });
      validateProjectHierarchy(relations);
      for (const row of relations) tx.update(projects).set({ projectId: row.projectId }).where(eq(projects.id, row.id)).run();
      return { imported, enriched, unchanged, total: rows.length };
    });
  }
}
module.exports = { ProjectRepository };
