import Database from '@tauri-apps/plugin-sql';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from './schema';
import { runStartupMigrations, type QueryExecutor } from './migrations';

export const DATABASE_FILE = 'sqlite:ikeen_desktop.db';

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function bindRowFromInsert(
  query: string,
  bindValues: unknown[],
  defaults: Record<string, any>
): Record<string, any> {
  const row = { ...defaults };
  const colMatch = query.match(/\((.*?)\)/);
  if (colMatch?.[1]) {
    colMatch[1]
      .split(',')
      .map((c) => c.trim().replace(/^"|"$/g, ''))
      .forEach((col, idx) => {
        if (bindValues[idx] !== undefined) row[col] = bindValues[idx];
      });
  }
  return row;
}

function applyUpdateSetColumns(
  target: Record<string, any>,
  query: string,
  bindValues: unknown[]
): void {
  const setMatch = query.match(/set\s+(.+?)\s+where/i);
  if (!setMatch?.[1]) return;
  let paramIdx = 0;
  for (const part of setMatch[1].split(',')) {
    const [rawCol, rawRhs] = part.split('=').map((s) => s.trim());
    if (!rawCol || !rawRhs) continue;
    const col = rawCol.replace(/^"|"$/g, '');
    if (rawRhs.includes('?')) {
      target[col] = bindValues[paramIdx++];
    }
  }
}
export class BrowserMockDatabase implements QueryExecutor {
  public notes: Record<string, any>[] = [];
  public folders: Record<string, any>[] = [];
  public syncOutbox: Record<string, any>[] = [];

  async execute(query: string, bindValues: unknown[] = []): Promise<unknown> {
    const q = query.trim();
    const upper = q.toUpperCase();
    const now = new Date().toISOString();

    if (upper.startsWith('INSERT INTO "NOTES"') || upper.startsWith('INSERT INTO NOTES')) {
      this.notes.unshift(
        bindRowFromInsert(q, bindValues, {
          id: crypto.randomUUID(),
          user_id: null,
          folder_id: null,
          title: 'Untitled Note',
          content: '',
          tags: '[]',
          is_pinned: 0,
          is_archived: 0,
          summary: null,
          version: 1,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })
      );
    } else if (upper.startsWith('INSERT INTO "FOLDERS"') || upper.startsWith('INSERT INTO FOLDERS')) {
      this.folders.push(
        bindRowFromInsert(q, bindValues, {
          id: crypto.randomUUID(),
          user_id: null,
          name: 'New Folder',
          color: '#3b82f6',
          icon: 'folder',
          is_locked: 0,
          pin_code: null,
          sort_order: this.folders.length,
          version: 1,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        })
      );
    } else if (upper.startsWith('UPDATE "NOTES"') || upper.startsWith('UPDATE NOTES')) {
      const note = this.notes.find((n) => n.id === bindValues[bindValues.length - 1]);
      if (note) {
        applyUpdateSetColumns(note, q, bindValues);
        note.updated_at = note.updated_at ?? now;
      }
    } else if (upper.startsWith('UPDATE "FOLDERS"') || upper.startsWith('UPDATE FOLDERS')) {
      const folder = this.folders.find((f) => f.id === bindValues[bindValues.length - 1]);
      if (folder) {
        applyUpdateSetColumns(folder, q, bindValues);
        folder.updated_at = folder.updated_at ?? now;
      }
    }

    return { rowsAffected: 1, lastInsertId: 1 };
  }

  async select<T = unknown[]>(query: string, bindValues: unknown[] = []): Promise<T> {
    const q = query.trim().toUpperCase();

    if (q.includes('FROM "FOLDERS"') || q.includes('FROM FOLDERS')) {
      return this.folders.filter((f) => !f.deleted_at) as unknown as T;
    }

    if (q.includes('COUNT(*)')) {
      if (q.includes('SYNC_OUTBOX')) return [{ 'count(*)': 0 }] as unknown as T;
      return [{ 'count(*)': this.notes.filter((n) => !n.deleted_at).length }] as unknown as T;
    }

    if (q.includes('FROM "NOTES"') || q.includes('FROM NOTES')) {
      let filtered = this.notes.filter((n) => !n.deleted_at);
      if (bindValues.length > 0) {
        const match = filtered.filter((n) => n.id === bindValues[0]);
        if (match.length > 0) return match as unknown as T;
      }
      if (q.includes('IS_ARCHIVED = 1') || q.includes('"IS_ARCHIVED" = 1')) {
        filtered = filtered.filter((n) => n.is_archived === 1);
      } else if (q.includes('IS_ARCHIVED = 0') || q.includes('"IS_ARCHIVED" = 0')) {
        filtered = filtered.filter((n) => !n.is_archived);
      }
      if (q.includes('IS_PINNED = 1') || q.includes('"IS_PINNED" = 1')) {
        filtered = filtered.filter((n) => n.is_pinned === 1);
      }
      return filtered.sort(
        (a, b) =>
          (b.is_pinned || 0) - (a.is_pinned || 0) ||
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ) as unknown as T;
    }

    return [] as unknown as T;
  }
}

let tauriDbInstance: Database | null = null;
let mockDbInstance: BrowserMockDatabase | null = null;
let initPromise: Promise<void> | null = null;

export async function getTauriSqlDatabase(): Promise<Database | BrowserMockDatabase> {
  if (isTauriEnvironment()) {
    if (!tauriDbInstance) tauriDbInstance = await Database.load(DATABASE_FILE);
    return tauriDbInstance;
  }
  if (!mockDbInstance) mockDbInstance = new BrowserMockDatabase();
  return mockDbInstance;
}

export async function initDatabase(): Promise<{ sqlDb: Database | BrowserMockDatabase }> {
  if (!initPromise) {
    initPromise = (async () => {
      const sqlDb = await getTauriSqlDatabase();
      if (isTauriEnvironment() && sqlDb instanceof Database) {
        await runStartupMigrations(sqlDb);
      }
    })();
  }
  await initPromise;
  return { sqlDb: (tauriDbInstance || mockDbInstance)! };
}

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
        return { rows: first ? (Array.isArray(first) ? first : Object.values(first)) : [] };
      }
      return { rows: rows.map((r) => (Array.isArray(r) ? r : Object.values(r))) };
    } catch (err: unknown) {
      console.error(`[Drizzle SQLite Proxy Error] method: ${method}, sql: ${sql}`, err);
      throw err;
    }
  },
  { schema }
);
