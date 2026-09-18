import React from "react";
import { Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import {
  Bold,
  CheckSquare,
  Hash,
  Heading1,
  Italic,
  List,
  Undo,
  Redo,
  CheckCheck,
  Pencil,
  Pin,
  Share2,
} from "lucide-react-native";

import { useTheme } from "@/hooks/use-theme";

interface NoteAccessoryBarProps {
  onInsertSnippet: (snippet: string) => void;
  onOpenTagPrompt?: () => void;
  onDismiss?: () => void;
}

interface NoteMinimalToolbarProps {
  onStartEditing: () => void;
  wordCount?: number;
  onShare?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const NoteAccessoryBar = React.memo(function NoteAccessoryBar({
  onInsertSnippet,
  onOpenTagPrompt,
  onDismiss,
}: NoteAccessoryBarProps) {
  const colors = useTheme();

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
    <View className="absolute bottom-safe-or-5 w-full items-center justify-center px-4">
      <View className="h-12 flex-row items-center border border-border rounded-full px-2 bg-background-element">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="items-center gap-3 px-1"
          keyboardShouldPersistTaps="always">
          {/* Checklist */}
          <Pressable
            className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
            onPress={() => handleAction("\n- [ ] ")}>
            <CheckSquare size={18} color={colors.text} />
          </Pressable>

          {/* Bullet List */}
          <Pressable
            className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
            onPress={() => handleAction("\n- ")}>
            <List size={18} color={colors.text} />
          </Pressable>

          {/* Heading */}
          <Pressable
            className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
            onPress={() => handleAction("\n## ")}>
            <Heading1 size={18} color={colors.text} />
          </Pressable>

          {/* Bold */}
          <Pressable
            className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
            onPress={() => handleAction("****")}>
            <Bold size={18} color={colors.text} />
          </Pressable>

          {/* Italic */}
          <Pressable
            className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
            onPress={() => handleAction("**")}>
            <Italic size={18} color={colors.text} />
          </Pressable>

          {/* Tag Pill */}
          <Pressable
            className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
            onPress={handleTagAction}>
            <Hash size={18} color={colors.text} />
          </Pressable>

          {/* Undo */}
          <Pressable
            className="p-1.5 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
            hitSlop={8}>
            <Undo size={18} color={colors.textSecondary} />
          </Pressable>
          {/* Redo */}
          <Pressable
            className="p-1.5 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
            hitSlop={8}>
            <Redo size={18} color={colors.textSecondary} />
          </Pressable>
        </ScrollView>

        {/* Done Button */}
        <Pressable
          className="px-3 py-2 justify-center items-center active:opacity-70 min-h-9"
          onPress={handleDismiss}>
          <CheckCheck size={24} color={colors.primary} />
        </Pressable>
      </View>
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

  return (
    <View className="absolute bottom-safe-or-5 w-full items-center justify-center px-4 pointer-events-box-none">
      <View className="h-12 flex-row items-center justify-between border border-border rounded-full px-4 bg-card/95 shadow-sm max-w-sm w-full">
        {/* Left: Word count badge */}
        <Text className="text-xs font-mono text-text-secondary">
          {wordCount} {wordCount === 1 ? "word" : "words"}
        </Text>

        {/* Right: Quick actions */}
        <View className="flex-row items-center gap-2">
          {onShare ? (
            <Pressable
              className="p-2 rounded-full justify-center items-center active:opacity-70"
              onPress={onShare}
              hitSlop={8}>
              <Share2 size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}

          {onTogglePin ? (
            <Pressable
              className="p-2 rounded-full justify-center items-center active:opacity-70"
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