export interface QueryExecutor {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
}

export const BASE_TABLE_STATEMENTS: string[] = [
  // 1. Folders table & indexes
  `CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    name TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#3b82f6',
    icon TEXT NOT NULL DEFAULT 'folder',
    is_locked INTEGER NOT NULL DEFAULT 0,
    pin_code TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_folders_user_id ON folders(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_folders_updated_at ON folders(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_folders_deleted_at ON folders(deleted_at);`,

  // 2. Notes table & indexes
  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_notes_user_id ON notes(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_notes_folder_id ON notes(folder_id);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_notes_updated_at ON notes(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_notes_deleted_at ON notes(deleted_at);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_notes_pinned ON notes(is_pinned);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_notes_archived ON notes(is_archived);`,

  // 3. Note Blocks table & indexes
  `CREATE TABLE IF NOT EXISTS note_blocks (
    id TEXT PRIMARY KEY NOT NULL,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    position INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_note_blocks_note_id_position ON note_blocks(note_id, position);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_note_blocks_note_id ON note_blocks(note_id);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_note_blocks_deleted_at ON note_blocks(deleted_at);`,

  // 4. Sync Outbox table & indexes
  `CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    mutation_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_sync_outbox_status_created ON sync_outbox(status, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_sync_outbox_created_at ON sync_outbox(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_sync_outbox_entity ON sync_outbox(entity, entity_id);`,

  // 5. Sync Metadata table
  `CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // 6. Media Sync Outbox table & indexes
  `CREATE TABLE IF NOT EXISTS media_sync_outbox (
    id TEXT PRIMARY KEY NOT NULL,
    block_id TEXT NOT NULL,
    local_uri TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_media_sync_outbox_status ON media_sync_outbox(status);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_media_sync_outbox_block_id ON media_sync_outbox(block_id);`,

  // 7. Reminders table & indexes
  `CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT,
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    due_at TEXT NOT NULL,
    repeat TEXT NOT NULL DEFAULT 'none',
    repeat_interval INTEGER,
    max_repeats INTEGER,
    repeat_count INTEGER NOT NULL DEFAULT 0,
    is_completed INTEGER NOT NULL DEFAULT 0,
    notification_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_reminders_user_id ON reminders(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_reminders_note_id ON reminders(note_id);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_reminders_due_at ON reminders(due_at);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_reminders_completed ON reminders(is_completed);`,
  `CREATE INDEX IF NOT EXISTS idx_desktop_reminders_deleted_at ON reminders(deleted_at);`,
];

export async function runStartupMigrations(db: QueryExecutor): Promise<void> {
  // Enforce WAL mode and foreign key constraints
  try {
    await db.execute('PRAGMA journal_mode = WAL;');
  } catch (err) {
    console.warn('[Desktop Migrations] WAL pragma skipped/unsupported:', err);
  }

  try {
    await db.execute('PRAGMA foreign_keys = ON;');
  } catch (err) {
    console.warn('[Desktop Migrations] Foreign keys pragma skipped/unsupported:', err);
  }

  // Run core relational schema migrations
  for (const statement of BASE_TABLE_STATEMENTS) {
    try {
      await db.execute(statement);
    } catch (err: unknown) {
      console.error('[Desktop Migrations] Core schema migration error:', err, 'for statement:', statement);
      throw err;
    }
  }

  // Safe additive migrations for existing tables
  const additiveMigrations = [
    'ALTER TABLE reminders ADD COLUMN repeat_interval INTEGER;',
    'ALTER TABLE reminders ADD COLUMN max_repeats INTEGER;',
    'ALTER TABLE reminders ADD COLUMN repeat_count INTEGER NOT NULL DEFAULT 0;',
  ];
  for (const sql of additiveMigrations) {
    try {
      await db.execute(sql);
    } catch {
      // Ignore error if column already exists
    }
  }
}
