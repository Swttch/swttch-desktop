const { eq, and, desc, inArray, count, sql } = require('drizzle-orm');
const { sessions, projects } = require('./schema.cjs');
class SessionRepository {
  constructor(db) { this.db = db; }
  all() { return this.db.select().from(sessions).all(); }
  active(offset = 0, limit = 5) {
    const rows = this.db.select({ session: sessions, project: projects }).from(sessions).innerJoin(projects, eq(sessions.projectId, projects.id)).where(and(eq(sessions.isOpen, true), eq(projects.hiddenAt, 0))).orderBy(desc(sessions.activityUpdatedAt), desc(sessions.lastTimestamp), sessions.uid).limit(limit + 1).offset(offset).all();
    return { rows: rows.slice(0, limit), hasMore: rows.length > limit, nextOffset: offset + Math.min(rows.length, limit) };
  }
  list(projectIds, offset = 0, limit = 30) {
    const where = inArray(sessions.projectId, projectIds);
    let query = this.db.select({ session: sessions, project: projects }).from(sessions).innerJoin(projects, eq(sessions.projectId, projects.id)).where(where).orderBy(desc(sql`coalesce(${sessions.lastTimestamp}, ${sessions.createdAt})`), sessions.uid).offset(offset);
    if (limit !== null) query = query.limit(limit);
    const rows = query.all(), total = this.db.select({ total: count() }).from(sessions).where(where).get().total;
    return { rows, total, nextOffset: offset + rows.length, hasMore: offset + rows.length < total, scopeDirCount: projectIds.length };
  }
  find(uid) { return this.db.select().from(sessions).where(eq(sessions.uid, uid)).get(); }
  upsert(uid, fields) {
    this.db.insert(sessions).values({ uid, ...fields }).onConflictDoUpdate({ target: sessions.uid, set: fields }).run();
    return this.find(uid);
  }
  remove(uid) { this.db.delete(sessions).where(eq(sessions.uid, uid)).run(); }
  syncActivity(snapshot) {
    const now = Date.now(), open = new Set(snapshot.open);
    this.db.transaction(tx => {
      for (const row of tx.select().from(sessions).all()) {
        const isOpen = open.has(row.uid), activity = isOpen ? snapshot.activity[row.uid] || 'idle' : 'idle';
        if (row.isOpen !== isOpen || row.activity !== activity) tx.update(sessions).set({ isOpen, activity, activityUpdatedAt: now }).where(eq(sessions.uid, row.uid)).run();
      }
    });
  }
}
module.exports = { SessionRepository };
