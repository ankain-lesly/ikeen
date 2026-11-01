import { db } from '@/db/client';
import { folders, notes } from '@/db/schema';
import { isNull, count } from 'drizzle-orm';
import type { Folder, Note } from '@repo/types';
import { DEFAULT_FOLDER_COLOR } from '@repo/utils/constants';

export const DEFAULT_STARTER_FOLDERS: Folder[] = [
  {
    id: 'folder-general',
    name: 'General',
    color: DEFAULT_FOLDER_COLOR,
    icon: 'folder',
    isLocked: false,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'folder-architecture',
    name: 'Ideas & Architecture',
    color: '#39ff14',
    icon: 'lightbulb',
    isLocked: false,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_STARTER_NOTES: Note[] = [
  {
    id: 'note-starter-1',
    folderId: 'folder-architecture',
    title: 'Tauri v2 Desktop Architecture',
    content: `# Tauri v2 Desktop Architecture

Local-first desktop client running on embedded SQLite with zero-latency FTS5 full-text search and background sync outbox.

## Key Capabilities
- **Local-First SQLite**: Full offline capability with instant indexed queries.
- **FTS5 Instant Search**: Sub-10ms full-text BM25 search across all note titles, contents, and tags.
- **Bi-directional Sync**: Outbox mutation queue automatically pushes changes when online with Last-Write-Wins (LWW) conflict resolution.
- **Desktop Ergonomics**: Clean two-pane interface, command palette, and keyboard-first navigation.`,
    tags: ['architecture', 'tauri', 'desktop'],
    isPinned: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-starter-2',
    folderId: 'folder-general',
    title: 'Fast Keyboard Ergonomics',
    content: `# Fast Keyboard Ergonomics

All major workflows are accessible through single or dual-key shortcuts:

- **⌘N** / **Ctrl+N**: Create new note
- **⌘K** / **Ctrl+K**: Open Command Palette
- **⌘\\** / **Ctrl+\\**: Open Navigation Drawer (Sheet)
- **⌘⇧Space**: Summon Quick-Capture HUD
- **⌘,**: Preferences & Settings`,
    tags: ['ux', 'shortcuts'],
    isPinned: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function seedStarterNotesIfEmpty(): Promise<boolean> {
  try {
    const existing = await db
      .select({ val: count() })
      .from(notes)
      .where(isNull(notes.deletedAt));

    const totalNotes = existing[0]?.val ?? 0;
    if (totalNotes > 0) {
      return false;
    }

    // Insert starter folders with Drizzle
    for (const folder of DEFAULT_STARTER_FOLDERS) {
      await db.insert(folders).values({
        id: folder.id,
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        isLocked: folder.isLocked,
        sortOrder: folder.sortOrder,
        version: 1,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
      });
    }

    // Insert starter notes with Drizzle
    for (const note of DEFAULT_STARTER_NOTES) {
      await db.insert(notes).values({
        id: note.id,
        folderId: note.folderId,
        title: note.title,
        content: note.content,
        tags: JSON.stringify(note.tags),
        isPinned: note.isPinned,
        isArchived: note.isArchived,
        version: 1,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });
    }

    console.log('[Desktop Seed] Starter folders and notes seeded successfully via Drizzle ORM.');
    return true;
  } catch (err: unknown) {
    console.error('[Desktop Seed:Error]', err);
    return false;
  }
}
