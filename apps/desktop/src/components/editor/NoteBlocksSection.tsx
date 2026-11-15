import { useState } from "react";
import type { NoteBlock, ListItem, MediaItem } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownPreview } from "./MarkdownPreview";
import { getMediaDisplayUri } from "@/lib/media/file-system";
import { retryMediaUpload, cancelMediaUpload } from "@/lib/media/upload-service";
import { useMediaUploadProgress } from "@/lib/media/use-media-upload-store";
import { CheckSquare, Image as ImageIcon, Loader2, Plus, X } from "lucide-react";

interface MediaThumbProps {
  item: MediaItem;
  readOnly: boolean;
  onRemove: () => void;
}

function MediaThumb({ item, readOnly, onRemove }: MediaThumbProps) {
  const uploadState = useMediaUploadProgress(item.id);
  const displayUri = getMediaDisplayUri(item);
  const isUploading = uploadState?.status === "uploading";
  const isFailed = uploadState?.status === "failed";

  return (
    <div className="relative group/img rounded border border-border/60 overflow-hidden bg-black/40">
      {!readOnly && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 z-10 opacity-0 group-hover/img:opacity-100 bg-black/70 rounded p-1 text-white hover:text-red-400 transition-opacity"
          title="Remove media"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {displayUri ? (
        <img
          src={displayUri}
          alt={item.name || "Attachment"}
          className={`w-full ${readOnly ? "h-32" : "h-28"} object-cover`}
        />
      ) : (
        <div
          className={`w-full ${
            readOnly ? "h-32" : "h-28"
          } flex items-center justify-center bg-muted/20 text-muted-foreground`}
        >
          <ImageIcon className="h-6 w-6" />
        </div>
      )}

      {isUploading && (uploadState?.progress || 0) > 0 && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 p-2">
          <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
          <span className="text-[10px] text-sky-300 font-mono">
            {Math.round((uploadState?.progress || 0) * 100)}%
          </span>
        </div>
      )}

      {!readOnly && isFailed && (
        <div className="absolute bottom-6 left-1 right-1 bg-red-950/80 border border-red-500/40 rounded px-1.5 py-0.5 flex items-center justify-between text-[10px] text-red-300">
          <span className="truncate">Upload failed</span>
          <button
            type="button"
            onClick={() => void retryMediaUpload(item.id)}
            className="text-red-200 underline ml-1 hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      <div className="p-1 text-[10px] font-mono text-muted-foreground truncate bg-card/80 flex items-center justify-between">
        <span className="truncate">{item.name || "Media"}</span>
        {item.url && !isUploading && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 ml-1"
            title="Synced to cloud"
          />
        )}
      </div>
    </div>
  );
}

interface NoteBlocksSectionProps {
  blocks: NoteBlock[];
  readOnly?: boolean;
  onUpdateBlocks: (nextBlocks: NoteBlock[], immediate?: boolean) => void;
  onTriggerMediaUpload?: () => void;
}

export function NoteBlocksSection({
  blocks,
  readOnly = false,
  onUpdateBlocks,
  onTriggerMediaUpload,
}: NoteBlocksSectionProps) {
  const [pendingFocusItemId, setPendingFocusItemId] = useState<string | null>(null);

  if (blocks.length === 0) return null;

  const removeBlock = (blockId: string) => {
    onUpdateBlocks(blocks.filter((b) => b.id !== blockId), true);
  };

  const toggleChecklistItem = (blockId: string, itemId: string) => {
    onUpdateBlocks(
      blocks.map((b) =>
        b.id === blockId && b.type === "list"
          ? {
              ...b,
              content: b.content.map((it) =>
                it.id === itemId ? { ...it, checked: !it.checked } : it
              ),
            }
          : b
      ),
      true
    );
  };

  const updateChecklistItem = (blockId: string, itemId: string, content: string) => {
    onUpdateBlocks(
      blocks.map((b) =>
        b.id === blockId && b.type === "list"
          ? {
              ...b,
              content: b.content.map((it) => (it.id === itemId ? { ...it, content } : it)),
            }
          : b
      ),
      false
    );
  };

  const addChecklistItem = (blockId: string, afterItemId?: string) => {
    const newItem: ListItem = { id: crypto.randomUUID(), content: "", checked: false };
    onUpdateBlocks(
      blocks.map((b) => {
        if (b.id !== blockId || b.type !== "list") return b;
        const idx = afterItemId ? b.content.findIndex((it) => it.id === afterItemId) : -1;
        if (idx === -1) return { ...b, content: [...b.content, newItem] };
        const next = [...b.content];
        next.splice(idx + 1, 0, newItem);
        return { ...b, content: next };
      }),
      true
    );
    setPendingFocusItemId(newItem.id);
  };

  const removeChecklistItem = (blockId: string, itemId: string) => {
    onUpdateBlocks(
      blocks
        .map((b) => {
          if (b.id !== blockId || b.type !== "list") return b;
          const next = b.content.filter((it) => it.id !== itemId);
          return next.length > 0 ? { ...b, content: next } : null;
        })
        .filter((b): b is NoteBlock => b !== null),
      true
    );
  };

  const removeMediaItem = (blockId: string, mediaId: string) => {
    void cancelMediaUpload(mediaId);
    onUpdateBlocks(
      blocks
        .map((b) => {
          if (b.id !== blockId || b.type !== "media") return b;
          const next = b.content.filter((m) => m.id !== mediaId);
          return next.length > 0 ? { ...b, content: next } : null;
        })
        .filter((b): b is NoteBlock => b !== null),
      true
    );
  };

  return (
    <div className={readOnly ? "space-y-4 pt-4 border-t border-border/40" : "space-y-4 pt-2"}>
      {blocks.map((block) => {
        if (block.type === "list") {
          return (
            <div
              key={block.id}
              className={`relative group rounded border border-border/40 p-3 space-y-2 ${
                readOnly ? "bg-muted/5" : "bg-muted/10"
              }`}
            >
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  title="Remove checklist"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-[#39ff14]" />
                <span>{block.header || "Checklist"}</span>
              </div>
              <div className="space-y-1.5">
                {block.content.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs group/item">
                    <input
                      type="checkbox"
                      checked={Boolean(item.checked)}
                      onChange={() => toggleChecklistItem(block.id, item.id)}
                      className="h-3.5 w-3.5 rounded border-border accent-[#39ff14] cursor-pointer shrink-0"
                    />
                    {readOnly ? (
                      <span
                        className={`text-xs font-mono ${
                          item.checked ? "line-through text-muted-foreground/60" : "text-foreground"
                        }`}
                      >
                        {item.content || "Empty item"}
                      </span>
                    ) : (
                      <>
                        <input
                          ref={(el) => {
                            if (el && pendingFocusItemId === item.id) {
                              el.focus();
                              setPendingFocusItemId(null);
                            }
                          }}
                          type="text"
                          value={item.content}
                          onChange={(e) => updateChecklistItem(block.id, item.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addChecklistItem(block.id, item.id);
                            }
                          }}
                          placeholder="List item..."
                          className={`flex-1 bg-transparent border-0 p-0 text-xs font-mono focus:outline-none focus:ring-0 ${
                            item.checked
                              ? "line-through text-muted-foreground/60"
                              : "text-foreground"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => removeChecklistItem(block.id, item.id)}
                          className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-0.5 shrink-0"
                          title="Delete item"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addChecklistItem(block.id)}
                  className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 px-1.5"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add task</span>
                </Button>
              )}
            </div>
          );
        }

        if (block.type === "media") {
          return (
            <div
              key={block.id}
              className={`relative group rounded border border-border/40 p-3 space-y-2 ${
                readOnly ? "bg-muted/5" : "bg-muted/10"
              }`}
            >
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  title="Remove media"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-sky-400" />
                  <span>Media{readOnly ? ` (${block.content.length})` : ""}</span>
                </div>
                {!readOnly && onTriggerMediaUpload && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onTriggerMediaUpload}
                    className="h-5 text-[10px] text-sky-400 hover:text-sky-300 gap-1 px-1"
                  >
                    <Plus className="h-2.5 w-2.5" />
                    <span>Add Media</span>
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {block.content.map((item) => (
                  <MediaThumb
                    key={item.id}
                    item={item}
                    readOnly={readOnly}
                    onRemove={() => removeMediaItem(block.id, item.id)}
                  />
                ))}
              </div>
            </div>
          );
        }

        if (block.type === "text") {
          return (
            <div
              key={block.id}
              className={`relative group rounded border border-border/40 ${
                readOnly ? "p-3 bg-muted/5" : "p-2 bg-muted/10"
              }`}
            >
              {readOnly ? (
                <MarkdownPreview content={block.content} />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    title="Remove block"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <Textarea
                    value={block.content}
                    onChange={(e) =>
                      onUpdateBlocks(
                        blocks.map((b) =>
                          b.id === block.id && b.type === "text"
                            ? { ...b, content: e.target.value }
                            : b
                        ),
                        false
                      )
                    }
                    placeholder="Text block..."
                    className="min-h-[100px] text-xs leading-relaxed border-0 bg-transparent p-0 focus-visible:ring-0 resize-none font-mono text-foreground"
                  />
                </>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
