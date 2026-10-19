import {
  forwardRef,
  memo,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
} from "react";
import {  TextInput, type StyleProp, type ViewStyle } from "react-native";
import {
  EnrichedMarkdownText,
  EnrichedMarkdownTextInput,
  type EnrichedMarkdownTextInputInstance,
  type LinkPressEvent,
} from "react-native-enriched-markdown";
import { useTheme } from "@/hooks/use-theme";
import { useMarkdownStyle } from "./markdown-styles";
import { OpenURLSheet } from "../notes/open-url-sheet";
 

export type MarkdownFormatAction =
  "bold" | "italic" | "heading" | "list" | "checklist";

export type MarkdownEditorHandle = {
  focus: () => void;
  getMarkdown: () => Promise<string | null>;
  format: (action: MarkdownFormatAction) => void;
};
 

const containerStyle: StyleProp<ViewStyle> = {
  width: "100%",
  // minHeight: screenHeight,
};
const editorStyle: StyleProp<ViewStyle> = {
  width: "100%",
  // minHeight: "100%",
  // minHeight: screenHeight,
  paddingBottom: 96,
};

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
        // Style
        markdownStyle={markdownStyle}
        containerStyle={containerStyle}
        streamingAnimation={streaming}

        enableTaskListItemToggle={false}
        // ISSUE: on link long press selects instead of trigger the function. SO we use on press
        // onLinkPress={openLink}
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
      defaultValue?: string;
      placeholder?: string;
      placeholderTextColor?: string;
      onChangeMarkdown?: (markdown: string) => void;
      onChangeText?: (text: string) => void;
    }
  >(function MarkdownEditor(
    { defaultValue = "", placeholder, onChangeText, onChangeMarkdown },
    ref,
  ) {
    // const nativeRef = useRef<EnrichedMarkdownTextInputInstance>(null);
    const nativeRef = useRef<TextInput>(null);
    const colors = useTheme();
    const markdownStyle = useMarkdownStyle();


    // Fix: Use correct method names for React Native's TextInput, which does not have toggleBold, toggleItalic, toggleHeading etc.
    // Also, .value() is not a method on TextInput. Instead, access .value via .current?.props.value or use a controlled value.
    // Since it's a plain TextInput, formatting actions should manipulate the text value instead.
    // So expose focus, getMarkdown (returns current value), and format (makes changes to value via a callback/prop).

    // We'll need to use a controlled input approach
    const [internalValue, setInternalValue] = useState(defaultValue);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => nativeRef.current?.focus(),
        getMarkdown: async () => internalValue,
        format: (action: "bold" | "italic" | "heading" | "list" | "checklist") => {
          let newValue = internalValue;
          switch (action) {
            case "bold":
              newValue = `${newValue}**bold**`;
              break;
            case "italic":
              newValue = `${newValue}*italic*`;
              break;
            case "heading":
              newValue = `${newValue}\n## Heading`;
              break;
            case "list":
              newValue = `${newValue}\n- List`;
              break;
            case "checklist":
              newValue = `${newValue}\n- [ ] Checklist`;
              break;
          }
          setInternalValue(newValue);
          onChangeText?.(newValue);
        },
      }),
      [internalValue, onChangeText],
    );

    // // Native
    // useImperativeHandle(
    //   ref,
    //   () => ({
    //     focus: () => nativeRef.current?.focus(),
    //     getMarkdown: async () =>
    //       (await nativeRef.current?.getMarkdown()) ?? null,
    //     format: (action) => {
    //       const editor = nativeRef.current;
    //       if (!editor) return;
    //       switch (action) {
    //         case "bold":
    //           editor.toggleBold();
    //           break;
    //         case "italic":
    //           editor.toggleItalic();
    //           break;
    //         case "heading":
    //           editor.toggleHeading(2);
    //           break;
    //         case "list":
    //           editor.toggleUnorderedList();
    //           break;
    //         case "checklist":
    //           editor.insertText("- [ ] ");
    //           break;
    //       }
    //     },
    //   }),
    //   [],
    // );

    return (
      <TextInput
        ref={nativeRef}
        defaultValue={defaultValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}

        // onChangeMarkdown={(e) => {
        //   onChangeMarkdown?.(e);
        //   log({ e });
        // }}
        onChangeText={(e) => {
          onChangeText?.(e);
          setInternalValue(e)
          // log({ e });
        }}
        multiline
        scrollEnabled={false}
        // Style
        // markdownStyle={markdownStyle}
        // markdownShortcuts={markdownShortcuts}
        style={[
          {
            
            width: "100%",
            // minHeight: "100%",
            paddingBottom: 96,
            // backgroundColor: "red",
            verticalAlign: "top",
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
