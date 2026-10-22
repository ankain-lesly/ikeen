import React, { useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  CheckCircle2,
  CloudOff,
  Image as ImageIcon,
  Trash2,
  X,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { MediaBlock as MediaBlockType, MediaItem } from "@/lib/types/notes";

export interface MediaBlockProps {
  block: MediaBlockType;
  isEditing: boolean;
  onStageContent: (items: MediaItem[]) => void;
  onImmediateContent: (items: MediaItem[]) => void;
  onCommit: () => void;
}

export const MediaBlock = React.memo(function MediaBlock({
  block,
  isEditing,
  onStageContent,
  onImmediateContent,
  onCommit,
}: MediaBlockProps) {
  const colors = useTheme();
  const items = block.content || [];
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  // Remove media item (immediate update)
  const handleRemoveMedia = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const nextItems = items.filter((item) => item.id !== id);
    onImmediateContent(nextItems);
  };

  // Update caption (staged in memory until onBlur or Done)
  const handleUpdateCaption = (id: string, caption: string) => {
    const nextItems = items.map((item) =>
      item.id === id ? { ...item, caption } : item
    );
    onStageContent(nextItems);
  };

  if (items.length === 0 && !isEditing) {
    return null;
  }

  return (
    <View className="w-full">
      {/* Media Items Grid */}
      <View className="gap-3">
        {items.map((item) => {
          const imageUri = item.localUri || item.url;
          return (
            <View
              key={item.id}
              className="relative rounded-2xl overflow-hidden border border-border/60 bg-background-element"
            >
              {/* Image Preview */}
              <Pressable
                onPress={() => setSelectedItem(item)}
                accessibilityRole="button"
                accessibilityLabel="View full size image"
                className="w-full h-48 bg-card items-center justify-center"
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <ImageIcon size={32} color={colors.textSecondary} />
                )}

                {/* Synced Badge */}
                <View className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 flex-row items-center gap-1">
                  {item.synced ? (
                    <>
                      <CheckCircle2 size={12} color="#22c55e" />
                      <Text className="text-[10px] text-white font-medium">
                        Synced
                      </Text>
                    </>
                  ) : (
                    <>
                      <CloudOff size={12} color="#eab308" />
                      <Text className="text-[10px] text-white font-medium">
                        Local
                      </Text>
                    </>
                  )}
                </View>

                {/* Delete button when editing */}
                {isEditing && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveMedia(item.id);
                    }}
                    hitSlop={8}
                    className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 active:opacity-70"
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </Pressable>
                )}
              </Pressable>

              {/* Caption */}
              <View className="p-2 border-t border-border/30">
                {isEditing ? (
                  <TextInput
                    value={item.caption || ""}
                    onChangeText={(text) => handleUpdateCaption(item.id, text)}
                    onBlur={onCommit}
                    placeholder="Add a caption..."
                    placeholderTextColor={colors.textSecondary}
                    className="text-xs text-foreground py-0.5"
                  />
                ) : (
                  item.caption ? (
                    <Text className="text-xs text-text-secondary italic">
                      {item.caption}
                    </Text>
                  ) : null
                )}
              </View>
            </View>
          );
        })}

        {items.length === 0 && isEditing && (
          <View className="flex-row items-center justify-center gap-2 py-4 px-4 rounded-xl border border-dashed border-border">
            <ImageIcon size={16} color={colors.textSecondary} />
            <Text className="text-xs text-text-secondary">
              Media block ready
            </Text>
          </View>
        )}
      </View>

      {/* Lightbox Fullscreen Modal */}
      {selectedItem && (
        <Modal
          visible={!!selectedItem}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedItem(null)}
        >
          <View className="flex-1 bg-black/95 justify-center items-center px-4">
            {/* Close Button */}
            <Pressable
              onPress={() => setSelectedItem(null)}
              hitSlop={12}
              className="absolute top-12 right-6 p-2 rounded-full bg-white/20 active:opacity-70 z-10"
            >
              <X size={20} color="#ffffff" />
            </Pressable>

            {/* Image */}
            <Image
              source={{ uri: selectedItem.localUri || selectedItem.url }}
              style={{ width: "100%", height: "70%" }}
              contentFit="contain"
            />

            {/* Caption */}
            {selectedItem.caption ? (
              <Text className="text-sm text-white/90 text-center mt-4 px-6">
                {selectedItem.caption}
              </Text>
            ) : null}
          </View>
        </Modal>
      )}
    </View>
  );
});
