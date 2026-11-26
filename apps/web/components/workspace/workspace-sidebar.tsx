"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ChevronsUpDown,
  FileText,
  Folder as FolderIcon,
  LogOut,
  Menu,
  Moon,
  Pin,
  Plus,
  StickyNote,
  Sun,
  Trash2,
} from "lucide-react";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useCreateNote, useInfiniteNotes } from "@/lib/api/notes.api";
import { useWorkspaceStore } from "@/lib/stores/workspace-store";
import { formatRelativeDate } from "@/lib/workspace/note-filters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

const TOP_NAV_ITEMS = [
  {
    label: "All Notes",
    href: "/app/notes",
    icon: FileText,
    match: (p: string) => p === "/app/notes" || p === "/app/notes/",
  },
  {
    label: "Folders",
    href: "/app/folders",
    icon: FolderIcon,
    match: (p: string) => p.startsWith("/app/folders"),
  },
  {
    label: "Scratchpad",
    href: "/app/scratchpad",
    icon: StickyNote,
    match: (p: string) => p.startsWith("/app/scratchpad"),
  },
  {
    label: "Trash",
    href: "/app/trash",
    icon: Trash2,
    match: (p: string) => p.startsWith("/app/trash"),
  },
] as const;

function SidebarProfileCard({ onAction }: { onAction?: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const initials = (
    user?.firstName?.[0] ||
    user?.email?.[0] ||
    "U"
  ).toUpperCase();
  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.email || "Account";

  return (
    <div className="border-t border-border/60 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-secondary/60 cursor-pointer"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-bold text-primary">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          }
        />
        <DropdownMenuContent side="top" align="start" className="w-56 p-1.5">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5">
              <p className="truncate text-xs font-medium text-foreground">
                {displayName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email}
              </p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={toggleTheme}
              className="text-xs gap-2 cursor-pointer"
            >
              {theme === "light" ? (
                <Moon className="size-3.5" />
              ) : (
                <Sun className="size-3.5" />
              )}
              <span>
                {theme === "light" ? "Dark Theme" : "Light Theme"}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onAction?.();
                router.push("/app/folders");
              }}
              className="text-xs gap-2 cursor-pointer"
            >
              <FolderIcon className="size-3.5" />
              <span>Manage Folders</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                onAction?.();
                logout();
              }}
              className="text-xs gap-2 cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const createNote = useCreateNote();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteNotes(20);

  const notes = React.useMemo(
    () => data?.pages.flatMap((page) => page) ?? [],
    [data],
  );

  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  function handleNewNote() {
    const folderMatch = pathname.match(/^\/app\/folders\/([^/]+)$/);
    const folderId = folderMatch?.[1] ?? null;

    createNote.mutate(
      { title: "Untitled", folderId },
      {
        onSuccess: (created) => {
          onNavClick?.();
          router.push(`/app/notes/${created.id}`);
        },
        onError: () => toast.error("Failed to create note"),
      },
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top Actions & Primary Navigation */}
      <div className="shrink-0 space-y-4 p-4 pb-3 border-b border-border/50">
        <Button
          onClick={handleNewNote}
          disabled={createNote.isPending}
          size="sm"
          className="w-full gap-2 font-medium shadow-xs"
        >
          {createNote.isPending ? (
            <Spinner className="size-3.5" />
          ) : (
            <Plus className="size-4" />
          )}
          <span>New Note</span>
        </Button>

        <div className="space-y-1">
          <p className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          <nav aria-label="Workspace" className="space-y-0.5">
            {TOP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.match(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavClick}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`size-4 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Middle Scrollable Infinite Notes Loader */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Recent Notes
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/70">
            {notes.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {isLoading ? (
            <div className="space-y-1.5 px-2 pt-1">
              <div className="h-9 rounded-lg bg-secondary/50 animate-pulse" />
              <div className="h-9 rounded-lg bg-secondary/50 animate-pulse" />
              <div className="h-9 rounded-lg bg-secondary/50 animate-pulse" />
            </div>
          ) : notes.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              No notes yet
            </p>
          ) : (
            <>
              {notes.map((note) => {
                const href = `/app/notes/${note.id}`;
                const active = pathname === href;
                return (
                  <Link
                    key={note.id}
                    href={href}
                    onClick={onNavClick}
                    className={`block rounded-lg px-2.5 py-2 transition-colors ${
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/90 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {note.isPinned && (
                        <Pin className="size-3 shrink-0 text-primary" />
                      )}
                      <span className="truncate text-xs font-medium">
                        {note.title.trim() || "Untitled"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatRelativeDate(note.updatedAt)}
                    </p>
                  </Link>
                );
              })}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="py-2 text-center">
                {isFetchingNextPage && (
                  <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Spinner className="size-3" />
                    <span>Loading more…</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Profile Card + Menu */}
      <SidebarProfileCard onAction={onNavClick} />
    </div>
  );
}

/**
 * Desktop Left Sidebar (Sticky beneath WorkspaceHeader, matching legacy dashboard)
 */
export function WorkspaceSidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col border-r border-border bg-card/40 sticky top-[53px] h-[calc(100vh-53px)]">
      <SidebarContent />
    </aside>
  );
}

/**
 * Mobile Sticky Sub-Navigation Bar with Sheet Drawer
 */
export function WorkspaceMobileNav() {
  const pathname = usePathname();
  const open = useWorkspaceStore((s) => s.isMobileNavOpen);
  const setOpen = useWorkspaceStore((s) => s.setMobileNavOpen);

  const currentItem =
    TOP_NAV_ITEMS.find((item) => item.match(pathname)) ?? TOP_NAV_ITEMS[0];
  const CurrentIcon = currentItem.icon;

  return (
    <div className="md:hidden sticky top-[53px] z-30 border-b border-border bg-card/90 backdrop-blur-md px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" size="icon-sm" className="size-8">
                <Menu className="size-4" />
                <span className="sr-only">Toggle Workspace Menu</span>
              </Button>
            }
          />
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Workspace Navigation</SheetTitle>
            </SheetHeader>
            <SidebarContent onNavClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <CurrentIcon className="size-3.5 text-primary" />
          <span>{currentItem.label}</span>
        </div>
      </div>
    </div>
  );
}
