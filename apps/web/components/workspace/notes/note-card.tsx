"use client";

import * as React from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Archive, MoreVertical, Pin, Trash2 } from "lucide-react";
import type { Folder, Note } from "@repo/types";

import { useDeleteNote, useUpdateNote } from "@/lib/api/notes.api";
import { formatRelativeDate } from "@/lib/workspace/note-filters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteCardProps {
  note: Note;
  folder?: Folder;
}

export function NoteCard({ note, folder }: NoteCardProps) {
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  function handleTogglePin(e: React.MouseEvent) {
    e.preventDefault();
    updateNote.mutate(
      { id: note.id, dto: { isPinned: !note.isPinned } },
      {
        onSuccess: () =>
          toast.success(note.isPinned ? "Note unpinned" : "Note pinned"),
        onError: () => toast.error("Failed to update note"),
      },
    );
  }

  function handleToggleArchive(e: React.MouseEvent) {
    e.preventDefault();
    updateNote.mutate(
      { id: note.id, dto: { isArchived: !note.isArchived } },
      {
        onSuccess: () =>
          toast.success(note.isArchived ? "Note unarchived" : "Note archived"),
        onError: () => toast.error("Failed to update note"),
      },
    );
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    deleteNote.mutate(note.id, {
      onSuccess: () => toast.success("Note deleted"),
      onError: () => toast.error("Failed to delete note"),
    });
  }

  const snippet = (note.summary || note.content || "").trim();

  return (
    <div className="group relative flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-card/50 p-4 transition-colors hover:border-border hover:bg-card">
      <Link
        href={`/app/notes/${note.id}`}
        className="min-w-0 flex-1 space-y-1.5"
      >
        <div className="flex items-center gap-2">
          {note.isPinned && (
            <Pin className="size-3.5 shrink-0 text-primary" aria-label="Pinned" />
          )}
          <h3 className="truncate font-heading text-sm font-semibold text-foreground">
            {note.title.trim() || "Untitled"}
          </h3>
        </div>

        {snippet && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {snippet}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
          <span>{formatRelativeDate(note.updatedAt)}</span>
          {folder && (
            <span className="inline-flex items-center gap-1.5 text-foreground/80">
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: folder.color || "#39ff14" }}
              />
              {folder.name}
            </span>
          )}
          {note.tags.length > 0 && (
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {note.tags.slice(0, 4).map((t) => `#${t}`).join("  ")}
            </span>
          )}
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Note actions"
              className="size-7 shrink-0 opacity-60 group-hover:opacity-100"
            >
              <MoreVertical className="size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={handleTogglePin}
            className="text-xs gap-2 cursor-pointer"
          >
            <Pin className="size-3.5" />
            <span>{note.isPinned ? "Unpin" : "Pin"}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleToggleArchive}
            className="text-xs gap-2 cursor-pointer"
          >
            <Archive className="size-3.5" />
            <span>{note.isArchived ? "Unarchive" : "Archive"}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={handleDelete}
            className="text-xs gap-2 cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
