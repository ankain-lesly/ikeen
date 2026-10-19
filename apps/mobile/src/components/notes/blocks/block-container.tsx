import React, { useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Plus } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { Note, NoteBlock } from "@/lib/types/notes";
import {
  createBlock,
  deleteBlock,
  reorderBlocks,
  updateBlock,
  useLiveNoteBlocks,
} from "@/lib/queries/note-blocks";
import { BlockWrapper } from "./block-wrapper";
import { TextBlock } from "./text-block";
import { ListBlock } from "./list-block";
import { MediaBlock } from "./media-block";
import { MarkdownBody, MarkdownEditor } from "@/components/markdown";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";

export interface BlockContainerProps {
  note: Note;
  isEditing: boolean;
  onContentConverted?: () => void;
  onStartEditing: () => void;
  onContentChange?: (t: string) => void;
}

export const BlockContainer = React.memo(function BlockContainer({
  note,
  isEditing,
  onStartEditing,
  onContentChange,
}: BlockContainerProps) {
  const colors = useTheme();
  const { data: blocks } = useLiveNoteBlocks(note.id);

  // Invariant: Idempotent Prepend Conversion of legacy note.content
  // CODE: Keep Content
  // useEffect(() => {
  //   if (note.id && note.content && note.content.trim()) {
  //     void (async () => {
  //       try {
  //         await convertNoteContentToBlock(note);
  //         onContentConverted?.();
  //       } catch (err) {
  //         console.error(
  //           "[BlockContainer] Failed to convert legacy note content:",
  //           err,
  //         );
  //       }
  //     })();
  //   }
  // }, [note.id, note.content, onContentConverted, note]);

  // Update block content / metadata
  const handleUpdate = useCallback(async (blockId: string, updates: any) => {
    try {
      await updateBlock(blockId, updates);
    } catch (err) {
      console.error("[BlockContainer] Update block error:", err);
    }
  }, []);

  // Delete block
  const handleDelete = useCallback(async (blockId: string) => {
    try {
      await deleteBlock(blockId);
    } catch (err) {
      console.error("[BlockContainer] Delete block error:", err);
    }
  }, []);

  // Duplicate block
  const handleDuplicate = useCallback(
    async (block: NoteBlock, currentIndex: number) => {
      try {
        await createBlock(note.id, {
          type: block.type,
          position: currentIndex + 1,
          content: block.content,
          ...(block.type === "list"
            ? {
                listType: block.listType,
                header: block.header,
                footer: block.footer,
              }
            : {}),
        });
      } catch (err) {
        console.error("[BlockContainer] Duplicate block error:", err);
      }
    },
    [note.id],
  );

  // Move block up
  const handleMoveUp = useCallback(
    async (index: number) => {
      if (index <= 0 || !blocks) return;
      const ids = blocks.map((b) => b.id);
      const temp = ids[index - 1];
      ids[index - 1] = ids[index];
      ids[index] = temp;
      await reorderBlocks(note.id, ids);
    },
    [blocks, note.id],
  );

  // Move block down
  const handleMoveDown = useCallback(
    async (index: number) => {
      if (!blocks || index >= blocks.length - 1) return;
      const ids = blocks.map((b) => b.id);
      const temp = ids[index + 1];
      ids[index + 1] = ids[index];
      ids[index] = temp;
      await reorderBlocks(note.id, ids);
    },
    [blocks, note.id],
  );

  // Quick initial block creation when empty
  const handleAddInitialBlock = useCallback(
    async (type: "text" | "list" = "text") => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (type === "text") {
        await createBlock(note.id, {
          type: "text",
          content: "",
        });
      } else {
        await createBlock(note.id, {
          type: "list",
          listType: "checkbox",
          content: [{ id: "item-1", content: "", checked: false }],
        });
      }
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
              handleUpdate(block.id, { content: newContent })
            }
            onFocus={onStartEditing}
          />
        );
      case "list":
        return (
          <ListBlock
            block={block}
            isEditing={isEditing}
            onUpdateBlock={(updates) => handleUpdate(block.id, updates)}
          />
        );
      case "media":
        return (
          <MediaBlock
            block={block}
            isEditing={isEditing}
            onUpdateContent={(items) =>
              handleUpdate(block.id, { content: items })
            }
          />
        );
      default:
        return null;
    }
  };

  // Render DEMO BLock Actions
  const renderBlockActions = () => {
    if (isEditing) {
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
    }
  };

  // Handle Tap Gestures
  const combinedGestures = useMemo(() => {
    const singleTap = Gesture.Tap();
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        "worklet";
        scheduleOnRN(onStartEditing);
      });

    return Gesture.Exclusive(doubleTap, singleTap);
  }, [onStartEditing]);

  return (
    <View className="w-full pb-32">
      {/* Editor Content | Blocks */}
      {isEditing ? (
        <MarkdownEditor
          // ref={contentInputRef}
          defaultValue={note.content}
          placeholder="Start typing..."
          onChangeText={onContentChange}
        />
      ) : note.content.trim() ? (
        <View className="w-full min-w-0 pb-24">
          <MarkdownBody source={note.content} />
        </View>
      ) : (
        <GestureDetector gesture={combinedGestures}>
          <View className="w-full min-w-0 pb-24">
            <Text className="text-base leading-6 text-text-secondary">
              Start typing...
            </Text>
          </View>
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
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            onDelete={() => handleDelete(block.id)}
            onDuplicate={() => handleDuplicate(block, index)}>
            {renderBlockContent(block)}
          </BlockWrapper>
        );
      })}

      {renderBlockActions()}
    </View>
  );
});
