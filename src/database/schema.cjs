const { relations } = require('drizzle-orm');
const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');

const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  sessionsExpanded: integer('sessions_expanded', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  path: text('path').notNull().unique(),
  openedAt: integer('opened_at').notNull(),
  sessionCount: integer('session_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'number' }).notNull().default(0),
  lastModified: integer('last_modified', { mode: 'number' }).notNull().default(0),
  favoritedAt: integer('favorited_at').notNull().default(0),
  hiddenAt: integer('hidden_at').notNull().default(0),
  alias: text('alias'),
  description: text('description'),
  // Keep source entity fields, including fields this version does not consume.
  data: text('data', { mode: 'json' }).notNull().default({}),
});
const projectRelations = relations(projects, ({ one, many }) => ({
  parent: one(projects, { fields: [projects.projectId], references: [projects.id], relationName: 'projectHierarchy' }),
  children: many(projects, { relationName: 'projectHierarchy' }),
  sessions: many(sessions),
}));
const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  uid: text('uid').notNull().unique(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  src: text('src'), title: text('title'), customTitle: text('custom_title'), alias: text('alias'),
  createdAt: text('created_at'), lastTimestamp: text('last_timestamp'),
  favoritedAt: integer('favorited_at').notNull().default(0),
  isOpen: integer('is_open', { mode: 'boolean' }).notNull().default(false),
  activity: text('activity').notNull().default('idle'),
  activityUpdatedAt: integer('activity_updated_at').notNull().default(0),
  sourceSyncedAt: integer('source_synced_at').notNull().default(0),
  sourceMtime: integer('source_mtime'), sourceSize: integer('source_size'),
  data: text('data', { mode: 'json' }).notNull().default({}),
});
const sessionRelations = relations(sessions, ({ one }) => ({ project: one(projects, { fields: [sessions.projectId], references: [projects.id] }) }));
module.exports = { projects, projectRelations, sessions, sessionRelations };
