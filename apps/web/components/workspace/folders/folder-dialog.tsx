"use client";

import * as React from "react";
import toast from "react-hot-toast";
import type { Folder } from "@repo/types";
import { useCreateFolder, useUpdateFolder } from "@/lib/api/folders.api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const FOLDER_COLORS = [
  "#39ff14",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#a855f7",
  "#14b8a6",
  "#ef4444",
  "#94a3b8",
] as const;

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: Folder | null;
}

export function FolderDialog({
  open,
  onOpenChange,
  folder,
}: FolderDialogProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-heading">
            {folder ? "Edit Folder" : "New Folder"}
          </SheetTitle>
          <SheetDescription>
            Group related notes with a name and color marker.
          </SheetDescription>
        </SheetHeader>

        {open && (
          <FolderDialogForm
            key={folder?.id ?? "new"}
            folder={folder}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function FolderDialogForm({
  folder,
  onClose,
}: {
  folder?: Folder | null;
  onClose: () => void;
}) {
  const isEditing = Boolean(folder);
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();

  const [name, setName] = React.useState(folder?.name ?? "");
  const [color, setColor] = React.useState(folder?.color ?? FOLDER_COLORS[0]);

  const isPending = createFolder.isPending || updateFolder.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Folder name is required");
      return;
    }

    if (folder) {
      updateFolder.mutate(
        { id: folder.id, dto: { name: trimmed, color } },
        {
          onSuccess: () => {
            toast.success("Folder updated");
            onClose();
          },
          onError: () => toast.error("Failed to update folder"),
        },
      );
    } else {
      createFolder.mutate(
        { name: trimmed, color, icon: "folder" },
        {
          onSuccess: () => {
            toast.success("Folder created");
            onClose();
          },
          onError: () => toast.error("Failed to create folder"),
        },
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5 px-4">
      <div className="space-y-2">
        <Label htmlFor="folder-name">Name</Label>
        <Input
          id="folder-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Engineering, Personal"
          maxLength={100}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2.5 pt-1">
          {FOLDER_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => setColor(swatch)}
              aria-label={`Select color ${swatch}`}
              className={`size-7 rounded-full transition-transform cursor-pointer ${
                color === swatch
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
                  : "opacity-75 hover:opacity-100"
              }`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending && <Spinner className="size-3.5" />}
          <span>{isEditing ? "Save" : "Create Folder"}</span>
        </Button>
      </div>
    </form>
  );
}
