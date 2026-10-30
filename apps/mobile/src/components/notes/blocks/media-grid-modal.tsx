import React, { useCallback } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { MediaItem } from "@/lib/types/notes";
import { MediaCard } from "./media-card";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 32 - 12) / 2;

export interface MediaGridModalProps {
  items: MediaItem[];
  visible: boolean;
  onDismiss: () => void;
  onSelectMedia: (index: number) => void;
  onRemoveMedia: (id: string) => void;
  onUpdateCaption?: (id: string, caption: string) => void;
}

export const MediaGridModal = React.memo(function MediaGridModal({
  items,
  visible,
  onDismiss,
  onSelectMedia,
  onRemoveMedia,
  onUpdateCaption,
}: MediaGridModalProps) {
  const colors = useTheme();

  const handleCardPress = useCallback(
    (item: MediaItem) => {
      Haptics.selectionAsync();
      onDismiss();
      const idx = items.findIndex((i) => i.id === item.id);
      if (idx !== -1) onSelectMedia(idx);
    },
    [items, onDismiss, onSelectMedia],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}>
      <View className="flex-1 py-safe bg-background">
        {/* Header Bar */}
        <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-border/40">
          <View>
            <Text className="text-lg font-bold text-foreground">All Media</Text>
            <Text className="text-xs text-text-secondary">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Text>
          </View>

          <Pressable
            onPress={onDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close all media grid"
            className="w-9 h-9 rounded-full bg-background-element_ items-center justify-center active:opacity-70">
            <X size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* 2-Column Grid */}
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 6 }}
          renderItem={({ item }) => (
            <View style={{ width: GRID_ITEM_WIDTH }}>
              <MediaCard
                item={item}
                width={GRID_ITEM_WIDTH}
                height={250}
                onPress={handleCardPress}
                onRemove={onRemoveMedia}
              />
            </View>
          )}
        />
      </View>
    </Modal>
  );
});
