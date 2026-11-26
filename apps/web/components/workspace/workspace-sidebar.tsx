"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Archive,
  FileText,
  Folder as FolderIcon,
  Menu,
  Pin,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";

import { useFolders } from "@/lib/api/folders.api";
import { useCreateNote } from "@/lib/api/notes.api";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { UserMenu } from "@/components/auth/user-menu";
import { FolderDialog } from "@/components/workspace/folders/folder-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

const PRIMARY_NAV = [
  { label: "All Notes", href: "/app/notes", icon: FileText },
  { label: "Scratchpad", href: "/app/scratchpad", icon: StickyNote },
  { label: "Pinned", href: "/app/pinned", icon: Pin },
  { label: "Archive", href: "/app/archive", icon: Archive },
  { label: "Trash", href: "/app/trash", icon: Trash2 },
] as const;

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: folders = [], isLoading: isFoldersLoading } = useFolders();
  const createNote = useCreateNote();
  const setQuickSwitcherOpen = useWorkspaceStore((s) => s.setQuickSwitcherOpen);
  const [isFolderDialogOpen, setIsFolderDialogOpen] = React.useState(false);

  function handleNewNote() {
    const folderMatch = pathname.match(/^\/app\/folders\/([^/]+)$/);
    const folderId = folderMatch?.[1] ?? null;

    createNote.mutate(
      { title: "Untitled", folderId },
      {
        onSuccess: (created) => {
          onNavigate?.();
          router.push(`/app/notes/${created.id}`);
        },
        onError: () => toast.error("Failed to create note"),
      },
    );
  }

  return (
    <div className="flex h-full flex-col bg-card/40">
      {/* Brand header */}
      <div className="flex items-center justify-between px-4 py-4">
        <Link
          href="/app/notes"
          onClick={onNavigate}
          className="flex items-center gap-2 font-heading text-sm font-bold tracking-tight text-foreground"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            iK
          </span>
          <span>iKeen</span>
        </Link>
      </div>

      {/* Primary actions */}
      <div className="px-3 pb-3 space-y-1.5">
        <Button
          onClick={handleNewNote}
          disabled={createNote.isPending}
          size="sm"
          className="w-full justify-start gap-2 font-medium"
        >
          {createNote.isPending ? (
            <Spinner className="size-3.5" />
          ) : (
            <Plus className="size-3.5" />
          )}
          <span>New Note</span>
        </Button>

        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            setQuickSwitcherOpen(true);
          }}
          className="flex w-full items-center justify-between rounded-lg border border-border/70 bg-background/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <Search className="size-3.5" />
            <span>Quick jump…</span>
          </span>
          <kbd className="font-mono text-[10px] text-muted-foreground/80">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation + Folders */}
      <ScrollArea className="flex-1 px-2">
        <nav aria-label="Workspace" className="space-y-0.5">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/app/notes"
                ? pathname === "/app/notes" || pathname.startsWith("/app/notes/")
                : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`size-3.5 ${active ? "text-primary" : "text-muted-foreground"}`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Folders section */}
        <div className="mt-6 px-2.5">
          <div className="flex items-center justify-between pb-1.5">
            <Link
              href="/app/folders"
              onClick={onNavigate}
              className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              Folders
            </Link>
            <button
              type="button"
              onClick={() => setIsFolderDialogOpen(true)}
              aria-label="Create folder"
              className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="space-y-0.5 pb-4">
            {isFoldersLoading ? (
              <div className="space-y-1.5 pt-1">
                <div className="h-6 rounded bg-secondary/50 animate-pulse" />
                <div className="h-6 rounded bg-secondary/50 animate-pulse" />
              </div>
            ) : folders.length === 0 ? (
              <p className="py-1.5 text-[11px] text-muted-foreground">
                No folders yet
              </p>
            ) : (
              folders.map((folder) => {
                const href = `/app/folders/${folder.id}`;
                const active = pathname === href;
                return (
                  <Link
                    key={folder.id}
                    href={href}
                    onClick={onNavigate}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                      active
                        ? "bg-secondary font-medium text-foreground"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: folder.color || "#39ff14" }}
                    />
                    <span className="truncate">{folder.name}</span>
                  </Link>
                );
              })
            )}

            <Link
              href="/app/folders"
              onClick={onNavigate}
              className={`mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] transition-colors ${
                pathname === "/app/folders"
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <FolderIcon className="size-3" />
              <span>Manage Folders</span>
            </Link>
          </div>
        </div>
      </ScrollArea>

      {/* Footer account menu */}
      <div className="border-t border-border p-3">
        <UserMenu />
      </div>

      <FolderDialog
        open={isFolderDialogOpen}
        onOpenChange={setIsFolderDialogOpen}
      />
    </div>
  );
}

export function WorkspaceSidebar() {
  const isMobileNavOpen = useWorkspaceStore((s) => s.isMobileNavOpen);
  const setMobileNavOpen = useWorkspaceStore((s) => s.setMobileNavOpen);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col border-r border-border">
        <SidebarBody />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 px-4 py-2.5 md:hidden">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            className="size-8"
          >
            <Menu className="size-4" />
          </Button>
          <Link
            href="/app/notes"
            className="font-heading text-sm font-bold tracking-tight text-foreground"
          >
            iKeen
          </Link>
        </div>
        <UserMenu />
      </div>

      <Sheet open={isMobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Workspace Navigation</SheetTitle>
          </SheetHeader>
          <SidebarBody onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
