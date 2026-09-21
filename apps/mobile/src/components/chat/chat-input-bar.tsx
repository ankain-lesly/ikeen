import React, { useRef } from 'react';
import { View, TextInput, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArrowUp, Square } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

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
  placeholder = 'Type a thought or ask iKeen...',
}: InputBarProps) {
  const colors = useTheme();
  const inputRef = useRef<TextInput>(null);

  const canSubmit = input.trim().length > 0 && !isLoading;

  const handlePressAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLoading) {
      onStop();
    } else if (canSubmit) {
      onSubmit();
    }
  };

  return (
    <View className="px-4 py-2.5 bg-background border-t border-border/80 pb-safe">
      <View className="flex-row items-end gap-2 p-1.5 rounded-3xl bg-background-element border border-border">
        {/* Multiline Auto-Growing TextInput */}
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={2000}
          textAlignVertical="center"
          style={{
            minHeight: 38,
            maxHeight: 120,
            paddingTop: Platform.OS === 'ios' ? 8 : 6,
            paddingBottom: Platform.OS === 'ios' ? 8 : 6,
            paddingLeft: 12,
            paddingRight: 8,
            fontSize: 15,
            color: colors.text,
          }}
          className="flex-1"
        />

        {/* Action Button (Send or Stop) */}
        <Pressable
          onPress={handlePressAction}
          disabled={!canSubmit && !isLoading}
          hitSlop={8}
          className="w-9 h-9 rounded-full items-center justify-center mb-0.5 active:scale-95"
          style={{
            backgroundColor: isLoading
              ? colors.backgroundSelected
              : canSubmit
              ? colors.primary
              : colors.backgroundSelected,
            opacity: canSubmit || isLoading ? 1 : 0.45,
          }}>
          {isLoading ? (
            <Square size={14} color={colors.text} fill={colors.text} />
          ) : (
            <ArrowUp
              size={18}
              color={canSubmit ? '#ffffff' : colors.textSecondary}
              strokeWidth={2.5}
            />
          )}
        </Pressable>
      </View>
    </View>
  );
}
