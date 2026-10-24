import React, { useState, useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
// import * as Sharing from "expo-sharing";
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  FileArchive,
  File,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { FileMetadata, MediaItem } from "@/lib/types/notes";
import { formatFileSize } from "@/lib/media/file-system";
import { useMediaUploadProgress } from "@/lib/media/use-media-upload-store";
import { retrySingleMediaUpload } from "@/lib/media/upload-service";
import { MediaCaptionField } from "./media-caption-field";
import { toast } from "@/lib/toast";

export interface MediaFileCardProps {
  item: MediaItem;
  isEditing: boolean;
  onRemove: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
  onCommit: () => void;
}

function getFileIcon(name?: string, mimeType?: string, color?: string) {
  const ext = name?.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || mimeType?.includes("pdf")) {
    return <FileText size={20} color={color} />;
  }
  if (["zip", "rar", "tar", "gz", "7z"].includes(ext)) {
    return <FileArchive size={20} color={color} />;
  }
  if (["csv", "xls", "xlsx"].includes(ext) || mimeType?.includes("spreadsheet")) {
    return <FileSpreadsheet size={20} color={color} />;
  }
  if (["js", "ts", "tsx", "jsx", "json", "html", "css", "py", "sh"].includes(ext)) {
    return <FileCode size={20} color={color} />;
  }
  return <File size={20} color={color} />;
}

export const MediaFileCard = React.memo(function MediaFileCard({
  item,
  isEditing,
  onRemove,
  onUpdateCaption,
  onCommit,
}: MediaFileCardProps) {
  const colors = useTheme();
  const fileMeta = item.metadata as FileMetadata | undefined;
  const displayName = item.name || "Attached Document";
  const sizeString = formatFileSize(fileMeta?.size);

  const [localCaption, setLocalCaption] = useState(item.caption || "");
  const uploadState = useMediaUploadProgress(item.id);
  const isUploading = uploadState?.status === "uploading";
  const isFailed = uploadState?.status === "failed";
  const progressPercent = Math.round((uploadState?.progress || 0) * 100);

  useEffect(() => {
    setLocalCaption(item.caption || "");
  }, [item.caption]);

  const handleOpenFile = async () => {
    const fileUri = item.localUri || item.url;
    if (!fileUri) return;
    Haptics.selectionAsync();
    try {
      // const isAvailable = await Sharing.isAvailableAsync();
      // if (isAvailable) {
      //   await Sharing.shareAsync(fileUri, {
      //     dialogTitle: displayName,
      //     mimeType: fileMeta?.mimeType,
      //     UTI: fileMeta?.mimeType,
      //   });
      // }
      toast.info("Sharing Disabled for next dev build")
    } catch (err) {
      console.warn("[MediaFileCard] Failed to share/open file via expo-sharing:", err);
    }
  };

  const handleCaptionChange = (text: string) => {
    setLocalCaption(text);
    onUpdateCaption(item.id, text);
  };

  return (
    <View className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
      <Pressable
        onPress={isEditing ? undefined : handleOpenFile}
        accessibilityRole="button"
        accessibilityLabel={`Document: ${displayName}${sizeString ? `, ${sizeString}` : ""}`}
        className="flex-row items-center gap-3 active:opacity-70"
      >
        {/* File Type Icon Box */}
        <View className="w-10 h-10 rounded-xl bg-background-element items-center justify-center border border-border/50">
          {getFileIcon(item.name, fileMeta?.mimeType, colors.text)}
        </View>

        {/* File Details */}
        <View className="flex-1 min-w-0 justify-center">
          <View className="flex-row items-center gap-1.5">
            <Text
              numberOfLines={1}
              className="text-xs font-semibold text-foreground truncate flex-1"
            >
              {displayName}
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

          <View className="flex-row items-center gap-2 mt-0.5">
            {sizeString ? (
              <Text className="text-[11px] font-mono text-text-secondary">
                {sizeString}
              </Text>
            ) : null}

            {!isEditing && (
              <View className="flex-row items-center gap-0.5">
                <Text className="text-[10px] text-primary font-medium">Open</Text>
                <ExternalLink size={10} color={colors.primary} />
              </View>
            )}
          </View>
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
            accessibilityLabel="Delete attached file"
            className="p-1.5 rounded-full active:opacity-60 self-center"
          >
            <Trash2 size={16} color={colors.textSecondary} />
          </Pressable>
        )}
      </Pressable>

      {/* Markdown Notes Field (Edit mode: MarkdownEditor, View mode: MarkdownBody) */}
      {(isEditing || localCaption.trim().length > 0) && (
        <View className="mt-2.5 pt-2 border-t border-border/30">
          <MediaCaptionField
            value={localCaption}
            isEditing={isEditing}
            placeholder="Add notes for this document "
            onChangeText={handleCaptionChange}
            onCommit={onCommit}
          />
        </View>
      )}
    </View>
  );
});
