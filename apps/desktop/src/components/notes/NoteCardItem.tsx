import { memo } from "react";
import type { Note } from "@repo/types";
import { formatDate } from "@repo/utils";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Zap, Pin, Trash2, Archive, Copy } from "lucide-react";

interface NoteCardItemProps {
  note: Note;
  isActive: boolean;
  onSelect: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
}

export const NoteCardItem = memo(
  function NoteCardItem({
    note,
    isActive,
    onSelect,
    onTogglePin,
    onDeleteNote,
    onArchiveNote,
  }: NoteCardItemProps) {
    return (
      <ContextMenu>
        <ContextMenuTrigger
          onClick={() => onSelect(note.id)}
          className={`block p-3 cursor-pointer transition-colors border-b border-border/40 text-left select-none ${
            isActive
              ? "bg-secondary/70 border-l-2 border-l-[#39ff14]"
              : "hover:bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <h3
              className={`text-xs font-medium truncate ${
                isActive ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              {note.title || "Untitled Note"}
            </h3>
            {note.isPinned && (
              <Zap className="w-3 h-3 text-[#39ff14] shrink-0" />
            )}
          </div>

          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-1.5 font-sans">
            {note.content || "Empty note..."}
          </p>

          {/* Footer: Date & Subtle Text Tags (No Badge Chip Clutter) */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-mono text-[9px] text-muted-foreground/70">
              {formatDate(new Date(note.updatedAt))}
            </span>
            {note.tags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-hidden font-mono text-[9px] text-muted-foreground/60">
                {note.tags.slice(0, 3).map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onTogglePin(note.id)}>
            <Pin className="mr-2 h-3.5 w-3.5 text-[#39ff14]" />
            <span>{note.isPinned ? "Unpin Note" : "Pin to Top"}</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onArchiveNote(note.id)}>
            <Archive className="mr-2 h-3.5 w-3.5" />
            <span>{note.isArchived ? "Unarchive" : "Archive Note"}</span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              void navigator.clipboard.writeText(note.content);
            }}
          >
            <Copy className="mr-2 h-3.5 w-3.5" />
            <span>Copy Content</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDeleteNote(note.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            <span>Delete</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
  (prev, next) => {
    return (
      prev.note.id === next.note.id &&
      prev.note.title === next.note.title &&
      prev.note.content === next.note.content &&
      prev.note.updatedAt === next.note.updatedAt &&
      prev.note.isPinned === next.note.isPinned &&
      prev.note.isArchived === next.note.isArchived &&
      prev.isActive === next.isActive
    );
  }
);
