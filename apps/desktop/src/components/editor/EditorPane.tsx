import { useState } from "react";
import type { Note } from "@repo/types";
import { formatDate } from "@repo/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { DiagnosticCard } from "./DiagnosticCard";
import { MarkdownPreview } from "./MarkdownPreview";
import {
  Pin,
  Archive,
  Trash2,
  MoreVertical,
  CheckCircle2,
  FileEdit,
  Eye,
  Activity,
  Plus,
} from "lucide-react";

interface EditorPaneProps {
  note: Note | undefined;
  onUpdateNote: (updated: Partial<Note>) => void;
  onTogglePin: (noteId: string) => void;
  onArchiveNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onNewNote: () => void;
  rustGreeting: string;
  ipcConnected: boolean;
}

export function EditorPane({
  note,
  onUpdateNote,
  onTogglePin,
  onArchiveNote,
  onDeleteNote,
  onNewNote,
  rustGreeting,
  ipcConnected,
}: EditorPaneProps) {
  const [activeTab, setActiveTab] = useState<string>("edit");
  const [newTagInput, setNewTagInput] = useState<string>("");

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
      {/* Top Action Bar */}
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
              <TabsTrigger value="diagnostic" className="gap-1.5 text-xs">
                <Activity className="h-3.5 w-3.5 text-[#39ff14]" />
                <span>System</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <span className="text-[11px] text-muted-foreground font-mono truncate hidden sm:inline-block">
            Saved {formatDate(new Date(note.updatedAt))}
          </span>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/40 border border-border text-[11px]">
            <CheckCircle2
              className={`w-3.5 h-3.5 ${
                ipcConnected ? "text-[#39ff14]" : "text-amber-400"
              }`}
            />
            <span className="text-[10px] font-mono text-muted-foreground">
              {ipcConnected ? "Local Sync" : "Tauri Core"}
            </span>
          </div>

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
              <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
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
        <div className="p-8 max-w-4xl mx-auto space-y-6">
          {activeTab === "edit" && (
            <div className="space-y-4">
              {/* Title input */}
              <Input
                value={note.title}
                onChange={(e) =>
                  onUpdateNote({
                    title: e.target.value,
                    updatedAt: new Date().toISOString(),
                  })
                }
                placeholder="Note Title..."
                className="text-2xl font-bold tracking-tight h-auto p-0 border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50 text-foreground"
              />

              {/* Tags list */}
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {note.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 text-[10px] pl-2 pr-1 py-0.5 bg-muted border-border font-mono cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
                    onClick={() => handleRemoveTag(tag)}
                    title="Click to remove tag"
                  >
                    <span>#{tag}</span>
                    <span className="text-muted-foreground hover:text-destructive">×</span>
                  </Badge>
                ))}
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="+ Add tag..."
                  className="text-[10px] font-mono bg-transparent border-0 outline-none text-muted-foreground placeholder:text-muted-foreground/40 w-20"
                />
              </div>

              <Separator />

              {/* Body textarea */}
              <Textarea
                value={note.content}
                onChange={(e) =>
                  onUpdateNote({
                    content: e.target.value,
                    updatedAt: new Date().toISOString(),
                  })
                }
                placeholder="Write in markdown or plain text..."
                className="min-h-[440px] text-xs leading-relaxed border-0 bg-transparent p-0 focus-visible:ring-0 resize-none font-mono text-foreground placeholder:text-muted-foreground/40"
              />
            </div>
          )}

          {activeTab === "preview" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-bold tracking-tight text-foreground border-b border-border pb-2">
                {note.title || "Untitled Note"}
              </h1>
              <MarkdownPreview content={note.content} />
            </div>
          )}

          {activeTab === "diagnostic" && (
            <div className="space-y-6">
              <DiagnosticCard
                rustGreeting={rustGreeting}
                ipcConnected={ipcConnected}
              />
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
