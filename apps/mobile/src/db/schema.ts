import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    tags: text('tags').notNull().default('[]'),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    summary: text('summary'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_notes_updated_at').on(table.updatedAt),
    index('idx_notes_deleted_at').on(table.deletedAt),
    index('idx_notes_pinned').on(table.isPinned),
    index('idx_notes_archived').on(table.isArchived),
  ]
);

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

