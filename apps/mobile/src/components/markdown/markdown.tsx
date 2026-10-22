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

const containerStyle: StyleProp<ViewStyle> = {
  width: "100%",
};

const editorStyle = {
  width: "100%",
  verticalAlign: "top",
} as const;

const markdownShortcuts = {
  heading: true,
  unorderedList: true,
  orderedList: true,
} as const;

// function openLink({ url }: LinkPressEvent) {
//   if (!url.startsWith("https://") && !url.startsWith("http://")) return;
//   void Linking.openURL(url).catch(() => {});
// }

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

  const markdownStyle = useMarkdownStyle(size);
  return (
    <>
      <EnrichedMarkdownText
        markdown={source}
        flavor="github"
        markdownStyle={markdownStyle}
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
      onChangeText?: (text: string) => void;
      onBlur?: () => void;
    }
  >(function MarkdownEditor(
    { defaultValue = "", style, placeholder, placeholderTextColor, onChangeText, onBlur },
    ref,
  ) {
    const nativeRef = useRef<TextInput>(null);
    const colors = useTheme();
    const [internalValue, setInternalValue] = useState(defaultValue);

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
        onBlur={onBlur}
        multiline
        scrollEnabled={false}
        style={[
          editorStyle,
          style,
          {
            color: colors.foreground,
          },
        ]}
      />
    );
    // return (
    //   <EnrichedMarkdownTextInput
    //     ref={nativeRef}
    //     defaultValue={defaultValue}
    //     placeholder={placeholder}
    //     placeholderTextColor={colors.textSecondary}
    //     onChangeMarkdown={(e) => {
    //       onChangeMarkdown?.(e);
    //       log({ e });
    //     }}
    //     onChangeText={(e) => {
    //       onChangeText?.(e);
    //       log({ e });
    //     }}
    //     multiline
    //     scrollEnabled={false}
    //     // Style
    //     markdownStyle={markdownStyle}
    //     markdownShortcuts={markdownShortcuts}
    //     style={editorStyle}
    //   />
    // );
  }),
);
