import React, { useState } from "react";
import { Pressable, View } from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  MoreVertical,
  Trash2,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import { OptionSheet } from "@/components/ui/option-sheet";
import type { NoteBlock } from "@/lib/types/notes";

export interface BlockWrapperProps {
  block: NoteBlock;
  isEditing: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  dragHandleProps?: any;
  children: React.ReactNode;
}

export const BlockWrapper = React.memo(function BlockWrapper({
  block,
  isEditing,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onDelete,
  onDuplicate,
  dragHandleProps,
  children,
}: BlockWrapperProps) {
  const colors = useTheme();
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const optionsActions = [
    {
      label: "Move Up",
      icon: <ChevronUp size={18} color={colors.text} />,
      onPress: () => {
        setIsOptionsOpen(false);
        Haptics.selectionAsync();
        onMoveUp?.();
      },
      visible: canMoveUp,
    },
    {
      label: "Move Down",
      icon: <ChevronDown size={18} color={colors.text} />,
      onPress: () => {
        setIsOptionsOpen(false);
        Haptics.selectionAsync();
        onMoveDown?.();
      },
      visible: canMoveDown,
    },
    {
      label: "Duplicate",
      icon: <Copy size={18} color={colors.text} />,
      onPress: () => {
        setIsOptionsOpen(false);
        Haptics.selectionAsync();
        onDuplicate?.();
      },
      visible: !!onDuplicate,
    },
    {
      label: "Delete Block",
      icon: <Trash2 size={18} color="#ef4444" />,
      color: "#ef4444",
      onPress: () => {
        setIsOptionsOpen(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDelete?.();
      },
      visible: !!onDelete,
    },
  ];

  return (
    <View className={`group relative w-full mb-3 rounded-2xl ${isEditing ? "border border-border/60 bg-card/40 p-2.5" : "py-1"}`}>
      {/* Header Bar when Editing: Drag Handle + Block Type & Actions */}
      {isEditing && (
        <View className="flex-row items-center justify-between pb-1.5 border-b border-border/30 mb-2">
          {/* Drag Handle */}
          <Pressable
            {...dragHandleProps}
            accessibilityRole="button"
            accessibilityLabel="Reorder block"
            className="flex-row items-center gap-1.5 py-1 px-1.5 rounded-md active:bg-background-element active:opacity-70"
            hitSlop={8}
          >
            <GripVertical size={16} color={colors.textSecondary} />
            <View className="px-1.5 py-0.5 rounded bg-background-element border border-border/40">
              <ThemedBadge text={block.type.toUpperCase()} />
            </View>
          </Pressable>

          {/* Block Options Trigger */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Block options"
            className="p-1.5 rounded-full active:bg-background-element"
            hitSlop={8}
            onPress={() => {
              Haptics.selectionAsync();
              setIsOptionsOpen(true);
            }}
          >
            <MoreVertical size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Block Body */}
      <View className="w-full">{children}</View>

      {/* Block Options Sheet */}
      {isOptionsOpen && (
        <OptionSheet
          isPresented={isOptionsOpen}
          onDismiss={() => setIsOptionsOpen(false)}
          title={`Block Options (${block.type})`}
          actions={optionsActions}
        />
      )}
    </View>
  );
});

function ThemedBadge({ text }: { text: string }) {
  return (
    <View>
      <Pressable>
        <TextWrapper text={text} />
      </Pressable>
    </View>
  );
}

import { Text } from "react-native";
function TextWrapper({ text }: { text: string }) {
  return <Text className="text-[10px] font-bold tracking-wider text-text-secondary">{text}</Text>;
}
