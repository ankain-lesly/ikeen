import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Sparkles, FileText, Compass, FolderSync } from 'lucide-react-native';
import { IKeenMascot } from '@/components/ikeen-mascot';
import { useTheme } from '@/hooks/use-theme';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    id: '1',
    label: 'Summarize Recent Notes',
    prompt: 'Summarize my recent notes and highlight key action items.',
    Icon: Sparkles,
  },
  {
    id: '2',
    label: 'Search Notes',
    prompt: 'What notes do I have about current projects?',
    Icon: FileText,
  },
  {
    id: '3',
    label: 'Brainstorm Ideas',
    prompt: 'Help me brainstorm ideas for expanding iKeen with new workflows.',
    Icon: Compass,
  },
  {
    id: '4',
    label: 'Organize Folders',
    prompt: 'Review my notes and suggest folders to organize them better.',
    Icon: FolderSync,
  },
];

export function ChatEmptyState({ onSelectPrompt }: EmptyStateProps) {
  const colors = useTheme();

  const handlePromptPress = (prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectPrompt(prompt);
  };

  return (
    <View className="flex-1 items-center justify-center px-6 py-8">
      {/* Centered Mascot */}
      <View className="items-center mb-6">
        <IKeenMascot size={130} />
        <Text className="text-xl font-bold text-text mt-4 text-center tracking-tight">
          Eye-Keen on Ideas
        </Text>
        <Text className="text-sm text-text-secondary mt-1.5 text-center leading-relaxed max-w-[280px]">
          Your curious thought partner. Brainstorm, capture notes, or synthesize insights.
        </Text>
      </View>

      {/* Suggestion Chips */}
      <View className="w-full gap-2.5 max-w-[340px]">
        {SUGGESTED_PROMPTS.map((item) => {
          const Icon = item.Icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => handlePromptPress(item.prompt)}
              className="px-4 py-3 rounded-2xl bg-card border border-border flex-row items-center gap-3 active:bg-background-selected">
              <View className="w-7 h-7 rounded-lg bg-background-element items-center justify-center">
                <Icon size={15} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-semibold text-text">
                  {item.label}
                </Text>
                <Text
                  className="text-[11px] text-text-secondary mt-0.5"
                  numberOfLines={1}>
                  {item.prompt}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
