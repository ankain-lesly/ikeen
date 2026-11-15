import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

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
    index('idx_desktop_folders_user_id').on(table.userId),
    index('idx_desktop_folders_updated_at').on(table.updatedAt),
    index('idx_desktop_folders_deleted_at').on(table.deletedAt),
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
    index('idx_desktop_notes_user_id').on(table.userId),
    index('idx_desktop_notes_folder_id').on(table.folderId),
    index('idx_desktop_notes_updated_at').on(table.updatedAt),
    index('idx_desktop_notes_deleted_at').on(table.deletedAt),
    index('idx_desktop_notes_pinned').on(table.isPinned),
    index('idx_desktop_notes_archived').on(table.isArchived),
  ]
);

export const noteBlocks = sqliteTable(
  'note_blocks',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['text', 'list', 'media'] }).notNull(),
    position: integer('position').notNull(),
    content: text('content').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_desktop_note_blocks_note_id_position').on(table.noteId, table.position),
    index('idx_desktop_note_blocks_note_id').on(table.noteId),
    index('idx_desktop_note_blocks_deleted_at').on(table.deletedAt),
  ]
);

export const notesRelations = relations(notes, ({ many, one }) => ({
  folder: one(folders, {
    fields: [notes.folderId],
    references: [folders.id],
  }),
  blocks: many(noteBlocks),
}));

export const noteBlocksRelations = relations(noteBlocks, ({ one }) => ({
  note: one(notes, {
    fields: [noteBlocks.noteId],
    references: [notes.id],
  }),
}));

export const reminders = sqliteTable(
  'reminders',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    noteId: text('note_id').references(() => notes.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    dueAt: text('due_at').notNull(),
    repeat: text('repeat', { enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'] })
      .notNull()
      .default('none'),
    isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
    notificationId: text('notification_id'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('idx_desktop_reminders_user_id').on(table.userId),
    index('idx_desktop_reminders_note_id').on(table.noteId),
    index('idx_desktop_reminders_due_at').on(table.dueAt),
    index('idx_desktop_reminders_completed').on(table.isCompleted),
    index('idx_desktop_reminders_deleted_at').on(table.deletedAt),
  ]
);

export const remindersRelations = relations(reminders, ({ one }) => ({
  note: one(notes, {
    fields: [reminders.noteId],
    references: [notes.id],
  }),
}));

export const syncOutbox = sqliteTable(
  'sync_outbox',
  {
    id: text('id').primaryKey(),
    entity: text('entity', { enum: ['folders', 'notes', 'note_blocks', 'reminders'] }).notNull(),
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
    index('idx_desktop_sync_outbox_status_created').on(table.status, table.createdAt),
    index('idx_desktop_sync_outbox_created_at').on(table.createdAt),
    index('idx_desktop_sync_outbox_entity').on(table.entity, table.entityId),
  ]
);

export const syncMetadata = sqliteTable('sync_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const mediaSyncOutbox = sqliteTable(
  'media_sync_outbox',
  {
    id: text('id').primaryKey(),
    blockId: text('block_id').notNull(),
    localUri: text('local_uri').notNull(),
    status: text('status', { enum: ['pending', 'uploading', 'completed', 'failed'] })
      .notNull()
      .default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_desktop_media_sync_outbox_status').on(table.status),
    index('idx_desktop_media_sync_outbox_block_id').on(table.blockId),
  ]
);

export type NoteSelect = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

export type NoteBlockSelect = typeof noteBlocks.$inferSelect;
export type InsertNoteBlock = typeof noteBlocks.$inferInsert;

export type FolderSelect = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

export type SyncOutboxItem = typeof syncOutbox.$inferSelect;
export type InsertSyncOutboxItem = typeof syncOutbox.$inferInsert;
export type SyncMetadataItem = typeof syncMetadata.$inferSelect;
export type MediaSyncOutboxSelect = typeof mediaSyncOutbox.$inferSelect;

export type ReminderSelect = typeof reminders.$inferSelect;
export type InsertReminder = typeof reminders.$inferInsert;
