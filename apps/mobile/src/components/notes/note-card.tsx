import React, { useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
import { Link } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { ArchiveRestore, Pin } from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import type { Note } from "@/lib/types/notes";
import { useTheme } from "@/hooks/use-theme";
import NotesDetailDropdown from "./notes-detail-dropdown";
import { formatTimeAgo } from "@repo/utils/date";

interface NoteCardProps {
  note: Note;
  onTogglePin?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export const NoteCard = React.memo(function NoteCard({
  note,
  className,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: NoteCardProps) {
  const colors = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const parsedTags = useMemo(() => {
    try {
      const parsed = JSON.parse(note.tags || "[]");
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [note.tags]);

  const displayTitle = note.title.trim() || "Untitled Note";
  const displaySnippet = note.content.trim() || "No additional text";
  const formattedDate = formatTimeAgo(note.updatedAt);

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
    onTogglePin?.(note.id);
  };

  const handleArchivePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleArchive?.(note.id);
  };

  const handleDeletePress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete?.(note.id);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsMenuOpen(true);
  };

  return (
    <>
      <Link
        href={{
          pathname: "/notes/[id]",
          params: { id: note.id },
        }}
        onLongPress={handleLongPress}
        className={className}
        asChild>
        <Link.Trigger>
          <Pressable className="p-3.5 rounded-xl border border-border bg-card shadow-sm active:opacity-90 active:scale-[0.99] gap-1">
            {/* Header Row: Title & Pin/Date */}
            <View className="flex-row items-center justify-between gap-2">
              <View className="gap-1.5">
                <View className="flex-row items-center justify-right gap-1 w-full">
                  <Text className="text-[10px] inline-block mr-auto font-mono text-text-secondary">
                    {formattedDate}
                  </Text>
                  {note.isPinned && (
                    <Pin
                      size={12}
                      color={colors.primary}
                      fill={colors.primary}
                      // style={{ transform: [{ rotate: '45deg' }] }}
                    />
                  )}

                  <View/>
                  
                  {note.isArchived && (
                    <ArchiveRestore
                      size={12}
                      color={colors.textSecondary}
                    />
                  )}

                  {/*  Menu Context */}
                  <NotesDetailDropdown
                    isExpanded={isMenuOpen}
                    setIsExpanded={(a) => setIsMenuOpen(a)}
                    // customTrigger={
                    //   <MoreVertical size={14} color={colors.textSecondary} />
                    // }
                    isDeleted={!!note.deletedAt}
                    noteId={note.id}
                    iconStyle={{ size: 14, className: "pl-2" }}
                    isPinned={note.isPinned}
                    isArchived={note.isArchived}
                    onTogglePin={handlePinPress}
                    onToggleArchive={handleArchivePress}
                    onDelete={handleDeletePress}
                    onShare={handleShare}
                  />
                </View>

                <ThemedText
                  numberOfLines={2}
                  className="font-semibold text-base text-text flex-1">
                  {displayTitle}
                </ThemedText>
              </View>
            </View>

            {/* Footer: Tags List */}
            {/* TODO: Only list */}
            {parsedTags.length > 0 && (
              <View className="flex-row overflow-hidden__flex-wrap items-center gap-1.5 mt-0.5">
                {parsedTags.slice(0, 2).map((tag, index) => (
                  <View
                    key={`${tag}-${index}`}
                    className="px-2 py-0.5 rounded-full border border-border bg-background-element">
                    <Text className="text-[11px] font-medium text-text-secondary">
                      #{tag}
                    </Text>
                  </View>
                ))}
                {parsedTags.length > 2 && (
                  <Text className="text-[11px] font-bold text-text-secondary self-center">
                    +{parsedTags.length - 2}
                  </Text>
                )}
              </View>
            )}

            {/* Snippet Row */}
            <ThemedText
              numberOfLines={2}
              className="text-[13px] leading-5 text-text-secondary mb-2.5">
              {displaySnippet}
            </ThemedText>
          </Pressable>
        </Link.Trigger>

        {/* Native Context Menu on iOS / Fallback */}
        <Link.Menu>
          <Link.MenuAction
            title={note.isPinned ? "Unpin Note" : "Pin Note"}
            icon={note.isPinned ? "pin.slash" : "pin"}
            onPress={handlePinPress}
          />
          <Link.MenuAction
            title={note.isArchived ? "Unarchive Note" : "Archive Note"}
            icon={note.isArchived ? "archivebox.fill" : "archivebox"}
            onPress={handleArchivePress}
          />
          <Link.MenuAction
            title="Share Note"
            icon="square.and.arrow.up"
            onPress={handleShare}
          />
          <Link.MenuAction
            title="Trash Note"
            icon="trash"
            destructive
            onPress={handleDeletePress}
          />
        </Link.Menu>
      </Link>
    </>
  );
});
