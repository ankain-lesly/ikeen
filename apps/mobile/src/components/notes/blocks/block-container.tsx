import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { Pressable, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { Note, NoteBlock, UpdateBlockInput } from "@/lib/types/notes";
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
  onRequestRecordAudio?: () => void;
}

interface BlockRowProps {
  block: NoteBlock;
  index: number;
  totalBlocks: number;
  isEditing: boolean;
  onStartEditing: () => void;
  onStageUpdate: (blockId: string, updates: UpdateBlockInput) => void;
  onImmediateUpdate: (
    blockId: string,
    updates: UpdateBlockInput,
  ) => Promise<void>;
  onCommit: (blockId: string) => Promise<void>;
  onMoveBlock: (index: number, direction: -1 | 1) => Promise<void>;
  onDelete: (blockId: string) => Promise<void>;
  onDuplicate: (block: NoteBlock, index: number) => Promise<void>;
  onRequestRecordAudio?: () => void;
}

/**
 * Memoized row wrapper so typing inside one block never re-renders sibling blocks.
 */
const BlockRow = React.memo(function BlockRow({
  block,
  index,
  totalBlocks,
  isEditing,
  onStartEditing,
  onStageUpdate,
  onImmediateUpdate,
  onCommit,
  onMoveBlock,
  onDelete,
  onDuplicate,
  onRequestRecordAudio,
}: BlockRowProps) {
  const handleStage = useCallback(
    (updates: UpdateBlockInput) => onStageUpdate(block.id, updates),
    [block.id, onStageUpdate],
  );
  const handleImmediate = useCallback(
    (updates: UpdateBlockInput) => {
      void onImmediateUpdate(block.id, updates);
    },
    [block.id, onImmediateUpdate],
  );
  const handleCommit = useCallback(() => {
    void onCommit(block.id);
  }, [block.id, onCommit]);

  return (
    <BlockWrapper
      block={block}
      isEditing={isEditing}
      canMoveUp={index > 0}
      canMoveDown={index < totalBlocks - 1}
      onMoveUp={() => void onMoveBlock(index, -1)}
      onMoveDown={() => void onMoveBlock(index, 1)}
      onDelete={() => void onDelete(block.id)}
      onDuplicate={() => void onDuplicate(block, index)}>
      {block.type === "text" ? (
        <TextBlock
          block={block}
          isEditing={isEditing}
          onChangeContent={(content) => handleStage({ content })}
          onBlur={handleCommit}
          onFocus={onStartEditing}
        />
      ) : block.type === "list" ? (
        <ListBlock
          block={block}
          isEditing={isEditing}
          onStageUpdate={handleStage}
          onImmediateUpdate={handleImmediate}
          onCommit={handleCommit}
        />
      ) : block.type === "media" ? (
        <MediaBlock
          block={block}
          isEditing={isEditing}
          onStageContent={(content) => handleStage({ content })}
          onImmediateContent={(content) => handleImmediate({ content })}
          onCommit={handleCommit}
          onRequestRecordAudio={onRequestRecordAudio}
        />
      ) : null}
    </BlockWrapper>
  );
});

export const BlockContainer = React.memo(
  forwardRef<BlockContainerHandle, BlockContainerProps>(function BlockContainer(
    { note, isEditing, onStartEditing, onContentChange, onRequestRecordAudio },
    ref,
  ) {
    const colors = useTheme();
    const { data: liveBlocks, isLoading } = useLiveNoteBlocks(note.id);
    const contentEditorRef = useRef<MarkdownEditorHandle>(null);

    const {
      blocks,
      clearDirtyEntry,
      handleStageUpdate,
      commitBlock,
      handleImmediateUpdate,
      flushBlocks,
    } = useStagedBlockUpdates(liveBlocks);

    const blocksRef = useRef(blocks);
    useLayoutEffect(() => {
      blocksRef.current = blocks;
    });

    useImperativeHandle(
      ref,
      () => ({
        flushBlocks,
        focusContent: () => contentEditorRef.current?.focus(),
        formatContent: (action: MarkdownFormatAction) =>
          contentEditorRef.current?.format(action),
      }),
      [flushBlocks],
    );

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

    const handleDuplicate = useCallback(
      async (block: NoteBlock, currentIndex: number) => {
        try {
          await commitBlock(block.id);
          const created = await createBlock(
            note.id,
            cloneBlockInput(block, currentIndex + 1),
          );
          const nextIds = blocksRef.current.map((b) => b.id);
          nextIds.splice(currentIndex + 1, 0, created.id);
          await reorderBlocks(note.id, nextIds);
        } catch (err) {
          console.error("[BlockContainer] Duplicate block error:", err);
        }
      },
      [commitBlock, note.id],
    );

    const handleMoveBlock = useCallback(
      async (index: number, direction: -1 | 1) => {
        const cur = blocksRef.current;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= cur.length) return;
        await flushBlocks();
        const ids = cur.map((b) => b.id);
        [ids[index], ids[targetIndex]] = [ids[targetIndex], ids[index]];
        await reorderBlocks(note.id, ids);
      },
      [flushBlocks, note.id],
    );

    const handleAddInitialBlock = useCallback(
      async (type: "text" | "list" = "text") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await createBlock(
          note.id,
          type === "text"
            ? createDefaultTextBlockInput()
            : createDefaultChecklistBlockInput(),
        );
      },
      [note.id],
    );

    if (isLoading) return null;

    return (
      <View className="w-full pb-32 gap-2">
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
          <></>
        )}

        {blocks.map((block, index) => (
          <BlockRow
            key={block.id}
            block={block}
            index={index}
            totalBlocks={blocks.length}
            isEditing={isEditing}
            onStartEditing={onStartEditing}
            onStageUpdate={handleStageUpdate}
            onImmediateUpdate={handleImmediateUpdate}
            onCommit={commitBlock}
            onMoveBlock={handleMoveBlock}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onRequestRecordAudio={onRequestRecordAudio}
          />
        ))}

        {isEditing && blocks.length === 0 && (
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
        )}
      </View>
    );
  }),
);
