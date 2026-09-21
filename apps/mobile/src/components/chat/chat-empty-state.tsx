import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Sparkles, Compass, FolderSync, Lightbulb } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string, autoSubmit?: boolean) => void;
}

const SUGGESTIONS = [
  {
    id: '1',
    label: 'Summarize recent notes',
    prompt: 'Summarize my recent notes and highlight key action items.',
    Icon: Sparkles,
  },
  {
    id: '2',
    label: 'Brainstorm ideas',
    prompt: 'Help me brainstorm fresh concepts and ideas for my current projects.',
    Icon: Lightbulb,
  },
  {
    id: '3',
    label: 'Organize workspace',
    prompt: 'Review my notes and suggest folders to organize them better.',
    Icon: FolderSync,
  },
  {
    id: '4',
    label: 'Synthesize insights',
    prompt: 'What recurring themes or insights stand out across my notes?',
    Icon: Compass,
  },
];

export function ChatEmptyState({ onSelectPrompt }: EmptyStateProps) {
  const colors = useTheme();

  const handlePromptPress = (prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectPrompt(prompt, true);
  };

  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      {/* 🌌 Ambient Focal Glyph */}
      <View className="items-center justify-center mb-7">
        <View className="w-16 h-16 rounded-full bg-background-element border border-border/80 items-center justify-center shadow-xs">
          <View className="w-9 h-9 rounded-full bg-background border border-border/60 items-center justify-center">
            <View className="w-2.5 h-2.5 rounded-full bg-primary" />
          </View>
        </View>

        <Text className="text-xl font-medium text-text mt-5 tracking-tight text-center">
          Clear space to think
        </Text>
        <Text className="text-xs text-text-secondary mt-1.5 text-center leading-relaxed max-w-[260px]">
          Explore thoughts, draft notes, or synthesize insights with iKeen.
        </Text>
      </View>

      {/* ✦ Floating Spark Capsules */}
      <View className="w-full max-w-[340px] flex-row flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((item) => {
          const Icon = item.Icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => handlePromptPress(item.prompt)}
              hitSlop={8}
              className="flex-row items-center gap-2 px-3.5 py-2.5 rounded-full bg-background-element border border-border/80 active:bg-background-selected">
              <Icon size={13} color={colors.primary} />
              <Text className="text-xs font-medium text-text">
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
