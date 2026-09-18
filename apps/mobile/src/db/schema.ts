import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const folders = sqliteTable(
  'folders',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().default(''),
    color: text('color').notNull().default('#3b82f6'),
    icon: text('icon').notNull().default('folder'),
    isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
    pinCode: text('pin_code'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_folders_updated_at').on(table.updatedAt),
    index('idx_folders_deleted_at').on(table.deletedAt),
  ]
);

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
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
    index('idx_notes_folder_id').on(table.folderId),
    index('idx_notes_updated_at').on(table.updatedAt),
    index('idx_notes_deleted_at').on(table.deletedAt),
    index('idx_notes_pinned').on(table.isPinned),
    index('idx_notes_archived').on(table.isArchived),
  ]
);

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;


