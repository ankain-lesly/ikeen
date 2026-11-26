"use client";

import * as React from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Folder as FolderIcon, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { Folder } from "@repo/types";

import { useDeleteFolder, useFolders } from "@/lib/api/folders.api";
import { useNotes } from "@/lib/api/notes.api";
import { FolderDialog } from "@/components/workspace/folders/folder-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function FoldersPage() {
  const { data: folders = [], isLoading } = useFolders();
  const { data: notes = [] } = useNotes();
  const deleteFolder = useDeleteFolder();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingFolder, setEditingFolder] = React.useState<Folder | null>(null);

  const counts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const note of notes) {
      if (note.folderId) {
        map.set(note.folderId, (map.get(note.folderId) ?? 0) + 1);
      }
    }
    return map;
  }, [notes]);

  function openCreate() {
    setEditingFolder(null);
    setDialogOpen(true);
  }

  function openEdit(folder: Folder) {
    setEditingFolder(folder);
    setDialogOpen(true);
  }

  function handleDelete(folder: Folder) {
    deleteFolder.mutate(folder.id, {
      onSuccess: () => toast.success(`Deleted "${folder.name}"`),
      onError: () => toast.error("Failed to delete folder"),
    });
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-8 sm:py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Folders
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Organize your notes into focused collections
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5 font-medium">
          <Plus className="size-3.5" />
          <span>New Folder</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : folders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
          <FolderIcon className="size-7 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">No folders yet</p>
            <p className="text-xs text-muted-foreground">
              Create a folder to group related notes together.
            </p>
          </div>
          <Button onClick={openCreate} variant="outline" size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            <span>Create Folder</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => {
            const count = counts.get(folder.id) ?? 0;
            return (
              <div
                key={folder.id}
                className="group flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/50 p-4 transition-colors hover:border-border hover:bg-card"
              >
                <Link
                  href={`/app/folders/${folder.id}`}
                  className="min-w-0 flex-1 space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: folder.color || "#39ff14" }}
                    />
                    <h2 className="truncate font-heading text-sm font-semibold text-foreground">
                      {folder.name}
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {count} {count === 1 ? "note" : "notes"}
                  </p>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Folder actions"
                        className="size-7 shrink-0 opacity-60 group-hover:opacity-100"
                      >
                        <MoreVertical className="size-3.5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={() => openEdit(folder)}
                      className="text-xs gap-2 cursor-pointer"
                    >
                      <Pencil className="size-3.5" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(folder)}
                      className="text-xs gap-2 cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <FolderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        folder={editingFolder}
      />
    </div>
  );
}
