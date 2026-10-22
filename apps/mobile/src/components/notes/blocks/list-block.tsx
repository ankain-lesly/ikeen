import React, { useCallback, useMemo, useRef } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import {
  CheckSquare,
  Square,
  List as ListIcon,
  ListOrdered,
  Plus,
  X,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type {
  ListBlock as ListBlockType,
  ListItem,
  ListType,
} from "@/lib/types/notes";
import { AnimatedEntryView } from "@/components/ui/animated";
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
} from "@/components/markdown";
import { useRegisterBlockActions } from "./block-wrapper";
import type { SheetAction } from "@/components/ui/option-sheet";

export type ListBlockUpdateInput = {
  content?: ListItem[];
  listType?: ListType;
  header?: string | null;
  footer?: string | null;
};

export interface ListBlockProps {
  block: ListBlockType;
  isEditing: boolean;
  onStageUpdate: (updates: ListBlockUpdateInput) => void;
  onImmediateUpdate: (updates: ListBlockUpdateInput) => void;
  onCommit: () => void;
}

export const ListBlock = React.memo(function ListBlock({
  block,
  isEditing,
  onStageUpdate,
  onImmediateUpdate,
  onCommit,
}: ListBlockProps) {
  const colors = useTheme();
  const inputRefs = useRef<{ [id: string]: MarkdownEditorHandle | null }>({});

  const items = useMemo(() => block.content || [], [block.content]);
  const listType = block.listType || "checkbox";

  // Toggle checklist item (immediate update)
  const handleToggleCheck = useCallback(
    (itemId: string) => {
      Haptics.selectionAsync();
      const nextItems = items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      onImmediateUpdate({ content: nextItems });
    },
    [items, onImmediateUpdate]
  );

  // Edit item text (staged in memory until onBlur or Done)
  const handleItemTextChange = useCallback(
    (itemId: string, text: string) => {
      const nextItems = items.map((item) =>
        item.id === itemId ? { ...item, content: text } : item
      );
      onStageUpdate({ content: nextItems });
    },
    [items, onStageUpdate]
  );

  // Add new item below (immediate update)
  const handleAddItem = useCallback(
    (afterIndex?: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newItem: ListItem = {
        id: Crypto.randomUUID(),
        content: "",
        checked: false,
      };

      let nextItems: ListItem[];
      if (afterIndex !== undefined && afterIndex >= 0) {
        nextItems = [
          ...items.slice(0, afterIndex + 1),
          newItem,
          ...items.slice(afterIndex + 1),
        ];
      } else {
        nextItems = [...items, newItem];
      }

      onImmediateUpdate({ content: nextItems });

      setTimeout(() => {
        inputRefs.current[newItem.id]?.focus();
      }, 50);
    },
    [items, onImmediateUpdate]
  );

  // Delete item (immediate update)
  const handleDeleteItem = useCallback(
    (itemId: string) => {
      const nextItems = items.filter((item) => item.id !== itemId);
      onImmediateUpdate({ content: nextItems });
    },
    [items, onImmediateUpdate]
  );

  // Register contextual actions into parent BlockWrapper OptionSheet
  const blockActions = useMemo<SheetAction[]>(
    () => [
      {
        label: "Switch to Checklist",
        icon: <CheckSquare size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ listType: "checkbox" }),
        visible: listType !== "checkbox",
      },
      {
        label: "Switch to Bullet List",
        icon: <ListIcon size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ listType: "bullet" }),
        visible: listType !== "bullet",
      },
      {
        label: "Switch to Numbered List",
        icon: <ListOrdered size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ listType: "ordered" }),
        visible: listType !== "ordered",
      },
      {
        label: "Add Header",
        icon: <Plus size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ header: "" }),
        visible: block.header === undefined,
      },
      {
        label: "Remove Header",
        icon: <X size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ header: null }),
        visible: block.header !== undefined,
      },
      {
        label: "Add Footer",
        icon: <Plus size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ footer: "" }),
        visible: block.footer === undefined,
      },
      {
        label: "Remove Footer",
        icon: <X size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ footer: null }),
        visible: block.footer !== undefined,
      },
    ],
    [block.footer, block.header, colors.text, listType, onImmediateUpdate]
  );

  useRegisterBlockActions(blockActions);

  // Completed items count
  const completedCount = items.filter((i) => i.checked).length;

  return (
    <View className="w-full">
      {/* Header Display / Edit */}
      {block.header !== undefined && (
        <View className="mb-2">
          {isEditing ? (
            <View className="flex-row items-center gap-1 border-b border-border/40 pb-1">
              <TextInput
                value={block.header}
                onChangeText={(header) => onStageUpdate({ header })}
                onBlur={onCommit}
                placeholder="Section header..."
                placeholderTextColor={colors.textSecondary}
                className="flex-1 text-sm font-bold text-foreground py-0.5"
              />
              <Pressable
                onPress={() => onImmediateUpdate({ header: null })}
                hitSlop={8}
                className="p-1"
              >
                <X size={12} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : (
            block.header.trim() ? (
              <Text className="text-sm font-bold tracking-tight text-foreground pb-1">
                {block.header}
              </Text>
            ) : null
          )}
        </View>
      )}

      {/* List Items */}
      <View className="gap-2">
        {items.map((item, index) => {
          return (
            <AnimatedEntryView
              key={item.id}
              className="flex-row items-start gap-2.5 min-h-8"
            >
              {/* Left Indicator / Bullet / Checkbox */}
              {listType === "checkbox" && (
                <Pressable
                  hitSlop={8}
                  onPress={() => handleToggleCheck(item.id)}
                  className="pt-0.5"
                >
                  {item.checked ? (
                    <CheckSquare size={18} color={colors.primary} />
                  ) : (
                    <Square size={18} color={colors.textSecondary} />
                  )}
                </Pressable>
              )}

              {listType === "bullet" && (
                <View className="pt-2 px-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-foreground" />
                </View>
              )}

              {listType === "ordered" && (
                <View className="pt-0.5 w-6">
                  <Text className="text-sm font-semibold font-mono text-text-secondary">
                    {index + 1}.
                  </Text>
                </View>
              )}

              {/* Text Input / Display */}
              {isEditing ? (
                <MarkdownEditor
                  ref={(el) => {
                    inputRefs.current[item.id] = el;
                  }}
                  defaultValue={item.content}
                  onChangeText={(text) => handleItemTextChange(item.id, text)}
                  onBlur={onCommit}
                  placeholder="List item..."
                  placeholderTextColor={colors.textSecondary}
                />
              ) : (
                <Text
                  onPress={() => {
                    if (listType === "checkbox") {
                      handleToggleCheck(item.id);
                    }
                  }}
                  className={`flex-1 text-sm leading-5 py-0.5 text-foreground ${
                    item.checked && listType === "checkbox"
                      ? "line-through text-text-secondary"
                      : ""
                  }`}
                >
                  {item.content || "Untitled item"}
                </Text>
              )}

              {/* Delete item button when editing */}
              {isEditing && (
                <Pressable
                  onPress={() => handleDeleteItem(item.id)}
                  hitSlop={8}
                  className="p-1 active:opacity-60"
                >
                  <X size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </AnimatedEntryView>
          );
        })}

        {/* Add Item button */}
        {isEditing && (
          <Pressable
            onPress={() => handleAddItem()}
            className="flex-row items-center gap-2 py-1.5 px-2 rounded-lg self-start mt-1"
          >
            <Plus size={16} color={colors.textSecondary} />
            <Text className="text-xs font-semibold text-text-secondary">
              List item
            </Text>
          </Pressable>
        )}
      </View>

      {/* Footer Display / Edit */}
      {block.footer !== undefined && (
        <View className="mt-2.5 pt-1.5 border-t border-border/30">
          {isEditing ? (
            <View className="flex-row items-center gap-1">
              <TextInput
                value={block.footer}
                onChangeText={(footer) => onStageUpdate({ footer })}
                onBlur={onCommit}
                placeholder="Section footer..."
                placeholderTextColor={colors.textSecondary}
                className="flex-1 text-xs text-text-secondary py-0.5"
              />
              <Pressable
                onPress={() => onImmediateUpdate({ footer: null })}
                hitSlop={8}
                className="p-1"
              >
                <X size={12} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : (
            block.footer.trim() ? (
              <Text className="text-xs text-text-secondary">
                {block.footer}
              </Text>
            ) : null
          )}
        </View>
      )}

      {/* Progress count for checkbox list in view mode if no custom footer */}
      {!isEditing && listType === "checkbox" && items.length > 0 && !block.footer && (
        <Text className="text-[11px] font-mono text-text-secondary mt-2">
          {completedCount}/{items.length} completed
        </Text>
      )}
    </View>
  );
});
