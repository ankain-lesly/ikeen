import React, { useCallback, useRef } from "react";
import {
  TextInput,
  View,
  Text,
  Pressable,
} from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { MarkdownBody } from "@/components/markdown";
import type { TextBlock as TextBlockType } from "@/lib/types/notes";

export interface TextBlockProps {
  block: TextBlockType;
  isEditing: boolean;
  onChangeContent: (newContent: string) => void;
  onFocus?: () => void;
}

export const TextBlock = React.memo(function TextBlock({
  block,
  isEditing,
  onChangeContent,
  onFocus,
}: TextBlockProps) {
  const colors = useTheme();
  const inputRef = useRef<TextInput>(null);

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeContent(text);
    },
    [onChangeContent]
  );

  if (isEditing) {
    return (
      <View className="w-full min-h-11">
        <TextInput
          ref={inputRef}
          value={block.content}
          onChangeText={handleChangeText}
          placeholder="Start typing markdown..."
          placeholderTextColor={colors.textSecondary}
          multiline
          scrollEnabled={false}
          onFocus={onFocus}
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
        <Text className="text-sm italic text-text-secondary">
          Edit text
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="w-full">
      <MarkdownBody source={block.content} />
    </View>
  );
});
