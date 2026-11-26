import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  MoreVertical,
  PanelBottom,
  Trash2,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import { OptionSheet, type SheetAction } from "@/components/ui/option-sheet";
import type { NoteBlock } from "@/lib/types/notes";
import { capitalize } from "@repo/utils";
import { Card } from "@/components/ui/card";

const BlockWrapperContext = createContext<React.MutableRefObject<
  SheetAction[]
> | null>(null);

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
  children,
}: BlockWrapperProps) {
  const colors = useTheme();
  const [optionsActions, setOptionsActions] = useState<SheetAction[] | null>(
    null,
  );
  const contextualActionsRef = useRef<SheetAction[]>([]);

  const badgeText =
    block.type === "list"
      ? `List • Block - (${block.listType || "checkbox"})`
      : `${block.type} Block`;

  const wrapAction =
    (fn?: () => void, destructive = false) =>
    () => {
      setOptionsActions(null);
      if (destructive) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.selectionAsync();
      }
      fn?.();
    };

  const handleOpenOptions = () => {
    Haptics.selectionAsync();
    setOptionsActions([
      ...contextualActionsRef.current.map((action) => ({
        ...action,
        onPress: wrapAction(action.onPress),
      })),
      ...(canMoveUp
        ? [
            {
              label: "Move Up",
              icon: <ArrowUp size={18} color={colors.text} />,
              onPress: wrapAction(onMoveUp),
            },
          ]
        : []),
      ...(canMoveDown
        ? [
            {
              label: "Move Down",
              icon: <ArrowDown size={18} color={colors.text} />,
              onPress: wrapAction(onMoveDown),
            },
          ]
        : []),
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
    ]);
  };

  return (
    <BlockWrapperContext.Provider value={contextualActionsRef}>
      <View className={`group relative w-full ${isEditing ? "mb-1" : "py-1 mb-1"}`}>
        {isEditing && (
          <View className="flex-row items-center justify-between py-1.5">
            <View className="flex-row items-center gap-1.5 py-1 px-1.5 rounded-md">
              <PanelBottom size={20} color={colors.primary} />
              <View className="px-1.5 py-0.5 rounded bg-background-element">
                <Text className="text-xs font-bold tracking-wider text-primary">
                  {capitalize(badgeText)}
                </Text>
              </View>
            </View>

            <Card className="px-3 flex-row items-center gap-4 rounded-full">
              {canMoveUp && (
                <Pressable
                  onPress={wrapAction(onMoveUp)}
                  accessibilityRole="button"
                  accessibilityLabel="Move block up"
                  hitSlop={8}>
                  <ArrowUp size={18} color={colors.text} />
                </Pressable>
              )}
              {canMoveDown && (
                <Pressable
                  onPress={wrapAction(onMoveDown)}
                  accessibilityRole="button"
                  accessibilityLabel="Move block down"
                  hitSlop={8}>
                  <ArrowDown size={18} color={colors.text} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Block options"
                hitSlop={8}
                onPress={handleOpenOptions}>
                <MoreVertical size={18} color={colors.textSecondary} />
              </Pressable>
            </Card>
          </View>
        )}

        <View className="w-full">{children}</View>

        {optionsActions !== null && (
          <OptionSheet
            isPresented
            onDismiss={() => setOptionsActions(null)}
            actions={optionsActions}
          />
        )}
      </View>
    </BlockWrapperContext.Provider>
  );
});
