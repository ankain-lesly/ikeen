import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Note, Folder } from "@repo/types";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { NotesListPane } from "@/components/notes/NotesListPane";
import { EditorPane } from "@/components/editor/EditorPane";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CommandPalette } from "@/components/modals/CommandPalette";
import { SettingsDialog } from "@/components/modals/SettingsDialog";
import { ShortcutsHelpDialog } from "@/components/modals/ShortcutsHelpDialog";
import { FolderEditDialog } from "@/components/modals/FolderEditDialog";
import { SyncOutboxDialog } from "@/components/modals/SyncOutboxDialog";
import { AuthSheet } from "@/components/auth/AuthSheet";
import { useNotesStore } from "@/stores/use-notes-store";
import { useSidebar } from "@/hooks/use-sidebar";
import { useSyncStore } from "@/lib/sync/use-sync";
import { syncManager } from "@/lib/sync/sync-manager";
import { syncApi } from "@/lib/sync/sync-api";

export default function App() {
  const {
    notes,
    folders,
    activeNoteId,
    activeFilter,
    searchQuery,
    isLoading,
    isInitialized,
    remindersCount,
    init,
    selectNote,
    setActiveFilter,
    setSearchQuery,
    createNewNote,
    saveActiveNote,
    deleteActiveNote,
    addFolder,
    editFolder,
    removeFolder,
  } = useNotesStore();

  // Modals state
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isOutboxOpen, setIsOutboxOpen] = useState<boolean>(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  const handleOpenNewFolder = () => {
    setEditingFolder(null);
    setIsFolderDialogOpen(true);
  };

  const handleOpenEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setIsFolderDialogOpen(true);
  };

  const handleSaveFolder = async (name: string, color: string) => {
    if (editingFolder) {
      await editFolder(editingFolder.id, { name, color });
    } else {
      await addFolder({ name, color });
    }
  };

  const handleDeleteFolder = async (id: string) => {
    await removeFolder(id);
  };

  // Memoized filter note counts avoiding redundant computations
  const pinnedNotesCount = useMemo(
    () => notes.filter((n) => n.isPinned && !n.isArchived).length,
    [notes]
  );

  const archivedNotesCount = useMemo(
    () => notes.filter((n) => n.isArchived).length,
    [notes]
  );

  const folderNotesCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notes) {
      if (n.folderId && !n.isArchived) {
        map[n.folderId] = (map[n.folderId] || 0) + 1;
      }
    }
    return map;
  }, [notes]);

  // References for keyboard focus coordination
  const searchInputRef = useRef<HTMLInputElement>(null);
  const editorTitleRef = useRef<HTMLInputElement>(null);
  const editorContentRef = useRef<HTMLTextAreaElement>(null);

  // 1. Initialize SQLite Database, Migrations, and Sync on mount
  useEffect(() => {
    void init();
  }, [init]);

  // 2. Observe sync status changes and dynamically update system tray tooltip
  useEffect(() => {
    const updateTray = (status: string, pendingCount: number) => {
      let label: string;
      const isAuthenticated = syncApi.isAuthenticated();

      if (!isAuthenticated) {
        label = "Offline mode (Guest - not signed in)";
      } else if (status === "syncing") {
        label = pendingCount > 0 ? `Syncing ${pendingCount} notes...` : "Syncing...";
      } else if (status === "offline") {
        label = "Offline mode (No connection)";
      } else if (status === "error") {
        label = "Sync warning (will retry)";
      } else if (status === "idle") {
        label = pendingCount > 0 ? `${pendingCount} changes waiting to sync` : "All notes synced";
      } else {
        label = "Offline mode (Local-first)";
      }
      invoke("update_tray_status", { status: label }).catch(() => {});
    };

    // Initial update
    const initialState = useSyncStore.getState();
    updateTray(initialState.status, initialState.pendingCount);

    const unsubscribe = useSyncStore.subscribe((state) => {
      updateTray(state.status, state.pendingCount);
    });

    return () => unsubscribe();
  }, []);

  // 3. Listen for system tray / HUD events
  useEffect(() => {
    // Listen for new notes created via Quick-Capture HUD
    const unlistenNoteCreated = listen("note:created", () => {
      void useNotesStore.getState().loadNotes();
    });

    // Listen for tray actions
    const unlistenTrayNewNote = listen("tray:new-note", () => {
      void createNewNote();
      editorTitleRef.current?.focus();
    });

    const unlistenTraySettings = listen("tray:open-settings", () => {
      setIsSettingsOpen(true);
    });

    const unlistenTraySync = listen("tray:sync-now", () => {
      void syncManager.sync();
    });

    return () => {
      unlistenNoteCreated.then((f) => f()).catch(() => {});
      unlistenTrayNewNote.then((f) => f()).catch(() => {});
      unlistenTraySettings.then((f) => f()).catch(() => {});
      unlistenTraySync.then((f) => f()).catch(() => {});
    };
  }, [createNewNote]);

  // Handlers for note operations
  const handleUpdateActiveNote = useCallback(
    (updated: Partial<Note>, targetNoteId?: string) => {
      return saveActiveNote(updated, targetNoteId);
    },
    [saveActiveNote]
  );

  const handleTogglePin = useCallback(
    (noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        void saveActiveNote({ isPinned: !note.isPinned }, noteId);
      }
    },
    [notes, saveActiveNote]
  );

  const handleArchiveNote = useCallback(
    (noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (note) {
        void saveActiveNote({ isArchived: !note.isArchived }, noteId);
      }
    },
    [notes, saveActiveNote]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      void deleteActiveNote(noteId);
    },
    [deleteActiveNote]
  );

  const handleSyncNow = () => {
    void syncManager.sync();
  };

  const handleToggleSidebar = () => {
    useSidebar.getState().toggleSidebar();
  };

  // 4. Centralized Global Keyboard Coordinator (High-Throughput Ergonomics)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        (activeEl as HTMLElement)?.isContentEditable;

      // ⌘K or Ctrl+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
        return;
      }

      // ⌘N or Ctrl+N -> New Note & focus title
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void createNewNote().then(() => {
          setTimeout(() => editorTitleRef.current?.focus(), 50);
        });
        return;
      }

      // ⌘F or Ctrl+F -> Focus Search in Notes list
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // ⌘, or Ctrl+, -> Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      // ⌘\ or Ctrl+\ -> Toggle Sidebar
      if ((e.metaKey || e.ctrlKey) && (e.key === "\\" || e.key === "b")) {
        // Only trigger ⌘B as sidebar toggle if not actively in an editable text field
        if (e.key === "b" && isInputFocused) return;
        e.preventDefault();
        handleToggleSidebar();
        return;
      }

      // ⌘R or Ctrl+R -> Sync Now
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleSyncNow();
        return;
      }

      // ⌘1 -> Focus Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        useSidebar.getState().openSidebar();
        return;
      }

      // ⌘2 -> Focus Notes List Search
      if ((e.metaKey || e.ctrlKey) && e.key === "2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // ⌘3 -> Focus Editor Content
      if ((e.metaKey || e.ctrlKey) && e.key === "3") {
        e.preventDefault();
        editorContentRef.current?.focus();
        return;
      }

      // ⌘P or Ctrl+P -> Toggle Pin on Active Note
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p" && activeNoteId) {
        e.preventDefault();
        handleTogglePin(activeNoteId);
        return;
      }

      // ⌘E or Ctrl+E -> Toggle Archive on Active Note
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e" && activeNoteId) {
        e.preventDefault();
        handleArchiveNote(activeNoteId);
        return;
      }

      // ? or ⌘/ -> Shortcuts Cheatsheet (only when not typing in text field)
      if (
        ((e.key === "?" || e.key === "/") && !isInputFocused) ||
        ((e.metaKey || e.ctrlKey) && e.key === "/")
      ) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createNewNote, activeNoteId]);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <TooltipProvider delay={150}>
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground antialiased font-sans flex">
        {/* 1. Sidebar Component: In-flow sticky desktop navigation */}
        <AppSidebar
          folders={folders}
          totalNotesCount={notes.length}
          pinnedNotesCount={pinnedNotesCount}
          archivedNotesCount={archivedNotesCount}
          remindersCount={remindersCount}
          folderNotesCountMap={folderNotesCountMap}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onNewNote={() => {
            void createNewNote();
            editorTitleRef.current?.focus();
          }}
          onNewFolder={handleOpenNewFolder}
          onEditFolder={handleOpenEditFolder}
          onDeleteFolder={handleOpenEditFolder}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        {/* 2. Workspace Resizable Split: Notes List (32%) + Editor (68%) */}
        <div className="flex-1 h-full min-w-0">
          <ErrorBoundary fallbackTitle="Workspace Layout Error">
            <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
              {/* Notes List Pane */}
              <ResizablePanel
                id="notes-list"
              defaultSize="32%"
              minSize="24%"
              maxSize="45%"
              >
                <NotesListPane
                  notes={notes}
                  activeNoteId={activeNoteId}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectNote={selectNote}
                  onTogglePin={handleTogglePin}
                  onDeleteNote={handleDeleteNote}
                  onArchiveNote={handleArchiveNote}
                  onOpenCommand={() => setIsCommandOpen(true)}
                  onNewNote={() => {
                    void createNewNote();
                    editorTitleRef.current?.focus();
                  }}
                  searchRef={searchInputRef}
                  onFocusEditor={() => editorContentRef.current?.focus()}
                />
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Editor Workspace Pane */}
              <ResizablePanel
                id="editor"
              defaultSize="68%"
              minSize="40%"
              >
                {isLoading && !isInitialized ? (
                  <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                    Initializing local SQLite database...
                  </div>
                ) : (
                  <EditorPane
                    key={activeNote?.id || "empty"}
                    note={activeNote}
                    folders={folders}
                    onUpdateNote={handleUpdateActiveNote}
                    onTogglePin={handleTogglePin}
                    onArchiveNote={handleArchiveNote}
                    onDeleteNote={handleDeleteNote}
                    onNewNote={() => {
                      void createNewNote();
                      editorTitleRef.current?.focus();
                    }}
                    titleRef={editorTitleRef}
                    contentRef={editorContentRef}
                  />
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          </ErrorBoundary>
        </div>

        {/* Global Modals */}
        <CommandPalette
          open={isCommandOpen}
          onOpenChange={setIsCommandOpen}
          notes={notes}
          folders={folders}
          activeNoteId={activeNoteId}
          onSelectNote={selectNote}
          onSelectFilter={setActiveFilter}
          onNewNote={() => {
            void createNewNote();
            editorTitleRef.current?.focus();
          }}
          onNewFolder={handleOpenNewFolder}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenShortcutsHelp={() => setIsShortcutsOpen(true)}
          onTogglePin={handleTogglePin}
          onArchiveNote={handleArchiveNote}
          onDeleteNote={handleDeleteNote}
          onSyncNow={handleSyncNow}
          onOpenOutbox={() => setIsOutboxOpen(true)}
          onToggleSidebar={handleToggleSidebar}
        />

        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenOutbox={() => setIsOutboxOpen(true)}
        />

        <ShortcutsHelpDialog
          open={isShortcutsOpen}
          onOpenChange={setIsShortcutsOpen}
        />

        <FolderEditDialog
          open={isFolderDialogOpen}
          onOpenChange={setIsFolderDialogOpen}
          folder={editingFolder}
          onSave={handleSaveFolder}
          onDelete={handleDeleteFolder}
        />

        <SyncOutboxDialog
          open={isOutboxOpen}
          onOpenChange={setIsOutboxOpen}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        <AuthSheet
          open={isAuthOpen}
          onOpenChange={setIsAuthOpen}
        />
      </div>
    </TooltipProvider>
  );
}
