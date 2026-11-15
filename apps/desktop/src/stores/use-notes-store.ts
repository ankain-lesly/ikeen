import { create } from 'zustand';
import type {
  Note,
  Folder,
  ListNotesOptions,
  UpdateNoteInput,
} from '@repo/types';
import { initDatabase } from '@/db/client';
import { seedStarterNotesIfEmpty } from '@/lib/queries/seed';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
} from '@/lib/queries/notes';
import {
  listFolders,
  createFolder as queryCreateFolder,
  updateFolder as queryUpdateFolder,
  deleteFolder as queryDeleteFolder,
} from '@/lib/queries/folders';
import { countActiveReminders } from '@/lib/queries/reminders';
import { syncManager, onSyncComplete } from '@/lib/sync/sync-manager';

export interface NotesStoreState {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  activeFilter: string;
  searchQuery: string;
  isLoading: boolean;
  isInitialized: boolean;
  remindersCount: number;

  // Actions
  init: () => Promise<void>;
  loadNotes: () => Promise<void>;
  loadFolders: () => Promise<void>;
  loadRemindersCount: () => Promise<void>;
  setActiveFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  selectNote: (id: string | null) => void;
  createNewNote: () => Promise<Note | null>;
  saveActiveNote: (input: UpdateNoteInput, targetNoteId?: string) => Promise<void>;
  deleteActiveNote: (targetNoteId?: string) => Promise<void>;
  addFolder: (input: { name: string; color?: string; icon?: string }) => Promise<Folder | null>;
  editFolder: (id: string, updates: { name?: string; color?: string; icon?: string }) => Promise<boolean>;
  removeFolder: (id: string) => Promise<boolean>;
}

export const useNotesStore = create<NotesStoreState>((set, get) => ({
  notes: [],
  folders: [],
  activeNoteId: null,
  activeFilter: 'all',
  searchQuery: '',
  isLoading: true,
  isInitialized: false,
  remindersCount: 0,

  init: async () => {
    if (get().isInitialized) return;
    set({ isLoading: true });

    try {
      // 1. Initialize SQLite and execute DDL migrations
      await initDatabase();

      // 2. Check and seed onboarding starter notes if empty
      await seedStarterNotesIfEmpty();

      // 3. Initialize background sync manager
      syncManager.init();

      // 4. Register listener to refresh on sync completion
      onSyncComplete(() => {
        void get().loadNotes();
        void get().loadFolders();
        void get().loadRemindersCount();
      });

      // 5. Load initial folders, notes, and reminders count
      await get().loadFolders();
      await get().loadNotes();
      await get().loadRemindersCount();

      // Select first note if available
      const currentNotes = get().notes;
      if (currentNotes.length > 0) {
        set({ activeNoteId: currentNotes[0].id });
      }
      set({ isInitialized: true });
    } catch (err: unknown) {
      console.error('[NotesStore:Init:Error]', err);
    } finally {
      set({ isLoading: false });
    }
  },

  loadFolders: async () => {
    try {
      const folders = await listFolders();
      set({ folders });
    } catch (err: unknown) {
      console.error('[NotesStore:loadFolders:Error]', err);
    }
  },

  loadRemindersCount: async () => {
    try {
      const count = await countActiveReminders();
      set({ remindersCount: count });
    } catch (err: unknown) {
      console.error('[NotesStore:loadRemindersCount:Error]', err);
    }
  },

  loadNotes: async () => {
    const { activeFilter, searchQuery } = get();

    const filter: ListNotesOptions = {
      search: searchQuery.trim() || undefined,
    };

    if (activeFilter.startsWith('folder:')) {
      filter.folderId = activeFilter.replace('folder:', '');
    } else if (activeFilter === 'pinned') {
      filter.pinnedOnly = true;
    } else if (activeFilter === 'archived') {
      filter.archivedOnly = true;
    } else if (activeFilter === 'reminders') {
      filter.remindersOnly = true;
    } else if (activeFilter === 'unorganized') {
      filter.folderId = null;
    } else if (activeFilter !== 'all') {
      filter.folderId = activeFilter;
    }

    try {
      const notes = await listNotes(filter);
      set({ notes });

      // If active note is not in the filtered list, pick the first or keep selection
      const currentActive = get().activeNoteId;
      if (currentActive && !notes.some((n) => n.id === currentActive)) {
        set({ activeNoteId: notes.length > 0 ? notes[0].id : null });
      } else if (!currentActive && notes.length > 0) {
        set({ activeNoteId: notes[0].id });
      }
    } catch (err: unknown) {
      console.error('[NotesStore:loadNotes:Error]', err);
    }
  },

  setActiveFilter: (filter: string) => {
    set({ activeFilter: filter });
    void get().loadNotes();
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    void get().loadNotes();
  },

  selectNote: (id: string | null) => {
    set({ activeNoteId: id });
  },

  createNewNote: async () => {
    const { activeFilter } = get();
    const virtualFilters = new Set(['all', 'pinned', 'archived', 'unorganized', 'reminders']);
    const folderId = activeFilter.startsWith('folder:')
      ? activeFilter.replace('folder:', '')
      : !virtualFilters.has(activeFilter)
        ? activeFilter
        : undefined;

    const note = await createNote({
      title: 'Untitled Note',
      content: '',
      folderId,
      isPinned: activeFilter === 'pinned',
    });

    if (note) {
      await get().loadNotes();
      set({ activeNoteId: note.id });
      void syncManager.updatePendingCount();
    }
    return note;
  },

  saveActiveNote: async (input: UpdateNoteInput, targetNoteId?: string) => {
    const activeId = targetNoteId ?? get().activeNoteId;
    if (!activeId) return;

    const now = new Date().toISOString();
    // Optimistically update in-memory note
    set((state) => ({
      notes: state.notes.map((n) =>
        n.id === activeId
          ? {
              ...n,
              ...input,
              folderId: input.folderId === null ? undefined : (input.folderId ?? n.folderId),
              tags: input.tags ?? n.tags,
              updatedAt: now,
            }
          : n
      ),
    }));

    await updateNote(activeId, input);
    void syncManager.updatePendingCount();
  },

  deleteActiveNote: async (targetNoteId?: string) => {
    const activeId = targetNoteId ?? get().activeNoteId;
    if (!activeId) return;

    await deleteNote(activeId);
    void syncManager.updatePendingCount();
    await get().loadNotes();
  },

  addFolder: async (input: { name: string; color?: string; icon?: string }) => {
    const folder = await queryCreateFolder(input);
    if (folder) {
      await get().loadFolders();
      void syncManager.updatePendingCount();
    }
    return folder;
  },

  editFolder: async (id: string, updates: { name?: string; color?: string; icon?: string }) => {
    const success = await queryUpdateFolder(id, updates);
    if (success) {
      await get().loadFolders();
      void syncManager.updatePendingCount();
    }
    return success;
  },

  removeFolder: async (id: string) => {
    const success = await queryDeleteFolder(id);
    if (success) {
      if (get().activeFilter === `folder:${id}`) {
        set({ activeFilter: 'all' });
      }
      await get().loadFolders();
      await get().loadNotes();
      void syncManager.updatePendingCount();
    }
    return success;
  },
}));
