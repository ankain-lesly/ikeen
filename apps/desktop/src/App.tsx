import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
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
import { CommandPalette } from "@/components/modals/CommandPalette";
import { SettingsDialog } from "@/components/modals/SettingsDialog";

const INITIAL_FOLDERS: Folder[] = [
  {
    id: "folder-1",
    name: "General",
    color: "#3b82f6",
    icon: "folder",
    isLocked: false,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "folder-2",
    name: "Ideas & Architecture",
    color: "#39ff14",
    icon: "lightbulb",
    isLocked: false,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_NOTES: Note[] = [
  {
    id: "note-1",
    title: "Tauri v2 Desktop Architecture",
    content: `# Tauri v2 Desktop Architecture

Local-first desktop client running on embedded SQLite with zero-latency FTS5 and MCP sidecar orchestration.

## Key Capabilities
- **Local-First SQLite**: Full offline capability with instant indexed queries.
- **Global Quick-Capture HUD**: Floating translucent overlay triggered via Cmd+Shift+Space.
- **Bi-directional Sync**: Outbox mutation queue automatically pushes changes when online.`,
    tags: ["architecture", "tauri", "desktop"],
    isPinned: true,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "note-2",
    title: "Fast Keyboard Ergonomics",
    content: `# Fast Keyboard Ergonomics

All major workflows are accessible through single or dual-key shortcuts:
- **⌘N**: Create new note
- **⌘K**: Open Command Palette
- **⌘\\**: Open Navigation Drawer (Sheet)
- **⌘⇧Space**: Summon Quick-Capture HUD
- **⌘,**: Preferences & Settings`,
    tags: ["ux", "shortcuts"],
    isPinned: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function App() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [folders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [activeNoteId, setActiveNoteId] = useState<string | null>("note-1");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Modals
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Tauri IPC status
  const [rustGreeting, setRustGreeting] = useState<string>("Connecting to Tauri IPC...");
  const [ipcConnected, setIpcConnected] = useState<boolean>(false);

  // Initialize Tauri IPC
  useEffect(() => {
    invoke<string>("greet", { name: "iKeen Desktop Shell" })
      .then((res) => {
        setRustGreeting(res);
        setIpcConnected(true);
      })
      .catch((err) => {
        setRustGreeting(`IPC Ready: ${String(err)}`);
      });
  }, []);

  // Global keybindings (⌘N for new note, ⌘, for settings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘N or Ctrl+N -> New Note
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewNote();
      }
      // ⌘, or Ctrl+, -> Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notes]);

  // Handlers for note operations
  const handleNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: "Untitled Note",
      content: "",
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
  };

  const handleUpdateActiveNote = (updated: Partial<Note>) => {
    if (!activeNoteId) return;
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, ...updated } : n))
    );
  };

  const handleTogglePin = (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const handleArchiveNote = (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isArchived: !n.isArchived } : n))
    );
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (activeNoteId === noteId) {
      const remaining = notes.filter((n) => n.id !== noteId);
      setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Filter notes based on active sidebar filter
  const displayedNotes = useMemo(() => {
    if (activeFilter.startsWith("folder:")) {
      const folderId = activeFilter.replace("folder:", "");
      return notes.filter((n) => n.folderId === folderId);
    }
    if (activeFilter === "ai") {
      return notes.filter((n) => n.tags.includes("ai") || n.tags.includes("memories"));
    }
    if (activeFilter === "mcp") {
      return notes.filter((n) => n.tags.includes("mcp") || n.tags.includes("tools"));
    }
    return notes;
  }, [notes, activeFilter]);

  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <TooltipProvider delay={150}>
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground antialiased font-sans">
        {/* 1. Sidebar Component: Self-contained shadcn Sheet managed via Zustand store */}
        <AppSidebar
          folders={folders}
          totalNotesCount={notes.length}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onNewNote={handleNewNote}
          onOpenSettings={() => setIsSettingsOpen(true)}
          ipcConnected={ipcConnected}
        />

        {/* 2. Workspace Resizable Split: Notes List (32%) + Editor (68%) */}
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
          {/* Notes List Pane */}
          <ResizablePanel
            id="notes-list"
            defaultSize="32%"
            minSize="24%"
            maxSize="45%"
          >
            <NotesListPane
              notes={displayedNotes}
              activeNoteId={activeNoteId}
              onSelectNote={setActiveNoteId}
              onTogglePin={handleTogglePin}
              onDeleteNote={handleDeleteNote}
              onArchiveNote={handleArchiveNote}
              onOpenCommand={() => setIsCommandOpen(true)}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor Workspace Pane */}
          <ResizablePanel
            id="editor"
            defaultSize="68%"
            minSize="40%"
          >
            <EditorPane
              note={activeNote}
              onUpdateNote={handleUpdateActiveNote}
              onTogglePin={handleTogglePin}
              onArchiveNote={handleArchiveNote}
              onDeleteNote={handleDeleteNote}
              onNewNote={handleNewNote}
              rustGreeting={rustGreeting}
              ipcConnected={ipcConnected}
            />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Global Modals */}
        <CommandPalette
          open={isCommandOpen}
          onOpenChange={setIsCommandOpen}
          notes={notes}
          onSelectNote={setActiveNoteId}
          onNewNote={handleNewNote}
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
