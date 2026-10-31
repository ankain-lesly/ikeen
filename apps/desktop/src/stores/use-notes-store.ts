import { create } from 'zustand';
import type { Note, Folder } from '@repo/types';
import { initDatabase } from '@/db/client';
import { seedStarterNotesIfEmpty } from '@/lib/queries/seed';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  type ListNotesFilter,
} from '@/lib/queries/notes';
import { listFolders } from '@/lib/queries/folders';
import { syncManager, onSyncComplete } from '@/lib/sync/sync-manager';

export interface NotesStoreState {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  activeFilter: string;
  searchQuery: string;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  init: () => Promise<void>;
  loadNotes: () => Promise<void>;
  loadFolders: () => Promise<void>;
  setActiveFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  selectNote: (id: string | null) => void;
  createNewNote: () => Promise<Note | null>;
  saveActiveNote: (input: Partial<{ title: string; content: string; tags: string[]; isPinned: boolean; isArchived: boolean; folderId: string | null }>) => Promise<void>;
  deleteActiveNote: () => Promise<void>;
}

export const useNotesStore = create<NotesStoreState>((set, get) => ({
  notes: [],
  folders: [],
  activeNoteId: null,
  activeFilter: 'all',
  searchQuery: '',
  isLoading: true,
  isInitialized: false,

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
      });

      // 5. Load initial folders and notes
      await get().loadFolders();
      await get().loadNotes();

      // Select first note if available
      const currentNotes = get().notes;
      if (currentNotes.length > 0 && !get().activeNoteId) {
        set({ activeNoteId: currentNotes[0].id });
      }

      set({ isInitialized: true, isLoading: false });
    } catch (err: unknown) {
      console.error('[NotesStore:init:Error]', err);
      set({ isLoading: false, isInitialized: true });
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

  loadNotes: async () => {
    const { activeFilter, searchQuery } = get();

    const filter: ListNotesFilter = {
      search: searchQuery.trim() || undefined,
    };

    if (activeFilter.startsWith('folder:')) {
      filter.folderId = activeFilter.replace('folder:', '');
    } else if (activeFilter === 'pinned') {
      filter.pinnedOnly = true;
    } else if (activeFilter === 'archived') {
      filter.archivedOnly = true;
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
    const folderId = activeFilter.startsWith('folder:')
      ? activeFilter.replace('folder:', '')
      : activeFilter !== 'all' &&
          activeFilter !== 'pinned' &&
          activeFilter !== 'archived' &&
          activeFilter !== 'unorganized'
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

  saveActiveNote: async (input) => {
    const activeId = get().activeNoteId;
    if (!activeId) return;

    // Optimistically update in-memory note
    set((state) => ({
      notes: state.notes.map((n) => (n.id === activeId ? { ...n, ...input, updatedAt: new Date().toISOString() } : n)),
    }));

    await updateNote(activeId, input);
    void syncManager.updatePendingCount();
  },

  deleteActiveNote: async () => {
    const activeId = get().activeNoteId;
    if (!activeId) return;

    await deleteNote(activeId);
    void syncManager.updatePendingCount();
    await get().loadNotes();
  },
}));
