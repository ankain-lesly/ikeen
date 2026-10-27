import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { Check, File, Mic } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import type { ListBlock, MediaItem } from "@/lib/types/notes";

/**
 * Strips markdown tokens to display clean, human-readable plain text.
 */
export function stripMarkdown(content?: string): string {
  if (!content) return "";
  return content
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "") // headers
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // italic
    .replace(/~~(.*?)~~/g, "$1") // strikethrough
    .replace(/^[ \t]*>[ \t]?/gm, "") // blockquotes
    .replace(/^[ \t]*[-*+][ \t]+/gm, "") // bullets
    .replace(/^[ \t]*\d+\.[ \t]+/gm, "") // numbers
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Structured preview for list blocks (first 3 items with exact type markers + count).
 */
export const ListBlockPreview = React.memo(function ListBlockPreview({
  block,
}: {
  block: ListBlock;
}) {
  const colors = useTheme();
  const items = Array.isArray(block.content) ? block.content : [];
  if (items.length === 0) return null;

  const previewItems = items.slice(0, 3);
  const remainingCount = items.length - previewItems.length;

  return (
    <View className="gap-1.5">
      {previewItems.map((item, index) => {
        const displayText = stripMarkdown(item.content) || "List item";
        return (
          <View key={item.id || index} className="flex-row items-center gap-2">
            {block.listType === "checkbox" ? (
              <View
                className={`size-3.5 rounded-[3px] border items-center justify-center ${
                  item.checked
                    ? "border-text-secondary bg-text-secondary"
                    : "border-text-secondary/60 bg-transparent"
                }`}>
                {item.checked ? (
                  <Check size={10} color={colors.background} strokeWidth={3} />
                ) : null}
              </View>
            ) : block.listType === "bullet" ? (
              <View className="size-3.5 items-center justify-center">
                <View className="size-1.5 rounded-full bg-text-secondary" />
              </View>
            ) : (
              <View className="size-3.5 items-center justify-center">
                <Text className="text-[10px] font-semibold font-mono text-text-secondary">
                  {index + 1}.
                </Text>
              </View>
            )}

            <Text
              numberOfLines={1}
              className={`text-xs text-text-secondary flex-1 ${
                item.checked ? "line-through opacity-60" : ""
              }`}>
              {displayText}
            </Text>
          </View>
        );
      })}

      {remainingCount > 0 && (
        <Text className="text-[11px] font-medium text-text-secondary/70 ml-5.5">
          +{remainingCount} more
        </Text>
      )}
    </View>
  );
});

/**
 * Prominent cover thumbnail preview for notes containing media blocks.
 * Supports "cover" (grid mode hero banner) and "thumbnail" (list mode square anchor).
 * Icon-only presentation for audio and file previews without extra text clutter.
 */
export const MediaCoverPreview = React.memo(function MediaCoverPreview({
  item,
  // totalMediaCount = 1,
  variant = "cover",
}: {
  item: MediaItem;
  totalMediaCount?: number;
  variant?: "cover" | "thumbnail";
}) {
  const colors = useTheme();
  const sourceUri = item.localUri || item.url;

  if (variant === "thumbnail") {
    if (item.mediaType === "image" && sourceUri) {
      return (
        <View className="bg-card relative overflow-hidden shrink-0">
          <Image
            source={{ uri: sourceUri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={150}
          />
          {/* {totalMediaCount > 1 && (
            <View className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60">
              <Text className="text-[9px] font-semibold text-white">
                +{totalMediaCount - 1}
              </Text>
            </View>
          )} */}
        </View>
      );
    }

    if (item.mediaType === "audio") {
      return (
        <View className="relative flex-1 bg-primary/10 items-center justify-center shrink-0">
          <Mic size={22} color={colors.primary} />
          {/* {totalMediaCount > 1 && (
            <View className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-primary/20">
              <Text className="text-[9px] font-semibold text-primary">
                +{totalMediaCount - 1}
              </Text>
            </View>
          )} */}
        </View>
      );
    }

    return (
      <View className="relative flex-1 rounded-lg bg-card border border-border/50 items-center justify-center shrink-0">
        <File size={22} color={colors.textSecondary} />
        {/* {totalMediaCount > 1 && (
          <View className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-background-element">
            <Text className="text-[9px] font-semibold text-text-secondary">
              +{totalMediaCount - 1}
            </Text>
          </View>
        )} */}
      </View>
    );
  }

  if (item.mediaType === "image" && sourceUri) {
    return (
      <View className="w-full h-32 bg-card relative overflow-hidden">
        <Image
          source={{ uri: sourceUri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={150}
        />
        {/* {totalMediaCount > 1 && (
          <View className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60">
            <Text className="text-[10px] font-semibold text-white">
              +{totalMediaCount - 1}
            </Text>
          </View>
        )} */}
      </View>
    );
  }

  if (item.mediaType === "audio") {
    return (
      <View className="w-full h-20 bg-primary/10 items-center justify-center relative">
        <View className="size-10 rounded-full bg-primary/20 items-center justify-center">
          <Mic size={22} color={colors.primary} />
        </View>
        {/* {totalMediaCount > 1 && (
          <View className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/50">
            <Text className="text-[10px] font-semibold text-white">
              +{totalMediaCount - 1}
            </Text>
          </View>
        )} */}
      </View>
    );
  }

  return (
    <View className="w-full h-20 bg-card border-b border-border/40 items-center justify-center relative">
      <View className="size-10 items-center justify-center">
        <File size={22} color={colors.textSecondary} />
      </View>
      {/* {totalMediaCount > 1 && (
        <View className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/50">
          <Text className="text-[10px] font-semibold text-white">
            +{totalMediaCount - 1}
          </Text>
        </View>
      )} */}
    </View>
  );
});
