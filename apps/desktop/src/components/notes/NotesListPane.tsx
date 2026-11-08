import { useState, useMemo, useEffect, useRef } from "react";
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
  onFocusEditor?: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
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
  onFocusEditor,
  searchRef: externalSearchRef,
}: NotesListPaneProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const isControlled = onSearchChange !== undefined;
  const targetSearchQuery = isControlled ? (externalSearchQuery ?? "") : internalSearchQuery;

  // Local immediate input state for 0ms typing response
  const [inputValue, setInputValue] = useState(targetSearchQuery);
  const localSearchRef = useRef<HTMLInputElement>(null);
  const searchInputRef = externalSearchRef || localSearchRef;

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

  // Auto-scroll active card into view on selection change
  useEffect(() => {
    if (activeNoteId) {
      const activeEl = document.querySelector(`[data-note-id="${activeNoteId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activeNoteId]);

  // High-throughput keyboard navigation in note list (Arrow keys, j/k, Enter, Esc)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isSearchFocused = activeEl === searchInputRef.current;
      const isInputFocused =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        (activeEl as HTMLElement)?.isContentEditable;

      // 1. When typing inside the search input:
      if (isSearchFocused) {
        if (e.key === "Escape") {
          e.preventDefault();
          if (inputValue) {
            setInputValue("");
            if (isControlled) onSearchChange?.("");
            else setInternalSearchQuery("");
          } else {
            searchInputRef.current?.blur();
          }
          return;
        }

        if (e.key === "ArrowDown" && sortedNotes.length > 0) {
          e.preventDefault();
          searchInputRef.current?.blur();
          if (!activeNoteId) {
            onSelectNote(sortedNotes[0].id);
          } else {
            const idx = sortedNotes.findIndex((n) => n.id === activeNoteId);
            const nextIdx = Math.min(sortedNotes.length - 1, idx + 1);
            onSelectNote(sortedNotes[nextIdx].id);
          }
          return;
        }

        if (e.key === "Enter" && sortedNotes.length > 0) {
          e.preventDefault();
          searchInputRef.current?.blur();
          if (!activeNoteId) {
            onSelectNote(sortedNotes[0].id);
          }
          onFocusEditor?.();
          return;
        }
      }

      // If typing in another input (like editor), do not intercept general list navigation keys
      if (isInputFocused) return;

      // 2. Global / Pane List Navigation:
      if (e.key === "ArrowDown" || e.key === "j") {
        if (sortedNotes.length === 0) return;
        e.preventDefault();
        const currentIndex = sortedNotes.findIndex((n) => n.id === activeNoteId);
        if (currentIndex === -1) {
          onSelectNote(sortedNotes[0].id);
        } else {
          const nextIndex = Math.min(sortedNotes.length - 1, currentIndex + 1);
          onSelectNote(sortedNotes[nextIndex].id);
        }
      } else if (e.key === "ArrowUp" || e.key === "k") {
        if (sortedNotes.length === 0) return;
        e.preventDefault();
        const currentIndex = sortedNotes.findIndex((n) => n.id === activeNoteId);
        if (currentIndex === -1) {
          onSelectNote(sortedNotes[0].id);
        } else {
          const prevIndex = Math.max(0, currentIndex - 1);
          onSelectNote(sortedNotes[prevIndex].id);
        }
      } else if (e.key === "Enter") {
        if (activeNoteId) {
          e.preventDefault();
          onFocusEditor?.();
        }
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    sortedNotes,
    activeNoteId,
    inputValue,
    isControlled,
    onSearchChange,
    onSelectNote,
    onFocusEditor,
    searchInputRef,
  ]);

  return (
    <section className="h-full w-full bg-card/20 flex flex-col border-r border-border select-none overflow-hidden">
      {/* Search Header: Clean with Sidebar Trigger and ⌘K */}
      <div className="h-14 px-3 border-b border-border flex items-center gap-2 shrink-0">
        <AppSidebarTrigger />

        <div className="relative flex-1 flex items-center min-w-0">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search notes (FTS5)... [/]"
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
