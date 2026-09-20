import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const folders = sqliteTable(
  'folders',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    name: text('name').notNull().default(''),
    color: text('color').notNull().default('#3b82f6'),
    icon: text('icon').notNull().default('folder'),
    isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
    pinCode: text('pin_code'),
    sortOrder: integer('sort_order').notNull().default(0),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_folders_user_id').on(table.userId),
    index('idx_folders_updated_at').on(table.updatedAt),
    index('idx_folders_deleted_at').on(table.deletedAt),
  ]
);

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    tags: text('tags').notNull().default('[]'),
    isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    summary: text('summary'),
    version: integer('version').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_notes_user_id').on(table.userId),
    index('idx_notes_folder_id').on(table.folderId),
    index('idx_notes_updated_at').on(table.updatedAt),
    index('idx_notes_deleted_at').on(table.deletedAt),
    index('idx_notes_pinned').on(table.isPinned),
    index('idx_notes_archived').on(table.isArchived),
  ]
);

export const syncOutbox = sqliteTable(
  'sync_outbox',
  {
    id: text('id').primaryKey(),
    entity: text('entity', { enum: ['folders', 'notes'] }).notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action', { enum: ['upsert', 'delete'] }).notNull(),
    status: text('status', { enum: ['pending', 'in_flight', 'success', 'failed'] })
      .notNull()
      .default('pending'),
    mutationId: text('mutation_id').notNull(),
    payload: text('payload').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => [
    index('idx_sync_outbox_status_created').on(table.status, table.createdAt),
    index('idx_sync_outbox_created_at').on(table.createdAt),
    index('idx_sync_outbox_entity').on(table.entity, table.entityId),
  ]
);

export const syncMetadata = sqliteTable('sync_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});



export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

export type SyncOutboxItem = typeof syncOutbox.$inferSelect;
export type InsertSyncOutboxItem = typeof syncOutbox.$inferInsert;
export type SyncMetadataItem = typeof syncMetadata.$inferSelect;


