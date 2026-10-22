import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { Pressable, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useDoubleTap } from "@/hooks/use-double-tap";
import * as Haptics from "@/lib/haptics";
import type { Note, NoteBlock } from "@/lib/types/notes";
import {
  createBlock,
  deleteBlock,
  reorderBlocks,
  useLiveNoteBlocks,
} from "@/lib/queries/note-blocks";
import { BlockWrapper } from "./block-wrapper";
import { TextBlock } from "./text-block";
import { ListBlock } from "./list-block";
import { MediaBlock } from "./media-block";
import {
  cloneBlockInput,
  createDefaultChecklistBlockInput,
  createDefaultTextBlockInput,
} from "./block-factories";
import { useStagedBlockUpdates } from "./use-staged-block-updates";
import {
  MarkdownBody,
  MarkdownEditor,
  type MarkdownEditorHandle,
  type MarkdownFormatAction,
} from "@/components/markdown";
import { GestureDetector } from "react-native-gesture-handler";

export type BlockContainerHandle = {
  flushBlocks: () => Promise<void>;
  focusContent: () => void;
  formatContent: (action: MarkdownFormatAction) => void;
};

export interface BlockContainerProps {
  note: Note;
  isEditing: boolean;
  onStartEditing: () => void;
  onContentChange?: (t: string) => void;
}

export const BlockContainer = React.memo(
  forwardRef<BlockContainerHandle, BlockContainerProps>(function BlockContainer(
    { note, isEditing, onStartEditing, onContentChange },
    ref,
  ) {
    const colors = useTheme();
    const { data: liveBlocks } = useLiveNoteBlocks(note.id);
    const contentEditorRef = useRef<MarkdownEditorHandle>(null);

    const {
      blocks,
      clearDirtyEntry,
      handleStageUpdate,
      commitBlock,
      handleImmediateUpdate,
      flushBlocks,
    } = useStagedBlockUpdates(liveBlocks);

    useImperativeHandle(
      ref,
      () => ({
        flushBlocks,
        focusContent: () => {
          contentEditorRef.current?.focus();
        },
        formatContent: (action: MarkdownFormatAction) => {
          contentEditorRef.current?.format(action);
        },
      }),
      [flushBlocks],
    );

    // Delete block
    const handleDelete = useCallback(
      async (blockId: string) => {
        clearDirtyEntry(blockId);
        try {
          await deleteBlock(blockId);
        } catch (err) {
          console.error("[BlockContainer] Delete block error:", err);
        }
      },
      [clearDirtyEntry],
    );

    // Duplicate block with fresh child UUIDs and re-indexed positions
    const handleDuplicate = useCallback(
      async (block: NoteBlock, currentIndex: number) => {
        try {
          await commitBlock(block.id);
          const created = await createBlock(
            note.id,
            cloneBlockInput(block, currentIndex + 1),
          );

          const nextIds = blocks.map((b) => b.id);
          nextIds.splice(currentIndex + 1, 0, created.id);
          await reorderBlocks(note.id, nextIds);
        } catch (err) {
          console.error("[BlockContainer] Duplicate block error:", err);
        }
      },
      [blocks, commitBlock, note.id],
    );

    // Move block up (-1) or down (+1)
    const handleMoveBlock = useCallback(
      async (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;
        await flushBlocks();
        const ids = blocks.map((b) => b.id);
        [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
        await reorderBlocks(note.id, ids);
      },
      [blocks, flushBlocks, note.id],
    );

    // Quick initial block creation when empty
    const handleAddInitialBlock = useCallback(
      async (type: "text" | "list" = "text") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const payload =
          type === "text"
            ? createDefaultTextBlockInput()
            : createDefaultChecklistBlockInput();
        await createBlock(note.id, payload);
      },
      [note.id],
    );

    // Render individual block content by type
    const renderBlockContent = (block: NoteBlock) => {
      switch (block.type) {
        case "text":
          return (
            <TextBlock
              block={block}
              isEditing={isEditing}
              onChangeContent={(newContent) =>
                handleStageUpdate(block.id, { content: newContent })
              }
              onBlur={() => {
                void commitBlock(block.id);
              }}
              onFocus={onStartEditing}
            />
          );
        case "list":
          return (
            <ListBlock
              block={block}
              isEditing={isEditing}
              onStageUpdate={(updates) => handleStageUpdate(block.id, updates)}
              onImmediateUpdate={(updates) => {
                void handleImmediateUpdate(block.id, updates);
              }}
              onCommit={() => {
                void commitBlock(block.id);
              }}
            />
          );
        case "media":
          return (
            <MediaBlock
              block={block}
              isEditing={isEditing}
              onStageContent={(items) =>
                handleStageUpdate(block.id, { content: items })
              }
              onImmediateContent={(items) => {
                void handleImmediateUpdate(block.id, { content: items });
              }}
              onCommit={() => {
                void commitBlock(block.id);
              }}
            />
          );
        default:
          return null;
      }
    };

    // Empty state actions only when editing and no blocks exist yet
    const renderBlockActions = () => {
      if (!isEditing || blocks.length > 0) return null;
      return (
        <View className="py-6 items-center justify-center gap-3">
          <Text className="text-sm text-text-secondary text-center">
            This note has no blocks yet.
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => handleAddInitialBlock("text")}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-background-element border border-border">
              <Plus size={14} color={colors.primary} />
              <Text className="text-xs font-semibold text-foreground">
                Add Text Block
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleAddInitialBlock("list")}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-background-element border border-border">
              <Plus size={14} color={colors.primary} />
              <Text className="text-xs font-semibold text-foreground">
                Add Checklist
              </Text>
            </Pressable>
          </View>
        </View>
      );
    };

    const doubleTapGesture = useDoubleTap(onStartEditing);

    return (
      <View className="w-full pb-32">
        {/* Editor Content | Blocks */}
        {isEditing ? (
          <MarkdownEditor
            ref={contentEditorRef}
            defaultValue={note.content}
            placeholder="Start typing..."
            onChangeText={onContentChange}
          />
        ) : note.content.trim() ? (
          <MarkdownBody source={note.content} />
        ) : (
          <GestureDetector gesture={doubleTapGesture}>
            <Text className="text-base leading-6 text-text-secondary">
              Start typing...
            </Text>
          </GestureDetector>
        )}

        {blocks.map((block, index) => {
          return (
            <BlockWrapper
              key={block.id}
              block={block}
              isEditing={isEditing}
              canMoveUp={index > 0}
              canMoveDown={index < blocks.length - 1}
              onMoveUp={() => handleMoveBlock(index, -1)}
              onMoveDown={() => handleMoveBlock(index, 1)}
              onDelete={() => handleDelete(block.id)}
              onDuplicate={() => handleDuplicate(block, index)}>
              {renderBlockContent(block)}
            </BlockWrapper>
          );
        })}

        {renderBlockActions()}
      </View>
    );
  }),
);
