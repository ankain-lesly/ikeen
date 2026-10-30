import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import {
  EnrichedMarkdownText,
  type LinkPressEvent,
} from "react-native-enriched-markdown";
import { useTheme } from "@/hooks/use-theme";
import { useMarkdownStyle } from "./markdown-styles";
import { OpenURLSheet } from "../notes/open-url-sheet";
import type { MarkdownStyle } from "react-native-enriched-markdown";

export type MarkdownFormatAction =
  "bold" | "italic" | "heading" | "list" | "checklist";

export type MarkdownEditorHandle = {
  focus: () => void;
  getMarkdown: () => Promise<string | null>;
  format: (action: MarkdownFormatAction) => void;
};

const containerStyle: StyleProp<ViewStyle> = {
  width: "100%",
};

const editorStyle = {
  width: "100%",
  verticalAlign: "top",
  textAlignVertical: "top",
  fontSize: 16,
} as const;

export const MarkdownBody = memo(function MarkdownBody({
  source,
  size = 16,
  streaming = false,
}: {
  source: string;
  size?: 14 | 16;
  streaming?: boolean;
}) {
  const [isUrlSheetOpen, setUrlSheetOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const handleLinkLongPress = useCallback(({ url }: LinkPressEvent) => {
    setUrl(url);
    setUrlSheetOpen(true);
  }, []);

  const style = useMarkdownStyle(size);
  return (
    <>
      <EnrichedMarkdownText
        markdown={source}
        flavor="github"
        markdownStyle={{
          ...style,
        }}
        containerStyle={containerStyle}
        streamingAnimation={streaming}
        enableTaskListItemToggle={false}
        onLinkPress={handleLinkLongPress}
        onLinkLongPress={handleLinkLongPress}
      />
      {isUrlSheetOpen && url && (
        <OpenURLSheet
          isSheetOpen={isUrlSheetOpen}
          url={url}
          onDismiss={() => setUrlSheetOpen(false)}
        />
      )}
    </>
  );
});

export const MarkdownEditor = memo(
  forwardRef<
    MarkdownEditorHandle,
    {
      style?: TextStyle;
      defaultValue?: string;
      placeholder?: string;
      placeholderTextColor?: string;
      multiline?: boolean;
      onChangeText?: (text: string) => void;
      onBlur?: () => void;
      onFocus?: () => void;
      onKeyPress?: TextInputProps["onKeyPress"];
    }
  >(function MarkdownEditor(
    {
      defaultValue = "",
      style,
      placeholder,
      placeholderTextColor,
      multiline = true,
      onChangeText,
      onFocus,
      onBlur,
      onKeyPress,
    },
    ref,
  ) {
    const nativeRef = useRef<TextInput>(null);
    const colors = useTheme();
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [contentHeight, setContentHeight] = useState<number | undefined>(
      undefined,
    );

    useEffect(() => {
      setInternalValue(defaultValue);
    }, [defaultValue]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => nativeRef.current?.focus(),
        getMarkdown: async () => internalValue,
        format: (action: MarkdownFormatAction) => {
          let newValue = internalValue;
          switch (action) {
            case "bold":
              newValue = `${newValue}**bold**`;
              break;
            case "italic":
              newValue = `${newValue}*italic*`;
              break;
            case "heading":
              newValue = `${newValue}${newValue ? "\n" : ""}## Heading`;
              break;
            case "list":
              newValue = `${newValue}${newValue ? "\n" : ""}- List`;
              break;
            case "checklist":
              newValue = `${newValue}${newValue ? "\n" : ""}- [ ] Checklist`;
              break;
          }
          setInternalValue(newValue);
          onChangeText?.(newValue);
        },
      }),
      [internalValue, onChangeText],
    );

    return (
      <TextInput
        ref={nativeRef}
        value={internalValue}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor ?? colors.textSecondary}
        onChangeText={(text) => {
          setInternalValue(text);
          onChangeText?.(text);
        }}
        onContentSizeChange={
          multiline
            ? (e) => {
                const h = Math.ceil(e.nativeEvent.contentSize.height);
                if (h > 0 && Math.abs(h - (contentHeight ?? 0)) > 1) {
                  setContentHeight(h);
                }
              }
            : undefined
        }
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyPress={onKeyPress}
        multiline={multiline}
        scrollEnabled={false}
        style={[
          editorStyle,
          style,
          contentHeight ? { height: contentHeight } : undefined,
          {
            color: colors.foreground,
          },
        ]}
      />
    );
  }),
);
