import React, { useRef } from "react";
import { View, TextInput, Pressable, Platform, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { ArrowUp, Square, Sparkles } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { ChatInputBar2 } from "./chat-input-bar2";

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
  const colors = useTheme();
  const inputRef = useRef<TextInput>(null);

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
    <ChatInputBar2
      placeholder={"Ask one deeper question"}
      inputContext={{
        age_range: "2",
        hobbies: ["foo", "bars"],
        refine: "demo",
        user_type: "worker",
        values: ["foo", "bars"],
      }}
      value={""}
      onChangeText={() => {}}
      onSubmit={() => {}}
      onAddContext={() => {}}
      onRefine={() => {}}
      disabled={false}
    />
  );
  return (
    <View className="px-4 pb-safe-offset-2 pt-2 bg-background border-t border-border/40">
      {/* Floating Modern Island Dock */}
      <View className="rounded-3xl bg-background-element border border-border/80 p-2 shadow-xs">
        {/* Multiline Auto-Growing TextInput */}
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={3000}
          textAlignVertical="center"
          style={{
            minHeight: 38,
            maxHeight: 120,
            paddingTop: Platform.OS === "ios" ? 6 : 4,
            paddingBottom: Platform.OS === "ios" ? 6 : 4,
            paddingHorizontal: 12,
            fontSize: 15,
            color: colors.text,
          }}
        />

        {/* Footer Dock Meta & Controls */}
        <View className="flex-row items-center justify-between pt-1.5 px-2">
          {/* Subtle Context Indicator */}
          <View className="flex-row items-center gap-1.5 py-0.5 px-2 rounded-full bg-background border border-border/60">
            <Sparkles size={11} color={colors.primary} />
            <Text className="text-[10px] font-medium text-text-secondary">
              Notes Context Active
            </Text>
          </View>

          {/* Dynamic Circular Send / Stop Button */}
          <Pressable
            onPress={handlePressAction}
            disabled={!canSubmit && !isLoading}
            hitSlop={8}
            className="w-12 h-12 rounded-full items-center justify-center active:scale-95 transition-all"
            style={{
              backgroundColor: isLoading
                ? colors.backgroundSelected
                : canSubmit
                  ? colors.primary
                  : colors.border,
              // opacity: canSubmit || isLoading ? 1 : 0.45,
            }}>
            {isLoading ? (
              <Square size={12} color={colors.text} fill={colors.text} />
            ) : (
              <ArrowUp
                size={16}
                color={canSubmit ? "#ffffff" : colors.textSecondary}
                strokeWidth={2.4}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
