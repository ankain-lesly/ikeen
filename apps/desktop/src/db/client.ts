import Database from '@tauri-apps/plugin-sql';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import { runStartupMigrations, type QueryExecutor } from './migrations';

export const DATABASE_FILE = 'sqlite:ikeen_desktop.db';

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// In-memory fallback mock database for web browser dev previews outside Tauri
export class BrowserMockDatabase implements QueryExecutor {
  public notes: Record<string, any>[] = [
    {
      id: 'note-starter-1',
      user_id: null,
      folder_id: 'folder-architecture',
      title: 'Tauri v2 Desktop Architecture',
      content: `# Tauri v2 Desktop Architecture\n\nLocal-first desktop client running on embedded SQLite with zero-latency FTS5 full-text search.`,
      tags: '["architecture", "tauri", "desktop"]',
      is_pinned: 1,
      is_archived: 0,
      summary: null,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    {
      id: 'note-starter-2',
      user_id: null,
      folder_id: 'folder-general',
      title: 'Fast Keyboard Ergonomics',
      content: `# Fast Keyboard Ergonomics\n\nAll major workflows are accessible through single or dual-key shortcuts.`,
      tags: '["ux", "shortcuts"]',
      is_pinned: 0,
      is_archived: 0,
      summary: null,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  public folders: Record<string, any>[] = [
    {
      id: 'folder-general',
      user_id: null,
      name: 'General',
      color: '#3b82f6',
      icon: 'folder',
      is_locked: 0,
      pin_code: null,
      sort_order: 0,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    {
      id: 'folder-architecture',
      user_id: null,
      name: 'Ideas & Architecture',
      color: '#39ff14',
      icon: 'lightbulb',
      is_locked: 0,
      pin_code: null,
      sort_order: 1,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  public syncOutbox: Record<string, any>[] = [];

  async execute(query: string, bindValues: unknown[] = []): Promise<unknown> {
    const q = query.trim();
    const upper = q.toUpperCase();

    if (upper.startsWith('INSERT INTO "NOTES"') || upper.startsWith('INSERT INTO NOTES')) {
      const colMatch = q.match(/\((.*?)\)/);
      const row: Record<string, any> = {
        id: `mock-${Date.now()}`,
        user_id: null,
        folder_id: null,
        title: 'Untitled Note',
        content: '',
        tags: '[]',
        is_pinned: 0,
        is_archived: 0,
        summary: null,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };

      if (colMatch && colMatch[1]) {
        const cols = colMatch[1].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        cols.forEach((col, idx) => {
          if (bindValues[idx] !== undefined) {
            row[col] = bindValues[idx];
          }
        });
      }
      this.notes.unshift(row);
      return { rowsAffected: 1, lastInsertId: 1 };
    }

    if (upper.startsWith('INSERT INTO "FOLDERS"') || upper.startsWith('INSERT INTO FOLDERS')) {
      const colMatch = q.match(/\((.*?)\)/);
      const row: Record<string, any> = {
        id: `folder-${Date.now()}`,
        user_id: null,
        name: 'New Folder',
        color: '#3b82f6',
        icon: 'folder',
        is_locked: 0,
        pin_code: null,
        sort_order: this.folders.length,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      if (colMatch && colMatch[1]) {
        const cols = colMatch[1].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        cols.forEach((col, idx) => {
          if (bindValues[idx] !== undefined) {
            row[col] = bindValues[idx];
          }
        });
      }
      this.folders.push(row);
      return { rowsAffected: 1, lastInsertId: 1 };
    }

    if (upper.startsWith('INSERT INTO "SYNC_OUTBOX"') || upper.startsWith('INSERT INTO SYNC_OUTBOX')) {
      return { rowsAffected: 1, lastInsertId: 1 };
    }

    if (upper.startsWith('UPDATE "NOTES"') || upper.startsWith('UPDATE NOTES')) {
      const lastParam = bindValues[bindValues.length - 1];
      const note = this.notes.find((n) => n.id === lastParam);
      if (note) {
        if (upper.includes('"DELETED_AT"') || upper.includes('DELETED_AT')) {
          note.deleted_at = bindValues[0] ?? new Date().toISOString();
        }
        if (upper.includes('"TITLE"') || upper.includes('TITLE')) {
          note.title = bindValues[0] ?? note.title;
        }
        if (upper.includes('"CONTENT"') || upper.includes('CONTENT')) {
          note.content = bindValues[1] ?? note.content;
        }
        note.updated_at = new Date().toISOString();
      }
      return { rowsAffected: 1 };
    }

    if (upper.startsWith('UPDATE "FOLDERS"') || upper.startsWith('UPDATE FOLDERS')) {
      const lastParam = bindValues[bindValues.length - 1];
      const folder = this.folders.find((f) => f.id === lastParam);
      if (folder) {
        if (upper.includes('DELETED_AT')) folder.deleted_at = bindValues[0] ?? new Date().toISOString();
        folder.updated_at = new Date().toISOString();
      }
      return { rowsAffected: 1 };
    }

    return { rowsAffected: 1, lastInsertId: 1 };
  }

  async select<T = unknown[]>(query: string, bindValues: unknown[] = []): Promise<T> {
    const q = query.trim().toUpperCase();

    if (q.includes('FROM "FOLDERS"') || q.includes('FROM FOLDERS')) {
      const activeFolders = this.folders.filter((f) => !f.deleted_at);
      return activeFolders as unknown as T;
    }

    if (q.includes('COUNT(*)')) {
      const countVal = this.notes.filter((n) => !n.deleted_at).length;
      return [{ 'count(*)': countVal }] as unknown as T;
    }

    if (q.includes('FROM "NOTES"') || q.includes('FROM NOTES')) {
      let filtered = this.notes.filter((n) => !n.deleted_at);

      if (bindValues.length > 0) {
        const idParam = bindValues[0];
        const match = filtered.filter((n) => n.id === idParam);
        if (match.length > 0) return match as unknown as T;
      }

      if (q.includes('"IS_ARCHIVED" = 1') || q.includes('IS_ARCHIVED = 1')) {
        filtered = filtered.filter((n) => n.is_archived === 1);
      } else if (q.includes('"IS_ARCHIVED" = 0') || q.includes('IS_ARCHIVED = 0')) {
        filtered = filtered.filter((n) => !n.is_archived);
      }

      if (q.includes('"IS_PINNED" = 1') || q.includes('IS_PINNED = 1')) {
        filtered = filtered.filter((n) => n.is_pinned === 1);
      }

      filtered.sort((a, b) => {
        if (b.is_pinned !== a.is_pinned) return (b.is_pinned || 0) - (a.is_pinned || 0);
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      return filtered as unknown as T;
    }

    return [] as unknown as T;
  }
}

let tauriDbInstance: Database | null = null;
let mockDbInstance: BrowserMockDatabase | null = null;
let initPromise: Promise<void> | null = null;

export async function getTauriSqlDatabase(): Promise<Database | BrowserMockDatabase> {
  if (isTauriEnvironment()) {
    if (!tauriDbInstance) {
      tauriDbInstance = await Database.load(DATABASE_FILE);
    }
    return tauriDbInstance;
  }

  if (!mockDbInstance) {
    mockDbInstance = new BrowserMockDatabase();
  }
  return mockDbInstance;
}

export async function initDatabase(): Promise<{
  sqlDb: Database | BrowserMockDatabase;
}> {
  if (initPromise) {
    await initPromise;
    return { sqlDb: (tauriDbInstance || mockDbInstance)! };
  }

  initPromise = (async () => {
    const sqlDb = await getTauriSqlDatabase();

    // Run migrations on native Tauri SQLite
    if (isTauriEnvironment() && sqlDb instanceof Database) {
      await runStartupMigrations(sqlDb);
    }
  })();

  await initPromise;
  return { sqlDb: (tauriDbInstance || mockDbInstance)! };
}

// 100% Pure Drizzle ORM client wired to SQLite Proxy
export const db = drizzle(
  async (sql, params, method) => {
    await initDatabase();
    const sqlDb = await getTauriSqlDatabase();

    try {
      if (method === 'run') {
        await sqlDb.execute(sql, params);
        return { rows: [] };
      }

      const rows = await sqlDb.select<any[]>(sql, params);

      if (method === 'get') {
        const first = rows[0];
        if (!first) return { rows: [] };
        return { rows: Array.isArray(first) ? first : Object.values(first) };
      }

      const mapped = rows.map((r) => (Array.isArray(r) ? r : Object.values(r)));
      return { rows: mapped };
    } catch (err: unknown) {
      console.error(`[Drizzle SQLite Proxy Error] method: ${method}, sql: ${sql}`, err);
      throw err;
    }
  },
  { schema }
);
