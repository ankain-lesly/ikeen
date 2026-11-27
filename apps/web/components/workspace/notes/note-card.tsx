"use client";

import * as React from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Archive, MoreVertical, Pin, Trash2 } from "lucide-react";
import type { Folder } from "@repo/types";

import { useDeleteNote, useUpdateNote } from "@/lib/api/notes.api";
import type { NoteListItem } from "@/lib/api/schemas";
import {
  formatRelativeDate,
  getNoteCoverImage,
  stripMarkdown,
} from "@/lib/workspace/note-filters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteCardProps {
  note: NoteListItem;
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

  const snippet = stripMarkdown(note.summary || note.content || "");
  const coverImage = variant === "card" ? getNoteCoverImage(note) : null;
  const displayTitle = note.title.trim() || "Untitled";

  const actionMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Note actions"
            className="size-7 shrink-0 text-muted-foreground opacity-70 transition-opacity md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 hover:text-foreground"
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

  // =========================================================================
  // LIST VIEW — Compact inbox row (zero media thumbnails)
  // =========================================================================
  if (variant === "list") {
    return (
      <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/40">
        <Link
          href={`/app/notes/${note.id}`}
          className="flex min-w-0 flex-1 items-center justify-between gap-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {note.isPinned && (
                <Pin
                  className="size-3 shrink-0 text-primary"
                  aria-label="Pinned"
                />
              )}
              <h3 className="truncate font-heading text-[13.5px] font-semibold text-foreground group-hover:text-primary transition-colors">
                {displayTitle}
              </h3>
            </div>
            {snippet && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {snippet}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3.5 text-[11px] text-muted-foreground">
            {folder && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-foreground/80">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: folder.color || "#39ff14" }}
                />
                <span className="max-w-28 truncate">{folder.name}</span>
              </span>
            )}
            {note.tags.length > 0 && (
              <span className="hidden lg:inline font-mono text-[11px] text-muted-foreground/80">
                {note.tags
                  .slice(0, 2)
                  .map((t) => `#${t}`)
                  .join(" ")}
              </span>
            )}
            <span className="w-16 text-right tabular-nums text-[11px] text-muted-foreground/80">
              {formatRelativeDate(note.updatedAt)}
            </span>
          </div>
        </Link>

        {actionMenu}
      </div>
    );
  }

  // =========================================================================
  // CARD VIEW — Variable-height Masonry card (2-col mobile, 3-col desktop)
  // =========================================================================
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-border/70 bg-card/60 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-sm">
      {/* First Media Image Cover (Cards view only) */}
      {coverImage && (
        <Link
          href={`/app/notes/${note.id}`}
          className="relative block h-24 sm:h-36 w-full overflow-hidden bg-secondary/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImage}
            alt={displayTitle}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 sm:h-10 bg-gradient-to-t from-card/80 to-transparent" />
          {note.isPinned && (
            <span
              aria-label="Pinned"
              className="absolute left-2 top-2 sm:left-3 sm:top-3 inline-flex items-center justify-center rounded-full bg-background/80 p-1 sm:p-1.5 text-primary backdrop-blur-sm"
            >
              <Pin className="size-2.5 sm:size-3" />
            </span>
          )}
        </Link>
      )}

      {/* Card Body */}
      <div className="flex flex-col justify-between p-3 sm:p-4">
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <Link
            href={`/app/notes/${note.id}`}
            className="min-w-0 flex-1 space-y-1 sm:space-y-1.5"
          >
            <div className="flex items-center gap-1.5">
              {!coverImage && note.isPinned && (
                <Pin
                  className="size-3 sm:size-3.5 shrink-0 text-primary"
                  aria-label="Pinned"
                />
              )}
              <h3 className="line-clamp-2 font-heading text-[13px] sm:text-[15px] font-semibold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
                {displayTitle}
              </h3>
            </div>

            {snippet ? (
              <p
                className={`${
                  coverImage ? "line-clamp-2" : "line-clamp-4 sm:line-clamp-5"
                } text-[11.5px] sm:text-xs leading-relaxed text-muted-foreground`}
              >
                {snippet}
              </p>
            ) : (
              !coverImage && (
                <p className="text-[11px] sm:text-xs italic text-muted-foreground/50">
                  Empty note
                </p>
              )
            )}
          </Link>

          {actionMenu}
        </div>

        {/* Footer Metadata */}
        <Link
          href={`/app/notes/${note.id}`}
          className="mt-3 sm:mt-4 flex items-center justify-between gap-1.5 sm:gap-2 border-t border-border/50 pt-2 sm:pt-2.5 text-[10px] sm:text-[11px] text-muted-foreground"
        >
          <div className="flex min-w-0 items-center gap-2">
            {folder && (
              <span className="inline-flex min-w-0 items-center gap-1 sm:gap-1.5 text-foreground/80">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: folder.color || "#39ff14" }}
                />
                <span className="truncate max-w-20 sm:max-w-24">
                  {folder.name}
                </span>
              </span>
            )}
            {note.tags.length > 0 && (
              <span className="hidden sm:inline truncate font-mono text-[10.5px] text-muted-foreground/80">
                {note.tags
                  .slice(0, 2)
                  .map((t) => `#${t}`)
                  .join(" ")}
              </span>
            )}
          </div>
          <span className="shrink-0 tabular-nums text-[10px] sm:text-[10.5px] text-muted-foreground/80">
            {formatRelativeDate(note.updatedAt)}
          </span>
        </Link>
      </div>
    </article>
  );
}
