import * as React from "react";
import type { Folder } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Folder as FolderIcon,
  Zap,
  StickyNote,
  Bell,
  Archive,
  Settings,
  Plus,
  PanelLeft,
  PanelLeftClose,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuthStore } from "@/stores/use-auth-store";
import { cn } from "@/lib/utils";

// 1. Sidebar Trigger button (placed in headers or navigation rails)
export function AppSidebarTrigger({ className }: { className?: string }) {
  const { toggleSidebar, isOpen } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleSidebar}
            className={cn(
              "text-muted-foreground hover:text-foreground shrink-0 transition-colors",
              isOpen && "text-[#39ff14]",
              className
            )}
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        }
      />
      <TooltipContent side="bottom">
        <p className="text-xs">{isOpen ? "Collapse Sidebar (⌘\\)" : "Expand Sidebar (⌘\\)"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// 2. Sidebar Props: Clean, focused
export interface AppSidebarProps {
  folders: Folder[];
  totalNotesCount: number;
  pinnedNotesCount?: number;
  archivedNotesCount?: number;
  remindersCount?: number;
  folderNotesCountMap?: Record<string, number>;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onNewNote: () => void;
  onNewFolder: () => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
  onOpenSettings: () => void;
  onOpenAuth?: () => void;
}

// 3. Self-contained Sticky Desktop Sidebar
export function AppSidebar({
  folders,
  totalNotesCount,
  pinnedNotesCount = 0,
  archivedNotesCount = 0,
  remindersCount = 0,
  folderNotesCountMap = {},
  activeFilter,
  onFilterChange,
  onNewNote,
  onNewFolder,
  onEditFolder,
  onDeleteFolder,
  onOpenSettings,
  onOpenAuth,
}: AppSidebarProps) {
  const { isOpen, toggleSidebar, closeSidebar } = useSidebar();
  const { user, isAuthenticated } = useAuthStore();

  // Keyboard shortcut listener: ⌘\ or ⌘B
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "\\" || e.key.toLowerCase() === "b")) {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <aside
      className={cn(
        "h-full bg-card border-r border-border shrink-0 transition-[width] duration-200 select-none overflow-hidden flex flex-col justify-between",
        isOpen ? "w-60 min-w-[240px]" : "w-0 min-w-0 border-r-0 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex flex-col min-h-0 w-60 overflow-y-auto">
        {/* Header: Clean branding without version clutter */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14]" />
            <span className="font-semibold text-xs tracking-wider uppercase font-mono text-foreground">
              iKeen
            </span>
          </div>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={closeSidebar}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </Button>
              }
            />
            <TooltipContent side="right">
              <p className="text-xs">Collapse Sidebar (⌘\)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* New Note Action */}
        <div className="p-3 shrink-0">
          <Button
            onClick={onNewNote}
            className="w-full justify-start gap-2 bg-[#39ff14] text-black font-semibold text-xs hover:bg-[#32e012] transition-colors"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">New Note</span>
            <Kbd className="ml-auto bg-black/20 text-black border-transparent text-[10px] shrink-0 font-mono">
              ⌘N
            </Kbd>
          </Button>
        </div>

        {/* Navigation Categories */}
        <nav className="px-2 space-y-1 shrink-0">
          <Button
            variant={activeFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("all")}
            className="w-full justify-start gap-2.5 text-xs font-normal"
          >
            <FileText className="w-3.5 h-3.5 text-[#39ff14] shrink-0" />
            <span className="truncate">All Notes</span>
            <span className="ml-auto text-[11px] font-mono text-muted-foreground shrink-0">
              {totalNotesCount}
            </span>
          </Button>

          <Button
            variant={activeFilter === "pinned" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("pinned")}
            className="w-full justify-start gap-2.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            <Zap className="w-3.5 h-3.5 text-[#39ff14] shrink-0" />
            <span className="truncate">Pinned</span>
            {pinnedNotesCount > 0 && (
              <span className="ml-auto text-[11px] font-mono text-muted-foreground shrink-0">
                {pinnedNotesCount}
              </span>
            )}
          </Button>

          <Button
            variant={activeFilter === "scratchpad" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("scratchpad")}
            className="w-full justify-start gap-2.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            <StickyNote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Scratchpad</span>
          </Button>

          <Button
            variant={activeFilter === "reminders" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("reminders")}
            className="w-full justify-start gap-2.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Reminders</span>
            {remindersCount > 0 && (
              <span className="ml-auto text-[11px] font-mono text-muted-foreground shrink-0">
                {remindersCount}
              </span>
            )}
          </Button>

          <Button
            variant={activeFilter === "archived" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("archived")}
            className="w-full justify-start gap-2.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            <Archive className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="truncate">Archived</span>
            {archivedNotesCount > 0 && (
              <span className="ml-auto text-[11px] font-mono text-muted-foreground shrink-0">
                {archivedNotesCount}
              </span>
            )}
          </Button>
        </nav>

        <Separator className="my-3 mx-2 w-auto shrink-0" />

        {/* Folders List with Management */}
        <div className="px-3 pb-4 flex-1">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground font-semibold">
              Folders ({folders.length})
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onNewFolder}
                    className="h-5 w-5 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                }
              />
              <TooltipContent side="right">
                <p className="text-xs">New Folder</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-0.5">
            {folders.length === 0 ? (
              <div className="px-2 py-3 text-center rounded border border-dashed border-border/60">
                <p className="text-[11px] text-muted-foreground">No folders yet</p>
                <button
                  type="button"
                  onClick={onNewFolder}
                  className="text-[11px] text-[#39ff14] hover:underline mt-1 inline-block"
                >
                  Create your first folder
                </button>
              </div>
            ) : (
              folders.map((folder) => {
                const isSelected = activeFilter === `folder:${folder.id}`;
                const noteCount = folderNotesCountMap[folder.id] ?? 0;

                return (
                  <div
                    key={folder.id}
                    className={cn(
                      "group flex items-center justify-between rounded-md transition-colors pr-1",
                      isSelected
                        ? "bg-secondary text-foreground"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onFilterChange(`folder:${folder.id}`)}
                      className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs font-normal truncate text-left"
                    >
                      <FolderIcon
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: folder.color || "#3b82f6" }}
                      />
                      <span className="truncate">{folder.name}</span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {noteCount > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground px-1">
                          {noteCount}
                        </span>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-36 text-xs">
                          <DropdownMenuItem
                            onClick={() => onEditFolder(folder)}
                            className="gap-2 text-xs"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit Folder
                          </DropdownMenuItem>
                          {onDeleteFolder && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDeleteFolder(folder)}
                                className="gap-2 text-xs text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer: Account profile & settings */}
      <div className="p-2.5 border-t border-border bg-background/50 flex items-center justify-between text-xs shrink-0 w-60">
        {onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-w-0 px-1 py-1 rounded hover:bg-muted/40 cursor-pointer"
            title={isAuthenticated && user ? `Signed in as ${user.email}` : "Sign In to sync"}
          >
            <div className="h-6 w-6 rounded-full bg-muted/60 border border-border/80 flex items-center justify-center text-[10px] font-semibold text-foreground shrink-0">
              {isAuthenticated && user ? (
                user.firstName ? user.firstName[0].toUpperCase() : user.email[0].toUpperCase()
              ) : (
                <User className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <span className="text-[11px] truncate max-w-[130px]">
              {isAuthenticated && user
                ? user.firstName || user.email.split("@")[0]
                : "Sign In"}
            </span>
          </button>
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onOpenSettings}
                className="text-muted-foreground hover:text-foreground shrink-0 ml-auto"
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <TooltipContent side="top">
            <p className="text-xs">Preferences (⌘,)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
