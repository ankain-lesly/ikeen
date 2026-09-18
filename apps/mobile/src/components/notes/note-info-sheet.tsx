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
  Folder,
  Hash,
  X,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Note } from '@/lib/types/notes';
import { formatFullDate } from '@repo/utils/date';
import { calculateReadingTime, countWords } from '@repo/utils/string';

interface NoteInfoSheetProps {
  note: Note | null;
  visible: boolean;
  folderName?: string | null;
  onClose: () => void;
  onOpenMoveToFolder?: () => void;
}

export const NoteInfoSheet = React.memo(function NoteInfoSheet({
  note,
  visible,
  folderName,
  onClose,
  onOpenMoveToFolder,
}: NoteInfoSheetProps) {
  const colors = useTheme();

  if (!note) return null;

  const wordCount = countWords(note.content);
  const charCount = note.content.length;
  const readingTimeMinutes = calculateReadingTime(note.content);

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

            {/* Folder Row */}
            <View className="flex-row items-center justify-between pt-2 border-t border-border/50">
              <View className="flex-row items-center gap-2">
                <Folder size={15} color={colors.textSecondary} />
                <Text className="text-sm text-text-secondary">
                  Folder
                </Text>
              </View>
              {onOpenMoveToFolder ? (
                <Pressable
                  onPress={() => {
                    handleClose();
                    onOpenMoveToFolder();
                  }}
                  className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background-element active:opacity-70">
                  <Text className="text-sm font-semibold text-primary">
                    {folderName || 'Unorganized'}
                  </Text>
                  <Text className="text-xs text-text-secondary">Change</Text>
                </Pressable>
              ) : (
                <Text className="text-sm font-medium text-text">
                  {folderName || 'Unorganized'}
                </Text>
              )}
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
