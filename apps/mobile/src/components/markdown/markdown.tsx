import { forwardRef, memo, useImperativeHandle, useRef } from "react";
import { Linking, type StyleProp, type ViewStyle } from "react-native";
import {
  EnrichedMarkdownText,
  EnrichedMarkdownTextInput,
  type EnrichedMarkdownTextInputInstance,
  type LinkPressEvent,
} from "react-native-enriched-markdown";
import { useTheme } from "@/hooks/use-theme";
import { useMarkdownStyle } from "./markdown-styles";

export type MarkdownFormatAction =
  | "bold"
  | "italic"
  | "heading"
  | "list"
  | "checklist";

export type MarkdownEditorHandle = {
  focus: () => void;
  getMarkdown: () => Promise<string | null>;
  format: (action: MarkdownFormatAction) => void;
};

const containerStyle: StyleProp<ViewStyle> = { width: "100%" };
const editorStyle: StyleProp<ViewStyle> = {
  width: "100%",
  // height: "100%",
  minHeight: "100%",
  // minHeight: 160,
  paddingBottom: 96,
};
const markdownShortcuts = {
  heading: true,
  unorderedList: true,
  orderedList: true,
} as const;

function openLink({ url }: LinkPressEvent) {
  if (!url.startsWith("https://") && !url.startsWith("http://")) return;
  void Linking.openURL(url).catch(() => {});
}

export const MarkdownBody = memo(function MarkdownBody({
  source,
  size = 16,
  streaming = false,
}: {
  source: string;
  size?: 14 | 16;
  streaming?: boolean;
}) {
  const markdownStyle = useMarkdownStyle(size);
  return (
    <EnrichedMarkdownText
      markdown={source}
      flavor="github"
      markdownStyle={markdownStyle}
      containerStyle={containerStyle}
      streamingAnimation={streaming}
      enableTaskListItemToggle={false}
      onLinkPress={openLink}
    />
  );
});

export const MarkdownEditor = memo(
  forwardRef<
    MarkdownEditorHandle,
    {
      defaultValue?: string;
      placeholder?: string;
      placeholderTextColor?: string;
      onChangeMarkdown: (markdown: string) => void;
    }
  >(function MarkdownEditor(
    { defaultValue = "", placeholder, placeholderTextColor, onChangeMarkdown },
    ref,
  ) {
    const nativeRef = useRef<EnrichedMarkdownTextInputInstance>(null);
    const colors = useTheme();
    const markdownStyle = useMarkdownStyle(16);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => nativeRef.current?.focus(),
        getMarkdown: async () =>
          (await nativeRef.current?.getMarkdown()) ?? null,
        format: (action) => {
          const editor = nativeRef.current;
          if (!editor) return;
          switch (action) {
            case "bold":
              editor.toggleBold();
              break;
            case "italic":
              editor.toggleItalic();
              break;
            case "heading":
              editor.toggleHeading(2);
              break;
            case "list":
              editor.toggleUnorderedList();
              break;
            case "checklist":
              editor.insertText("- [ ] ");
              break;
          }
        },
      }),
      [],
    );

    return (
      <EnrichedMarkdownTextInput
        ref={nativeRef}
        defaultValue={defaultValue}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor ?? colors.textSecondary}
        onChangeMarkdown={onChangeMarkdown}
        multiline
        scrollEnabled={false}
        markdownShortcuts={markdownShortcuts}
        markdownStyle={markdownStyle}
        style={editorStyle}
      />
    );
  }),
);
