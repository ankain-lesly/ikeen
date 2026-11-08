import * as React from "react";
import type { Note, Folder } from "@repo/types";
import { invoke } from "@tauri-apps/api/core";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FileText,
  Plus,
  Zap,
  Settings,
  Folder as FolderIcon,
  Tag,
  RefreshCw,
  Archive,
  Trash2,
  HelpCircle,
  Sidebar,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  folders?: Folder[];
  activeNoteId?: string | null;
  onSelectNote: (noteId: string) => void;
  onSelectFilter?: (filter: string) => void;
  onNewNote: () => void;
  onNewFolder?: () => void;
  onOpenSettings: () => void;
  onOpenShortcutsHelp?: () => void;
  onTogglePin?: (noteId: string) => void;
  onArchiveNote?: (noteId: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onSyncNow?: () => void;
  onToggleSidebar?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  notes,
  folders = [],
  activeNoteId,
  onSelectNote,
  onSelectFilter,
  onNewNote,
  onNewFolder,
  onOpenSettings,
  onOpenShortcutsHelp,
  onTogglePin,
  onArchiveNote,
  onDeleteNote,
  onSyncNow,
  onToggleSidebar,
}: CommandPaletteProps) {
  // Global ⌘K / Ctrl+K listener
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  // Extract unique tags across all notes
  const uniqueTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        if (tag.trim()) tagsSet.add(tag.trim().toLowerCase());
      });
    });
    return Array.from(tagsSet).sort();
  }, [notes]);

  const activeNote = React.useMemo(() => {
    return notes.find((n) => n.id === activeNoteId);
  }, [notes, activeNoteId]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Quick search notes, jump to folders, or run desktop commands"
    >
      <CommandInput placeholder="Type a command or search notes, folders, tags..." />
      <CommandList>
        <CommandEmpty>No matching results found.</CommandEmpty>

        {/* 1. Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onNewNote();
              onOpenChange(false);
            }}
          >
            <Plus className="mr-2 h-4 w-4 text-[#39ff14]" />
            <span>New Note</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>

          {onNewFolder && (
            <CommandItem
              onSelect={() => {
                onNewFolder();
                onOpenChange(false);
              }}
            >
              <FolderIcon className="mr-2 h-4 w-4 text-[#3b82f6]" />
              <span>Create New Folder</span>
              <CommandShortcut>⌘⇧F</CommandShortcut>
            </CommandItem>
          )}

          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              try {
                invoke("toggle_quick_capture").catch(() => {});
              } catch {
                // Ignore preview errors
              }
            }}
          >
            <Zap className="mr-2 h-4 w-4 text-amber-400" />
            <span>Open Quick-Capture HUD</span>
            <CommandShortcut>⌘⇧Space</CommandShortcut>
          </CommandItem>

          {onSyncNow && (
            <CommandItem
              onSelect={() => {
                onSyncNow();
                onOpenChange(false);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4 text-blue-400" />
              <span>Sync with Server Now</span>
              <CommandShortcut>⌘R</CommandShortcut>
            </CommandItem>
          )}

          {activeNote && onTogglePin && (
            <CommandItem
              onSelect={() => {
                onTogglePin(activeNote.id);
                onOpenChange(false);
              }}
            >
              <Zap className="mr-2 h-4 w-4 text-[#39ff14]" />
              <span>{activeNote.isPinned ? "Unpin Note" : "Pin Note to Top"}</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
          )}

          {activeNote && onArchiveNote && (
            <CommandItem
              onSelect={() => {
                onArchiveNote(activeNote.id);
                onOpenChange(false);
              }}
            >
              <Archive className="mr-2 h-4 w-4 text-orange-400" />
              <span>{activeNote.isArchived ? "Unarchive Note" : "Archive Active Note"}</span>
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
          )}

          {activeNote && onDeleteNote && (
            <CommandItem
              onSelect={() => {
                onDeleteNote(activeNote.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4 text-rose-400" />
              <span>Move Note to Trash</span>
              <CommandShortcut>⌘⌫</CommandShortcut>
            </CommandItem>
          )}

          {onToggleSidebar && (
            <CommandItem
              onSelect={() => {
                onToggleSidebar();
                onOpenChange(false);
              }}
            >
              <Sidebar className="mr-2 h-4 w-4" />
              <span>Toggle Sidebar</span>
              <CommandShortcut>⌘\</CommandShortcut>
            </CommandItem>
          )}

          {onOpenShortcutsHelp && (
            <CommandItem
              onSelect={() => {
                onOpenShortcutsHelp();
                onOpenChange(false);
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Keyboard Shortcuts Help</span>
              <CommandShortcut>?</CommandShortcut>
            </CommandItem>
          )}

          <CommandItem
            onSelect={() => {
              onOpenSettings();
              onOpenChange(false);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Preferences & Settings</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* 2. Folders */}
        {folders.length > 0 && (
          <>
            <CommandGroup heading="Folders">
              {folders.map((folder) => (
                <CommandItem
                  key={folder.id}
                  value={`folder ${folder.name}`}
                  onSelect={() => {
                    onSelectFilter?.(folder.id);
                    onOpenChange(false);
                  }}
                >
                  <FolderIcon
                    className="mr-2 h-4 w-4"
                    style={{ color: folder.color || "#94a3b8" }}
                  />
                  <span>{folder.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* 3. Tags Filter */}
        {uniqueTags.length > 0 && (
          <>
            <CommandGroup heading="Tags">
              {uniqueTags.map((tag) => (
                <CommandItem
                  key={tag}
                  value={`tag ${tag}`}
                  onSelect={() => {
                    onSelectFilter?.(`tag:${tag}`);
                    onOpenChange(false);
                  }}
                >
                  <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>#{tag}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* 4. Notes List */}
        <CommandGroup heading="Notes">
          {notes.map((note) => (
            <CommandItem
              key={note.id}
              value={`${note.title} ${note.tags.join(" ")} ${note.content.substring(0, 100)}`}
              onSelect={() => {
                onSelectNote(note.id);
                onOpenChange(false);
              }}
            >
              {note.isPinned ? (
                <Zap className="mr-2 h-4 w-4 text-[#39ff14] shrink-0" />
              ) : (
                <FileText className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="truncate flex-1 font-medium">{note.title}</span>
              {note.tags.length > 0 && (
                <span className="ml-2 text-[10px] text-muted-foreground shrink-0">
                  #{note.tags[0]}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* 5. Smart Views */}
        <CommandGroup heading="Smart Filters">
          <CommandItem
            onSelect={() => {
              onSelectFilter?.("all");
              onOpenChange(false);
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            <span>All Notes</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onSelectFilter?.("pinned");
              onOpenChange(false);
            }}
          >
            <Zap className="mr-2 h-4 w-4 text-[#39ff14]" />
            <span>Pinned Notes</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onSelectFilter?.("archived");
              onOpenChange(false);
            }}
          >
            <Archive className="mr-2 h-4 w-4 text-orange-400" />
            <span>Archived Notes</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
