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
  FileText,
  Folder as FolderIcon,
  Sparkles,
  Terminal,
  Settings,
  Plus,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

// 1. Sidebar Trigger button (placed in headers or navigation rails)
export function AppSidebarTrigger({ className }: { className?: string }) {
  const { toggleSidebar, isOpen } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger render={
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
      } />
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
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onNewNote: () => void;
  onOpenSettings: () => void;
}

// 3. Self-contained Sticky Desktop Sidebar
export function AppSidebar({
  folders,
  totalNotesCount,
  activeFilter,
  onFilterChange,
  onNewNote,
  onOpenSettings,
}: AppSidebarProps) {
  const { isOpen, toggleSidebar, closeSidebar } = useSidebar();

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
        "h-full bg-card border-r border-border shrink-0 transition-all duration-200 select-none overflow-hidden flex flex-col justify-between",
        isOpen ? "w-60 min-w-[240px]" : "w-0 border-r-0"
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
            <TooltipTrigger render={
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={closeSidebar}
                className="text-muted-foreground hover:text-foreground"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </Button>
            } />
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
            variant={activeFilter === "ai" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("ai")}
            className="w-full justify-start gap-2.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">AI Memories</span>
          </Button>

          <Button
            variant={activeFilter === "mcp" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange("mcp")}
            className="w-full justify-start gap-2.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">MCP Tools</span>
          </Button>
        </nav>

        <Separator className="my-3 mx-2 w-auto shrink-0" />

        {/* Folders List */}
        <div className="px-3 pb-4">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground font-semibold">
              Folders
            </span>
          </div>
          <div className="space-y-0.5">
            {folders.map((folder) => {
              const isSelected = activeFilter === `folder:${folder.id}`;
              return (
                <Button
                  key={folder.id}
                  variant={isSelected ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onFilterChange(`folder:${folder.id}`)}
                  className="w-full justify-start gap-2 text-xs font-normal text-muted-foreground hover:text-foreground"
                >
                  <FolderIcon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: folder.color || "#3b82f6" }}
                  />
                  <span className="truncate">{folder.name}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer: Quiet, settings-only */}
      <div className="p-3 border-t border-border bg-background/50 flex items-center justify-end text-xs shrink-0 w-60">
        <Tooltip>
          <TooltipTrigger render={
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onOpenSettings}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          } />
          <TooltipContent side="top">
            <p className="text-xs">Preferences (⌘,)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
