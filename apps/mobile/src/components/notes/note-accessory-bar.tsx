import React from "react";
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
  // Undo,
  // Redo,
  CheckCheck,
  Pencil,
  Pin,
  Share2,
} from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  // LinearTransition,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";
import { useKeyboardGradualAnimation } from "@/hooks/use-gradual-animation";

interface NoteAccessoryBarProps {
  onInsertSnippet: (snippet: string) => void;
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
}

interface NoteBottomToolBarProps
  extends NoteMinimalToolbarProps, NoteAccessoryBarProps {
  isEditing: boolean;
}

export const NoteBottomToolBar = React.memo(function NoteBottomToolBar({
  onInsertSnippet,
  onOpenTagPrompt,
  onDismiss,
  isSaving,
  onStartEditing,
  isPinned,
  isEditing,
  onShare,
  onTogglePin,
  wordCount,
}: NoteBottomToolBarProps) {

  return (
    <View
      className={`absolute w-full items-center justify-center  pointer-events-box-none bottom-0`}>
      {isEditing ? (
        <Animated.View
          key="editing"
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="flex-1 flex-row items-center">
          <NoteAccessoryBar
            onInsertSnippet={onInsertSnippet}
            onOpenTagPrompt={onOpenTagPrompt}
            onDismiss={onDismiss}
            isSaving={isSaving}
          />
        </Animated.View>
      ) : (
        <Animated.View
          key="viewing"
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="flex-1 flex-row items-center justify-between">
          <NoteMinimalToolbar
            wordCount={wordCount}
            onStartEditing={onStartEditing}
            onShare={onShare}
            isPinned={isPinned}
            onTogglePin={onTogglePin}
          />
        </Animated.View>
      )}
    </View>
  );
});

export const NoteAccessoryBar = React.memo(function NoteAccessoryBar({
  onInsertSnippet,
  onOpenTagPrompt,
  onDismiss,
  isSaving,
}: NoteAccessoryBarProps) {
  const colors = useTheme();
  const { isVisible } = useKeyboardGradualAnimation();

  const handleAction = (snippet: string) => {
    Haptics.selectionAsync();
    onInsertSnippet(snippet);
  };

  const handleTagAction = () => {
    Haptics.selectionAsync();
    if (onOpenTagPrompt) {
      onOpenTagPrompt();
    } else {
      onInsertSnippet("#");
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    onDismiss?.();
  };

  return (
    <View
      className={`flex-row items-center border border-border _rounded-full px-2 bg-background-element${!isVisible?" pb-safe-offset-2":""}`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-center gap-3 px-1"
        keyboardShouldPersistTaps="always">
        {/* Checklist */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert checklist item"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-11 min-w-11"
          onPress={() => handleAction("\n- [ ] ")}>
          <CheckSquare size={18} color={colors.text} />
        </Pressable>

        {/* Bullet List */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert bullet list"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-11 min-w-11"
          onPress={() => handleAction("\n- ")}>
          <List size={18} color={colors.text} />
        </Pressable>

        {/* Heading */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert heading"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-11 min-w-11"
          onPress={() => handleAction("\n## ")}>
          <Heading1 size={18} color={colors.text} />
        </Pressable>

        {/* Bold */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert bold"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-11 min-w-11"
          onPress={() => handleAction("****")}>
          <Bold size={18} color={colors.text} />
        </Pressable>

        {/* Italic */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert italic"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-11 min-w-11"
          onPress={() => handleAction("**")}>
          <Italic size={18} color={colors.text} />
        </Pressable>

        {/* Tag Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Insert tag"
          className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-11 min-w-11"
          onPress={handleTagAction}>
          <Hash size={18} color={colors.text} />
        </Pressable>

        {/* Undo / Redo — not wired to editor history yet
        <Pressable
          className="p-1.5 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
          hitSlop={8}>
          <Undo size={18} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          className="p-1.5 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
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
          className="px-3 py-2 justify-center items-center active:opacity-70 min-h-11"
          onPress={handleDismiss}>
          <ActivityIndicator size={"small"} color={colors.border} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done editing"
          className="px-3 py-2 justify-center items-center active:opacity-70 min-h-11"
          onPress={handleDismiss}>
          <CheckCheck size={24} color={colors.primary} />
        </Pressable>
      )}
    </View>
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
  isPinned,
  onTogglePin,
}: NoteMinimalToolbarProps) {
  const colors = useTheme();
  const { isVisible } = useKeyboardGradualAnimation();

  return (
    <View className={`items-center justify-center w-full${!isVisible ? " pb-safe-offset-2" : ""}`}>
      <View
        className={`h-12 flex-row items-center justify-between border border-border rounded-full px-4 bg-card/95 shadow-sm gap-2`}>
        {/* Left: Word count badge */}
        <Text className="text-xs font-mono text-text-secondary">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </Text>

        {/* Right: Quick actions */}
        <View className="flex-row items-center gap-2">
          {onShare ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share note"
              className="p-2 rounded-full justify-center items-center active:opacity-70 min-h-11 min-w-11"
              onPress={onShare}
              hitSlop={8}>
              <Share2 size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}

          {onTogglePin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPinned ? "Unpin note" : "Pin note"}
              className="p-2 rounded-full justify-center items-center active:opacity-70 min-h-11 min-w-11"
              onPress={onTogglePin}
              hitSlop={8}>
              <Pin
                size={16}
                color={isPinned ? colors.primary : colors.textSecondary}
                fill={isPinned ? colors.primary : undefined}
              />
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
  );
});
