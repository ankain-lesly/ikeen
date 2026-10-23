import React from "react";
import { View } from "react-native";
import { MarkdownBody, MarkdownEditor } from "@/components/markdown";

export interface MediaCaptionFieldProps {
  value?: string;
  isEditing: boolean;
  placeholder?: string;
  onChangeText: (text: string) => void;
  onCommit: () => void;
}

export const MediaCaptionField = React.memo(function MediaCaptionField({
  value = "",
  isEditing,
  placeholder = "Add a caption ",
  onChangeText,
  onCommit,
}: MediaCaptionFieldProps) {
  if (isEditing) {
    return (
      <View className="w-full">
        <MarkdownEditor
          defaultValue={value}
          placeholder={placeholder}
          multiline
          onChangeText={onChangeText}
          onBlur={onCommit}
          style={{
            fontSize: 13,
            minHeight: 22,
            paddingVertical: 1,
          }}
        />
      </View>
    );
  }

  if (value.trim()) {
    return (
      <View className="w-full pt-0.5">
        <MarkdownBody source={value} size={14} />
      </View>
    );
  }

  return null;
});
