"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FileText, Plus, Search, X } from "lucide-react";
import type { Note } from "@repo/types";

import { useFolders } from "@/lib/api/folders.api";
import { useCreateNote } from "@/lib/api/notes.api";
import {
  useWorkspaceStore,
  type NoteSortField,
} from "@/lib/stores/workspace-store";
import { filterAndSortNotes } from "@/lib/workspace/note-filters";
import { NoteCard } from "./note-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORT_LABELS: Record<NoteSortField, string> = {
  updatedAt: "Sort: Recently updated",
  createdAt: "Sort: Date created",
  title: "Sort: Title",
};

interface NotesListViewProps {
  title: string;
  subtitle?: string;
  notes: Note[];
  isLoading: boolean;
  isError?: boolean;
  folderId?: string | null;
  pinnedFirst?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  headerAction?: React.ReactNode;
}

export function NotesListView({
  title,
  subtitle,
  notes,
  isLoading,
  isError = false,
  folderId = null,
  pinnedFirst = true,
  emptyTitle = "No notes yet",
  emptyDescription = "Create your first note to start writing.",
  headerAction,
}: NotesListViewProps) {
  const router = useRouter();
  const { data: folders = [] } = useFolders();
  const createNote = useCreateNote();

  const [searchQuery, setSearchQuery] = React.useState("");
  const sortBy = useWorkspaceStore((s) => s.sortBy);
  const sortDirection = useWorkspaceStore((s) => s.sortDirection);
  const setSortBy = useWorkspaceStore((s) => s.setSortBy);

  const folderMap = React.useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders],
  );

  const visibleNotes = React.useMemo(
    () =>
      filterAndSortNotes(notes, {
        searchQuery,
        sortBy,
        sortDirection,
        pinnedFirst,
      }),
    [notes, searchQuery, sortBy, sortDirection, pinnedFirst],
  );

  function handleCreate() {
    createNote.mutate(
      { title: "Untitled", folderId },
      {
        onSuccess: (created) => router.push(`/app/notes/${created.id}`),
        onError: () => toast.error("Failed to create note"),
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          <Button
            onClick={handleCreate}
            disabled={createNote.isPending}
            size="sm"
            className="gap-1.5 font-medium"
          >
            {createNote.isPending ? (
              <Spinner className="size-3.5" />
            ) : (
              <Plus className="size-3.5" />
            )}
            <span>New Note</span>
          </Button>
        </div>
      </div>

      {/* Search & Sort Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or #tags..."
            className="h-9 pl-9 pr-8 text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select
          value={sortBy}
          onValueChange={(val) => {
            if (val) setSortBy(val as NoteSortField);
          }}
        >
          <SelectTrigger aria-label="Sort notes" className="h-9 min-w-[180px] text-xs">
            <SelectValue>{SORT_LABELS[sortBy]}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="updatedAt">Sort: Recently updated</SelectItem>
            <SelectItem value="createdAt">Sort: Date created</SelectItem>
            <SelectItem value="title">Sort: Title</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">
            Could not load notes
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check your connection and try refreshing the page.
          </p>
        </div>
      ) : visibleNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <FileText className="size-7 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {searchQuery ? "No matching notes" : emptyTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? `No notes matched "${searchQuery}".`
                : emptyDescription}
            </p>
          </div>
          {!searchQuery && (
            <Button
              onClick={handleCreate}
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Create Note</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              folder={note.folderId ? folderMap.get(note.folderId) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
