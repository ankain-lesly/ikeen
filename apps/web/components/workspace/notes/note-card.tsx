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
  variant?: "card" | "list";
}

export function NoteCard({
  note,
  folder,
  variant = "card",
}: NoteCardProps) {
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
      onSuccess: () => toast.success("Note moved to Trash"),
      onError: () => toast.error("Failed to delete note"),
    });
  }

  const snippet = (note.summary || note.content || "").trim();

  const actionMenu = (
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
          <span>Move to Trash</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (variant === "list") {
    return (
      <div className="group flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/40 px-4 py-3 transition-colors hover:border-border hover:bg-card">
        <Link
          href={`/app/notes/${note.id}`}
          className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="flex min-w-0 items-center gap-2">
            {note.isPinned && (
              <Pin
                className="size-3.5 shrink-0 text-primary"
                aria-label="Pinned"
              />
            )}
            <h3 className="truncate font-heading text-sm font-semibold text-foreground">
              {note.title.trim() || "Untitled"}
            </h3>
            {snippet && (
              <span className="hidden truncate text-xs text-muted-foreground lg:inline">
                — {snippet}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground">
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
              <span className="hidden font-mono text-[11px] sm:inline">
                {note.tags
                  .slice(0, 2)
                  .map((t) => `#${t}`)
                  .join(" ")}
              </span>
            )}
            <span className="tabular-nums">
              {formatRelativeDate(note.updatedAt)}
            </span>
          </div>
        </Link>

        {actionMenu}
      </div>
    );
  }

  return (
    <div className="group relative flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card/50 p-4 transition-all hover:border-primary/40 hover:bg-card">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/app/notes/${note.id}`}
          className="min-w-0 flex-1 space-y-2"
        >
          <div className="flex items-center gap-1.5">
            {note.isPinned && (
              <Pin
                className="size-3.5 shrink-0 text-primary"
                aria-label="Pinned"
              />
            )}
            <h3 className="truncate font-heading text-sm font-semibold text-foreground">
              {note.title.trim() || "Untitled"}
            </h3>
          </div>

          <p className="line-clamp-3 min-h-[3rem] text-xs leading-relaxed text-muted-foreground">
            {snippet || "No preview text yet"}
          </p>
        </Link>

        {actionMenu}
      </div>

      <Link
        href={`/app/notes/${note.id}`}
        className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {folder && (
            <span className="inline-flex items-center gap-1.5 truncate text-foreground/80">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: folder.color || "#39ff14" }}
              />
              <span className="truncate">{folder.name}</span>
            </span>
          )}
          {note.tags.length > 0 && (
            <span className="truncate font-mono text-[10px]">
              {note.tags
                .slice(0, 2)
                .map((t) => `#${t}`)
                .join(" ")}
            </span>
          )}
        </div>
        <span className="shrink-0 tabular-nums">
          {formatRelativeDate(note.updatedAt)}
        </span>
      </Link>
    </div>
  );
}
