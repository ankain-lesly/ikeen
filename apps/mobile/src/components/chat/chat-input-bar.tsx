/**
 * Reusable floating clarity input for Clarity Entry and Coaching screens.
 * Simple layout: (1) Full-width text input; (2) Icon row: Mic (audio) + Send only.
 * Add context and Refine/Suggest live in other components (e.g. in-scroll button, header).
 */
import React, { useMemo } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Text,
} from "react-native";
import * as Haptics from "expo-haptics";
import { ArrowUp } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { ThemeColor } from "@/constants/theme";
import { useKeyboardGradualAnimation } from "@/hooks/use-gradual-animation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface InputBarProps {
  input: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onStop: () => void;
  placeholder?: string;
}

export function ChatInputBar({
  input,
  onChangeText,
  onSubmit,
  isLoading,
  onStop,
  placeholder = "Ask iKeen or capture a thought...",
}: InputBarProps) {
  const hasText = input.trim().length > 0;
  const canSubmit = hasText && !isLoading;

  const handlePressAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLoading) {
      onStop();
    } else if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <ChatInputComponent
      // placeholder={"Ask one deeper question"}
      placeholder={placeholder}
      inputContext={
        {
          // age_range: "2",
        }
      }
      value={input}
      onChangeText={onChangeText}
      onSubmit={handlePressAction}
      onAddContext={() => {}}
      onRefine={() => {}}
      disabled={isLoading}
    />
  );
}

export type InputContextType = {
  user_type?: string | null;
  values?: string[] | null;
  hobbies?: string[] | null;
  age_range?: string | null;
  refine?: string;
};

export type ClarityFloatingInputProps = {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  /** Bottom safe area padding */
  /** Show Refine (orange M) button; coaching only */
  showRefineButton?: boolean;
  onRefine?: () => void;
  /** Optional: Plus button (e.g. Add context) */
  onAddContext?: () => void;
  /** Optional: voice input; no-op if not provided */
  onVoice?: () => void;
  inputContext: InputContextType;
  disabled?: boolean;
};

export const ICON_BTN_SIZE = 44;
export const BAR_RADIUS = 14;

function ChatInputComponent({
  placeholder,
  value,
  onChangeText,
  onSubmit,
  showRefineButton = false,
  onRefine,
  onAddContext,
  onVoice,
  disabled = false,
  inputContext,
}: ClarityFloatingInputProps) {
  const canSubmit = value.trim().length > 0 && !disabled;
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { isVisible } = useKeyboardGradualAnimation();

  const handleSubmit = () => {
    if (!canSubmit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit();
  };

  // const handleRefine = () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  //   onRefine?.();
  // };

  // const handleAddContext = () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  //   onAddContext?.();
  // };

  // const handleVoice = () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  //   onVoice?.();
  // };
  const styles = useMemo(() => createStyles(theme), [theme]);

  const bottomPadding = Math.max(insets.bottom, 12) + 12;

  const context = Object.keys(inputContext).filter(
    (key) => !!inputContext[key as keyof InputContextType],
  );
  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: isVisible ? 8 : bottomPadding,
        },
      ]}>
      <View style={[styles.inputWrap]}>
        {/* Section 1: full-width input */}
        <TextInput
          style={[styles.input]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onChangeText}
          multiline
          maxLength={2000}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />

        {context.length > 0 && (
          <View style={styles.iconContext}>
            {context.map((c) => (
              <Text key={c} style={styles.iconContextText}>
                @{c.split("_").join("").toLowerCase()}
              </Text>
            ))}
          </View>
        )}
        {/* Section 2: icon row — Mic + Send only */}
        <View style={styles.iconRow}>
          {/* <Pressable
            onPress={handleAddContext}
            disabled={disabled}
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
            ]}
            hitSlop={8}>
            <Plus size={22} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
            ]}
            hitSlop={8}
            onPress={handleRefine}
            accessibilityLabel="Suggest">
            <Lightbulb size={22} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.iconBtn,
              { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
            ]}
            hitSlop={8}
            accessibilityLabel="More">
            <AppWindow
              // name="apps-outline"
              size={22}
              color={theme.textSecondary}
            />
          </Pressable> */}

          <View style={styles.spacer} />

          {/* <Pressable
            onPress={handleVoice}
            style={({ pressed }) => [
              styles.micBtn,
              {
                // backgroundColor: theme.backgroundElement,
                backgroundColor: theme.backgroundSelected,
                borderColor: theme.border,
                opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
            hitSlop={8}>
            <Mic size={22} color={theme.textSecondary} />
          </Pressable> */}

          {/* <View style={styles.spacer} /> */}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: canSubmit
                  ? theme.primary
                  : theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed && canSubmit ? 0.9 : 1,
              },
            ]}
            hitSlop={8}>
            {disabled ? (
              <ActivityIndicator size="small" color={theme.foreground} />
            ) : (
              <ArrowUp
                size={22}
                color={canSubmit ? theme.foreground : theme.textSecondary}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Record<ThemeColor, string>) =>
  StyleSheet.create({
    wrap: {
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      gap: 12,
      // backgroundColor: theme.backgroundSelected,
      // borderColor: theme.border,
    },
    inputWrap: {
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
    },
    input: {
      width: "100%",
      minHeight: 44,
      color: theme.text,
      maxHeight: 120,
      // borderRadius: 20,
      // borderWidth: 1,
      // paddingHorizontal: 16,
      // paddingVertical: 12,
      fontFamily: "DMSans_400Regular",
      fontSize: 14   },
    iconContext: {
      flexDirection: "row",
      alignItems: "center",
      overflow: "hidden",
      gap: 8,
    },
    iconContextText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: theme.primary,
    },
    iconRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    refineBtn: {
      width: ICON_BTN_SIZE,
      height: ICON_BTN_SIZE,
      borderRadius: BAR_RADIUS,
      alignItems: "center",
      justifyContent: "center",
    },
    refineLabel: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 16,
      color: "#FFF",
    },
    iconBtn: {
      width: ICON_BTN_SIZE,
      height: ICON_BTN_SIZE,
      borderRadius: BAR_RADIUS,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    spacer: {
      flex: 1,
    },
    micBtn: {
      width: ICON_BTN_SIZE,
      height: ICON_BTN_SIZE,
      borderRadius: BAR_RADIUS,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtn: {
      width: ICON_BTN_SIZE,
      height: ICON_BTN_SIZE,
      borderRadius: BAR_RADIUS,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });
