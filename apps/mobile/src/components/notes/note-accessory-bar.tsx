import React, { useCallback, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "@/lib/haptics";
import {
  Bold,
  CheckSquare,
  Hash,
  Heading1,
  Italic,
  List,
  CheckCheck,
  Pencil,
  Share2,
  Plus,
  LetterText,
  X,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { useKeyboardGradualAnimation } from "@/hooks/use-gradual-animation";
import type { MarkdownFormatAction } from "@/components/markdown";
import { AnimatedEntryView } from "../ui/animated";
import { Card } from "../ui/card";
import { NotesEditorToolbarBlocks } from "./editor-toolbar-blocks";

interface NoteAccessoryBarProps {
  onFormat: (action: MarkdownFormatAction) => void;
  onOpenTagPrompt?: () => void;
  onDismiss?: () => void;
  isSaving: boolean;
}

interface NoteMinimalToolbarProps {
  onStartEditing: () => void;
  wordCount?: number;
  onShare?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onOpenBlockSheet?: () => void;
}

interface NoteBottomToolBarProps
  extends NoteMinimalToolbarProps, NoteAccessoryBarProps {
  isEditing: boolean;
  onAddTextBlock?: () => void;
  onAddCheckboxBlock?: () => void;
  onAddMedia?: () => void;
  onTakePhoto?: () => void;
  onRecordAudio?: () => void;
  onAttachFile?: () => void;
}

type ToolbarMode = "default" | "text";

export const NoteBottomToolBar = React.memo(function NoteBottomToolBar({
  onFormat,
  onOpenTagPrompt,
  onDismiss,
  isSaving,
  onStartEditing,
  isPinned,
  isEditing,
  onShare,
  onTogglePin,
  wordCount,
  onAddTextBlock,
  onAddCheckboxBlock,
  onAddMedia,
  onTakePhoto,
  onRecordAudio,
  onAttachFile,
}: NoteBottomToolBarProps) {
  const { isVisible } = useKeyboardGradualAnimation();

  const [mode, setMode] = useState<ToolbarMode>("default");
  const [isBlockSheetOpen, setIsBlockSheetOpen] = useState(false);

  const renderMode = useCallback(() => {
    switch (mode) {
      case "text":
        return (
          <ToolbarModeEditText
            onFormat={onFormat}
            setMode={(m) => setMode(m)}
            isSaving={isSaving}
          />
        );

      case "default":
      default:
        return (
          <ToolbarModeDefault
            setMode={(m) => setMode(m)}
            onOpenTagPrompt={onOpenTagPrompt}
            onDismiss={onDismiss}
            onOpenBlockSheet={() => setIsBlockSheetOpen(true)}
            isSaving={isSaving}
          />
        );
    }
  }, [isSaving, mode, onDismiss, onFormat, onOpenTagPrompt]);

  return (
    <>
      <View className="w-full items-center justify-center pointer-events-box-none">
        {isEditing ? (
          <View
            className={`flex-row items-center border border-border px-2 bg-background-element${!isVisible ? " pb-safe-offset-2" : ""}`}>
            {renderMode()}
          </View>
        ) : (
          <NoteMinimalToolbar
            wordCount={wordCount}
            onStartEditing={onStartEditing}
            onShare={onShare}
            isPinned={isPinned}
            onTogglePin={onTogglePin}
            onOpenBlockSheet={() => setIsBlockSheetOpen(true)}
          />
        )}
      </View>

      {isBlockSheetOpen && (
        <NotesEditorToolbarBlocks
          isSheetOpen={isBlockSheetOpen}
          onDismiss={() => setIsBlockSheetOpen(false)}
          onAddCheckboxBlock={onAddCheckboxBlock}
          onAddMedia={onAddMedia}
          onAddTextBlock={onAddTextBlock}
          onTakePhoto={onTakePhoto}
          onRecordAudio={onRecordAudio}
          onAttachFile={onAttachFile}
        />
      )}
    </>
  );
});

type ToolbarModeDefaultProps = Omit<NoteAccessoryBarProps, "onFormat"> & {
  setMode: (m: ToolbarMode) => void;
  onOpenBlockSheet: () => void;
};
export const ToolbarModeDefault = React.memo(function NoteAccessoryBar({
  onOpenTagPrompt,
  onDismiss,
  setMode,
  onOpenBlockSheet,
  isSaving,
}: ToolbarModeDefaultProps) {
  const colors = useTheme();

  const handleTagAction = () => {
    onOpenTagPrompt?.();
  };

  const handleDismiss = () => {
    Keyboard.dismiss();
    onDismiss?.();
  };

  return (
    <AnimatedEntryView className="w-full flex-row items-center justify-between">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-center gap-3 px-1"
        keyboardShouldPersistTaps="always">
        {/* Add Block Sheet Trigger */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add block"
          onPress={() => onOpenBlockSheet()}>
          <Card className="bg-primary rounded-xl size-10 items-center justify-center">
            <Plus size={20} color={colors.text} />
          </Card>
        </Pressable>

        {/* Bullet List */}
        {/* <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert bullet list"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 size-10"
          onPress={() => setMode("color")}>
          <PaintBucket size={20} color={colors.text} />
        </Pressable> */}
        {/* Bullet List */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Text formatting"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 size-10"
          onPress={() => setMode("text")}>
          <LetterText size={20} color={colors.text} />
        </Pressable>

        {/* Tag Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert tag"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 size-10"
          onPress={handleTagAction}>
          <Hash size={20} color={colors.text} />
        </Pressable>

        {/* Undo / Redo — not wired to editor history yet
        <Pressable
          className="p-1.5 rounded-lg justify-center items-center active:opacity-70 size-9
          hitSlop={8}>
          <Undo size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          className="p-1.5 rounded-lg justify-center items-center active:opacity-70 size-9
          hitSlop={8}>
          <Redo size={18} color={colors.textSecondary} />
        </Pressable>
        */}
      </ScrollView>

      {/* Done Button */}
      {isSaving ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Saving note"
          className="px-3 py-2 justify-center items-center active:opacity-70 size-10"
          onPress={handleDismiss}>
          <ActivityIndicator size="small" color={colors.border} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done editing"
          className="px-3 py-2 justify-center items-center active:opacity-70 size-10"
          onPress={handleDismiss}>
          <CheckCheck size={24} color={colors.primary} />
        </Pressable>
      )}
    </AnimatedEntryView>
  );
});

type ToolbarModeEditTextProps = Omit<
  NoteAccessoryBarProps,
  "onDismiss" | "onOpenTagPrompt"
> & {
  setMode: (m: ToolbarMode) => void;
};
export const ToolbarModeEditText = React.memo(function NoteAccessoryBar({
  onFormat,
  setMode,
}: ToolbarModeEditTextProps) {
  const colors = useTheme();

  const handleAction = (action: MarkdownFormatAction) => {
    onFormat(action);
  };

  return (
    <AnimatedEntryView className="w-full flex-row items-center justify-between">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-center gap-3 px-1"
        keyboardShouldPersistTaps="always">
        {/* Checklist */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert checklist item"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 size-10"
          onPress={() => handleAction("checklist")}>
          <CheckSquare size={18} color={colors.text} />
        </Pressable>

        {/* Bullet List */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert bullet list"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 size-10"
          onPress={() => handleAction("list")}>
          <List size={18} color={colors.text} />
        </Pressable>

        {/* Heading */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert heading"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 size-10"
          onPress={() => handleAction("heading")}>
          <Heading1 size={18} color={colors.text} />
        </Pressable>

        {/* Bold */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert bold"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 size-10"
          onPress={() => handleAction("bold")}>
          <Bold size={18} color={colors.text} />
        </Pressable>

        {/* Italic */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert italic"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 size-10"
          onPress={() => handleAction("italic")}>
          <Italic size={18} color={colors.text} />
        </Pressable>
      </ScrollView>

      {/* Close Mode Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Done editing"
        className="px-3 py-2 justify-center items-center active:opacity-70 size-10"
        onPress={() => setMode("default")}>
        <X size={24} color={colors.textSecondary} />
      </Pressable>
    </AnimatedEntryView>
  );
});

/**
 * Minimal toolbar rendered when the user is in View Mode.
 * Clean, non-intrusive bottom pill showing note stats and a quick edit action.
 */
export const NoteMinimalToolbar = React.memo(function NoteMinimalToolbar({
  onStartEditing,
  wordCount = 0,
  onShare,
  onOpenBlockSheet,
}: NoteMinimalToolbarProps) {
  const colors = useTheme();
  const { isVisible } = useKeyboardGradualAnimation();

  return (
    <AnimatedEntryView className="absolute bottom-safe-offset-2 flex-1 flex-row items-center justify-between">
      <View
        className={`items-center justify-center w-full${!isVisible ? " pb-safe-offset-2" : ""}`}>
        <View className="h-12 flex-row items-center justify-between border border-border/70 rounded-full px-3.5 bg-card/95 shadow-sm gap-3">
          {/* Left: Quick Add '+' trigger */}
          {onOpenBlockSheet && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add block or attachment"
              className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center active:opacity-75"
              onPress={() => {
                Haptics.selectionAsync();
                onOpenBlockSheet();
              }}
              hitSlop={6}>
              <Plus size={16} color={colors.primary} />
            </Pressable>
          )}

          {/* Center: Word count badge */}
          <Text className="text-xs font-mono text-text-secondary">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </Text>

          {/* Right: Quick actions */}
          <View className="flex-row items-center gap-2">
            {onShare ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share note"
                className="p-2 rounded-full justify-center items-center active:opacity-70 size-9"
                onPress={onShare}
                hitSlop={8}>
                <Share2 size={16} color={colors.textSecondary} />
              </Pressable>
            ) : null}

            {/* Quick Edit CTA Button */}
            <Pressable
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary active:opacity-90"
              onPress={() => {
                Haptics.selectionAsync();
                onStartEditing();
              }}>
              <Pencil size={13} color="#ffffff" />
              <Text className="text-xs font-semibold text-white">Edit</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AnimatedEntryView>
  );
});
