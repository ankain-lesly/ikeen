import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Clock,
  Database,
  Edit3,
  FileText,
  HardDrive,
  Maximize2,
  MessageSquare,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import type {
  AudioMetadata,
  FileMetadata,
  ImageMetadata,
  MediaItem,
} from "@/lib/types/notes";
import { formatFileSize } from "@/lib/media/file-system";
import { formatDuration } from "@/lib/media/use-audio-player";
import { OptionSheet } from "@/components/ui/option-sheet";
import { MarkdownBody } from "@/components/markdown";

export interface MediaFileInfoSheetProps {
  item: MediaItem | null;
  visible: boolean;
  onDismiss: () => void;
  onEditCaption?: (item: MediaItem) => void;
}

export function MediaFileInfoContent({
  item,
  onEditCaption,
  onDismiss,
}: {
  item: MediaItem;
  onEditCaption?: (item: MediaItem) => void;
  onDismiss?: () => void;
}) {
  const colors = useTheme();

  const imageMeta = item.metadata as ImageMetadata | undefined;
  const audioMeta = item.metadata as AudioMetadata | undefined;
  const fileMeta = item.metadata as FileMetadata | undefined;

  const mimeTypeStr =
    fileMeta?.mimeType || (item.metadata as any)?.mimeType || "";
  const fileSize = fileMeta?.size || (item.metadata as any)?.size;
  const sizeString = formatFileSize(fileSize);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 8, gap: 14 }}>
      {/* File Name */}
      <InfoRow
        icon={<FileText size={16} color={colors.textSecondary} />}
        label="File Name"
        value={item.name || "Untitled"}
      />

      {/* Media Type */}
      <InfoRow
        icon={<Database size={16} color={colors.textSecondary} />}
        label="Type"
        value={`${item.mediaType.toUpperCase()}${mimeTypeStr ? ` • ${mimeTypeStr}` : ""}`}
      />

      {/* File Size */}
      {sizeString ? (
        <InfoRow
          icon={<HardDrive size={16} color={colors.textSecondary} />}
          label="Size"
          value={sizeString}
        />
      ) : null}

      {/* Dimensions (Images) */}
      {imageMeta?.width && imageMeta?.height ? (
        <InfoRow
          icon={<Maximize2 size={16} color={colors.textSecondary} />}
          label="Dimensions"
          value={`${imageMeta.width} × ${imageMeta.height} px`}
        />
      ) : null}

      {/* Duration (Audio) */}
      {audioMeta?.duration ? (
        <InfoRow
          icon={<Clock size={16} color={colors.textSecondary} />}
          label="Duration"
          value={formatDuration(audioMeta.duration)}
        />
      ) : null}

      {/* Storage & Sync Status */}
      <InfoRow
        icon={<Database size={16} color={colors.textSecondary} />}
        label="Status"
        value={item.url ? "Cloud Synced" : "Stored Locally"}
      />

      {/* Local Sandbox Path */}
      {item.localUri ? (
        <View className="gap-1 pt-1">
          <Text className="text-xs font-medium text-text-secondary">
            Local Path
          </Text>
          <Text
            numberOfLines={2}
            className="text-xs font-mono text-text-secondary p-2 rounded-xl">
            {item.localUri}
          </Text>
        </View>
      ) : null}

      {/* Cloud URL */}
      {item.url ? (
        <View className="gap-1 pt-1">
          <Text className="text-xs font-medium text-text-secondary">
            Cloud URL
          </Text>
          <Text
            numberOfLines={2}
            className="text-xs font-mono text-text-secondary p-2 rounded-xl">
            {item.url}
          </Text>
        </View>
      ) : null}

      {/* Caption Row with Edit Trigger */}
      <View className="gap-3">
        <View className="flex-row items-center gap-2">
          <MessageSquare size={16} color={colors.textSecondary} />
          <Text className="text-xs text-text-secondary">Caption</Text>

          {onEditCaption && (
            <Pressable
              onPress={() => {
                onDismiss?.();
                onEditCaption(item);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit caption"
              className="p-1 rounded-full bg-background-element active:opacity-70 ml-auto">
              <Edit3 size={13} color={colors.primary} />
            </Pressable>
          )}
        </View>
        <View className="flex-row items-center gap-2 flex-1 justify-end">
          <MarkdownBody
            size={14}
            source={item.caption || "No caption yet"}
          />
        </View>
      </View>
    </ScrollView>
  );
}

export const MediaFileInfoSheet = React.memo(function MediaFileInfoSheet({
  item,
  visible,
  onDismiss,
  onEditCaption,
}: MediaFileInfoSheetProps) {
  if (!item) return null;

  return (
    <OptionSheet
      isPresented={visible}
      onDismiss={onDismiss}
      title="File Information"
      snapPoints={["half", "full"]}
      matchHTMLContents={false}>
      <MediaFileInfoContent
        item={item}
        onEditCaption={onEditCaption}
        onDismiss={onDismiss}
      />
    </OptionSheet>
  );
});

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-2 shrink-0">
        {icon}
        <Text className="text-xs text-text-secondary">{label}</Text>
      </View>
      <Text
        numberOfLines={1}
        className="text-xs font-semibold text-foreground flex-1 text-right truncate">
        {value}
      </Text>
    </View>
  );
}
