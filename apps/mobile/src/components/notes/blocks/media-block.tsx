import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Camera, FilePlus, Image as ImageIcon, Mic } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type {
  MediaBlock as MediaBlockType,
  MediaItem,
} from "@/lib/types/notes";
import {
  pickDocumentFile,
  pickImagesFromLibrary,
  takePhotoWithCamera,
} from "@/lib/media/pickers";
import { useRegisterBlockActions } from "./block-wrapper";
import { MediaCard } from "./media-card";
import { MediaPreviewModal } from "./media-preview-modal";
import { MediaGridModal } from "./media-grid-modal";
import type { SheetAction } from "@/components/ui/option-sheet";

export interface MediaBlockProps {
  block: MediaBlockType;
  onStageContent: (items: MediaItem[]) => void;
  onImmediateContent: (items: MediaItem[]) => void;
  onCommit: () => void;
  onRequestRecordAudio?: () => void;
  isEditing: boolean;
}

export const MediaBlock = React.memo(function MediaBlock({
  block,
  isEditing,
  onStageContent,
  onImmediateContent,
  onCommit,
  onRequestRecordAudio,
}: MediaBlockProps) {
  const colors = useTheme();
  const items = useMemo(() => block.content || [], [block.content]);

  // Modal State Management
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isGridOpen, setIsGridOpen] = useState(false);

  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    itemsRef.current = items;
  });

  // Prepend new media items so newly added media appears first (index 0)
  const appendMediaItems = useCallback(
    (newItems: MediaItem[]) => {
      if (newItems.length === 0) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onImmediateContent([...newItems, ...itemsRef.current]);
    },
    [onImmediateContent],
  );

  // Action handlers
  const handlePickImages = useCallback(async () => {
    const picked = await pickImagesFromLibrary({ allowsMultiple: true });
    appendMediaItems(picked);
  }, [appendMediaItems]);

  const handleTakePhoto = useCallback(async () => {
    const photo = await takePhotoWithCamera();
    if (photo) appendMediaItems([photo]);
  }, [appendMediaItems]);

  const handlePickDocument = useCallback(async () => {
    const files = await pickDocumentFile();
    appendMediaItems(files);
  }, [appendMediaItems]);

  // Remove media item safely from block
  const handleRemoveMedia = useCallback(
    (id: string) => {
      const nextItems = itemsRef.current.filter((item) => item.id !== id);
      onImmediateContent(nextItems);
    },
    [onImmediateContent],
  );

  // Stable card press handler to preserve React.memo(MediaCard)
  const handleCardPress = useCallback((item: MediaItem) => {
    const idx = itemsRef.current.findIndex((i) => i.id === item.id);
    if (idx !== -1) setPreviewIndex(idx);
  }, []);

  // Update caption with stable callback dependency (O(1) keystroke render isolation)
  const handleUpdateCaption = useCallback(
    (id: string, caption: string) => {
      const nextItems = itemsRef.current.map((item) =>
        item.id === id ? { ...item, caption } : item,
      );
      onStageContent(nextItems);
    },
    [onStageContent],
  );

  // Register contextual block actions into parent BlockWrapper OptionSheet
  const blockActions = useMemo<SheetAction[]>(
    () => [
      {
        label: "Add Photos",
        icon: <ImageIcon size={18} color={colors.text} />,
        onPress: handlePickImages,
      },
      {
        label: "Take Photo",
        icon: <Camera size={18} color={colors.text} />,
        onPress: handleTakePhoto,
      },
      {
        label: "Attach File",
        icon: <FilePlus size={18} color={colors.text} />,
        onPress: handlePickDocument,
      },
      {
        label: "Record Audio",
        icon: <Mic size={18} color={colors.text} />,
        onPress: () => {
          if (onRequestRecordAudio) {
            onRequestRecordAudio();
          }
        },
        visible: !!onRequestRecordAudio,
      },
    ],
    [
      colors.text,
      handlePickDocument,
      handlePickImages,
      handleTakePhoto,
      onRequestRecordAudio,
    ],
  );

  useRegisterBlockActions(blockActions);

  if (items.length === 0) {
    return null;
  }

  return (
    <View className="w-full gap-2.5 my-1">
      {/* 1. Header with Counter and 'See all' Button */}
      {(!isEditing && items.length > 0) && (
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-sm font-semibold text-foreground">
            Note Media ({items.length})
          </Text>
          {items.length > 2 && (
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setIsGridOpen(true);
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="See all media in grid">
              <Text className="text-xs font-semibold text-primary">
                See all
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 2. Unified Single Horizontal Scroll Carousel */}
      {items.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4, paddingHorizontal: 2 }}
          decelerationRate="fast"
          snapToInterval={176 + 12} // card width (176) + gap (12)
        >
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              width={176}
              height={224}
              onPress={handleCardPress}
              onRemove={handleRemoveMedia}
              // onMenuPress={setSelectedMenuItem}
            />
          ))}
        </ScrollView>
      )}

      {/* 3. Swipeable Full-Screen Preview Modal */}
      <MediaPreviewModal
        items={items}
        initialIndex={previewIndex ?? 0}
        visible={previewIndex !== null}
        // initialIndex={3}
        // visible={true}
        onDismiss={() => setPreviewIndex(null)}
        onUpdateCaption={handleUpdateCaption}
        onRemoveMedia={handleRemoveMedia}
        onCommit={onCommit}
      />

      {/* 4. 'See All' 2-Column Grid Modal */}
      <MediaGridModal
        items={items}
        visible={isGridOpen}
        onDismiss={() => setIsGridOpen(false)}
        onSelectMedia={(index) => setPreviewIndex(index)}
        onRemoveMedia={handleRemoveMedia}
        onUpdateCaption={handleUpdateCaption}
      />
    </View>
  );
});
