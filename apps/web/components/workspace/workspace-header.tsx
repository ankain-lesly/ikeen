"use client";

import Image from "next/image";
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
      <div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-6">
        {/* Mobile-only brand mark (desktop shows brand in full-height sidebar) */}
        <Link
          href="/app/notes"
          className="flex md:hidden items-center gap-2 font-heading text-sm font-bold tracking-tight text-foreground"
        >
          <Image
            src="/icon.png"
            alt="iKeen"
            width={24}
            height={24}
            className="size-6 rounded-md"
          />
          <span>iKeen</span>
        </Link>

        {/* Desktop Quick Jump bar on left */}
        <button
          type="button"
          onClick={() => setQuickSwitcherOpen(true)}
          className="hidden md:flex items-center justify-between gap-6 w-64 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <Search className="size-3.5" />
            <span>Quick jump…</span>
          </span>
          <kbd className="font-mono text-[10px] text-muted-foreground/80">
            ⌘K
          </kbd>
        </button>

        <div className="flex items-center gap-2">
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
