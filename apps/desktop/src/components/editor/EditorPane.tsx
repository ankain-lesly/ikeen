import { useState, useEffect, useRef, useCallback } from "react";
import type { Note } from "@repo/types";
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
} from "lucide-react";

interface EditorPaneProps {
  note: Note | undefined;
  onUpdateNote: (updated: Partial<Note>) => void;
  onTogglePin: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onNewNote: () => void;
}

export function EditorPane({
  note,
  onUpdateNote,
  onTogglePin,
  onArchiveNote,
  onDeleteNote,
  onNewNote,
}: EditorPaneProps) {
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [newTagInput, setNewTagInput] = useState<string>("");

  // In-memory staged editing to avoid per-keystroke SQLite disk writes
  const [localTitle, setLocalTitle] = useState(note?.title ?? "");
  const [localContent, setLocalContent] = useState(note?.content ?? "");
  const lastSavedRef = useRef<{ title: string; content: string }>({
    title: note?.title ?? "",
    content: note?.content ?? "",
  });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
              Select an existing note from the list or create a fresh one.
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

  return (
    <main className="h-full w-full bg-background flex flex-col overflow-hidden">
      {/* Top Action Bar: Clean, distraction-free */}
      <header className="h-14 px-4 lg:px-6 border-b border-border flex items-center justify-between shrink-0 select-none bg-card/10 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="default" className="h-8 p-1 shrink-0">
              <TabsTrigger value="edit" className="gap-1.5 text-xs">
                <FileEdit className="h-3.5 w-3.5" />
                <span>Edit</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5 text-xs">
                <Eye className="h-3.5 w-3.5" />
                <span>Preview</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <span className="text-[11px] text-muted-foreground font-mono truncate hidden sm:inline-block">
            Saved {formatDate(new Date(note.updatedAt))}
          </span>
        </div>

        {/* Right Action Tools: Focused, minimal */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Tooltip>
            <TooltipTrigger render={
              <Button
                variant={note.isPinned ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => onTogglePin(note.id)}
                className={note.isPinned ? "text-[#39ff14]" : "text-muted-foreground"}
              >
                <Pin className="h-3.5 w-3.5" />
              </Button>
            } />
            <TooltipContent side="bottom">
              <p className="text-xs">{note.isPinned ? "Unpin note" : "Pin note"}</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            } />
            <DropdownMenuContent align="end" className="w-40">
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
                value={localTitle}
                onChange={(e) => {
                  setLocalTitle(e.target.value);
                  scheduleDebounce();
                }}
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
                value={localContent}
                onChange={(e) => {
                  setLocalContent(e.target.value);
                  scheduleDebounce();
                }}
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
