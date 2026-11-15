import { db } from '@/db/client';
import { folders, notes } from '@/db/schema';
import { isNull, count } from 'drizzle-orm';
import type { Folder, Note } from '@repo/types';
import { DEFAULT_FOLDER_COLOR } from '@repo/utils/constants';

const nowIso = () => new Date().toISOString();

export const DEFAULT_STARTER_FOLDERS: Folder[] = [
  {
    id: 'folder-general',
    name: 'General',
    color: DEFAULT_FOLDER_COLOR,
    icon: 'folder',
    isLocked: false,
    sortOrder: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: 'folder-architecture',
    name: 'Ideas & Architecture',
    color: '#39ff14',
    icon: 'lightbulb',
    isLocked: false,
    sortOrder: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export const DEFAULT_STARTER_NOTES: Note[] = [
  {
    id: 'note-starter-1',
    folderId: 'folder-architecture',
    title: 'Tauri v2 Desktop Architecture',
    content: `# Tauri v2 Desktop Architecture\n\nLocal-first desktop client running on embedded SQLite with zero-latency FTS5 full-text search and background sync outbox.\n\n## Key Capabilities\n- **Local-First SQLite**: Full offline capability with instant indexed queries.\n- **FTS5 Instant Search**: Sub-10ms full-text BM25 search across all note titles, contents, and tags.\n- **Bi-directional Sync**: Outbox mutation queue automatically pushes changes when online with Last-Write-Wins (LWW) conflict resolution.\n- **Desktop Ergonomics**: Clean two-pane interface, command palette, and keyboard-first navigation.`,
    tags: ['architecture', 'tauri', 'desktop'],
    isPinned: true,
    isArchived: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: 'note-starter-2',
    folderId: 'folder-general',
    title: 'Fast Keyboard Ergonomics',
    content: `# Fast Keyboard Ergonomics\n\nAll major workflows are accessible through single or dual-key shortcuts:\n\n- **⌘N** / **Ctrl+N**: Create new note\n- **⌘K** / **Ctrl+K**: Open Command Palette\n- **⌘\\** / **Ctrl+\\**: Open Navigation Drawer (Sheet)\n- **⌘⇧Space**: Summon Quick-Capture HUD\n- **⌘,**: Preferences & Settings`,
    tags: ['ux', 'shortcuts'],
    isPinned: false,
    isArchived: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

export async function seedStarterNotesIfEmpty(): Promise<boolean> {
  try {
    const existing = await db.select({ val: count() }).from(notes).where(isNull(notes.deletedAt));
    if ((existing[0]?.val ?? 0) > 0) return false;

    for (const f of DEFAULT_STARTER_FOLDERS) {
      await db.insert(folders).values({ ...f, version: 1 });
    }
    for (const n of DEFAULT_STARTER_NOTES) {
      await db.insert(notes).values({ ...n, tags: JSON.stringify(n.tags), version: 1 });
    }
    return true;
  } catch (err: unknown) {
    console.error('[Desktop Seed:Error]', err);
    return false;
  }
}
