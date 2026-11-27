"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { RotateCcw, Trash2 } from "lucide-react";

import {
  usePermanentDeleteNote,
  useRestoreNote,
  useTrashedNotes,
} from "@/lib/api/notes.api";
import { formatRelativeDate } from "@/lib/workspace/note-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrashPage() {
  const { data: trashed = [], isLoading, isError } = useTrashedNotes();
  const restoreNote = useRestoreNote();
  const permanentDelete = usePermanentDeleteNote();
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!confirmId) return;
    const timer = setTimeout(() => setConfirmId(null), 4000);
    return () => clearTimeout(timer);
  }, [confirmId]);

  function handleRestore(id: string, title: string) {
    restoreNote.mutate(id, {
      onSuccess: () => toast.success(`Restored "${title || "Untitled"}"`),
      onError: () => toast.error("Failed to restore note"),
    });
  }

  function handlePermanentDelete(id: string, title: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setConfirmId(null);
    permanentDelete.mutate(id, {
      onSuccess: () =>
        toast.success(`Permanently deleted "${title || "Untitled"}"`),
      onError: () => toast.error("Failed to delete note"),
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Trash
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Restore deleted notes or remove them permanently
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            Could not load trash
          </p>
        </div>
      ) : trashed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
          <Trash2 className="size-7 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">Trash is empty</p>
          <p className="text-xs text-muted-foreground">
            Deleted notes will appear here so you can recover them anytime.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {trashed.map((note) => {
            const isConfirming = confirmId === note.id;
            return (
              <div
                key={note.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/50 p-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="truncate font-heading text-sm font-semibold text-foreground">
                    {note.title.trim() || "Untitled"}
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Deleted{" "}
                    {note.deletedAt
                      ? formatRelativeDate(note.deletedAt)
                      : "recently"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={restoreNote.isPending}
                    onClick={() => handleRestore(note.id, note.title)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Restore</span>
                  </Button>
                  <Button
                    variant={isConfirming ? "destructive" : "ghost"}
                    size="sm"
                    disabled={permanentDelete.isPending}
                    onClick={() => handlePermanentDelete(note.id, note.title)}
                    className={`h-8 gap-1.5 text-xs ${
                      isConfirming
                        ? ""
                        : "text-muted-foreground hover:text-destructive"
                    }`}
                  >
                    <Trash2 className="size-3.5" />
                    <span>
                      {isConfirming ? "Confirm Delete" : "Delete Forever"}
                    </span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
