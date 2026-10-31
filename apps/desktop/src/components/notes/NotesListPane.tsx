import { useState, useMemo, useEffect } from "react";
import type { Note } from "@repo/types";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NoteCardItem } from "./NoteCardItem";
import { AppSidebarTrigger } from "@/components/layout/AppSidebar";
import { Search, Plus } from "lucide-react";

interface NotesListPaneProps {
  notes: Note[];
  activeNoteId: string | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSelectNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
  onOpenCommand: () => void;
  onNewNote?: () => void;
}

export function NotesListPane({
  notes,
  activeNoteId,
  searchQuery: externalSearchQuery,
  onSearchChange,
  onSelectNote,
  onTogglePin,
  onDeleteNote,
  onArchiveNote,
  onOpenCommand,
  onNewNote,
}: NotesListPaneProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const isControlled = onSearchChange !== undefined;
  const targetSearchQuery = isControlled ? (externalSearchQuery ?? "") : internalSearchQuery;

  // Local immediate input state for 0ms typing response
  const [inputValue, setInputValue] = useState(targetSearchQuery);

  // Sync when external query resets
  useEffect(() => {
    setInputValue(targetSearchQuery);
  }, [targetSearchQuery]);

  // 150ms debounce window before firing FTS5 search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== targetSearchQuery) {
        if (isControlled) {
          onSearchChange(inputValue);
        } else {
          setInternalSearchQuery(inputValue);
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [inputValue, targetSearchQuery, isControlled, onSearchChange]);

  // If controlled, queries are performed via FTS5 at store level.
  // If uncontrolled, perform client-side substring filter.
  const displayedNotes = useMemo(() => {
    if (isControlled || !targetSearchQuery.trim()) return notes;
    const q = targetSearchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [notes, targetSearchQuery, isControlled]);

  // Sort pinned notes to top, then recently updated
  const sortedNotes = useMemo(() => {
    return [...displayedNotes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [displayedNotes]);

  return (
    <section className="h-full w-full bg-card/20 flex flex-col border-r border-border select-none overflow-hidden">
      {/* Search Header: Clean with Sidebar Trigger and ⌘K */}
      <div className="h-14 px-3 border-b border-border flex items-center gap-2 shrink-0">
        <AppSidebarTrigger />

        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search notes (FTS5)..."
            className="pl-8 pr-12 h-8 text-xs bg-transparent border-border/60 focus-visible:ring-1 focus-visible:ring-[#39ff14]/50"
          />
          <button
            onClick={onOpenCommand}
            className="absolute right-2 flex items-center cursor-pointer text-muted-foreground hover:text-foreground"
            title="Open Command Palette (⌘K)"
          >
            <Kbd className="text-[10px] h-4.5 border-border bg-muted/40 px-1 font-mono">
              ⌘K
            </Kbd>
          </button>
        </div>

        {onNewNote && (
          <button
            onClick={onNewNote}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/60 hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
            title="Create New Note (⌘N)"
            aria-label="Create New Note"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollable Notes List */}
      <ScrollArea className="flex-1">
        {sortedNotes.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {inputValue ? "No matching notes found." : "No notes yet. Create your first note!"}
          </div>
        ) : (
          sortedNotes.map((note) => (
            <NoteCardItem
              key={note.id}
              note={note}
              isActive={note.id === activeNoteId}
              onSelect={onSelectNote}
              onTogglePin={onTogglePin}
              onDeleteNote={onDeleteNote}
              onArchiveNote={onArchiveNote}
            />
          ))
        )}
      </ScrollArea>
    </section>
  );
}
