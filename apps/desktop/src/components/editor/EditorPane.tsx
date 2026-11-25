import { useState, useEffect, useRef, useCallback } from "react";
import type {
  Note,
  Folder,
  NoteBlock,
  TextBlock,
  ListBlock,
  MediaBlock,
  MediaItem,
  Reminder,
} from "@repo/types";
import { formatDate, isScratchpadNote, formatReminderDisplay } from "@repo/utils";
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
import { NoteBlocksSection } from "./NoteBlocksSection";
import { ReminderDialog } from "@/components/modals/ReminderDialog";
import { getReminderForNote } from "@/lib/queries/reminders";
import {
  listBlocksForNote,
  saveBlocksForNote,
  enforceSingleMediaBlockRule,
} from "@/lib/queries/note-blocks";
import { saveMediaAssetToSandbox } from "@/lib/media/file-system";
import { enqueueMediaUpload, onMediaUploaded } from "@/lib/media/upload-service";
import { onSyncComplete } from "@/lib/sync/sync-manager";
import { useNotesStore } from "@/stores/use-notes-store";
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
  Bell,
  CheckSquare,
  Image as ImageIcon,
  Type,
  RotateCcw,
} from "lucide-react";

interface EditorPaneProps {
  note: Note | undefined;
  folders?: Folder[];
  onUpdateNote: (updated: Partial<Note>, targetNoteId?: string) => Promise<void> | void;
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
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [activeReminder, setActiveReminder] = useState<Reminder | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);

  const currentFolder = note ? folders?.find((f) => f.id === note.folderId) : undefined;

  const [localTitle, setLocalTitle] = useState(note?.title ?? "");
  const [localContent, setLocalContent] = useState(note?.content ?? "");
  const lastSavedRef = useRef<{ title: string; content: string }>({
    title: note?.title ?? "",
    content: note?.content ?? "",
  });
  const pendingNotePatchRef = useRef<{ title: string; content: string } | null>(null);
  const pendingBlocksRef = useRef<{ noteId: string; blocks: NoteBlock[] } | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef<string | undefined>(note?.id);
  noteIdRef.current = note?.id;
  const onUpdateNoteRef = useRef(onUpdateNote);
  onUpdateNoteRef.current = onUpdateNote;

  const internalTitleRef = useRef<HTMLInputElement>(null);
  const internalContentRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const titleInputRef = externalTitleRef || internalTitleRef;
  const contentInputRef = externalContentRef || internalContentRef;

  const refreshNoteReminder = useCallback((noteId: string) => {
    void getReminderForNote(noteId).then((rem) => {
      setActiveReminder(rem && !rem.deletedAt ? rem : null);
    });
  }, []);

  useEffect(() => {
    if (!note) {
      setBlocks([]);
      setActiveReminder(null);
      return;
    }

    if (!pendingNotePatchRef.current) {
      setLocalTitle(note.title);
      setLocalContent(note.content);
      lastSavedRef.current = { title: note.title, content: note.content };
    }

    refreshNoteReminder(note.id);
    void listBlocksForNote(note.id).then((loaded) => {
      setBlocks(enforceSingleMediaBlockRule(loaded));
    });

    const unsubMedia = onMediaUploaded(() => {
      void listBlocksForNote(note.id).then((loaded) => {
        setBlocks(enforceSingleMediaBlockRule(loaded));
      });
    });

    const unsubSync = onSyncComplete(() => {
      if (!pendingBlocksRef.current) {
        void listBlocksForNote(note.id).then((loaded) => {
          setBlocks(enforceSingleMediaBlockRule(loaded));
        });
      }
      refreshNoteReminder(note.id);
    });

    return () => {
      unsubMedia();
      unsubSync();
    };
  }, [note?.id, note?.updatedAt, refreshNoteReminder]);

  const commitChanges = useCallback(
    (overrides?: { title?: string; content?: string }) => {
      if (!note) return;
      const currentTitle = overrides?.title !== undefined ? overrides.title : localTitle;
      const currentContent = overrides?.content !== undefined ? overrides.content : localContent;

      pendingNotePatchRef.current = null;
      if (
        currentTitle !== lastSavedRef.current.title ||
        currentContent !== lastSavedRef.current.content
      ) {
        lastSavedRef.current = { title: currentTitle, content: currentContent };
        void onUpdateNoteRef.current(
          {
            title: currentTitle,
            content: currentContent,
            updatedAt: new Date().toISOString(),
          },
          note.id
        );
      }
    },
    [note, localTitle, localContent]
  );

  const scheduleDebounce = useCallback(
    (nextTitle: string, nextContent: string) => {
      pendingNotePatchRef.current = { title: nextTitle, content: nextContent };
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        commitChanges({ title: nextTitle, content: nextContent });
      }, 400);
    },
    [commitChanges]
  );

  // Flush debounced changes on unmount (e.g. switching notes)
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (pendingNotePatchRef.current && noteIdRef.current) {
        const { title, content } = pendingNotePatchRef.current;
        pendingNotePatchRef.current = null;
        if (
          title !== lastSavedRef.current.title ||
          content !== lastSavedRef.current.content
        ) {
          lastSavedRef.current = { title, content };
          void onUpdateNoteRef.current(
            { title, content, updatedAt: new Date().toISOString() },
            noteIdRef.current
          );
        }
      }
      if (blockDebounceTimerRef.current) {
        clearTimeout(blockDebounceTimerRef.current);
        blockDebounceTimerRef.current = null;
      }
      if (pendingBlocksRef.current) {
        const { noteId, blocks: pendingBlocks } = pendingBlocksRef.current;
        pendingBlocksRef.current = null;
        void saveBlocksForNote(noteId, pendingBlocks);
      }
    };
  }, []);

  const handleUpdateBlocks = useCallback(
    async (newBlocks: NoteBlock[], immediate = true) => {
      if (!note) return;
      const validated = enforceSingleMediaBlockRule(newBlocks);
      setBlocks(validated);

      if (blockDebounceTimerRef.current) {
        clearTimeout(blockDebounceTimerRef.current);
      }

      if (immediate) {
        pendingBlocksRef.current = null;
        await saveBlocksForNote(note.id, validated);
      } else {
        pendingBlocksRef.current = { noteId: note.id, blocks: validated };
        blockDebounceTimerRef.current = setTimeout(() => {
          pendingBlocksRef.current = null;
          void saveBlocksForNote(note.id, validated);
        }, 400);
      }
    },
    [note]
  );

  const handleAddTextBlock = () => {
    if (!note) return;
    const now = new Date().toISOString();
    const newBlock: TextBlock = {
      id: crypto.randomUUID(),
      noteId: note.id,
      type: "text",
      position: blocks.length,
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    void handleUpdateBlocks([...blocks, newBlock]);
  };

  const handleAddChecklistBlock = () => {
    if (!note) return;
    const now = new Date().toISOString();
    const newBlock: ListBlock = {
      id: crypto.randomUUID(),
      noteId: note.id,
      type: "list",
      listType: "checkbox",
      position: blocks.length,
      content: [{ id: crypto.randomUUID(), content: "", checked: false }],
      createdAt: now,
      updatedAt: now,
    };
    void handleUpdateBlocks([...blocks, newBlock]);
  };

  const handleTriggerMediaUpload = () => {
    if (note) fileInputRef.current?.click();
  };

  const handleMediaFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!note || !e.target.files?.length) return;
    const selectedFiles = Array.from(e.target.files);
    // Immediately clear input so the same files or new files can be re-selected reliably
    if (fileInputRef.current) fileInputRef.current.value = "";

    const newMediaItems: MediaItem[] = [];

    for (const file of selectedFiles) {
      try {
        const mediaId = crypto.randomUUID();
        const saved = await saveMediaAssetToSandbox(file, mediaId);
        newMediaItems.push({
          id: mediaId,
          mediaType: "image",
          name: saved.name,
          localUri: saved.localUri,
          url: undefined,
          metadata: { mimeType: file.type || "image/jpeg", size: saved.size },
        });
      } catch (err) {
        console.warn("[EditorPane] Skipping media file after sandbox write failure:", err);
      }
    }

    if (newMediaItems.length === 0) return;
    const now = new Date().toISOString();
    const existingIdx = blocks.findIndex((b) => b.type === "media");
    let targetBlockId = "";
    let updatedBlocks: NoteBlock[] = [];

    if (existingIdx >= 0) {
      const existingMedia = blocks[existingIdx] as MediaBlock;
      targetBlockId = existingMedia.id;
      updatedBlocks = [...blocks];
      updatedBlocks[existingIdx] = {
        ...existingMedia,
        content: [...existingMedia.content, ...newMediaItems],
        updatedAt: now,
      };
    } else {
      targetBlockId = crypto.randomUUID();
      const newMediaBlock: MediaBlock = {
        id: targetBlockId,
        noteId: note.id,
        type: "media",
        position: blocks.length,
        content: newMediaItems,
        createdAt: now,
        updatedAt: now,
      };
      updatedBlocks = [...blocks, newMediaBlock];
    }

    // Await database write of the block first so SQLite foreign key is guaranteed
    await handleUpdateBlocks(updatedBlocks, true);

    // Enqueue media uploads for background sync (matches Mobile pattern - runs strictly on sync)
    for (const item of newMediaItems) {
      await enqueueMediaUpload({
        id: item.id,
        blockId: targetBlockId,
        localUri: item.localUri || "",
      });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && newTagInput.trim()) {
      e.preventDefault();
      const sanitized = newTagInput.trim().replace(/^#/, "");
      if (note && !note.tags.includes(sanitized)) {
        void onUpdateNote({ tags: [...note.tags, sanitized] }, note.id);
      }
      setNewTagInput("");
    }
  };

  if (!note) {
    return (
      <main className="h-full w-full bg-background flex flex-col items-center justify-center text-center p-8 select-none">
        <div className="max-w-sm space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted/40 border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <FileEdit className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">No note selected</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select an existing note from the list or press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">
                ⌘N
              </kbd>{" "}
              to create a new one.
            </p>
          </div>
          <Button
            size="sm"
            onClick={onNewNote}
            className="text-xs bg-[#39ff14] text-black hover:bg-[#32e012] font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Note
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-full w-full bg-background flex flex-col overflow-hidden min-h-0">
      <header className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
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

          {isScratchpadNote(note) && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Scratchpad
            </span>
          )}

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
                  onClick={() => void onUpdateNote({ folderId: null }, note.id)}
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
                    onClick={() => void onUpdateNote({ folderId: f.id }, note.id)}
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

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground px-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#39ff14]" />
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </Button>
                    }
                  />
                }
              />
              <TooltipContent side="bottom" className="text-xs">
                Add structured block
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={handleTriggerMediaUpload} className="gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Add Media</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddChecklistBlock} className="gap-2">
                <CheckSquare className="w-3.5 h-3.5 text-[#39ff14]" />
                <span>Add Checklist</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAddTextBlock} className="gap-2">
                <Type className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Add Text Block</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-4 mx-0.5" />

          {(() => {
            const reminderDisplay =
              activeReminder && !activeReminder.isCompleted
                ? formatReminderDisplay(
                    activeReminder.dueAt,
                    activeReminder.repeat,
                    activeReminder.repeatInterval,
                    activeReminder.maxRepeats,
                    activeReminder.repeatCount
                  )
                : null;
            return (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setIsReminderDialogOpen(true)}
                      className={`transition-colors gap-1 ${
                        reminderDisplay
                          ? "text-[#39ff14] bg-[#39ff14]/10 hover:bg-[#39ff14]/20 px-1.5"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {reminderDisplay?.isRepeating ? (
                        <RotateCcw className="w-2.5 h-2.5 text-[#39ff14]" />
                      ) : null}
                    </Button>
                  }
                />
                <TooltipContent side="bottom" className="text-xs">
                  {reminderDisplay ? reminderDisplay.text : "Set Reminder"}
                </TooltipContent>
              </Tooltip>
            );
          })()}

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
              <DropdownMenuItem onClick={() => setIsReminderDialogOpen(true)}>
                <Bell className="mr-2 h-3.5 w-3.5" />
                <span>{activeReminder ? "Edit Reminder" : "Add Reminder"}</span>
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

      <ScrollArea className="flex-1">
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          {activeTab === "edit" ? (
            <div className="space-y-4">
              <Input
                ref={titleInputRef}
                value={localTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalTitle(val);
                  scheduleDebounce(val, localContent);
                }}
                onBlur={() => commitChanges()}
                placeholder="Note Title..."
                className="text-2xl font-bold tracking-tight h-auto p-0 border-0 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/40 text-foreground"
              />

              <div className="flex flex-wrap items-center gap-2 py-1 text-xs">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() =>
                      void onUpdateNote({ tags: note.tags.filter((t) => t !== tag) }, note.id)
                    }
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

              <Textarea
                ref={contentInputRef}
                value={localContent}
                onChange={(e) => {
                  const val = e.target.value;
                  setLocalContent(val);
                  scheduleDebounce(localTitle, val);
                }}
                onBlur={() => commitChanges()}
                placeholder="Write in markdown or plain text..."
                className="min-h-[280px] text-xs leading-relaxed border-0 bg-transparent p-0 focus-visible:ring-0 resize-none font-mono text-foreground placeholder:text-muted-foreground/30"
              />

              <NoteBlocksSection
                blocks={blocks}
                readOnly={false}
                onUpdateBlocks={(next, immediate) => void handleUpdateBlocks(next, immediate)}
                onTriggerMediaUpload={handleTriggerMediaUpload}
              />

              <div className="flex items-center gap-2 pt-3 border-t border-border/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTriggerMediaUpload}
                  className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                >
                  <ImageIcon className="h-3 w-3" />
                  Add Media
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddChecklistBlock}
                  className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                >
                  <CheckSquare className="h-3 w-3" />
                  + Checklist
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTextBlock}
                  className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Type className="h-3 w-3" />
                  + Text Block
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold tracking-tight text-foreground border-b border-border pb-2">
                {localTitle || "Untitled Note"}
              </h1>
              <MarkdownPreview content={localContent} />
              <NoteBlocksSection
                blocks={blocks}
                readOnly={true}
                onUpdateBlocks={(next, immediate) => void handleUpdateBlocks(next, immediate)}
              />
            </div>
          )}
        </div>
      </ScrollArea>

      {isReminderDialogOpen && (
        <ReminderDialog
          open={isReminderDialogOpen}
          onOpenChange={setIsReminderDialogOpen}
          noteId={note.id}
          noteTitle={localTitle}
          onReminderChanged={() => {
            refreshNoteReminder(note.id);
            const store = useNotesStore.getState();
            void store.loadRemindersCount();
            if (store.activeFilter === "reminders") {
              void store.loadNotes();
            }
          }}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleMediaFilesSelected}
        className="hidden"
      />
    </main>
  );
}
