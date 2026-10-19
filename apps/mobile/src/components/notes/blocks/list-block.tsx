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

export interface ListBlockProps {
  block: ListBlockType;
  isEditing: boolean;
  onUpdateBlock: (updates: {
    content?: ListItem[];
    listType?: ListType;
    header?: string;
    footer?: string;
  }) => void;
}

export const ListBlock = React.memo(function ListBlock({
  block,
  isEditing,
  onUpdateBlock,
}: ListBlockProps) {
  const colors = useTheme();
  const inputRefs = useRef<{ [id: string]: TextInput | null }>({});

  const items = useMemo(() => block.content || [], [block.content]);
  const listType = block.listType || "checkbox";

  // Toggle checklist item
  const handleToggleCheck = useCallback(
    (itemId: string) => {
      Haptics.selectionAsync();
      const nextItems = items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      onUpdateBlock({ content: nextItems });
    },
    [items, onUpdateBlock]
  );

  // Edit item text
  const handleItemTextChange = useCallback(
    (itemId: string, text: string) => {
      const nextItems = items.map((item) =>
        item.id === itemId ? { ...item, content: text } : item
      );
      onUpdateBlock({ content: nextItems });
    },
    [items, onUpdateBlock]
  );

  // Add new item below
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

      onUpdateBlock({ content: nextItems });

      // Focus the newly added item
      setTimeout(() => {
        inputRefs.current[newItem.id]?.focus();
      }, 50);
    },
    [items, onUpdateBlock]
  );

  // Delete item
  const handleDeleteItem = useCallback(
    (itemId: string) => {
      const nextItems = items.filter((item) => item.id !== itemId);
      onUpdateBlock({ content: nextItems });
    },
    [items, onUpdateBlock]
  );

  // Switch list type
  const handleCycleListType = useCallback(() => {
    Haptics.selectionAsync();
    const cycle: ListType[] = ["checkbox", "bullet", "ordered"];
    const currentIndex = cycle.indexOf(listType);
    const nextType = cycle[(currentIndex + 1) % cycle.length];
    onUpdateBlock({ listType: nextType });
  }, [listType, onUpdateBlock]);

  // Completed items count
  const completedCount = items.filter((i) => i.checked).length;

  return (
    <View className="w-full">
      {/* List Type Switcher when editing */}
      {isEditing && (
        <View className="flex-row items-center justify-between mb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cycle list type"
            onPress={handleCycleListType}
            className="flex-row items-center gap-1.5 px-2 py-1 rounded-lg bg-background-element border border-border/60 active:opacity-70"
          >
            {listType === "checkbox" && <CheckSquare size={14} color={colors.primary} />}
            {listType === "bullet" && <ListIcon size={14} color={colors.primary} />}
            {listType === "ordered" && <ListOrdered size={14} color={colors.primary} />}
            <Text className="text-xs font-semibold capitalize text-foreground">
              {listType} List
            </Text>
          </Pressable>

          {/* Quick Header / Footer add buttons if not present */}
          <View className="flex-row items-center gap-2">
            {block.header === undefined && (
              <Pressable
                onPress={() => onUpdateBlock({ header: "" })}
                className="px-2 py-0.5 rounded bg-background-element border border-dashed border-border"
              >
                <Text className="text-[11px] text-text-secondary">+ Header</Text>
              </Pressable>
            )}
            {block.footer === undefined && (
              <Pressable
                onPress={() => onUpdateBlock({ footer: "" })}
                className="px-2 py-0.5 rounded bg-background-element border border-dashed border-border"
              >
                <Text className="text-[11px] text-text-secondary">+ Footer</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Header Display / Edit */}
      {block.header !== undefined && (
        <View className="mb-2">
          {isEditing ? (
            <View className="flex-row items-center gap-1 border-b border-border/40 pb-1">
              <TextInput
                value={block.header}
                onChangeText={(header) => onUpdateBlock({ header })}
                placeholder="Section header..."
                placeholderTextColor={colors.textSecondary}
                className="flex-1 text-sm font-bold text-foreground py-0.5"
              />
              <Pressable
                onPress={() => onUpdateBlock({ header: undefined })}
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
            <View
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
                <TextInput
                  ref={(ref) => {
                    inputRefs.current[item.id] = ref;
                  }}
                  value={item.content}
                  onChangeText={(text) => handleItemTextChange(item.id, text)}
                  placeholder="List item..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  blurOnSubmit={false}
                  onSubmitEditing={() => handleAddItem(index)}
                  onKeyPress={({ nativeEvent }) => {
                    if (
                      nativeEvent.key === "Backspace" &&
                      !item.content &&
                      items.length > 1
                    ) {
                      handleDeleteItem(item.id);
                    }
                  }}
                  className={`flex-1 text-sm leading-5 py-0.5 text-foreground ${
                    item.checked && listType === "checkbox"
                      ? "line-through text-text-secondary"
                      : ""
                  }`}
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
            </View>
          );
        })}

        {/* Empty state or Add Item button */}
        {isEditing && (
          <Pressable
            onPress={() => handleAddItem()}
            className="flex-row items-center gap-2 py-1.5 px-2 rounded-lg border border-dashed border-border/80 active:bg-background-element self-start mt-1"
          >
            <Plus size={14} color={colors.primary} />
            <Text className="text-xs font-semibold text-primary">
              Add item
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
                onChangeText={(footer) => onUpdateBlock({ footer })}
                placeholder="Section footer..."
                placeholderTextColor={colors.textSecondary}
                className="flex-1 text-xs text-text-secondary py-0.5"
              />
              <Pressable
                onPress={() => onUpdateBlock({ footer: undefined })}
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
