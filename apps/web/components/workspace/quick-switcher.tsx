"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FileText, Folder as FolderIcon, LayoutDashboard, Plus, Search, StickyNote } from "lucide-react";

import { useFolders } from "@/lib/api/folders.api";
import { useCreateNote, useNotes } from "@/lib/api/notes.api";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

export function QuickSwitcher() {
  const router = useRouter();
  const open = useWorkspaceStore((s) => s.isQuickSwitcherOpen);
  const setOpen = useWorkspaceStore((s) => s.setQuickSwitcherOpen);
  const [query, setQuery] = React.useState("");

  const { data: notes = [] } = useNotes({}, open);
  const { data: folders = [] } = useFolders(open);
  const createNote = useCreateNote();

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        const current = useWorkspaceStore.getState().isQuickSwitcherOpen;
        setOpen(!current);
      } else if (e.key.toLowerCase() === "n") {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        createNote.mutate(
          { title: "Untitled" },
          {
            onSuccess: (created) => router.push(`/app/notes/${created.id}`),
            onError: () => toast.error("Failed to create note"),
          },
        );
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createNote, router, setOpen]);

  const normalized = query.trim().toLowerCase();

  const matchingNotes = React.useMemo(
    () =>
      notes
        .filter(
          (n) =>
            !normalized ||
            n.title.toLowerCase().includes(normalized) ||
            n.tags.some((t) => t.toLowerCase().includes(normalized)),
        )
        .slice(0, 8),
    [notes, normalized],
  );

  const matchingFolders = React.useMemo(
    () =>
      folders
        .filter(
          (f) => !normalized || f.name.toLowerCase().includes(normalized),
        )
        .slice(0, 5),
    [folders, normalized],
  );

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="top" className="mx-auto max-w-lg rounded-b-2xl">
        <SheetHeader className="sr-only">
          <SheetTitle>Quick Switcher</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-2 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to note, folder, or Scratchpad..."
              autoFocus
              className="pl-9 text-sm"
            />
          </div>

          <div className="max-h-72 space-y-4 overflow-y-auto text-xs">
            <div className="space-y-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Actions
              </p>
              <button
                type="button"
                onClick={() => go("/app/folders")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-foreground hover:bg-secondary cursor-pointer"
              >
                <FolderIcon className="size-3.5 text-primary" />
                <span>Browse Folders</span>
              </button>
              <button
                type="button"
                onClick={() => go("/app/scratchpad")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-foreground hover:bg-secondary cursor-pointer"
              >
                <StickyNote className="size-3.5 text-primary" />
                <span>Open Scratchpad</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  createNote.mutate(
                    { title: "Untitled" },
                    {
                      onSuccess: (created) =>
                        router.push(`/app/notes/${created.id}`),
                    },
                  );
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-foreground hover:bg-secondary cursor-pointer"
              >
                <Plus className="size-3.5 text-primary" />
                <span>Create New Note</span>
              </button>
              <button
                type="button"
                onClick={() => go("/dashboard")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-foreground hover:bg-secondary cursor-pointer"
              >
                <LayoutDashboard className="size-3.5 text-primary" />
                <span>Developer Dashboard</span>
              </button>
            </div>

            {matchingNotes.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </p>
                {matchingNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => go(`/app/notes/${note.id}`)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-foreground hover:bg-secondary cursor-pointer"
                  >
                    <FileText className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {note.title.trim() || "Untitled"}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {matchingFolders.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Folders
                </p>
                {matchingFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => go(`/app/folders/${folder.id}`)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-foreground hover:bg-secondary cursor-pointer"
                  >
                    <FolderIcon
                      className="size-3.5 shrink-0"
                      style={{ color: folder.color || "#39ff14" }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
