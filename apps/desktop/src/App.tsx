import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Note } from "@repo/types";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { NotesListPane } from "@/components/notes/NotesListPane";
import { EditorPane } from "@/components/editor/EditorPane";
import { CommandPalette } from "@/components/modals/CommandPalette";
import { SettingsDialog } from "@/components/modals/SettingsDialog";
import { useNotesStore } from "@/stores/use-notes-store";

export default function App() {
  const {
    notes,
    folders,
    activeNoteId,
    activeFilter,
    searchQuery,
    isLoading,
    isInitialized,
    init,
    selectNote,
    setActiveFilter,
    setSearchQuery,
    createNewNote,
    saveActiveNote,
    deleteActiveNote,
  } = useNotesStore();

  // Modals
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Tauri IPC status (for Settings preferences dialog)
  const [ipcConnected, setIpcConnected] = useState<boolean>(false);

  // 1. Initialize SQLite Database, Migrations, and Starter Notes on mount
  useEffect(() => {
    void init();
  }, [init]);

  // 2. Initialize Tauri IPC test
  useEffect(() => {
    invoke<string>("greet", { name: "iKeen Desktop Shell" })
      .then(() => {
        setIpcConnected(true);
      })
      .catch(() => {
        setIpcConnected(false);
      });
  }, []);

  // 3. Global keybindings (⌘N for new note, ⌘, for settings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘N or Ctrl+N -> New Note
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void createNewNote();
      }
      // ⌘, or Ctrl+, -> Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [createNewNote]);

  // Handlers for note operations
  const handleUpdateActiveNote = (updated: Partial<Note>) => {
    void saveActiveNote(updated);
  };

  const handleTogglePin = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      void saveActiveNote({ isPinned: !note.isPinned });
    }
  };

  const handleArchiveNote = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      void saveActiveNote({ isArchived: !note.isArchived });
    }
  };

  const handleDeleteNote = (_noteId: string) => {
    void deleteActiveNote();
  };

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <TooltipProvider delay={150}>
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground antialiased font-sans flex">
        {/* 1. Sidebar Component: In-flow sticky desktop navigation */}
        <AppSidebar
          folders={folders}
          totalNotesCount={notes.length}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onNewNote={() => void createNewNote()}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* 2. Workspace Resizable Split: Notes List (32%) + Editor (68%) */}
        <div className="flex-1 h-full min-w-0">
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
                onNewNote={() => void createNewNote()}
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
                  note={activeNote}
                  onUpdateNote={handleUpdateActiveNote}
                  onTogglePin={handleTogglePin}
                  onArchiveNote={handleArchiveNote}
                  onDeleteNote={handleDeleteNote}
                  onNewNote={() => void createNewNote()}
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Global Modals */}
        <CommandPalette
          open={isCommandOpen}
          onOpenChange={setIsCommandOpen}
          notes={notes}
          onSelectNote={selectNote}
          onSelectFilter={setActiveFilter}
          onNewNote={() => void createNewNote()}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          ipcConnected={ipcConnected}
        />
      </div>
    </TooltipProvider>
  );
}
