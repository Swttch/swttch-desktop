const { eq, and, desc, inArray, count, sql, gt } = require('drizzle-orm');
const { sessions, projects } = require('./schema.cjs');
class SessionRepository {
  constructor(db) { this.db = db; }
  all() { return this.db.select().from(sessions).all(); }
  collection(where, order, offset, limit) {
    const rows = this.db.select({ session: sessions, project: projects }).from(sessions).innerJoin(projects, eq(sessions.projectId, projects.id)).where(where).orderBy(...order).limit(limit).offset(offset).all();
    const total = this.db.select({ total: count() }).from(sessions).innerJoin(projects, eq(sessions.projectId, projects.id)).where(where).get().total;
    return { rows, total, hasMore: offset + rows.length < total, nextOffset: offset + rows.length };
  }
  active(offset = 0, limit = 5) {
    return this.collection(and(eq(sessions.isOpen, true), eq(projects.hiddenAt, 0)), [desc(sessions.activityUpdatedAt), desc(sessions.lastTimestamp), sessions.uid], offset, limit);
  }
  favorites(offset = 0, limit = 5) {
    return this.collection(and(gt(sessions.favoritedAt, 0), eq(projects.hiddenAt, 0)), [desc(sessions.favoritedAt), sessions.uid], offset, limit);
  }
  setFavorite(uid, favorite) {
    return this.upsert(uid, { favoritedAt: favorite ? this.find(uid)?.favoritedAt || Date.now() : 0 });
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
