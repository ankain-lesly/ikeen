import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { ArchiveRestore, Check, Pin } from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import type {
  ListBlock,
  MediaBlock,
  NoteWithBlocks,
  TextBlock,
  NoteBlock,
} from "@/lib/types/notes";
import { useTheme } from "@/hooks/use-theme";
import { NotesOptionsDropdown } from "./notes-options-dropdown";
import { formatTimeAgo } from "@repo/utils/date";
import {
  ListBlockPreview,
  MediaCoverPreview,
  stripMarkdown,
} from "./note-card-preview";

interface NoteCardProps {
  note: NoteWithBlocks;
  layout?: "grid" | "list";
  className?: string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onLongPressSelect?: (id: string) => void;
}

function areBlocksEqual(prev?: NoteBlock[], next?: NoteBlock[]): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i++) {
    const pb = prev[i];
    const nb = next[i];
    if (pb.id !== nb.id || pb.updatedAt !== nb.updatedAt) return false;
  }
  return true;
}

function areNoteCardPropsEqual(
  prev: NoteCardProps,
  next: NoteCardProps,
): boolean {
  return (
    prev.note.id === next.note.id &&
    prev.note.title === next.note.title &&
    prev.note.content === next.note.content &&
    prev.note.summary === next.note.summary &&
    prev.note.tags === next.note.tags &&
    prev.note.isPinned === next.note.isPinned &&
    prev.note.isArchived === next.note.isArchived &&
    prev.note.deletedAt === next.note.deletedAt &&
    prev.note.updatedAt === next.note.updatedAt &&
    areBlocksEqual(prev.note.blocks, next.note.blocks) &&
    prev.layout === next.layout &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isSelected === next.isSelected &&
    prev.className === next.className &&
    prev.onSelect === next.onSelect &&
    prev.onLongPressSelect === next.onLongPressSelect
  );
}

/**
 * Shared Action Bar: Date, Pin, Archive, and the stable 20x20 slot
 */
const CardActionBar = React.memo(function CardActionBar({
  note,
  formattedDate,
  colors,
  isSelectionMode,
  isSelected,
  isMenuOpen,
  setIsMenuOpen,
  variant = "in-flow",
}: {
  note: NoteWithBlocks;
  formattedDate: string;
  colors: ReturnType<typeof useTheme>;
  isSelectionMode: boolean;
  isSelected: boolean;
  isMenuOpen: boolean;
  setIsMenuOpen: (v: boolean) => void;
  variant?: "in-flow" | "floating";
}) {
  const isFloating = variant === "floating";

  return (
    <View
      className={
        isFloating
          ? "absolute top-2.5 left-2.5 right-2.5 z-10 flex-row items-center justify-between pointer-events-box-none"
          : "flex-row items-center justify-between gap-1 w-full"
      }>
      {/* Date Pill / Text */}
      {isFloating ? (
        <View className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md">
          <Text className="text-[10px] font-mono text-white/90">
            {formattedDate}
          </Text>
        </View>
      ) : (
        <Text className="text-[10px] inline-block font-mono text-text-secondary">
          {formattedDate}
        </Text>
      )}

      {/* Actions (Pin, Archive, 20x20 slot) */}
      <View
        className={
          isFloating
            ? "flex-row items-center gap-2 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md"
            : "flex-row items-center gap-2"
        }>
        {note.isPinned && (
          <Pin
            size={14}
            color={isFloating ? "#ffffff" : colors.primary}
            fill={isFloating ? "#ffffff" : colors.primary}
          />
        )}

        {note.isArchived && (
          <ArchiveRestore
            size={14}
            color={isFloating ? "#ffffff" : colors.textSecondary}
          />
        )}

        {/* Fixed-geometry slot (20x20) */}
        <View className="w-5 h-5 items-center justify-center">
          <View
            pointerEvents={isSelectionMode ? "none" : "auto"}
            style={{ opacity: isSelectionMode ? 0 : 1 }}
            className="absolute inset-0 items-center justify-center">
            <NotesOptionsDropdown
              variant="dropdown"
              isExpanded={isMenuOpen}
              setIsExpanded={setIsMenuOpen}
              note={note}
              iconStyle={{
                size: 16,
                color: isFloating ? "#ffffff" : undefined,
                className: "w-5 h-5 items-center justify-center",
              }}
            />
          </View>
          <View
            pointerEvents="none"
            style={{ opacity: isSelectionMode ? 1 : 0 }}
            className="absolute inset-0 items-center justify-center">
            <View
              className={`w-5 h-5 rounded-full items-center justify-center border ${
                isSelected
                  ? "bg-primary border-primary"
                  : isFloating
                    ? "border-white/60 bg-black/40"
                    : "border-border bg-background-element"
              }`}>
              {isSelected ? (
                <Check size={12} color="#ffffff" strokeWidth={3} />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

export const NoteCard = React.memo(function NoteCard({
  note,
  layout = "grid",
  className,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  onLongPressSelect,
}: NoteCardProps) {
  const colors = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const parsedTags = useMemo(() => {
    try {
      const parsed = JSON.parse(note.tags || "[]");
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [note.tags]);

  const displayTitle = note.title.trim() || "Untitled Note";

  const { coverMedia, totalMediaCount, contentBlock } = useMemo(() => {
    const rawBlocks = note.blocks || [];
    const mediaBlocks = rawBlocks.filter(
      (b): b is MediaBlock => b.type === "media",
    );
    const allMedia = mediaBlocks.flatMap((b) =>
      Array.isArray(b.content) ? b.content : [],
    );
    const cover = allMedia.find((m) => m.mediaType === "image") || allMedia[0];
    const nonMedia = rawBlocks.find(
      (b): b is ListBlock | TextBlock => b.type === "list" || b.type === "text",
    );
    return {
      coverMedia: cover,
      totalMediaCount: allMedia.length,
      contentBlock: nonMedia,
    };
  }, [note.blocks]);

  const displaySnippet = useMemo(() => {
    if (contentBlock?.type === "text") {
      return stripMarkdown(contentBlock.content);
    }
    return (
      (note.summary && note.summary.trim()) ||
      stripMarkdown(note.content.trim())
    );
  }, [contentBlock, note.summary, note.content]);

  const formattedDate = formatTimeAgo(note.updatedAt);

  useEffect(() => {
    if (isSelectionMode && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isSelectionMode, isMenuOpen]);

  const handlePress = useCallback(() => {
    if (isSelectionMode) {
      onSelect?.(note.id);
      return;
    }
    router.push({
      pathname: "/notes/[id]",
      params: { id: note.id },
    });
  }, [isSelectionMode, note.id, onSelect]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSelectionMode) {
      onSelect?.(note.id);
    } else if (onLongPressSelect) {
      onLongPressSelect(note.id);
    } else {
      setIsMenuOpen(true);
    }
  }, [isSelectionMode, note.id, onSelect, onLongPressSelect]);

  // ==========================================================================
  // Layout 1: Horizontal List Row (layout === "list")
  // ==========================================================================
  if (layout === "list") {
    return (
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        className={className}>
        <View
          className={`rounded-xl border overflow-hidden ${
            isSelected
              ? "border-primary bg-transparent"
              : "border-border bg-card/50"
          } active:opacity-90 active:scale-[0.99]`}>
          <View className="flex-row items-center gap-3 min-h-21">
            {/* Left Column: Actions Bar at Content Top, Title, Snippet, Tags */}
            <View className="flex-2 gap-1 justify-center p-3">
              {/* Actions bar at content top */}
              <CardActionBar
                note={note}
                formattedDate={formattedDate}
                colors={colors}
                isSelectionMode={isSelectionMode}
                isSelected={isSelected}
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                variant="in-flow"
              />

              {/* Title */}
              <ThemedText
                numberOfLines={2}
                className="font-semibold text-base text-text leading-none">
                {displayTitle}
              </ThemedText>

              {/* 1-Line Snippet / Preview */}
              {contentBlock?.type === "list" &&
              contentBlock.content?.length > 0 ? (
                <Text numberOfLines={2} className="text-xs text-text-secondary">
                  {stripMarkdown(contentBlock.content[0]?.content) ||
                    "List note"}
                  {contentBlock.content.length > 1
                    ? ` (+${contentBlock.content.length - 1} more)`
                    : ""}
                </Text>
              ) : displaySnippet ? (
                <Text numberOfLines={2} className="text-xs text-text-secondary">
                  {displaySnippet}
                </Text>
              ) : null}

              {/* Tags */}
              {parsedTags.length > 0 && (
                <View className="flex-row items-center gap-1.5 mt-0.5 overflow-hidden">
                  {parsedTags.slice(0, 2).map((tag, index) => (
                    <View
                      key={`${tag}-${index}`}
                      className="px-1.5 py-0.5 rounded-md bg-background-element border border-border">
                      <Text className="text-[10px] text-text-secondary font-medium">
                        #{tag}
                      </Text>
                    </View>
                  ))}
                  {parsedTags.length > 2 && (
                    <Text className="text-[10px] text-text-secondary font-bold">
                      +{parsedTags.length - 2}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Right Column: Square Thumbnail if media exists */}
            {coverMedia ? (
              <View className="relative h-full flex-1 min-h-21">
                <MediaCoverPreview
                  item={coverMedia}
                  totalMediaCount={totalMediaCount}
                  variant="thumbnail"
                />
              </View>
            ) : (
              <View className="relative h-full flex-1 min-h-21 items-center justify-center bg-card">
                <Text className="text-sm text-text-secondary">Media</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  // ==========================================================================
  // Layout 2: Masonry Grid Card (layout === "grid")
  // ==========================================================================
  const hasCoverMedia = !!coverMedia;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      className={className}>
      <View
        className={`rounded-xl border overflow-hidden ${
          isSelected
            ? "border-primary bg-transparent"
            : "border-border bg-card/50"
        } active:opacity-90 active:scale-[0.99]`}>
        {/* Cover Media & Floating Action Bar */}
        {hasCoverMedia && (
          <View className="relative">
            <MediaCoverPreview
              item={coverMedia}
              totalMediaCount={totalMediaCount}
              variant="cover"
            />
            <CardActionBar
              note={note}
              formattedDate={formattedDate}
              colors={colors}
              isSelectionMode={isSelectionMode}
              isSelected={isSelected}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              variant="floating"
            />
          </View>
        )}

        <View className="p-3.5 gap-1">
          {/* In-flow Action Bar when there is no cover media */}
          {!hasCoverMedia && (
            <CardActionBar
              note={note}
              formattedDate={formattedDate}
              colors={colors}
              isSelectionMode={isSelectionMode}
              isSelected={isSelected}
              isMenuOpen={isMenuOpen}
              setIsMenuOpen={setIsMenuOpen}
              variant="in-flow"
            />
          )}

          {/* Title sits directly below image or in-flow action bar */}
          <ThemedText
            numberOfLines={2}
            className="font-semibold text-base text-text">
            {displayTitle}
          </ThemedText>

          {/* Tags List */}
          {parsedTags.length > 0 && (
            <View className="flex-row items-center gap-1.5 mt-0.5 w-full overflow-hidden">
              {parsedTags.slice(0, 2).map((tag, index) => (
                <View
                  key={`${tag}-${index}`}
                  className="px-2 py-0.5 rounded-full border border-border bg-background-element">
                  <Text className="text-[11px] font-medium text-text-secondary">
                    #{tag}
                  </Text>
                </View>
              ))}
              {parsedTags.length > 2 && (
                <Text className="text-[11px] font-bold text-text-secondary self-center">
                  +{parsedTags.length - 2}
                </Text>
              )}
            </View>
          )}

          {/* Structured Preview / Snippet Row */}
          {contentBlock?.type === "list" && contentBlock.content?.length > 0 ? (
            <ListBlockPreview block={contentBlock} />
          ) : displaySnippet ? (
            <ThemedText
              numberOfLines={2}
              className="text-[13px] leading-5 text-text-secondary">
              {displaySnippet}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}, areNoteCardPropsEqual);
