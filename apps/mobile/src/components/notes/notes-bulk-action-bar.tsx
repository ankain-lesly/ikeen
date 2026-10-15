import React from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import {
  Archive,
  ArchiveRestore,
  FolderInput,
  Pin,
  RotateCcw,
  Trash2,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { Card } from "../ui/card";

export type NotesGridVariant = "default" | "trash";

interface NotesBulkActionBarProps {
  selectedCount: number;
  variant?: NotesGridVariant;
  isAllPinned?: boolean;
  isAllArchived?: boolean;
  onPin?: () => void;
  onMove?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onHardDelete?: () => void;
  onCancel: () => void;
}

export function NotesBulkActionBar({
  selectedCount,
  variant = "default",
  isAllPinned = false,
  isAllArchived = false,
  onPin,
  onMove,
  onArchive,
  onDelete,
  onRestore,
  onHardDelete,
  onCancel,
}: NotesBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      // style={{ bottom: BottomTabInset + 16 }}
      // className="absolute left-4 right-4 z-50"
    >
      <View className="bg-card border border-e-border rounded-2xl p-2 px-3 flex-row items-center justify-between shadow-lg">
        {/* Count & Cancel */}
        <View className="flex-row items-center gap-2 pl-1"></View>

        {/* <View className="flex-row items-center gap-2 pl-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel selection"
            onPress={() => {
              // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCancel();
            }}
            hitSlop={8}
            className="w-7 h-7 rounded-full bg-background-element items-center justify-center active:opacity-70">
            <X size={14} color={colors.textSecondary} />
          </Pressable>
          <Text className="text-sm font-semibold text-text">
            {selectedCount}{" "}
            <Text className="text-text-secondary font-normal">selected</Text>
          </Text>
        </View> */}

        {/* Action buttons */}
        <NotesBulkActions
          selectedCount={selectedCount}
          variant={variant}
          isAllPinned={isAllPinned}
          isAllArchived={isAllArchived}
          onPin={onPin}
          onMove={onMove}
          onArchive={onArchive}
          onDelete={onDelete}
          onRestore={onRestore}
          onHardDelete={onHardDelete}
          onCancel={onCancel}
        />
      </View>
    </Animated.View>
  );
}

export function NotesBulkActions({
  selectedCount,
  variant = "default",
  isAllPinned = false,
  isAllArchived = false,
  onPin,
  onMove,
  onArchive,
  onDelete,
  onRestore,
  onHardDelete,
  onCancel,
}: NotesBulkActionBarProps) {
  const colors = useTheme();

  const isTrash = variant === "trash";

  return (
    <Card className="rounded-full flex-row items-center gap-4">
      {isTrash ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restore selected notes"
            onPress={() => {
              // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRestore?.();
            }}
            hitSlop={4}
            className="">
            <RotateCcw size={20} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Permanently delete selected notes"
            onPress={() => {
              // Haptics.notificationAsync(
              //   Haptics.NotificationFeedbackType.Warning,
              // );
              onHardDelete?.();
            }}
            hitSlop={4}
            className="">
            <Trash2 size={20} color="#ef4444" />
          </Pressable>
        </>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isAllPinned ? "Unpin selected notes" : "Pin selected notes"
            }
            onPress={() => {
              // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPin?.();
            }}
            hitSlop={4}
            className="">
            <Pin
              size={20}
              color={isAllPinned ? colors.primary : colors.text}
              fill={isAllPinned ? colors.primary : "transparent"}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Move selected notes to folder"
            onPress={() => {
              // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onMove?.();
            }}
            hitSlop={4}
            className="">
            <FolderInput size={20} color={colors.text} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isAllArchived
                ? "Unarchive selected notes"
                : "Archive selected notes"
            }
            onPress={() => {
              // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onArchive?.();
            }}
            hitSlop={4}
            className="">
            {isAllArchived ? (
              <ArchiveRestore size={20} color={colors.text} />
            ) : (
              <Archive size={20} color={colors.text} />
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete selected notes"
            onPress={() => {
              // Haptics.notificationAsync(
              //   Haptics.NotificationFeedbackType.Warning,
              // );
              onDelete?.();
            }}
            hitSlop={4}
            className="">
            <Trash2 size={20} color="#ef4444" />
          </Pressable>
        </>
      )}
    </Card>
  );
}
