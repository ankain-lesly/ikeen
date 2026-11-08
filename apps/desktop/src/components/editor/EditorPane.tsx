import { useState, useEffect, useRef, useCallback } from "react";
import type { Note, Folder } from "@repo/types";
import { formatDate } from "@repo/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { MarkdownPreview } from "./MarkdownPreview";
import {
  Pin,
  Archive,
  Trash2,
  MoreVertical,
  FileEdit,
  Eye,
  Plus,
  Folder as FolderIcon,
  ChevronDown,
} from "lucide-react";

interface EditorPaneProps {
  note: Note | undefined;
  folders?: Folder[];
  onUpdateNote: (updated: Partial<Note>) => void;
  onTogglePin: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onNewNote: () => void;
  titleRef?: React.RefObject<HTMLInputElement | null>;
  contentRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function EditorPane({
  note,
  folders,
  onUpdateNote,
  onTogglePin,
  onArchiveNote,
  onDeleteNote,
  onNewNote,
  titleRef: externalTitleRef,
  contentRef: externalContentRef,
}: EditorPaneProps) {
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [newTagInput, setNewTagInput] = useState<string>("");
  const currentFolder = note ? folders?.find((f) => f.id === note.folderId) : undefined;

  // In-memory staged editing to avoid per-keystroke SQLite disk writes
  const [localTitle, setLocalTitle] = useState(note?.title ?? "");
  const [localContent, setLocalContent] = useState(note?.content ?? "");
  const lastSavedRef = useRef<{ title: string; content: string }>({
    title: note?.title ?? "",
    content: note?.content ?? "",
  });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const internalTitleRef = useRef<HTMLInputElement>(null);
  const internalContentRef = useRef<HTMLTextAreaElement>(null);

  const titleInputRef = externalTitleRef || internalTitleRef;
  const contentInputRef = externalContentRef || internalContentRef;

  // Sync state whenever note selection switches
  useEffect(() => {
    if (note) {
      setLocalTitle(note.title);
      setLocalContent(note.content);
      lastSavedRef.current = { title: note.title, content: note.content };
    }
  }, [note?.id]);

  const commitChanges = useCallback(
    (overrides?: { title?: string; content?: string }) => {
      if (!note) return;
      const currentTitle = overrides?.title !== undefined ? overrides.title : localTitle;
      const currentContent = overrides?.content !== undefined ? overrides.content : localContent;

      if (
        currentTitle !== lastSavedRef.current.title ||
        currentContent !== lastSavedRef.current.content
      ) {
        lastSavedRef.current = { title: currentTitle, content: currentContent };
        onUpdateNote({
          title: currentTitle,
          content: currentContent,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [note, localTitle, localContent, onUpdateNote]
  );

  const scheduleDebounce = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      commitChanges();
    }, 400);
  }, [commitChanges]);

  // Clean up debounce on unmount and commit
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        commitChanges();
      }
    };
  }, [commitChanges]);

  if (!note) {
    return (
      <main className="h-full w-full bg-background flex flex-col items-center justify-center text-center p-8 select-none">
        <div className="max-w-sm space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted/40 border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <FileEdit className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">No Note Selected</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Select an existing note from the list or press <kbd className="font-mono text-[10px] bg-muted px-1 py-0.5 rounded border border-border">⌘N</kbd> to create a fresh one.
            </p>
          </div>
          <Button
            onClick={onNewNote}
            className="bg-[#39ff14] text-black font-medium text-xs hover:bg-[#32e012]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Note
          </Button>
        </div>
      </main>
    );
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTagInput.trim()) {
      e.preventDefault();
      const cleanTag = newTagInput.trim().replace(/^#/, "");
      if (!note.tags.includes(cleanTag)) {
        onUpdateNote({ tags: [...note.tags, cleanTag] });
      }
      setNewTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateNote({ tags: note.tags.filter((t) => t !== tagToRemove) });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      contentInputRef.current?.focus();
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;

    // ⌘S or Ctrl+S -> Immediate commit & flush
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      commitChanges();
      return;
    }

    // ⌘B or Ctrl+B -> Bold markdown wrapping
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = localContent.substring(start, end);
      const replacement = `**${selected}**`;
      const updated = localContent.substring(0, start) + replacement + localContent.substring(end);
      setLocalContent(updated);
      scheduleDebounce();
      setTimeout(() => {
        if (start === end) {
          textarea.setSelectionRange(start + 2, start + 2);
        } else {
          textarea.setSelectionRange(start, start + replacement.length);
        }
      }, 0);
      return;
    }

    // ⌘I or Ctrl+I -> Italic markdown wrapping
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = localContent.substring(start, end);
      const replacement = `*${selected}*`;
      const updated = localContent.substring(0, start) + replacement + localContent.substring(end);
      setLocalContent(updated);
      scheduleDebounce();
      setTimeout(() => {
        if (start === end) {
          textarea.setSelectionRange(start + 1, start + 1);
        } else {
          textarea.setSelectionRange(start, start + replacement.length);
        }
      }, 0);
      return;
    }

    // Tab -> 2-space indentation; Shift+Tab -> Outdent
    if (e.key === "Tab") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      if (e.shiftKey) {
        // Outdent line
        const beforeCursor = localContent.substring(0, start);
        const lineStart = beforeCursor.lastIndexOf("\n") + 1;
        const line = localContent.substring(lineStart, end);
        if (line.startsWith("  ")) {
          const updated = localContent.substring(0, lineStart) + line.substring(2) + localContent.substring(end);
          setLocalContent(updated);
          scheduleDebounce();
          setTimeout(() => {
            textarea.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
          }, 0);
        }
      } else {
        // Indent 2 spaces
        const updated = localContent.substring(0, start) + "  " + localContent.substring(end);
        setLocalContent(updated);
        scheduleDebounce();
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
      return;
    }
  };

  return (
    <main className="h-full w-full bg-background flex flex-col overflow-hidden">
      {/* Distraction-Free Header: Scope-Dedicated Toolbar */}
      <header className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 select-none">
        {/* Left: Mode Switcher (Edit / Preview) */}
        <div className="flex items-center gap-3">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-auto"
          >
            <TabsList className="h-8 bg-muted/40 p-0.5 border border-border/60">
              <TabsTrigger
                value="edit"
                className="text-xs h-7 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <FileEdit className="w-3.5 h-3.5 mr-1.5" />
                Edit
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="text-xs h-7 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Folder Selector Dropdown */}
          {folders && folders.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-normal gap-1.5 text-muted-foreground hover:text-foreground border border-border/50 bg-muted/20"
                  >
                    <FolderIcon
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: currentFolder?.color || "#94a3b8" }}
                    />
                    <span className="truncate max-w-[120px]">
                      {currentFolder ? currentFolder.name : "Unfiled"}
                    </span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start" className="w-48 text-xs">
                <DropdownMenuItem
                  onClick={() => onUpdateNote({ folderId: null })}
                  className="gap-2 text-xs"
                >
                  <FolderIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Unfiled</span>
                  {!note.folderId && <span className="ml-auto text-[#39ff14]">✓</span>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {folders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => onUpdateNote({ folderId: f.id })}
                    className="gap-2 text-xs"
                  >
                    <FolderIcon
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: f.color || "#3b82f6" }}
                    />
                    <span className="truncate flex-1">{f.name}</span>
                    {note.folderId === f.id && <span className="ml-auto text-[#39ff14]">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <span className="text-[11px] font-mono text-muted-foreground/60 hidden sm:inline">
            Edited {formatDate(note.updatedAt)}
          </span>
        </div>

        {/* Right: Functional Action Icons */}
        <div className="flex items-center gap-1">
          {/* Pin Toggle */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onTogglePin(note.id)}
                  className={`transition-colors ${
                    note.isPinned
                      ? "text-[#39ff14] bg-[#39ff14]/10 hover:bg-[#39ff14]/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                </Button>
              }
            />
            <TooltipContent side="bottom" className="text-xs">
              {note.isPinned ? "Unpin Note (⌘P)" : "Pin to Top (⌘P)"}
            </TooltipContent>
          </Tooltip>

          {/* Archive Toggle */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onArchiveNote(note.id)}
                  className={`transition-colors ${
                    note.isArchived
                      ? "text-orange-400 bg-orange-400/10 hover:bg-orange-400/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              }
            />
            <TooltipContent side="bottom" className="text-xs">
              {note.isArchived ? "Unarchive Note (⌘E)" : "Archive Note (⌘E)"}
            </TooltipContent>
          </Tooltip>

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-40 text-xs">
              <DropdownMenuItem onClick={onNewNote}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                <span>New Note</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTogglePin(note.id)}>
                <Pin className="mr-2 h-3.5 w-3.5" />
                <span>{note.isPinned ? "Unpin" : "Pin to top"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchiveNote(note.id)}>
                <Archive className="mr-2 h-3.5 w-3.5" />
                <span>{note.isArchived ? "Unarchive" : "Archive"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteNote(note.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Editor Content Area */}
      <ScrollArea className="flex-1">
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          {activeTab === "edit" ? (
            <div className="space-y-4">
              {/* Clean Title Input with local staging */}
              <Input
                ref={titleInputRef}
                value={localTitle}
                onChange={(e) => {
                  setLocalTitle(e.target.value);
                  scheduleDebounce();
                }}
                onKeyDown={handleTitleKeyDown}
                onBlur={() => commitChanges()}
                placeholder="Note Title..."
                className="text-2xl font-bold tracking-tight h-auto p-0 border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/40 text-foreground"
              />

              {/* Clean Tags: Typography-driven, no loud badge boxes */}
              <div className="flex flex-wrap items-center gap-2 py-1 text-xs">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => handleRemoveTag(tag)}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                    title="Click to remove tag"
                  >
                    <span>#{tag}</span>
                    <span className="text-[10px] opacity-60">×</span>
                  </span>
                ))}
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="+ add tag"
                  className="text-[11px] font-mono bg-transparent border-0 outline-none text-muted-foreground placeholder:text-muted-foreground/30 w-20"
                />
              </div>

              <Separator />

              {/* Clean Markdown/Text Body with local staging */}
              <Textarea
                ref={contentInputRef}
                value={localContent}
                onChange={(e) => {
                  setLocalContent(e.target.value);
                  scheduleDebounce();
                }}
                onKeyDown={handleTextareaKeyDown}
                onBlur={() => commitChanges()}
                placeholder="Write in markdown or plain text..."
                className="min-h-[460px] text-xs leading-relaxed border-0 bg-transparent p-0 focus-visible:ring-0 resize-none font-mono text-foreground placeholder:text-muted-foreground/30"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold tracking-tight text-foreground border-b border-border pb-2">
                {localTitle || "Untitled Note"}
              </h1>
              <MarkdownPreview content={localContent} />
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
