import React from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Haptics from '@/lib/haptics';

import { ThemedText } from '@/components/ui/themed-text';
import type { FolderWithCount } from '@/lib/types/folders';
import { FolderGlyph } from './folder-glyph';
import { FolderDetailDropdown } from './folder-detail-dropdown';

export interface FolderCardProps {
  folder: FolderWithCount;
  onPress: (folder: FolderWithCount) => void;
  onEdit: (folder: FolderWithCount) => void;
  onToggleLock: (folder: FolderWithCount) => void;
  onDelete: (folder: FolderWithCount) => void;
}

export const FolderCard = React.memo(function FolderCard({
  folder,
  onPress,
  onEdit,
  onToggleLock,
  onDelete,
}: FolderCardProps) {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress(folder);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsMenuOpen(true);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      className="w-full rounded-2xl bg-card border border-border p-4 shadow-sm active:opacity-85 active:scale-[0.98]">
      {/* Top Row: Folder Graphic + Overflow Dropdown */}
      <View className="flex-row items-start justify-between">
        <FolderGlyph
          color={folder.color}
          isLocked={folder.isLocked}
          size="md"
        />

        <FolderDetailDropdown
          folder={folder}
          isExpanded={isMenuOpen}
          setIsExpanded={setIsMenuOpen}
          onEdit={() => onEdit(folder)}
          onToggleLock={() => onToggleLock(folder)}
          onDelete={() => onDelete(folder)}
        />
      </View>

      {/* Bottom Labels: Folder Name & Notes Count */}
      <View className="mt-4">
        <ThemedText
          className="font-bold text-base tracking-tight text-text"
          numberOfLines={1}>
          {folder.name}
        </ThemedText>
        <Text className="text-xs text-text-secondary mt-1 font-mono">
          {folder.noteCount} {folder.noteCount === 1 ? 'note' : 'notes'}
        </Text>
      </View>
    </Pressable>
  );
});
