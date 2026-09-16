import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  Clock,
  Hash,
  X,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Note } from '@/lib/types/notes';

interface NoteInfoSheetProps {
  note: Note | null;
  visible: boolean;
  onClose: () => void;
}

function formatFullDate(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export const NoteInfoSheet = React.memo(function NoteInfoSheet({
  note,
  visible,
  onClose,
}: NoteInfoSheetProps) {
  const colors = useTheme();

  if (!note) return null;

  const wordCount = note.content.trim()
    ? note.content.trim().split(/\s+/).length
    : 0;
  const charCount = note.content.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  let tags: string[] = [];
  try {
    tags = JSON.parse(note.tags || '[]');
  } catch {
    tags = [];
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}>
      <View className="flex-1 justify-end bg-black/45">
        <Pressable className="flex-1" onPress={handleClose} />

        <View className="rounded-t-3xl border-t border-border px-5 pb-9 bg-card">
          {/* Header Grabber */}
          <View className="items-center py-2.5">
            <View className="w-9 h-1 rounded-full bg-border" />
          </View>

          {/* Header Row */}
          <View className="flex-row items-center justify-between pb-4 border-b border-border">
            <ThemedText type="subtitle" className="font-semibold text-lg text-text">
              Note Details
            </ThemedText>
            <Pressable
              className="w-7 h-7 rounded-full justify-center items-center bg-background-element active:opacity-70"
              onPress={handleClose}>
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Stats Grid */}
          <View className="flex-row gap-3 my-4">
            <View className="flex-1 p-3 rounded-2xl border border-border bg-background-element">
              <Text className="text-xs text-text-secondary">
                Words
              </Text>
              <Text className="text-xl font-bold mt-1 text-text">
                {wordCount}
              </Text>
            </View>

            <View className="flex-1 p-3 rounded-2xl border border-border bg-background-element">
              <Text className="text-xs text-text-secondary">
                Characters
              </Text>
              <Text className="text-xl font-bold mt-1 text-text">
                {charCount}
              </Text>
            </View>

            <View className="flex-1 p-3 rounded-2xl border border-border bg-background-element">
              <Text className="text-xs text-text-secondary">
                Reading Time
              </Text>
              <Text className="text-xl font-bold mt-1 text-text">
                ~{readingTimeMinutes}m
              </Text>
            </View>
          </View>

          {/* Date Rows */}
          <View className="gap-3 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Calendar size={15} color={colors.textSecondary} />
                <Text className="text-sm text-text-secondary">
                  Created
                </Text>
              </View>
              <Text className="text-sm font-medium text-text">
                {formatFullDate(note.createdAt)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Clock size={15} color={colors.textSecondary} />
                <Text className="text-sm text-text-secondary">
                  Modified
                </Text>
              </View>
              <Text className="text-sm font-medium text-text">
                {formatFullDate(note.updatedAt)}
              </Text>
            </View>
          </View>

          {/* Tags */}
          {tags.length > 0 && (
            <View className="mt-2 pt-3 border-t border-border">
              <View className="flex-row items-center gap-2 mb-2">
                <Hash size={14} color={colors.textSecondary} />
                <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Tags ({tags.length})
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <View
                    key={`${tag}-${idx}`}
                    className="px-2.5 py-1 rounded-full border border-border bg-background-element">
                    <Text className="text-xs font-medium text-text">
                      #{tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});
