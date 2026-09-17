import React, { useMemo } from 'react';
import {
  Pressable,
  Share,
  Text,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Pin,
} from 'lucide-react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { Note } from '@/lib/types/notes';

interface NoteCardProps {
  note: Note;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

function formatRelativeDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return 'Yesterday';
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
  } catch {
    return '';
  }
}

export const NoteCard = React.memo(function NoteCard({
  note,
  className,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: NoteCardProps) {
  const colors = useTheme();

  const parsedTags = useMemo(() => {
    try {
      const parsed = JSON.parse(note.tags || '[]');
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [note.tags]);

  const displayTitle = note.title.trim() || 'Untitled Note';
  const displaySnippet = note.content.trim() || 'No additional text';
  const formattedDate = formatRelativeDate(note.updatedAt);

  const handleShare = async () => {
    try {
      await Share.share({
        title: displayTitle,
        message: `${displayTitle}\n\n${note.content}`,
      });
    } catch {
      // Ignored
    }
  };

  const handlePinPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onTogglePin(note.id);
  };

  const handleArchivePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleArchive(note.id);
  };

  const handleDeletePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(note.id);
  };

  return (
    <Link
      href={{
        pathname: '/notes/[id]',
        params: { id: note.id },
      }}
      className={className}
      asChild>
      <Link.Trigger>
        <Pressable className="p-3.5 rounded-2xl border border-border bg-card my-1 shadow-sm active:opacity-90 active:scale-[0.99]">
          {/* Header Row: Title & Pin/Date */}
          <View className="flex-row items-center justify-between gap-2 mb-1 border-b border-border pb-1">
            <View className="flex-1 flex-row items-center gap-1.5">
              {note.isPinned && (
                <Pin
                  size={14}
                  color={colors.primary}
                  fill={colors.primary}
                  // style={{ transform: [{ rotate: '45deg' }] }}
                />
              )}
              <ThemedText
                numberOfLines={2}
                className="font-semibold text-base text-text flex-1">
                {displayTitle}
              </ThemedText>
            </View>

            <Text className="text-xs font-mono text-text-secondary">
              {formattedDate}
            </Text>
          </View>

          {/* Snippet Row */}
          <ThemedText
            numberOfLines={2}
            className="text-[13px] leading-5 text-text-secondary mb-2.5">
            {displaySnippet}
          </ThemedText>

          {/* Footer: Tags List */}
          {parsedTags.length > 0 && (
            <View className="flex-row flex-wrap items-center gap-1.5 mt-0.5">
              {parsedTags.slice(0, 3).map((tag, index) => (
                <View
                  key={`${tag}-${index}`}
                  className="px-2 py-0.5 rounded-full border border-border bg-background-element">
                  <Text className="text-[11px] font-medium text-text-secondary">
                    #{tag}
                  </Text>
                </View>
              ))}
              {parsedTags.length > 3 && (
                <Text className="text-[11px] font-medium text-text-secondary self-center">
                  +{parsedTags.length - 3}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      </Link.Trigger>

      {/* Native Context Menu on iOS / Fallback */}
      <Link.Menu>
        <Link.MenuAction
          title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
          icon={note.isPinned ? 'pin.slash' : 'pin'}
          onPress={handlePinPress}
        />
        <Link.MenuAction
          title={note.isArchived ? 'Unarchive Note' : 'Archive Note'}
          icon={note.isArchived ? 'archivebox.fill' : 'archivebox'}
          onPress={handleArchivePress}
        />
        <Link.MenuAction
          title="Share Note"
          icon="square.and.arrow.up"
          onPress={handleShare}
        />
        <Link.MenuAction
          title="Delete Note"
          icon="trash"
          destructive
          onPress={handleDeletePress}
        />
      </Link.Menu>
    </Link>
  );
});
