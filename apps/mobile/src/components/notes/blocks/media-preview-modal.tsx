import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Check,
  Edit3,
  ExternalLink,
  FileText,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { AudioMetadata, FileMetadata, MediaItem } from "@/lib/types/notes";
import { formatFileSize } from "@/lib/media/file-system";
import {
  formatDuration,
  useAudioPlayerState,
} from "@/lib/media/use-audio-player";
import { AudioWaveform } from "./audio-waveform";
import { MediaOptionsDropdown } from "./media-options-dropdown";
import { MediaFileInfoSheet } from "./media-file-info-sheet";
import { KeyboardGradualWrapper } from "@/components/keyboard-gradual-animation";
import { AnimatedEntryView } from "@/components/ui/animated";
import { StatusBar } from "expo-status-bar";
import { MarkdownBody, MarkdownEditor } from "@/components/markdown";
import { capitalize } from "@repo/utils";
import { toast } from "@/lib/toast";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface MediaPreviewModalProps {
  items: MediaItem[];
  initialIndex: number;
  visible: boolean;
  onDismiss: () => void;
  onUpdateCaption?: (id: string, caption: string) => void;
  onRemoveMedia?: (id: string) => void;
  onCommit?: () => void;
}

export const MediaPreviewModal = React.memo(function MediaPreviewModal(
  props: MediaPreviewModalProps,
) {
  if (!props.visible || props.items.length === 0) {
    return null;
  }

  return (
    <MediaPreviewModalContent
      key={`preview-${props.initialIndex ?? 0}`}
      {...props}
    />
  );
});

