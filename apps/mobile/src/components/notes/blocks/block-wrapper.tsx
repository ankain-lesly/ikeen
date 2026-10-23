import React, { createContext, useContext, useLayoutEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  MoreVertical,
  PanelBottom,
  Trash2,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import { OptionSheet, type SheetAction } from "@/components/ui/option-sheet";
import type { NoteBlock } from "@/lib/types/notes";
import { capitalize } from "@repo/utils";

const BlockWrapperContext =
  createContext<React.MutableRefObject<SheetAction[]> | null>(null);

/**
 * Registers contextual actions from a child block into the parent BlockWrapper's
 * OptionSheet via a ref (zero extra state updates or effect cycles).
 */
export function useRegisterBlockActions(actions: SheetAction[]) {
  const actionsRef = useContext(BlockWrapperContext);
  useLayoutEffect(() => {
    if (actionsRef) actionsRef.current = actions;
  }, [actionsRef, actions]);
}

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
  const [optionsActions, setOptionsActions] = useState<SheetAction[] | null>(null);
  const contextualActionsRef = useRef<SheetAction[]>([]);

  const badgeText =
    block.type === "list"
      ? `List • Block - (${(block.listType || "checkbox")})`
      : `${block.type} Block`;

  const wrapAction = (fn?: () => void, destructive = false) => () => {
    setOptionsActions(null);
    if (destructive) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.selectionAsync();
    }
    fn?.();
  };

  // Build sheet actions strictly inside event handler so refs are never accessed during render
  const handleOpenOptions = () => {
    Haptics.selectionAsync();
    const contextual = contextualActionsRef.current;
    const actions: SheetAction[] = [
      ...contextual.map((action) => ({
        ...action,
        onPress: wrapAction(action.onPress),
      }))                       ,
      {
        label: "Move Up",
        icon: <ChevronUp size={18} color={colors.text} />,
        onPress: wrapAction(onMoveUp),
        visible: canMoveUp,
      },
      {
        label: "Move Down",
        icon: <ChevronDown size={18} color={colors.text} />,
        onPress: wrapAction(onMoveDown),
        visible: canMoveDown,
      },
      {
        label: "Duplicate",
        icon: <Copy size={18} color={colors.text} />,
        onPress: wrapAction(onDuplicate),
        visible: !!onDuplicate,
      },
      {
        label: "Delete Block",
        icon: <Trash2 size={18} color="#ef4444" />,
        color: "#ef4444",
        onPress: wrapAction(onDelete, true),
        visible: !!onDelete,
      },
    ];
    setOptionsActions(actions);
  };

  return (
    <BlockWrapperContext.Provider value={contextualActionsRef}>
      <View
        className={`group relative w-full mb-1 ${isEditing ? "mb-1" : "py-1"}`}>
        {isEditing && (
          <View className="flex-row items-center justify-between py-1.5 bg-card_rounded-md">
            <Pressable
              {...dragHandleProps}
              accessibilityRole="button"
              accessibilityLabel="Reorder block"
              className="flex-row items-center gap-1.5 py-1 px-1.5 rounded-md active:bg-background-element active:opacity-70"
              hitSlop={8}>
              {/* TODO: Drag Does not work -> SKip For Later Review */}
              {/* <GripVertical size={20} color={colors.textSecondary} /> */}
              <PanelBottom size={20} color={colors.primary} />

              <View className="px-1.5 py-0.5 rounded bg-background-element">
                <Text className="text-xs font-bold tracking-wider text-primary">
                  {capitalize(badgeText.toString())}{" "}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Block options"
              className="p-1.5 rounded-full active:bg-background-element"
              hitSlop={8}
              onPress={handleOpenOptions}>
              <MoreVertical size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        <View className="w-full">{children}</View>

        {optionsActions !== null && (
          <OptionSheet
            isPresented={true}
            onDismiss={() => setOptionsActions(null)}
            // title={`Block Options (${block.type})`}
            // title={`${capitalize(block.type)} Block`.split(" ").join(" ")}
            actions={optionsActions}
          />
        )}
      </View>
    </BlockWrapperContext.Provider>
  );
});
