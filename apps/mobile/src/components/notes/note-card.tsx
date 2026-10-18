import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { ArchiveRestore, Check, Pin } from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import type { Note } from "@/lib/types/notes";
import { useTheme } from "@/hooks/use-theme";
import { NotesOptionsDropdown } from "./notes-options-dropdown";
import { formatTimeAgo } from "@repo/utils/date";

interface NoteCardProps {
  note: Note;
  className?: string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onLongPressSelect?: (id: string) => void;
}

function areNoteCardPropsEqual(
  prev: NoteCardProps,
  next: NoteCardProps,
): boolean {
  return (
    prev.note.id === next.note.id &&
    prev.note.title === next.note.title &&
    prev.note.content === next.note.content &&
    prev.note.tags === next.note.tags &&
    prev.note.isPinned === next.note.isPinned &&
    prev.note.isArchived === next.note.isArchived &&
    prev.note.deletedAt === next.note.deletedAt &&
    prev.note.updatedAt === next.note.updatedAt &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isSelected === next.isSelected &&
    prev.className === next.className &&
    prev.onSelect === next.onSelect &&
    prev.onLongPressSelect === next.onLongPressSelect
  );
}

/**
 * ============================================================================
 * ARCHITECTURAL NOTES FOR FUTURE REVIEW: <Link> vs <Pressable> & Virtualization
 * ============================================================================
 *
 * 1. WHY EXPO ROUTER'S <Link> WAS REPLACED WITH <Pressable> & router.push():
 *    - In earlier iterations, NoteCard wrapped its contents in `<Link asChild>`
 *      with `<Link.Trigger>` and `<Link.Menu>`.
 *    - In multi-selection mode (`isSelectionMode === true`), cards must NOT
 *      navigate on tap, but rather toggle their selection state (`onSelect`).
 *    - Initially, the component conditionally swapped between:
 *        `if (isSelectionMode) return <Pressable ...>` vs `return <Link ...>`
 *    - In React tree reconciliation, swapping root component types (`Link` vs
 *      `Pressable`) forces React to unmount the entire subtree of every card
 *      and recreate it from scratch.
 *    - On iOS, `<Link>` also registers native context menu controllers
 *      (`UIContextMenuInteraction`). Tearing down and recreating these native
 *      controllers simultaneously for 20+ list items stalled the main UI thread.
 *
 * 2. FLASHLIST MASONRY SENSITIVITY & "GLITTER" / COLUMN JUMPING:
 *    - When rendered inside `@shopify/flash-list` with `masonry={true}`, the list
 *      continually balances column heights based on cell geometry measurements.
 *    - Remounting cards or altering their height by even 1 pixel triggers an
 *      immediate column recalculation, causing cards to jump across columns
 *      (observed as visual "glitter" or jumping during selection mode toggles).
 *    - By permanently mounting `<Pressable>` as the stable root element, the
 *      component tree NEVER unmounts during mode transitions.
 *
 * 3. GEOMETRIC STABILITY (THE 20x20 SLOT):
 *    - The top-right accessory slot is locked to a fixed `w-5 h-5` (20x20 px) box.
 *    - `NotesOptionsDropdown` stays mounted; the selection checkbox overlays it
 *      with opacity / pointerEvents so native Host views are not torn down.
 *    - Both unselected and selected states maintain identical border widths and
 *      padding (`p-3.5`, `border 1px`), ensuring 0-pixel height variance.
 *
 * 4. CONTEXT ACTIONS:
 *    - Note actions (Pin, Archive, Share, Delete, Move) are handled by
 *      `NotesOptionsDropdown` (accessible via tap or long-press) and the floating
 *      bulk action bar, avoiding dependency on `<Link.Menu>`.
 * ============================================================================
 */
export const NoteCard = React.memo(function NoteCard({
  note,
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
  const displaySnippet = note.content.trim() || "No additional text";
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

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      className={className}>
      <View
        className={`p-3.5 rounded-xl border ${
          isSelected
            ? "border-primary bg-transparent"
            : "border-border bg-card/50"
        } shadow-sm_ active:opacity-90 active:scale-[0.99] gap-1`}>
        {/* Header Row: Title & Pin/Date/Selection */}
        <View className="flex-row items-center justify-between gap-2">
          <View className="gap-1.5 flex-1">
            <View className="flex-row items-center justify-between gap-1 w-full">
              <Text className="text-[10px] inline-block font-mono text-text-secondary">
                {formattedDate}
              </Text>

              <View className="flex-row items-center gap-1.5">
                {note.isPinned && (
                  <Pin
                    size={12}
                    color={colors.primary}
                    fill={colors.primary}
                  />
                )}

                {note.isArchived && (
                  <ArchiveRestore
                    size={12}
                    color={colors.textSecondary}
                  />
                )}

                {/* Fixed-geometry slot (20x20): menu stays mounted, checkbox overlays */}
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
                        size: 14,
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

            <ThemedText
              numberOfLines={2}
              className="font-semibold text-base text-text flex-1">
              {displayTitle}
            </ThemedText>
          </View>
        </View>

        {/* Footer: Tags List */}
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

        {/* Snippet Row */}
        <ThemedText
          numberOfLines={2}
          className="text-[13px] leading-5 text-text-secondary mb-2.5">
          {displaySnippet}
        </ThemedText>
      </View>
    </Pressable>
  );
}, areNoteCardPropsEqual);
