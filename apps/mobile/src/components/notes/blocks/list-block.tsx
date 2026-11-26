import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  List as ListIcon,
  ListOrdered,
  Plus,
  X,
} from "lucide-react-native";
import Animated, { Easing, LinearTransition } from "react-native-reanimated";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type {
  ListBlock as ListBlockType,
  ListItem,
  ListType,
} from "@/lib/types/notes";
import {
  MarkdownBody,
  MarkdownEditor,
  type MarkdownEditorHandle,
} from "@/components/markdown";
import { useRegisterBlockActions } from "./block-wrapper";
import { ListItemRow } from "./list-item-row";
import {
  applyItemTextOrSplit,
  removeEmptyItemOnBackspace,
  reorderListGroup,
} from "./list-block.utils";
import type { SheetAction } from "@/components/ui/option-sheet";

const LIST_LAYOUT = LinearTransition.duration(160).easing(
  Easing.out(Easing.quad),
);

const LIST_TYPE_SWITCHERS: Array<{
  type: ListType;
  label: string;
  Icon: typeof CheckSquare;
}> = [
  { type: "checkbox", label: "Switch to Checklist", Icon: CheckSquare },
  { type: "bullet", label: "Switch to Bullet List", Icon: ListIcon },
  { type: "ordered", label: "Switch to Numbered List", Icon: ListOrdered },
];

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
  onStartEditing?: () => void;
}

