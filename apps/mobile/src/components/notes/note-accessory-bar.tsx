import React from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
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
} from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';

interface NoteAccessoryBarProps {
  onInsertSnippet: (snippet: string) => void;
  onOpenTagPrompt?: () => void;
  onDismiss?: () => void;
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
      onInsertSnippet('#');
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

        {/* Done Button */}
        {/* <Pressable
          className="px-3 py-2 justify-center items-center active:opacity-70 min-h-9"
          onPress={handleDismiss}>
          <Text className="text-[15px] font-semibold text-primary">Done</Text>
        </Pressable> */}
      </View>
    </View>
  );
});
