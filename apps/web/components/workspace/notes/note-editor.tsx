"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Archive, ArrowLeft, Pin, Plus, Trash2, X } from "lucide-react";

import { useFolders } from "@/lib/api/folders.api";
import { useDeleteNote, useUpdateNote } from "@/lib/api/notes.api";
import type { NoteDetail } from "@/lib/api/schemas";
import { BlockCanvas } from "./blocks/block-canvas";
import { Button } from "@/components/ui/button";

interface NoteEditorProps {
  note: NoteDetail;
  backHref?: string;
  backLabel?: string;
  extraActions?: React.ReactNode;
}

export function NoteEditor({
  note,
  backHref = "/app/notes",
  backLabel = "All Notes",
  extraActions,
}: NoteEditorProps) {
  const router = useRouter();
  const { data: folders = [] } = useFolders();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [titleDraft, setTitleDraft] = React.useState<string | null>(null);
  const [tagDraft, setTagDraft] = React.useState("");
  const title = titleDraft ?? note.title;

  function commitTitle() {
    if (titleDraft === null) return;
    const trimmed = titleDraft.trim() || "Untitled";
    setTitleDraft(null);
    if (trimmed !== note.title) {
      updateNote.mutate(
        { id: note.id, dto: { title: trimmed } },
        { onError: () => toast.error("Failed to update title") },
      );
    }
  }

  function handleFolderChange(folderId: string) {
    updateNote.mutate(
      { id: note.id, dto: { folderId: folderId || null } },
      {
        onSuccess: () => toast.success("Folder updated"),
        onError: () => toast.error("Failed to move note"),
      },
    );
  }

  function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = tagDraft.trim().replace(/^#/, "").toLowerCase();
    if (!cleaned || note.tags.includes(cleaned)) {
      setTagDraft("");
      return;
    }
    updateNote.mutate(
      { id: note.id, dto: { tags: [...note.tags, cleaned] } },
      {
        onSuccess: () => setTagDraft(""),
        onError: () => toast.error("Failed to add tag"),
      },
    );
  }

  function handleRemoveTag(tag: string) {
    updateNote.mutate(
      { id: note.id, dto: { tags: note.tags.filter((t) => t !== tag) } },
      { onError: () => toast.error("Failed to remove tag") },
    );
  }

  function handleDelete() {
    deleteNote.mutate(note.id, {
      onSuccess: () => {
        toast.success("Note deleted");
        router.push(backHref);
      },
      onError: () => toast.error("Failed to delete note"),
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>{backLabel}</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {updateNote.isPending ? "Saving…" : "Saved"}
          </span>

          <select
            aria-label="Assign folder"
            value={note.folderId ?? ""}
            onChange={(e) => handleFolderChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-card px-2.5 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              updateNote.mutate({
                id: note.id,
                dto: { isPinned: !note.isPinned },
              })
            }
            aria-label={note.isPinned ? "Unpin note" : "Pin note"}
            className={`size-8 ${note.isPinned ? "text-primary" : "text-muted-foreground"}`}
          >
            <Pin className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              updateNote.mutate({
                id: note.id,
                dto: { isArchived: !note.isArchived },
              })
            }
            aria-label={note.isArchived ? "Unarchive note" : "Archive note"}
            className={`size-8 ${note.isArchived ? "text-primary" : "text-muted-foreground"}`}
          >
            <Archive className="size-3.5" />
          </Button>

          {extraActions}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={deleteNote.isPending}
            aria-label="Delete note"
            className="size-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Title & Clean Inline Tags */}
      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="Untitled"
          maxLength={255}
          className="w-full bg-transparent font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40"
        />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="group/tag inline-flex items-center gap-1 font-mono text-muted-foreground"
            >
              <span>#{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-opacity cursor-pointer"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          <form onSubmit={handleAddTag} className="inline-flex items-center">
            <input
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder="+ add tag"
              className="w-24 bg-transparent font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            {tagDraft.trim() && (
              <button
                type="submit"
                aria-label="Add tag"
                className="text-primary hover:opacity-80 cursor-pointer"
              >
                <Plus className="size-3" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Block Canvas */}
      <BlockCanvas
        noteId={note.id}
        blocks={note.blocks}
        fallbackContent={note.content}
      />
    </div>
  );
}
