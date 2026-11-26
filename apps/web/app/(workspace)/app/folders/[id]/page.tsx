"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Pencil, Trash2 } from "lucide-react";

import { useDeleteFolder, useFolder } from "@/lib/api/folders.api";
import { useNotes } from "@/lib/api/notes.api";
import { NotesListView } from "@/components/workspace/notes/notes-list-view";
import { FolderDialog } from "@/components/workspace/folders/folder-dialog";
import { Button } from "@/components/ui/button";

export default function FolderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const folderId = params.id;

  const { data: folder } = useFolder(folderId);
  const { data: notes = [], isLoading, isError } = useNotes({ folderId });
  const deleteFolder = useDeleteFolder();
  const [editOpen, setEditOpen] = React.useState(false);

  function handleDelete() {
    if (!folder) return;
    deleteFolder.mutate(folder.id, {
      onSuccess: () => {
        toast.success(`Deleted "${folder.name}"`);
        router.push("/app/folders");
      },
      onError: () => toast.error("Failed to delete folder"),
    });
  }

  return (
    <>
      <NotesListView
        title={folder?.name ?? "Folder"}
        subtitle={`${notes.length} ${notes.length === 1 ? "note" : "notes"}`}
        notes={notes}
        isLoading={isLoading}
        isError={isError}
        folderId={folderId}
        emptyTitle="This folder is empty"
        emptyDescription="Create a new note in this folder to get started."
        headerAction={
          folder ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                aria-label="Delete folder"
                className="size-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ) : null
        }
      />

      <FolderDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        folder={folder ?? null}
      />
    </>
  );
}