function MediaPreviewModalContent({
  items,
  initialIndex = 0,
  visible,
  onDismiss,
  onUpdateCaption,
  onRemoveMedia,
  onCommit,
}: MediaPreviewModalProps) {
  const colors = useTheme();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editingText, setEditingText] = useState("");
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null);
  const [isChromeVisible, setIsChromeVisible] = useState(true);

  const toggleChrome = useCallback(() => {
    setIsChromeVisible((prev) => !prev);
  }, []);

  const flatListRef = useRef<FlatList>(null);

  const activeItem = items[currentIndex] || items[0];

  const handleMomentumScrollEnd = useCallback(
    (e: any) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      if (index >= 0 && index < items.length && index !== currentIndex) {
        setCurrentIndex(index);
        setIsEditingCaption(false);
        setEditingText("");
        Haptics.selectionAsync();
      }
    },
    [currentIndex, items.length],
  );

  const handleSaveCaption = useCallback(() => {
    if (!activeItem) return;
    const trimmed = editingText.trim();
    if (trimmed !== (activeItem.caption || "")) {
      if (onUpdateCaption) {
        onUpdateCaption(activeItem.id, trimmed);
      }
      if (onCommit) {
        onCommit();
      }
    }
    setIsEditingCaption(false);
    setEditingText("");
  }, [activeItem, editingText, onUpdateCaption, onCommit]);

  const handleShare = useCallback(async (item: MediaItem) => {
    const uri = item.localUri || item.url;
    if (!uri) return;
    try {
      // TODO: FFix on next build
      // const isAvailable = await Sharing.isAvailableAsync();
      // if (isAvailable) {
      //   await Sharing.shareAsync(uri, {
      //     dialogTitle: item.name || "Share media",
      //   });
      // } else {
      //   toast.info("Sharing not available on this device");
      // }
      toast.info("Sharing not configured");
    } catch (err) {
      console.warn("[MediaPreviewModal] Failed to share file:", err);
    }
  }, []);

  if (!visible || items.length === 0) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onDismiss}>
        <View className="flex-1 bg-background">
          <View className="flex-1">
            {/* Header Bar */}
            {isChromeVisible && (
              <AnimatedEntryView className="absolute top-0 pt-safe bg-background/80 w-full flex-row items-center justify-between px-4 pb-3 z-20">
                {/* Close Button */}
                <Pressable
                  onPress={onDismiss}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close preview"
                  className="p-1 gap-2 flex-row">
                  <ArrowLeft size={20} color={colors.text} />
                </Pressable>

                {/* Filename Header (Centered, replacing number index indicator) */}
                <View className="flex-1 px-4 items-center justify-center">
                  <Text
                    numberOfLines={1}
                    className="text-xl font-normal text-text-secondary text-center truncate">
                    {activeItem?.name?.split(".")?.[0] || "Media"}
                  </Text>
                </View>

                {/* Menu Button */}
                <MediaOptionsDropdown
                  variant="dropdown"
                  item={activeItem}
                  visible={false}
                  onShowInfo={(item) => {
                    setInfoItem(item);
                  }}
                  onEditCaption={(item) => {
                    setEditingText(item.caption || "");
                    setIsEditingCaption(true);
                  }}
                  onRemove={(id) => {
                    if (onRemoveMedia) onRemoveMedia(id);
                    if (items.length <= 1) onDismiss();
                  }}
                  onShare={handleShare}
                />
              </AnimatedEntryView>
            )}

            {/* Swipeable Paging FlatList */}
            <FlatList
              ref={flatListRef}
              data={items}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: false,
                  });
                }, 50);
              }}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              renderItem={({ item, index }) => (
                <View
                  style={{
                    width: SCREEN_WIDTH,
                    height: SCREEN_HEIGHT,
                  }}
                  className="items-center justify-center">
                  {item.mediaType === "image" ? (
                    <Pressable
                      onPress={toggleChrome}
                      style={{
                        width: SCREEN_WIDTH,
                        height: SCREEN_HEIGHT,
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                      <Image
                        source={{ uri: item.localUri || item.url }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="contain"
                        transition={200}
                      />
                    </Pressable>
                  ) : item.mediaType === "audio" ? (
                    <AudioPreviewPlayer
                      item={item}
                      isActive={currentIndex === index}
                    />
                  ) : (
                    <FilePreviewCard item={item} onShare={handleShare} />
                  )}
                </View>
              )}
            />

            {/* Bottom Caption Bar */}
            {isChromeVisible && (
              <KeyboardGradualWrapper className="absolute bg-background/90 bottom-0 w-full z-20 pb-2 px-5 items-center pointer-events-box-none">
                <CaptionEditor
                  caption={
                    isEditingCaption ? editingText : activeItem?.caption || ""
                  }
                  isEditing={isEditingCaption}
                  onStartEdit={() => {
                    setEditingText(activeItem?.caption || "");
                    setIsEditingCaption(true);
                  }}
                  onChangeText={setEditingText}
                  onSave={handleSaveCaption}
                />
              </KeyboardGradualWrapper>
            )}

            {/* File Info Sheet (OptionSheet at parent level) */}
            <MediaFileInfoSheet
              item={infoItem}
              visible={!!infoItem}
              onDismiss={() => setInfoItem(null)}
              onEditCaption={(item) => {
                setInfoItem(null);
                setEditingText(item.caption || "");
                setIsEditingCaption(true);
              }}
            />
          </View>
        </View>
      </Modal>

      <StatusBar hidden={isChromeVisible} />
    </>
  );
}

interface CaptionEditorProps {
  caption: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onChangeText: (text: string) => void;
  onSave: () => void;
}

function CaptionEditor({
  caption,
  isEditing,
  onStartEdit,
  onChangeText,
  onSave,
}: CaptionEditorProps) {
  const [showMore, setShowMore] = useState(false);
  const colors = useTheme();

  if (isEditing) {
    return (
      <View className="w-full bg-background/95 border border-border rounded-2xl p-3 shadow-2xl">
        <View className="flex-row items-end gap-2">
          <MarkdownEditor
            defaultValue={caption}
            onChangeText={onChangeText}
            // onSubmitEditing={handleSaveCaption}
            onBlur={onSave}
            placeholder="Add a caption..."
            placeholderTextColor={colors.textSecondary}
            // autoFoc us
            // returnKeyType="done"
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 14,
              maxHeight: 120,
              paddingTop: 4,
              paddingBottom: 4,
              paddingHorizontal: 8,
            }}
          />
          <Pressable
            onPress={onSave}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Save caption"
            className="w-10 h-10 rounded-full bg-primary items-center justify-center active:opacity-80">
            <Check size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    );
  }

  if (caption.trim().length > 0) {
    const LEN = 40;
    const source =
      caption.length > LEN && !showMore
        ? caption.slice(0, LEN) + "..."
        : caption;

    return (
      <View className="w-full flex-row items-end gap-2">
        <Pressable
          onPress={() => setShowMore((p) => !p)}
          accessibilityRole="button"
          accessibilityLabel="Edit caption"
          className="flex-1 p-1">
          <MarkdownBody source={source} size={14} />
        </Pressable>

        {/*  Edit Button */}
        <Pressable
          onPress={onStartEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Edit caption"
          className="p-2">
          <Edit3 size={20} color={colors.primary} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onStartEdit}
      accessibilityRole="button"
      accessibilityLabel="Add caption"
      className="flex-row items-center gap-2 bg-background/60 border border-border rounded-full px-4 py-2 active:opacity-80">
      <MessageSquare size={13} color={colors.textSecondary} />
      <Text className="text-text-secondary text-xs font-medium">
        Add a caption...
      </Text>
    </Pressable>
  );
}

