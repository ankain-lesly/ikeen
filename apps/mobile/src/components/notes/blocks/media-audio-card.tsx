import React, { useState, useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Play, Pause, Trash2, Mic, CheckCircle2, AlertCircle } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { AudioMetadata, MediaItem } from "@/lib/types/notes";
import {
  formatDuration,
  useAudioPlayerState,
} from "@/lib/media/use-audio-player";
import { useMediaUploadProgress } from "@/lib/media/use-media-upload-store";
import { retrySingleMediaUpload } from "@/lib/media/upload-service";
import { MediaCaptionField } from "./media-caption-field";

export interface MediaAudioCardProps {
  item: MediaItem;
  isEditing: boolean;
  onRemove: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
  onCommit: () => void;
}

export const MediaAudioCard = React.memo(function MediaAudioCard({
  item,
  isEditing,
  onRemove,
  onUpdateCaption,
  onCommit,
}: MediaAudioCardProps) {
  const colors = useTheme();
  const audioUri = item.localUri || item.url;
  const audioMeta = item.metadata as AudioMetadata | undefined;

  const [localCaption, setLocalCaption] = useState(item.caption || "");
  const uploadState = useMediaUploadProgress(item.id);
  const isUploading = uploadState?.status === "uploading";
  const isFailed = uploadState?.status === "failed";
  const progressPercent = Math.round((uploadState?.progress || 0) * 100);

  useEffect(() => {
    setLocalCaption(item.caption || "");
  }, [item.caption]);

  const {
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    togglePlay,
    seekTo,
  } = useAudioPlayerState(audioUri);

  const effectiveDuration = duration > 0 ? duration : audioMeta?.duration || 0;
  const progressRatio =
    effectiveDuration > 0
      ? Math.min(1, Math.max(0, currentTime / effectiveDuration))
      : 0;

  const handleToggle = () => {
    Haptics.selectionAsync();
    togglePlay();
  };

  const handleScrubPress = (event: { nativeEvent: { locationX: number } }, layoutWidth: number) => {
    if (layoutWidth <= 0 || effectiveDuration <= 0) return;
    const targetRatio = Math.min(1, Math.max(0, event.nativeEvent.locationX / layoutWidth));
    Haptics.selectionAsync();
    seekTo(targetRatio * effectiveDuration);
  };

  const [trackWidth, setTrackWidth] = React.useState(0);

  const handleCaptionChange = (text: string) => {
    setLocalCaption(text);
    onUpdateCaption(item.id, text);
  };

  return (
    <View className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
      <View className="flex-row items-center gap-3">
        {/* Play/Pause Button */}
        <Pressable
          onPress={handleToggle}
          accessibilityRole="button"
          accessibilityLabel={
            isPlaying
              ? "Pause audio recording"
              : `Play audio recording, duration ${formatDuration(effectiveDuration)}`
          }
          className="w-11 h-11 rounded-full bg-primary items-center justify-center active:opacity-80"
          hitSlop={6}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : isPlaying ? (
            <Pause size={18} color="#ffffff" fill="#ffffff" />
          ) : (
            <Play size={18} color="#ffffff" fill="#ffffff" className="ml-0.5" />
          )}
        </Pressable>

        {/* Audio Content Info & Waveform Scrubber */}
        <View className="flex-1 min-w-0 justify-center">
          {/* Header Row: Title and Duration */}
          <View className="flex-row items-center justify-between gap-2 mb-1.5">
            <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
              <Mic size={13} color={colors.textSecondary} />
              <Text
                numberOfLines={1}
                className="text-xs font-semibold text-foreground truncate"
              >
                {item.name || "Audio recording"}
              </Text>
              {isUploading ? (
                <View className="flex-row items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded-full">
                  <ActivityIndicator size={8} color={colors.primary} />
                  <Text className="text-[9px] text-primary font-medium">{progressPercent}%</Text>
                </View>
              ) : isFailed ? (
                <Pressable
                  onPress={() => void retrySingleMediaUpload(item.id)}
                  hitSlop={6}
                  className="flex-row items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded-full"
                >
                  <AlertCircle size={9} color="#ef4444" />
                  <Text className="text-[9px] text-red-500 font-medium">Retry</Text>
                </Pressable>
              ) : item.url ? (
                <CheckCircle2 size={11} color="#22c55e" />
              ) : null}
            </View>

            {/* Time Indicator with tabular nums */}
            <Text
              style={{ fontVariant: ["tabular-nums"] }}
              className="text-[11px] font-mono text-text-secondary"
            >
              {formatDuration(currentTime)} / {formatDuration(effectiveDuration)}
            </Text>
          </View>

          {/* Interactive Progress Bar */}
          <Pressable
            onPress={(e) => handleScrubPress(e, trackWidth)}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
            accessibilityRole="adjustable"
            accessibilityLabel="Audio progress scrubber"
            className="w-full h-4 justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
          >
            <View className="w-full h-1.5 rounded-full bg-border overflow-hidden">
              <View
                style={{ width: `${progressRatio * 100}%` }}
                className="h-full bg-primary rounded-full"
              />
            </View>
          </Pressable>
        </View>

        {/* Delete action in edit mode */}
        {isEditing && (
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onRemove(item.id);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Delete audio recording"
            className="p-1.5 rounded-full active:opacity-60 self-center"
          >
            <Trash2 size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Markdown Caption Field (Edit mode: MarkdownEditor, View mode: MarkdownBody) */}
      {(isEditing || localCaption.trim().length > 0) && (
        <View className="mt-2.5 pt-2 border-t border-border/30">
          <MediaCaptionField
            value={localCaption}
            isEditing={isEditing}
            placeholder="Add title or notes for this recording "
            onChangeText={handleCaptionChange}
            onCommit={onCommit}
          />
        </View>
      )}
    </View>
  );
});
