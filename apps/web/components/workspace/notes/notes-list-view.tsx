"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FileText, LayoutGrid, List, Plus, Search, X } from "lucide-react";
import type { NoteListItem } from "@/lib/api/schemas";
import { useFolders } from "@/lib/api/folders.api";
import { useCreateNote } from "@/lib/api/notes.api";
import {
  useWorkspaceStore,
  type NoteSortField,
} from "@/lib/stores/workspace-store";
import { filterAndSortNotes } from "@/lib/workspace/note-filters";
import { NoteCard } from "./note-card";
import { MasonryGrid } from "@/components/ui/masonry-grid";
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
  notes: NoteListItem[];
  isLoading: boolean;
  isError?: boolean;
  folderId?: string | null;
  pinnedFirst?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  headerAction?: React.ReactNode;
  filterBar?: React.ReactNode;
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
  filterBar,
}: NotesListViewProps) {
  const router = useRouter();
  const { data: folders = [] } = useFolders();
  const createNote = useCreateNote();

  const [searchQuery, setSearchQuery] = React.useState("");
  const sortBy = useWorkspaceStore((s) => s.sortBy);
  const sortDirection = useWorkspaceStore((s) => s.sortDirection);
  const viewMode = useWorkspaceStore((s) => s.viewMode);
  const setSortBy = useWorkspaceStore((s) => s.setSortBy);
  const setViewMode = useWorkspaceStore((s) => s.setViewMode);

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
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-8 space-y-6">
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

      {/* Inline Filter Bar + Search + Sort + View Mode Toggle */}
      <div className="space-y-3">
        {filterBar}

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

          <div className="flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(val) => {
                if (val) setSortBy(val as NoteSortField);
              }}
            >
              <SelectTrigger
                aria-label="Sort notes"
                className="h-9 min-w-[175px] text-xs"
              >
                <SelectValue>{SORT_LABELS[sortBy]}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="updatedAt">Sort: Recently updated</SelectItem>
                <SelectItem value="createdAt">Sort: Date created</SelectItem>
                <SelectItem value="title">Sort: Title</SelectItem>
              </SelectContent>
            </Select>

            {/* Smooth Cards / List View Toggle */}
            <div
              role="group"
              aria-label="Notes layout view"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-card p-0.5"
            >
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-pressed={viewMode === "cards"}
                title="Cards view"
                className={`inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                title="List view"
                className={`inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="size-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === "cards" ? (
          <div className="columns-2 gap-2.5 sm:gap-3.5 lg:columns-3">
            {["h-28", "h-44", "h-32", "h-40", "h-24", "h-36"].map(
              (height, idx) => (
                <Skeleton
                  key={idx}
                  className={`${height} mb-2.5 sm:mb-3.5 w-full break-inside-avoid rounded-xl sm:rounded-2xl`}
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        )
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
      ) : viewMode === "cards" ? (
        <MasonryGrid
          items={visibleNotes}
          keyExtractor={(note) => note.id}
          renderItem={(note) => (
            <NoteCard
              note={note}
              folder={note.folderId ? folderMap.get(note.folderId) : undefined}
              variant="card"
            />
          )}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/40 divide-y divide-border/50">
          {visibleNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              folder={note.folderId ? folderMap.get(note.folderId) : undefined}
              variant="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}
