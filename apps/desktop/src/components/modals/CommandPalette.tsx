import * as React from "react";
import type { Note } from "@repo/types";
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
  Sparkles,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onSelectFilter?: (filter: string) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  notes,
  onSelectNote,
  onSelectFilter,
  onNewNote,
  onOpenSettings,
}: CommandPaletteProps) {
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

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Quick search notes, jump to folders, or run desktop commands"
    >
      <CommandInput placeholder="Type a command or search notes..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
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
          <CommandItem
            onSelect={() => {
              onOpenSettings();
              onOpenChange(false);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Open Settings</span>
            <CommandShortcut>⌘,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Recent Notes">
          {notes.map((note) => (
            <CommandItem
              key={note.id}
              value={`${note.title} ${note.tags.join(" ")}`}
              onSelect={() => {
                onSelectNote(note.id);
                onOpenChange(false);
              }}
            >
              {note.isPinned ? (
                <Zap className="mr-2 h-4 w-4 text-[#39ff14]" />
              ) : (
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{note.title}</span>
              {note.tags.length > 0 && (
                <span className="ml-2 text-[10px] text-muted-foreground">
                  #{note.tags[0]}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="AI & Automation">
          <CommandItem
            onSelect={() => {
              onSelectFilter?.("ai");
              onOpenChange(false);
            }}
          >
            <Sparkles className="mr-2 h-4 w-4 text-amber-400" />
            <span>Filter AI Memories</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
