import { useState, useMemo } from "react";
import type { Note } from "@repo/types";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NoteCardItem } from "./NoteCardItem";
import { AppSidebarTrigger } from "@/components/layout/AppSidebar";
import { Search } from "lucide-react";

interface NotesListPaneProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
  onOpenCommand: () => void;
}

export function NotesListPane({
  notes,
  activeNoteId,
  onSelectNote,
  onTogglePin,
  onDeleteNote,
  onArchiveNote,
  onOpenCommand,
}: NotesListPaneProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        note.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [notes, searchQuery]);

  // Sort pinned notes to top
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNotes]);

  return (
    <section className="h-full w-full bg-card/30 flex flex-col border-r border-border select-none overflow-hidden">
      {/* Search Header with Sidebar Trigger */}
      <div className="h-14 px-3 border-b border-border flex items-center gap-2 shrink-0">
        <AppSidebarTrigger />

        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes (FTS5)..."
            className="pl-8 pr-12 h-8 text-xs bg-muted/20 border-border focus-visible:ring-1 focus-visible:ring-[#39ff14]/50"
          />
          <button
            onClick={onOpenCommand}
            className="absolute right-1.5 flex items-center gap-0.5 cursor-pointer text-muted-foreground hover:text-foreground"
            title="Open Command Palette"
          >
            <Kbd className="text-[10px] h-5 border-border bg-muted/40 px-1 font-mono">
              ⌘K
            </Kbd>
          </button>
        </div>
      </div>

      {/* Notes Count Bar */}
      <div className="px-3.5 py-1.5 border-b border-border/50 bg-background/30 flex items-center justify-between text-[10px] font-mono text-muted-foreground shrink-0">
        <span>{sortedNotes.length} notes</span>
        <span>SQLite indexed</span>
      </div>

      {/* Scrollable Notes List */}
      <ScrollArea className="flex-1">
        {sortedNotes.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No notes found.
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