export const ListBlock = React.memo(function ListBlock({
  block,
  isEditing,
  onStageUpdate,
  onImmediateUpdate,
  onCommit,
  onStartEditing,
}: ListBlockProps) {
  const colors = useTheme();
  const inputRefs = useRef<Record<string, MarkdownEditorHandle | null>>({});
  const pendingFocusRef = useRef<string | null>(null);
  const [isCheckedExpanded, setIsCheckedExpanded] = useState(true);

  const items = useMemo(() => block.content || [], [block.content]);
  const listType = block.listType || "checkbox";
  const isCheckboxList = listType === "checkbox";

  const { activeItems, checkedItems } = useMemo(() => {
    if (!isCheckboxList) return { activeItems: items, checkedItems: [] as ListItem[] };
    const active: ListItem[] = [];
    const checked: ListItem[] = [];
    for (const item of items) {
      (item.checked ? checked : active).push(item);
    }
    return { activeItems: active, checkedItems: checked };
  }, [isCheckboxList, items]);

  const stateRef = useRef({
    items,
    activeItems,
    checkedItems,
    isCheckboxList,
    onStageUpdate,
    onImmediateUpdate,
  });

  useLayoutEffect(() => {
    stateRef.current = {
      items,
      activeItems,
      checkedItems,
      isCheckboxList,
      onStageUpdate,
      onImmediateUpdate,
    };
  });

  const focusItem = useCallback((itemId?: string) => {
    if (!itemId) return;
    const el = inputRefs.current[itemId];
    if (el) el.focus();
    else pendingFocusRef.current = itemId;
  }, []);

  const registerInputRef = useCallback(
    (itemId: string, el: MarkdownEditorHandle | null) => {
      if (!el) {
        delete inputRefs.current[itemId];
        return;
      }
      inputRefs.current[itemId] = el;
      if (pendingFocusRef.current === itemId) {
        pendingFocusRef.current = null;
        el.focus();
      }
    },
    [],
  );

  const handleToggleCheck = useCallback((itemId: string) => {
    const { items: cur, onImmediateUpdate: commit } = stateRef.current;
    Haptics.selectionAsync();
    commit({
      content: cur.map((i) =>
        i.id === itemId ? { ...i, checked: !i.checked } : i,
      ),
    });
  }, []);

  const handleItemTextChange = useCallback(
    (itemId: string, text: string) => {
      const {
        items: cur,
        isCheckboxList: isCb,
        onStageUpdate: stage,
        onImmediateUpdate: commit,
      } = stateRef.current;
      const res = applyItemTextOrSplit(cur, itemId, text, isCb);
      if (res.type === "stage") {
        stage({ content: res.nextItems });
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      commit({ content: res.nextItems });
      focusItem(res.focusItemId);
    },
    [focusItem],
  );

  const handleBackspaceEmpty = useCallback(
    (itemId: string, isCheckedGroup: boolean) => {
      const {
        items: cur,
        activeItems: active,
        checkedItems: checked,
        onImmediateUpdate: commit,
      } = stateRef.current;
      const res = removeEmptyItemOnBackspace(
        cur,
        isCheckedGroup ? checked : active,
        itemId,
      );
      if (!res) return;
      Haptics.selectionAsync();
      commit({ content: res.nextItems });
      focusItem(res.focusItemId);
    },
    [focusItem],
  );

  const handleMoveItem = useCallback(
    (isCheckedGroup: boolean, fromIndex: number, toIndex: number) => {
      const {
        items: cur,
        activeItems: active,
        checkedItems: checked,
        onImmediateUpdate: commit,
      } = stateRef.current;
      const next = reorderListGroup(
        cur,
        isCheckedGroup ? checked : active,
        fromIndex,
        toIndex,
      );
      if (next !== cur) commit({ content: next });
    },
    [],
  );

  const handleAddItem = useCallback(() => {
    onStartEditing?.();
    const {
      items: cur,
      isCheckboxList: isCb,
      onImmediateUpdate: commit,
    } = stateRef.current;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newItem: ListItem = {
      id: Crypto.randomUUID(),
      content: "",
      checked: false,
    };
    const lastActiveIdx = isCb ? cur.findLastIndex((i) => !i.checked) : cur.length - 1;
    const insertAt = isCb ? lastActiveIdx + 1 : cur.length;
    commit({
      content: [...cur.slice(0, insertAt), newItem, ...cur.slice(insertAt)],
    });
    focusItem(newItem.id);
  }, [focusItem, onStartEditing]);

  const handleDeleteItem = useCallback((itemId: string) => {
    const { items: cur, onImmediateUpdate: commit } = stateRef.current;
    commit({ content: cur.filter((i) => i.id !== itemId) });
  }, []);

  const blockActions = useMemo<SheetAction[]>(() => {
    const hasHeader = block.header !== undefined;
    const hasFooter = block.footer !== undefined;
    return [
      ...LIST_TYPE_SWITCHERS.map(({ type, label, Icon }) => ({
        label,
        icon: <Icon size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ listType: type }),
        visible: listType !== type,
      })),
      {
        label: hasHeader ? "Remove Header" : "Add Header",
        icon: hasHeader ? <X size={18} color={colors.text} /> : <Plus size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ header: hasHeader ? null : "" }),
      },
      {
        label: hasFooter ? "Remove Footer" : "Add Footer",
        icon: hasFooter ? <X size={18} color={colors.text} /> : <Plus size={18} color={colors.text} />,
        onPress: () => onImmediateUpdate({ footer: hasFooter ? null : "" }),
      },
    ];
  }, [block.footer, block.header, colors.text, listType, onImmediateUpdate]);

  useRegisterBlockActions(blockActions);

  const renderGroup = (group: ListItem[]) =>
    group.map((item, index) => (
      <ListItemRow
        key={item.id}
        item={item}
        index={index}
        totalInGroup={group.length}
        listType={listType}
        isEditing={isEditing}
        onToggleCheck={handleToggleCheck}
        onTextChange={handleItemTextChange}
        onBackspaceEmpty={handleBackspaceEmpty}
        onDelete={handleDeleteItem}
        onCommit={onCommit}
        onMoveItem={handleMoveItem}
        registerInputRef={registerInputRef}
      />
    ));

  const renderMetaField = (
    field: "header" | "footer",
    value: string | undefined,
    placeholder: string,
    containerClass: string,
  ) => {
    if (value === undefined) return null;
    if (!isEditing && !value.trim()) return null;
    return (
      <View className={containerClass}>
        {isEditing ? (
          <MarkdownEditor
            key={field}
            defaultValue={value}
            onChangeText={(text) => onStageUpdate({ [field]: text })}
            onBlur={onCommit}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            style={{ paddingTop: 0, paddingBottom: 0, fontSize: 14 }}
          />
        ) : (
          <MarkdownBody source={value} />
        )}
      </View>
    );
  };

  return (
    <View className="w-full">
      {renderMetaField(
        "header",
        block.header,
        "Section header ",
        "bg-card px-2 py-1 rounded-md mb-3",
      )}

      <Animated.View layout={LIST_LAYOUT} className="gap-2">
        {renderGroup(activeItems)}

        <Pressable
          onPress={handleAddItem}
          className="flex-row items-center gap-2 py-1.5 px-2 rounded-lg self-start active:opacity-60">
          <Plus size={18} color={colors.textSecondary} />
          <Text className="text-sm font-medium text-text-secondary">
            Add item
          </Text>
        </Pressable>
      </Animated.View>

      {isCheckboxList && checkedItems.length > 0 && (
        <Animated.View
          layout={LIST_LAYOUT}
          className="mt-3 pt-2 border-t border-border">
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setIsCheckedExpanded((prev) => !prev);
            }}
            className="flex-row items-center gap-1.5 py-1 self-start active:opacity-70">
            {isCheckedExpanded ? (
              <ChevronDown size={20} color={colors.textSecondary} />
            ) : (
              <ChevronRight size={20} color={colors.textSecondary} />
            )}
            <Text className="text-sm font-semibold text-text-secondary">
              {checkedItems.length} Checked Items
            </Text>
          </Pressable>

          {isCheckedExpanded && (
            <View className="gap-2 mt-1.5">{renderGroup(checkedItems)}</View>
          )}
        </Animated.View>
      )}

      {renderMetaField(
        "footer",
        block.footer,
        "Section footer ",
        "bg-card px-2 py-1 mt-2 rounded-md",
      )}
    </View>
  );
});
