"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";

import { useCreateNote } from "@/lib/api/notes.api";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function WorkspaceHeader() {
  const router = useRouter();
  const createNote = useCreateNote();
  const setQuickSwitcherOpen = useWorkspaceStore(
    (s) => s.setQuickSwitcherOpen,
  );

  function handleNewNote() {
    createNote.mutate(
      { title: "Untitled" },
      {
        onSuccess: (created) => router.push(`/app/notes/${created.id}`),
        onError: () => toast.error("Failed to create note"),
      },
    );
  }

  return (
    <header className="sticky top-0 z-40 h-[53px] w-full border-b border-border bg-card/60 backdrop-blur-md">
      <div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-5">
        <Link
          href="/app/notes"
          className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight text-foreground"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            iK
          </span>
          <span>iKeen</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuickSwitcherOpen(true)}
            className="hidden sm:flex items-center gap-2.5 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground cursor-pointer"
          >
            <Search className="size-3.5" />
            <span>Quick jump…</span>
            <kbd className="font-mono text-[10px] text-muted-foreground/80">
              ⌘K
            </kbd>
          </button>

          <Button
            onClick={handleNewNote}
            disabled={createNote.isPending}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium"
          >
            {createNote.isPending ? (
              <Spinner className="size-3.5" />
            ) : (
              <Plus className="size-3.5" />
            )}
            <span className="hidden sm:inline">New Note</span>
          </Button>

          <div className="h-4 w-px bg-border/60" />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
