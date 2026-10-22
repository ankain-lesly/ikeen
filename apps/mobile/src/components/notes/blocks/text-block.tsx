import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { MarkdownBody, MarkdownEditor } from "@/components/markdown";
import type { TextBlock as TextBlockType } from "@/lib/types/notes";

export interface TextBlockProps {
  block: TextBlockType;
  isEditing: boolean;
  onChangeContent: (newContent: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

export const TextBlock = React.memo(function TextBlock({
  block,
  isEditing,
  onChangeContent,
  onBlur,
  onFocus,
}: TextBlockProps) {
  const colors = useTheme();

  if (isEditing) {
    return (
      <View className="w-full min-h-11">
        <MarkdownEditor
          defaultValue={block.content}
          onChangeText={onChangeContent}
          onBlur={onBlur}
          placeholder="Start typing markdown..."
          placeholderTextColor={colors.textSecondary}
          style={{
            color: colors.foreground,
            fontSize: 15,
            lineHeight: 22,
            minHeight: 44,
            paddingVertical: 4,
            textAlignVertical: "top",
          }}
        />
      </View>
    );
  }

  if (!block.content.trim()) {
    return (
      <Pressable onPress={onFocus} className="w-full py-2">
        <Text className="text-sm italic text-text-secondary">Edit text</Text>
      </Pressable>
    );
  }

  return (
    <View className="w-full">
      <MarkdownBody source={block.content} />
    </View>
  );
});
