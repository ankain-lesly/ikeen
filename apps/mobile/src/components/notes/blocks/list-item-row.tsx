import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Check,
  CheckSquare,
  GripVertical,
  Square,
  X,
} from "lucide-react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { ListItem, ListType } from "@/lib/types/notes";
import {
  MarkdownBody,
  MarkdownEditor,
  type MarkdownEditorHandle,
} from "@/components/markdown";
import { AnimatedEntryView } from "@/components/ui/animated";

const ROW_GAP = 8;
const DEFAULT_ROW_PITCH = 40;
// Snappy, non-oscillating natural ease for layout shifts
const ROW_LAYOUT = LinearTransition.duration(160).easing(
  Easing.out(Easing.quad),
);

const triggerDragStartHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

const triggerDragEndHaptic = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

export interface ListItemRowProps {
  item: ListItem;
  index: number;
  totalInGroup: number;
  listType: ListType;
  isEditing: boolean;
  onToggleCheck: (itemId: string) => void;
  onTextChange: (itemId: string, text: string) => void;
  onBackspaceEmpty: (itemId: string, isCheckedGroup: boolean) => void;
  onDelete: (itemId: string) => void;
  onCommit: () => void;
  onMoveItem: (
    isCheckedGroup: boolean,
    fromIndex: number,
    toIndex: number,
  ) => void;
  registerInputRef: (itemId: string, el: MarkdownEditorHandle | null) => void;
}

export const ListItemRow = React.memo(function ListItemRow({
  item,
  index,
  totalInGroup,
  listType,
  isEditing,
  onToggleCheck,
  onTextChange,
  onBackspaceEmpty,
  onDelete,
  onCommit,
  onMoveItem,
  registerInputRef,
}: ListItemRowProps) {
  const colors = useTheme();
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const stepOffset = useSharedValue(0);
  const rowPitch = useSharedValue(DEFAULT_ROW_PITCH);
  const [isFocused, setIsFocused] = useState(false);

  // const canDrag = isEditing && totalInGroup > 1;
  const canDrag = totalInGroup > 1;
  const isCheckedGroup = listType === "checkbox" && !!item.checked;

  const triggerSwap = (delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= totalInGroup) return;
    Haptics.selectionAsync();
    onMoveItem(isCheckedGroup, index, target);
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(canDrag)
        .activeOffsetY([-2, 2])
        .failOffsetX([-20, 20])
        .onStart(() => {
          "worklet";
          isDragging.value = true;
          stepOffset.value = 0;
          translateY.value = 0;
          scheduleOnRN(triggerDragStartHaptic);
        })
        .onUpdate((e) => {
          "worklet";
          const pitch = rowPitch.value;
          const relY = e.translationY - stepOffset.value * pitch;
          translateY.value = relY;

          if (relY > pitch && index < totalInGroup - 1) {
            stepOffset.value += 1;
            translateY.value = 0;
            scheduleOnRN(triggerSwap, 1);
          } else if (relY < -pitch && index > 0) {
            stepOffset.value -= 1;
            translateY.value = 0;
            scheduleOnRN(triggerSwap, -1);
          }
        })
        .onFinalize(() => {
          "worklet";
          isDragging.value = false;
          stepOffset.value = 0;
          // Smooth deceleration to 0 with zero spring bounce or overshoot
          translateY.value = withTiming(0, {
            duration: 140,
            easing: Easing.out(Easing.quad),
          });
          scheduleOnRN(triggerDragEndHaptic);
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canDrag, index, isCheckedGroup, onMoveItem, totalInGroup],
  );

  const animatedRowStyle = useAnimatedStyle(() => {
    const dragging = isDragging.value;
    return {
      transform: [
        { translateY: translateY.value },
        { scale: dragging ? 1.015 : 1 },
      ],
      zIndex: dragging ? 50 : 1,
      opacity: dragging ? 0.96 : 1,
      backgroundColor: dragging ? colors.card : "transparent",
      borderRadius: dragging ? 8 : 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: dragging ? 3 : 0 },
      shadowOpacity: dragging ? 0.12 : 0,
      shadowRadius: dragging ? 6 : 0,
      elevation: dragging ? 4 : 0,
    };
  });

  const renderContent = item.content || "Untitled item";

  return (
    // Outer view handles layout flow without spring bounce
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      layout={ROW_LAYOUT}>
      {/* Inner view handles gesture drag transforms and active floating card appearance */}
      <Animated.View
        style={animatedRowStyle}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) rowPitch.value = h + ROW_GAP;
        }}
        className="min-h-8">
        <View className="flex-2 flex-row gap-2">
          {canDrag && (
            <GestureDetector gesture={panGesture}>
              <View
                accessibilityRole="button"
                accessibilityLabel="Drag to reorder item"
                className="w-7 pl-2 min-h-7 h-auto py-1 -ml-1.5 -mt-0.5 items-center"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <GripVertical size={20} color={colors.textSecondary} />
              </View>
            </GestureDetector>
          )}

          <View className="pt-1">
            {listType === "checkbox" ? (
              <Pressable
                hitSlop={8}
                onPress={() => onToggleCheck(item.id)}
                className={`size-5 border-2 border-text-secondary rounded-[5px] items-center justify-center ${item.checked ? "bg-text-secondary" : ""}`}>
                {item.checked && <Check size={16} color={colors.background} />}
              </Pressable>
            ) : listType === "bullet" ? (
              <View className="px-1 size-5 items-center justify-center">
                <View className="w-1.5 h-1.5 rounded-full bg-foreground" />
              </View>
            ) : (
              <View className="size-5">
                <Text className="text-sm font-semibold font-mono text-text-secondary">
                  {index + 1}.
                </Text>
              </View>
            )}
          </View>

          <View className={`flex-1 ${item.checked ? "pt-1 opacity-70" : ""}`}>
            {isEditing && !item.checked ? (
              <MarkdownEditor
                ref={(el) => registerInputRef(item.id, el)}
                defaultValue={item.content}
                onChangeText={(text) => onTextChange(item.id, text)}
                onKeyPress={(e) => {
                  if (
                    e.nativeEvent.key === "Backspace" &&
                    item.content.length === 0
                  ) {
                    onBackspaceEmpty(item.id, isCheckedGroup);
                  }
                }}
                onBlur={() => {
                  onCommit();
                  setIsFocused(false);
                }}
                onFocus={() => setIsFocused(true)}
                placeholder="List item..."
                placeholderTextColor={colors.textSecondary}
                style={{
                  paddingTop: 0,
                  paddingBottom: 0,
                }}
              />
            ) : (
              <MarkdownBody
                source={item.checked ? `~~${renderContent}~~` : renderContent}
                size={item.checked ? 14 : 16}
              />
            )}
          </View>

          {isEditing && (
            <View className="size-5">
              {isFocused && (
                <AnimatedEntryView>
                  <Pressable
                    onPress={() => onDelete(item.id)}
                    disabled
                    hitSlop={8}
                    className="p-1 active:opacity-60">
                    <X size={20} color={colors.textSecondary} />
                  </Pressable>
                </AnimatedEntryView>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
});
