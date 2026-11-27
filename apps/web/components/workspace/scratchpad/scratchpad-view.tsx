"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { ArrowLeftRight, Plus, RotateCcw, StickyNote } from "lucide-react";
import {
  formatScratchpadTags,
  isScratchpadNote,
  removeScratchpadTag,
  SCRATCHPAD_TAG,
} from "@repo/utils";
import type { Note } from "@repo/types";

import {
  useCreateNote,
  useNote,
  useNotes,
  useUpdateNote,
} from "@/lib/api/notes.api";
import { NoteEditor } from "@/components/workspace/notes/note-editor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ScratchpadView() {
  const { data: allNotes = [], isLoading: isListLoading } = useNotes({
    includeArchived: true,
  });
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  const [isPickerOpen, setIsPickerOpen] = React.useState(false);

  const scratchpadSummary = React.useMemo(
    () => allNotes.find((n) => isScratchpadNote(n) && !n.deletedAt) ?? null,
    [allNotes],
  );

  const { data: scratchpadDetail, isLoading: isDetailLoading } = useNote(
    scratchpadSummary?.id,
    Boolean(scratchpadSummary),
  );

  function handleCreateScratchpad() {
    createNote.mutate(
      {
        title: "Scratchpad",
        tags: [SCRATCHPAD_TAG],
      },
      {
        onSuccess: () => toast.success("Scratchpad ready"),
        onError: () => toast.error("Failed to create scratchpad"),
      },
    );
  }

  function handleAssignNote(target: Note) {
    if (scratchpadSummary && scratchpadSummary.id !== target.id) {
      updateNote.mutate({
        id: scratchpadSummary.id,
        dto: { tags: removeScratchpadTag(scratchpadSummary.tags) },
      });
    }
    updateNote.mutate(
      {
        id: target.id,
        dto: { tags: formatScratchpadTags(target.tags) },
      },
      {
        onSuccess: () => {
          toast.success(`Assigned "${target.title || "Untitled"}" as Scratchpad`);
          setIsPickerOpen(false);
        },
        onError: () => toast.error("Failed to assign scratchpad"),
      },
    );
  }

  function handleResetScratchpad() {
    if (!scratchpadSummary) return;
    updateNote.mutate(
      {
        id: scratchpadSummary.id,
        dto: { tags: removeScratchpadTag(scratchpadSummary.tags) },
      },
      {
        onSuccess: () => toast.success("Scratchpad unassigned"),
        onError: () => toast.error("Failed to reset scratchpad"),
      },
    );
  }

  if (isListLoading || (scratchpadSummary && isDetailLoading)) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8 space-y-5">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      {scratchpadDetail ? (
        <NoteEditor
          note={scratchpadDetail}
          backHref="/app/notes"
          backLabel="All Notes"
          extraActions={
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPickerOpen(true)}
                aria-label="Switch scratchpad note"
                className="size-8 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftRight className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleResetScratchpad}
                aria-label="Unassign scratchpad"
                className="size-8 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </>
          }
        />
      ) : (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center space-y-5">
          <div className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <StickyNote className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-heading text-xl font-bold text-foreground">
              Set up your Scratchpad
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              One always-ready note synced across Web, Mobile, and Desktop via
              the <span className="font-mono text-foreground">#scratchpad</span>{" "}
              tag.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button
              onClick={handleCreateScratchpad}
              disabled={createNote.isPending}
              size="sm"
              className="gap-1.5"
            >
              {createNote.isPending ? (
                <Spinner className="size-3.5" />
              ) : (
                <Plus className="size-3.5" />
              )}
              <span>Create Scratchpad</span>
            </Button>
            {allNotes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPickerOpen(true)}
              >
                Use Existing Note
              </Button>
            )}
          </div>
        </div>
      )}

      <Sheet open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="font-heading">
              Choose Scratchpad Note
            </SheetTitle>
            <SheetDescription>
              Pick any existing note to act as your cross-device Scratchpad.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-1.5 overflow-y-auto px-4 pb-6">
            {allNotes.map((note) => {
              const isCurrent = note.id === scratchpadSummary?.id;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleAssignNote(note)}
                  disabled={isCurrent || updateNote.isPending}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                    isCurrent
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/70 bg-card/50 text-foreground hover:bg-card"
                  }`}
                >
                  <p className="font-medium truncate">
                    {note.title.trim() || "Untitled"}
                  </p>
                  {isCurrent && (
                    <p className="mt-0.5 text-[10px] text-primary">
                      Current Scratchpad
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
