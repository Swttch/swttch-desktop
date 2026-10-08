const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');

const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
module.exports = { projects };
