import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CloudOff,
  FilePlus,
  Image as ImageIcon,
  Mic,
  Trash2,
  X,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { MediaBlock as MediaBlockType, MediaItem } from "@/lib/types/notes";
import {
  pickDocumentFile,
  pickImagesFromLibrary,
  takePhotoWithCamera,
} from "@/lib/media/pickers";
import {
  cancelMediaUpload,
  enqueueMediaUpload,
  retrySingleMediaUpload,
} from "@/lib/media/upload-service";
import { useMediaUploadProgress } from "@/lib/media/use-media-upload-store";
import { useRegisterBlockActions } from "./block-wrapper";
import { MediaAudioCard } from "./media-audio-card";
import { MediaFileCard } from "./media-file-card";
import { MediaCaptionField } from "./media-caption-field";
import { MarkdownBody } from "@/components/markdown";
import type { SheetAction } from "@/components/ui/option-sheet";

export interface MediaBlockProps {
  block: MediaBlockType;
  isEditing: boolean;
  onStageContent: (items: MediaItem[]) => void;
  onImmediateContent: (items: MediaItem[]) => void;
  onCommit: () => void;
  onRequestRecordAudio?: () => void;
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
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);

  // Group items by category
  const visualItems = useMemo(
    () => items.filter((item) => item.mediaType === "image"),
    [items],
  );
  const audioItems = useMemo(
    () => items.filter((item) => item.mediaType === "audio"),
    [items],
  );
  const fileItems = useMemo(
    () => items.filter((item) => item.mediaType === "file"),
    [items],
  );

  const itemsRef = useRef(items);
  useLayoutEffect(() => {
    itemsRef.current = items;
  });

  // Append new media items and automatically enqueue for upload
  const appendMediaItems = useCallback(
    (newItems: MediaItem[]) => {
      if (newItems.length === 0) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onImmediateContent([...itemsRef.current, ...newItems]);
      for (const item of newItems) {
        if (item.localUri && !item.url) {
          void enqueueMediaUpload({
            id: item.id,
            blockId: block.id,
            localUri: item.localUri,
          });
        }
      }
    },
    [block.id, onImmediateContent],
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

  // Remove media item safely from block and cancel any pending upload job
  const handleRemoveMedia = useCallback(
    (id: string) => {
      const nextItems = itemsRef.current.filter((item) => item.id !== id);
      onImmediateContent(nextItems);
      void cancelMediaUpload(id);
    },
    [onImmediateContent],
  );

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

  if (items.length === 0 && !isEditing) {
    return null;
  }

  return (
    <View className="w-full gap-3">
      {/* 1. Visual Images Grid */}
      {visualItems.length > 0 && (
        <View className="gap-3">
          {visualItems.map((item) => {
            const imageUri = item.localUri || item.url;
            return (
              <VisualImageCard
                key={item.id}
                item={item}
                imageUri={imageUri}
                isEditing={isEditing}
                onSelect={setSelectedImage}
                onRemove={handleRemoveMedia}
                onUpdateCaption={handleUpdateCaption}
                onCommit={onCommit}
              />
            );
          })}
        </View>
      )}

      {/* 2. Audio Recordings Stack */}
      {audioItems.length > 0 && (
        <View className="gap-2.5">
          {audioItems.map((item) => (
            <MediaAudioCard
              key={item.id}
              item={item}
              isEditing={isEditing}
              onRemove={handleRemoveMedia}
              onUpdateCaption={handleUpdateCaption}
              onCommit={onCommit}
            />
          ))}
        </View>
      )}

      {/* 3. Document / File Attachments Stack */}
      {fileItems.length > 0 && (
        <View className="gap-2">
          {fileItems.map((item) => (
            <MediaFileCard
              key={item.id}
              item={item}
              isEditing={isEditing}
              onRemove={handleRemoveMedia}
              onUpdateCaption={handleUpdateCaption}
              onCommit={onCommit}
            />
          ))}
        </View>
      )}

      {/* Fullscreen Lightbox Modal */}
      {selectedImage && (
        <Modal
          visible={!!selectedImage}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedImage(null)}
        >
          <View className="flex-1 bg-black/95 justify-center items-center px-4">
            <Pressable
              onPress={() => setSelectedImage(null)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close image preview"
              className="absolute top-12 right-6 p-2 rounded-full bg-white/20 active:opacity-70 z-10"
            >
              <X size={20} color="#ffffff" />
            </Pressable>

            <Image
              source={{ uri: selectedImage.localUri || selectedImage.url }}
              style={{ width: "100%", height: "70%" }}
              contentFit="contain"
            />

            {(selectedImage.caption || selectedImage.name) ? (
              <View className="mt-4 px-6 w-full items-center">
                <MarkdownBody
                  source={selectedImage.caption || selectedImage.name || ""}
                  size={14}
                />
              </View>
            ) : null}
          </View>
        </Modal>
      )}
    </View>
  );
});

