import React from "react";
import { type DimensionValue, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
// import { LinearGradient } from "expo-linear-gradient";
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  File,
  Mic,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { AudioMetadata, FileMetadata, MediaItem } from "@/lib/types/notes";
import { formatFileSize } from "@/lib/media/file-system";
import { formatDuration } from "@/lib/media/use-audio-player";
import { useMediaUploadProgress } from "@/lib/media/use-media-upload-store";
import { AnimatedSyncBorder } from "./animated-sync-border";
import { MediaOptionsDropdown } from "./media-options-dropdown";

export interface MediaCardProps {
  item: MediaItem;
  width?: DimensionValue;
  height?: number;
  onPress: (item: MediaItem) => void;
  onRemove: (id: string) => void;
}

function getFileTypeMeta(name?: string, mimeType?: string) {
  const ext = name?.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || mimeType?.includes("pdf")) {
    return {
      label: "PDF",
      color: "#ef4444",
      bgColor: "rgba(239, 68, 68, 0.12)",
      icon: FileText,
    };
  }
  if (
    ["csv", "xls", "xlsx"].includes(ext) ||
    mimeType?.includes("spreadsheet")
  ) {
    return {
      label: "Sheet",
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.12)",
      icon: FileSpreadsheet,
    };
  }
  if (
    ["js", "ts", "tsx", "jsx", "json", "html", "css", "py", "sh"].includes(ext)
  ) {
    return {
      label: ext.toUpperCase(),
      color: "#06b6d4",
      bgColor: "rgba(6, 182, 212, 0.12)",
      icon: FileCode,
    };
  }
  if (["zip", "rar", "tar", "gz", "7z"].includes(ext)) {
    return {
      label: "Archive",
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.12)",
      icon: FileArchive,
    };
  }
  return {
    label: ext ? ext.toUpperCase() : "File",
    color: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.12)",
    icon: File,
  };
}

export const MediaCard = React.memo(function MediaCard({
  item,
  width = 176, // w-44
  height = 224, // h-56
  onPress,
  onRemove,
}: MediaCardProps) {
  const colors = useTheme();
  const uploadState = useMediaUploadProgress(item.id);

  const imageUri = item.localUri || item.url;
  const audioMeta = item.metadata as AudioMetadata | undefined;
  const fileMeta = item.metadata as FileMetadata | undefined;

  const durationStr = audioMeta?.duration
    ? formatDuration(audioMeta.duration)
    : "";
  const sizeStr = formatFileSize(
    fileMeta?.size || (item.metadata as any)?.size,
  );

  const fileTypeMeta = getFileTypeMeta(
    item.name,
    fileMeta?.mimeType || (item.metadata as any)?.mimeType,
  );

  // Subtitle generation matching user design (e.g. "Camera", "Audio • 02:15", "PDF • 2.4 MB")
  const subtitle =
    item.mediaType === "image"
        ? "Image"
      : item.mediaType === "audio"
        ? `Audio${durationStr ? ` • ${durationStr}` : ""}`
        : `${fileTypeMeta.label}${sizeStr ? ` • ${sizeStr}` : ""}`;

  const handleCardPress = () => {
    Haptics.selectionAsync();
    onPress(item);
  };

  return (
    <AnimatedSyncBorder
      status={uploadState?.status}
      isSynced={Boolean(item.url)}
      style={{ width, height }}
      borderRadius={24}>
      <Pressable
        onPress={handleCardPress}
        accessibilityRole="button"
        accessibilityLabel={`${item.name || "Attachment"}, ${subtitle}`}
        className="relative flex-1 bg-card overflow-hidden justify-between active:opacity-90">
        {/* Background Visual Layer */}
        {item.mediaType === "image" ? (
          imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View className="absolute inset-0 bg-background-element items-center justify-center">
              <fileTypeMeta.icon size={36} color={colors.textSecondary} />
            </View>
          )
        ) : item.mediaType === "audio" ? (
          <View className="absolute inset-0 bg-background-element items-center justify-center p-4 gap-3">
            {/* Center Audio Icon + Soundwave */}
            <View className="w-11 h-11 rounded-full bg-primary/20 items-center justify-center shadow-xs">
              <Mic size={20} color={colors.primary} />
            </View>
          </View>
        ) : (
          <View className="absolute inset-0 bg-background-element items-center justify-center p-4">
            {/* Clean Document Emblem */}
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center shadow-xs"
              style={{ backgroundColor: fileTypeMeta.bgColor }}>
              <fileTypeMeta.icon size={28} color={fileTypeMeta.color} />
            </View>
          </View>
        )}

        {/* Top-Right More Button (3 dots) */}
        <View className="w-full flex-row justify-end p-2.5 z-10">
          <MediaOptionsDropdown
            variant="dropdown"
            item={item}
            visible={false}
            // onDismiss={() => setSelectedMenuItem(null)}
            onRemove={onRemove}
          />
        </View>

        {/* Bottom Gradient Scrim & 2-Line Metadata Overlay */}
        <View className="w-full justify-end z-10 overflow-hidden rounded-b-[23px] relative pt-6">
          {/* TODO: Need a production build */}
          {/* <LinearGradient
            colors={["transparent", "rgba(0, 0, 0, 0.45)", "rgba(0, 0, 0, 0.88)"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          /> */}
          <View className="w-full px-3 pb-2.5 pt-2">
            <Text
              numberOfLines={1}
              className="text-sm font-normal text-text truncate leading-tight">
              {item.name || "Attachment"}
            </Text>
            <Text
              numberOfLines={1}
              className="text-[10px] font-medium text-text-secondary truncate mt-0.5">
              {subtitle}
            </Text>
          </View>
        </View>
      </Pressable>
    </AnimatedSyncBorder>
  );
});
