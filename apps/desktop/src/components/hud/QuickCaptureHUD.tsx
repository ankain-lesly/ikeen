import { useState, useEffect, useRef } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { Folder } from "@repo/types";
import { initDatabase } from "@/db/client";
import { createNote } from "@/lib/queries/notes";
import { listFolders } from "@/lib/queries/folders";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Zap,
  Folder as FolderIcon,
  X,
  ExternalLink,
  Check,
  Sparkles,
} from "lucide-react";

export function QuickCaptureHUD() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // 1. Initialize SQLite & Load Folders on Mount
  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        const loadedFolders = await listFolders();
        setFolders(loadedFolders);
      } catch (err: unknown) {
        console.error("[QuickCaptureHUD:SetupError]", err);
      }
    }
    void setup();
  }, []);

  // 2. Auto-focus Title input on mount and on window focus
  useEffect(() => {
    titleInputRef.current?.focus();

    const appWindow = getCurrentWebviewWindow();
    const unlisten = appWindow.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        titleInputRef.current?.focus();
      }
    });

    return () => {
      unlisten.then((f) => f()).catch(() => {});
    };
  }, []);

  // 3. Dismiss on Escape Key, Save on Cmd+Enter / Ctrl+Enter
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleSave();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [title, content, selectedFolderId, isPinned, tagsInput]);

  function handleStartDrag(e: React.MouseEvent) {
    if (e.button === 0 && !(e.target as HTMLElement).closest("button, input, textarea, [role='menuitem'], [data-slot='dropdown-menu-trigger']")) {
      try {
        getCurrentWebviewWindow().startDragging().catch(() => {});
      } catch {
        // Ignored
      }
    }
  }

  function handleClose() {
    setTitle("");
    setContent("");
    setTagsInput("");
    setIsPinned(false);
    setSelectedFolderId(null);
    try {
      invoke("hide_quick_capture").catch(() => {
        getCurrentWebviewWindow().hide().catch(() => {});
      });
    } catch {
      try {
        getCurrentWebviewWindow().hide().catch(() => {});
      } catch {
        // Ignored in browser preview
      }
    }
  }

  async function handleSave() {
    if (isSaving) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    // Prevent saving completely empty notes
    if (!trimmedTitle && !trimmedContent) {
      handleClose();
      return;
    }

    setIsSaving(true);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const note = await createNote({
        title: trimmedTitle || "Quick Note",
        content: trimmedContent,
        folderId: selectedFolderId ?? undefined,
        isPinned,
        tags: parsedTags,
      });

      if (note) {
        // Broadcast to main window to reload note list
        await emit("note:created", note).catch(() => {});
      }

      handleClose();
    } catch (err: unknown) {
      console.error("[QuickCaptureHUD:SaveError]", err);
    } finally {
      setIsSaving(false);
    }
  }

  function handleOpenMainWindow() {
    setTitle("");
    setContent("");
    setTagsInput("");
    setIsPinned(false);
    setSelectedFolderId(null);
    try {
      invoke("open_main_app").catch(() => {
        invoke("show_main_window").catch(() => {});
        handleClose();
      });
    } catch {
      handleClose();
    }
  }

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  return (
    <div className="w-screen h-screen flex items-center justify-center p-3 select-none bg-transparent">
      <div className="w-full h-full flex flex-col justify-between bg-card text-card-foreground border border-border/80 shadow-2xl rounded-2xl p-4 overflow-hidden backdrop-blur-2xl transition-all">
        {/* Header / Drag Bar */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          className="flex items-center justify-between pb-2 border-b border-border/40 cursor-grab active:cursor-grabbing select-none"
        >
          <div
            className="flex items-center gap-2"
            data-tauri-drag-region
            onMouseDown={handleStartDrag}
          >
            <div className="w-5 h-5 rounded-md bg-[#39ff14]/20 border border-[#39ff14]/30 flex items-center justify-center text-[#39ff14]">
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="text-xs font-semibold text-foreground tracking-tight">
              iKeen Quick Capture
            </span>

            {/* Folder Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-1.5 h-6 px-2 text-[11px] rounded-md border border-border/50 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer"
              >
                <FolderIcon
                  className="w-3 h-3"
                  style={{ color: selectedFolder?.color || "#94a3b8" }}
                />
                <span className="max-w-[120px] truncate">
                  {selectedFolder ? selectedFolder.name : "Unorganized"}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 text-xs">
                <DropdownMenuItem
                  onClick={() => setSelectedFolderId(null)}
                  className="flex items-center justify-between"
                >
                  <span className="text-muted-foreground">Unorganized</span>
                  {selectedFolderId === null && <Check className="w-3 h-3 text-[#39ff14]" />}
                </DropdownMenuItem>
                {folders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => setSelectedFolderId(f.id)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: f.color }}
                      />
                      <span className="truncate">{f.name}</span>
                    </div>
                    {selectedFolderId === f.id && (
                      <Check className="w-3 h-3 text-[#39ff14] shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Pin Toggle */}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setIsPinned(!isPinned)}
              className={`h-6 w-6 rounded-md transition-colors ${
                isPinned ? "text-[#39ff14] bg-[#39ff14]/10" : "text-muted-foreground hover:text-foreground"
              }`}
              title={isPinned ? "Pinned note" : "Pin note"}
            >
              <Zap className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleOpenMainWindow}
              className="text-muted-foreground hover:text-foreground h-6 w-6"
              title="Open full application"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground h-6 w-6"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Input Canvas */}
        <div className="flex-1 flex flex-col py-2.5 overflow-hidden">
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full text-sm font-semibold placeholder:text-muted-foreground/40 bg-transparent border-0 outline-none p-0 text-foreground"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Capture an idea, todo, or draft in markdown..."
            className="w-full flex-1 text-xs text-foreground placeholder:text-muted-foreground/30 bg-transparent border-0 outline-none p-0 resize-none mt-2 font-mono leading-relaxed"
          />
        </div>

        {/* Bottom Bar: Tags & Shortcut Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
          <div className="flex items-center gap-2 flex-1 mr-2">
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (comma separated)..."
              className="text-[11px] text-muted-foreground placeholder:text-muted-foreground/40 bg-transparent border-0 outline-none w-44 truncate"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground mr-1">
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd>
              <span className="ml-0.5">Save</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground mr-2">
              <Kbd>Esc</Kbd>
              <span className="ml-0.5">Cancel</span>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="h-7 px-3 text-xs bg-[#39ff14] text-black hover:bg-[#32e012] font-semibold"
            >
              {isSaving ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
