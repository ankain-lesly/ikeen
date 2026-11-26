"use client";

import * as React from "react";
import { nanoid } from "nanoid";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  CheckSquare,
  FileText,
  Image as ImageIcon,
  List,
  ListOrdered,
  Trash2,
} from "lucide-react";
import type { ListType, NoteBlock } from "@repo/types";

import {
  useDeleteBlock,
  useReorderBlocks,
  useUpsertBlock,
} from "@/lib/api/blocks.api";
import { TextBlockEditor } from "./text-block";
import { ListBlockEditor } from "./list-block";
import { MediaBlockEditor } from "./media-block";
import { Button } from "@/components/ui/button";

interface BlockCanvasProps {
  noteId: string;
  blocks: NoteBlock[];
  fallbackContent?: string;
}

export function BlockCanvas({
  noteId,
  blocks,
  fallbackContent = "",
}: BlockCanvasProps) {
  const upsertBlock = useUpsertBlock(noteId);
  const deleteBlock = useDeleteBlock(noteId);
  const reorderBlocks = useReorderBlocks(noteId);

  function handleAddTextBlock(initialContent = "") {
    const blockId = nanoid();
    upsertBlock.mutate(
      {
        blockId,
        dto: {
          type: "text",
          position: blocks.length,
          content: initialContent,
        },
      },
      { onError: () => toast.error("Failed to add text block") },
    );
  }

  function handleAddListBlock(listType: ListType) {
    const blockId = nanoid();
    upsertBlock.mutate(
      {
        blockId,
        dto: {
          type: "list",
          position: blocks.length,
          listType,
          content: [{ id: nanoid(10), content: "", checked: false }],
        },
      },
      { onError: () => toast.error("Failed to add list block") },
    );
  }

  function handleAddMediaBlock() {
    const blockId = nanoid();
    upsertBlock.mutate(
      {
        blockId,
        dto: {
          type: "media",
          position: blocks.length,
          content: [],
        },
      },
      { onError: () => toast.error("Failed to add media block") },
    );
  }

  function handleMove(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const ids = blocks.map((b) => b.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(target, 0, moved);
    reorderBlocks.mutate(ids, {
      onError: () => toast.error("Failed to reorder blocks"),
    });
  }

  function handleDelete(blockId: string) {
    deleteBlock.mutate(blockId, {
      onError: () => toast.error("Failed to delete block"),
    });
  }

  return (
    <div className="space-y-4">
      {/* Legacy flat-content fallback notice when note has no blocks yet */}
      {blocks.length === 0 && fallbackContent.trim() && (
        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {fallbackContent}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddTextBlock(fallbackContent)}
            className="text-xs"
          >
            Convert to editable block
          </Button>
        </div>
      )}

      {/* Ordered blocks */}
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="group/block relative rounded-xl border border-border/60 bg-card/30 px-4 py-3 transition-colors hover:border-border"
        >
          {/* Quiet block controls */}
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-mono uppercase tracking-wider opacity-60">
              {block.type === "list" ? block.listType : block.type}
            </span>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/block:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={index === 0 || reorderBlocks.isPending}
                aria-label="Move block up"
                className="rounded p-1 hover:bg-secondary disabled:opacity-30 cursor-pointer"
              >
                <ArrowUp className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={
                  index === blocks.length - 1 || reorderBlocks.isPending
                }
                aria-label="Move block down"
                className="rounded p-1 hover:bg-secondary disabled:opacity-30 cursor-pointer"
              >
                <ArrowDown className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(block.id)}
                disabled={deleteBlock.isPending}
                aria-label="Delete block"
                className="rounded p-1 hover:bg-secondary hover:text-destructive cursor-pointer"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>

          {block.type === "text" && (
            <TextBlockEditor
              block={block}
              onCommit={(content) =>
                upsertBlock.mutate(
                  {
                    blockId: block.id,
                    dto: { type: "text", position: block.position, content },
                  },
                  { onError: () => toast.error("Failed to save text block") },
                )
              }
            />
          )}

          {block.type === "list" && (
            <ListBlockEditor
              key={`${block.id}-${block.updatedAt}`}
              block={block}
              onCommit={(patch) =>
                upsertBlock.mutate(
                  {
                    blockId: block.id,
                    dto: {
                      type: "list",
                      position: block.position,
                      ...patch,
                    },
                  },
                  { onError: () => toast.error("Failed to save list block") },
                )
              }
            />
          )}

          {block.type === "media" && (
            <MediaBlockEditor
              block={block}
              onCommit={(content) =>
                upsertBlock.mutate(
                  {
                    blockId: block.id,
                    dto: { type: "media", position: block.position, content },
                  },
                  { onError: () => toast.error("Failed to save media block") },
                )
              }
            />
          )}
        </div>
      ))}

      {/* Add Block Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddTextBlock("")}
          disabled={upsertBlock.isPending}
          className="h-8 gap-1.5 text-xs"
        >
          <FileText className="size-3.5" />
          <span>Add Text</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddListBlock("checkbox")}
          disabled={upsertBlock.isPending}
          className="h-8 gap-1.5 text-xs"
        >
          <CheckSquare className="size-3.5" />
          <span>Add Checklist</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddListBlock("bullet")}
          disabled={upsertBlock.isPending}
          className="h-8 gap-1.5 text-xs"
        >
          <List className="size-3.5" />
          <span>Add Bullets</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleAddListBlock("ordered")}
          disabled={upsertBlock.isPending}
          className="h-8 gap-1.5 text-xs"
        >
          <ListOrdered className="size-3.5" />
          <span>Add Numbered</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddMediaBlock}
          disabled={upsertBlock.isPending}
          className="h-8 gap-1.5 text-xs"
        >
          <ImageIcon className="size-3.5" />
          <span>Add Media</span>
        </Button>
      </div>
    </div>
  );
}