interface VisualImageCardProps {
  item: MediaItem;
  imageUri?: string;
  isEditing: boolean;
  onSelect: (item: MediaItem) => void;
  onRemove: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
  onCommit: () => void;
}

const VisualImageCard = React.memo(function VisualImageCard({
  item,
  imageUri,
  isEditing,
  onSelect,
  onRemove,
  onUpdateCaption,
  onCommit,
}: VisualImageCardProps) {
  const colors = useTheme();
  const [localCaption, setLocalCaption] = useState(item.caption || "");
  const uploadState = useMediaUploadProgress(item.id);

  useEffect(() => {
    setLocalCaption(item.caption || "");
  }, [item.caption]);

  const handleCaptionChange = (text: string) => {
    setLocalCaption(text);
    onUpdateCaption(item.id, text);
  };

  const isUploading = uploadState?.status === "uploading";
  const isFailed = uploadState?.status === "failed";
  const progressPercent = Math.round((uploadState?.progress || 0) * 100);

  const handleRetryUpload = (e: any) => {
    e.stopPropagation();
    Haptics.selectionAsync();
    void retrySingleMediaUpload(item.id);
  };

  return (
    <View className="relative rounded-2xl overflow-hidden border border-border/70 bg-card shadow-xs">
      {/* Image Preview Container */}
      <Pressable
        onPress={() => onSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={item.caption || item.name || "View image"}
        className="w-full h-52 bg-background-element items-center justify-center"
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <ImageIcon size={32} color={colors.textSecondary} />
        )}

        {/* Upload / Cloud / Local Status Badge */}
        <Pressable
          onPress={isFailed ? handleRetryUpload : undefined}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={
            isUploading
              ? `Uploading ${progressPercent}%`
              : isFailed
                ? "Upload failed, tap to retry"
                : item.url
                  ? "Synced to cloud"
                  : "Saved locally"
          }
          className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 flex-row items-center gap-1"
        >
          {isUploading ? (
            <>
              <ActivityIndicator size={10} color="#38bdf8" />
              <Text className="text-[10px] text-white font-medium">
                {progressPercent}%
              </Text>
            </>
          ) : isFailed ? (
            <>
              <AlertCircle size={11} color="#ef4444" />
              <Text className="text-[10px] text-white font-medium">
                Retry
              </Text>
            </>
          ) : item.url ? (
            <>
              <CheckCircle2 size={11} color="#22c55e" />
              <Text className="text-[10px] text-white font-medium">
                Cloud
              </Text>
            </>
          ) : (
            <>
              <CloudOff size={11} color="#eab308" />
              <Text className="text-[10px] text-white font-medium">
                Local
              </Text>
            </>
          )}
        </Pressable>

        {/* Delete button in edit mode */}
        {isEditing && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
              onRemove(item.id);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Delete image"
            className="absolute top-2.5 left-2.5 p-1.5 rounded-full bg-black/60 active:opacity-70"
          >
            <Trash2 size={14} color="#ef4444" />
          </Pressable>
        )}
      </Pressable>

      {/* Markdown Caption Field (Edit mode: MarkdownEditor, View mode: MarkdownBody) */}
      {(isEditing || localCaption.trim().length > 0) && (
        <View className="p-2.5 border-t border-border/30">
          <MediaCaptionField
            value={localCaption}
            isEditing={isEditing}
            placeholder="Add a caption "
            onChangeText={handleCaptionChange}
            onCommit={onCommit}
          />
        </View>
      )}
    </View>
  );
});