// Clean Fullscreen Audio Player
function AudioPreviewPlayer({
  item,
  isActive,
}: {
  item: MediaItem;
  isActive: boolean;
}) {
  const colors = useTheme();
  const audioUri = item.localUri || item.url;
  const audioMeta = item.metadata as AudioMetadata | undefined;

  const { isPlaying, isBuffering, currentTime, duration, togglePlay, seekTo } =
    useAudioPlayerState(audioUri);

  // Automatically pause playback when swiping away to another slide
  useEffect(() => {
    if (!isActive && isPlaying) {
      togglePlay();
    }
  }, [isActive, isPlaying, togglePlay]);

  const effectiveDuration = duration > 0 ? duration : audioMeta?.duration || 0;
  const progressRatio =
    effectiveDuration > 0
      ? Math.min(1, Math.max(0, currentTime / effectiveDuration))
      : 0;

  return (
    <View className="w-full max-w-sm p-6 items-center justify-center gap-5">
      {/* Waveform Visualization */}
      <View className="w-full px-2">
        <AudioWaveform
          progress={progressRatio}
          onSeek={(ratio) => seekTo(ratio * effectiveDuration)}
          height={52}
          barCount={36}
          activeColor={colors.primary}
          inactiveColor={`${colors.textSecondary}20`}
          interactive={true}
        />
      </View>

      {/* Time Readout */}
      {/* <View className="w-full flex-row items-center justify-between px-1">
        <Text
          style={{ fontVariant: ["tabular-nums"] }}
          className="text-xs font-mono text-text-secondary">
          {formatDuration(currentTime)}
        </Text>
        <Text
          style={{ fontVariant: ["tabular-nums"] }}
          className="text-xs font-mono text-text-secondary">
          {formatDuration(effectiveDuration)}
        </Text>
      </View> */}

      {/* Main Playback Controls */}
      <View className="flex-row items-center justify-center gap-6">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            seekTo(0);
          }}
          hitSlop={8}
          className="w-10 h-10 rounded-full bg-background-element items-center justify-center active:opacity-70">
          <RotateCcw size={18} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            togglePlay();
          }}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? "Pause audio" : "Play audio"}
          className="w-16 h-16 rounded-full bg-primary items-center justify-center active:opacity-90 shadow-md">
          {isBuffering ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : isPlaying ? (
            <Pause size={26} color={colors.text} fill={colors.text} />
          ) : (
            <Play
              size={26}
              color={colors.text}
              fill={colors.text}
              className="ml-1"
            />
          )}
        </Pressable>

        {/* <View className="w-10 h-10" /> */}
        {/* Time Readout */}
        <View className="flex-row items-center justify-between">
          <Text
            style={{ fontVariant: ["tabular-nums"] }}
            className="text-base font-black font-mono text-text">
            {formatDuration(effectiveDuration - currentTime)}
          </Text>
          {/* <Text
            style={{ fontVariant: ["tabular-nums"] }}
            className="text-xs font-mono text-text-secondary">
            {formatDuration(effectiveDuration)}
          </Text> */}
        </View>
      </View>
    </View>
  );
}

// Clean Fullscreen Document / File Card
function FilePreviewCard({
  item,
  onShare,
}: {
  item: MediaItem;
  onShare: (item: MediaItem) => void;
}) {
  const colors = useTheme();
  const fileMeta = item.metadata as FileMetadata | undefined;
  const sizeString = formatFileSize(
    fileMeta?.size || (item.metadata as any)?.size,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open document externally"
      className="w-full items-center justify-center"
      onPress={() => onShare(item)}>
      <View className="w-full flex-row max-w-sm p-6 items-center gap-4">
        <View className="w-20 h-20 rounded-3xl bg-primary/15 items-center justify-center border border-primary/30">
          <FileText size={40} color={colors.primary} />
        </View>

        <View className="items-start gap-1">
          {/* <Text className="text-base font-mono text-text flex-1" numberOfLines={1}>
              {item.name}
            </Text> */}

          <Text className="text-base font-mono text-text-secondary">
            {capitalize(item.mediaType)} - {sizeString || "Unknown size"}
          </Text>
          <View className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl">
            <ExternalLink size={16} color={colors.primary} />
            <Text className="text-sm font-semibold text-primary">
              Open / Share File
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
