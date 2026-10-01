import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Host, Switch, RNHostView } from "@expo/ui/jetpack-compose";
import { BottomSheet } from "@expo/ui";
import * as Haptics from "@/lib/haptics";
import {
  Archive,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  Pin,
  RotateCcw,
  Tag,
  X,
} from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { hasActiveNotesFilters, ListNotesOptions } from "@/lib/types/notes";

export interface NotesFilterSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  availableTags: string[];
  appliedFilter: ListNotesOptions;
  handleApplyFilters: (filter: ListNotesOptions) => void;
}

export function NotesFilterSheet(props: NotesFilterSheetProps) {
  return (
    <Host matchContents>
      {props.isPresented ? <NotesFilterSheetBody {...props} /> : null}
    </Host>
  );
}

function NotesFilterSheetBody({
  availableTags = [],
  isPresented,
  onDismiss,
  appliedFilter,
  handleApplyFilters,
}: NotesFilterSheetProps) {
  const [filter, setFilter] = useState<ListNotesOptions>(appliedFilter);
  const colors = useTheme();

  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setFilter({
      pinnedOnly: appliedFilter.pinnedOnly,
      includeArchived: appliedFilter.includeArchived,
      archivedOnly: appliedFilter.archivedOnly,
    });
  };

  const updateFilter = (key: keyof ListNotesOptions, value: unknown) => {
    Haptics.selectionAsync();
    setFilter((s) => ({ ...s, [key]: value }));
  };

  const isAsc = useMemo(
    () => filter.orderDirection === "asc",
    [filter.orderDirection],
  );
  const directionLabel = useMemo(() => {
    return filter.orderBy === "title"
      ? isAsc
        ? "A → Z (Alphabetical)"
        : "Z → A (Reverse)"
      : isAsc
        ? "Oldest first"
        : "Newest first";
  }, [filter.orderBy, isAsc]);

  const hasActiveFilters = useMemo(
    () => hasActiveNotesFilters(filter),
    [filter],
  );

  const showPinnedFirstSort = !filter.pinnedOnly && !filter.includeArchived && !filter.archivedOnly;

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={() => onDismiss()}
      showDragIndicator
      snapPoints={["half", "full"]}
      containerColor={colors.card}>
          <RNHostView>
            <View className="flex-1 pt-2 pb-8 w-full p-4">
              {/* Header: Title + Reset Action + Close Button */}
              <View className="flex-row items-center justify-between pb-3.5 border-b border-border">
                <View className="flex-row items-center gap-2">
                  <ThemedText type="subtitle">Sort & Filter</ThemedText>
                  {hasActiveFilters && (
                    <View className="px-2 py-0.5 rounded-full bg-primary/20">
                      <Text className="text-[11px] font-semibold text-primary">
                        Active
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center gap-2">
                  {hasActiveFilters && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Reset sort and filters"
                      onPress={handleReset}
                      hitSlop={8}
                      className="flex-row items-center gap-1 min-h-11 px-2.5 py-1 rounded-lg bg-background-element active:opacity-70">
                      <RotateCcw size={12} color={colors.textSecondary} />
                      <Text className="text-xs font-medium text-text-secondary">
                        Reset
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close sort and filter"
                    onPress={onDismiss}
                    hitSlop={8}
                    className="h-11 w-11 items-center justify-center rounded-full bg-background-element active:opacity-70">
                    <X size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              <View className="pt-4 pb-6 gap-5">
                {/* Section 1: Sort By */}
                <View className="gap-2.5">
                  <Text className="text-xs font-semibold tracking-wider text-text-secondary">
                    Sort By
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(
                      [
                        { key: "updatedAt", label: "Modified" },
                        { key: "createdAt", label: "Created" },
                        { key: "title", label: "Title" },
                      ] as const
                    ).map((item) => {
                      const isActive = filter.orderBy === item.key;
                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => updateFilter("orderBy", item.key)}
                          className={`px-4 py-3 rounded-full items-center justify-center border active:opacity-80 ${
                            isActive
                              ? "bg-background-selected border-primary"
                              : "bg-background-element border-border"
                          }`}>
                          <Text
                            className={`text-xs ${
                              isActive
                                ? "font-bold text-text"
                                : "font-medium text-text-secondary"
                            }`}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Sort Direction Toggle Row */}
                  <Pressable
                    onPress={() =>
                      updateFilter(
                        "orderDirection",
                        filter.orderDirection === "asc" ? "desc" : "asc",
                      )
                    }
                    className="flex-row items-center justify-between p-3 rounded-xl border border-border bg-background-element active:opacity-80 mt-1">
                    <View className="flex-row items-center gap-2">
                      {isAsc ? (
                        <ArrowUpNarrowWide size={16} color={colors.primary} />
                      ) : (
                        <ArrowDownWideNarrow size={16} color={colors.primary} />
                      )}
                      <Text className="text-sm font-medium text-text">
                        Order: {directionLabel}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-primary">
                      Toggle
                    </Text>
                  </Pressable>
                </View>

                {/* Section 2: Pinned sort — Recent view only */}
                {showPinnedFirstSort && (
                  <View className="gap-2.5 pt-2 border-t border-border">
                    <View className="flex-row items-center justify-between py-1">
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-8 w-8 items-center justify-center rounded-lg bg-background-element">
                          <Pin
                            size={15}
                            color={colors.primary}
                            style={{ transform: [{ rotate: "45deg" }] }}
                          />
                        </View>
                        <View>
                          <Text className="text-sm font-semibold text-text">
                            Keep Pinned on Top
                          </Text>
                          <Text className="text-xs text-text-secondary mt-0.5">
                            Sort pinned notes above the rest
                          </Text>
                        </View>
                      </View>
                      <Host matchContents>
                        <Switch
                          value={filter.pinnedFirst !== false}
                          onCheckedChange={(value) =>
                            updateFilter("pinnedFirst", value)
                          }
                        />
                      </Host>
                    </View>
                  </View>
                )}

                {/* Section 3: Status / View Filter */}
                <View className="gap-2.5 pt-2 border-t border-border">
                  <View className="flex-row items-center justify-between py-1">
                    <View className="flex-row items-center gap-2.5">
                      <View className="h-8 w-8 items-center justify-center rounded-lg bg-background-element">
                        <Archive size={15} color={colors.primary} />
                      </View>
                      <View>
                        <Text className="text-sm font-semibold text-text">
                          Include Archived Notes
                        </Text>
                        <Text className="text-xs text-text-secondary mt-0.5">
                          Show archived notes in list results
                        </Text>
                      </View>
                    </View>
                    <Host matchContents>
                      <Switch
                        value={!!filter.includeArchived}
                        onCheckedChange={(value) => {
                          Haptics.selectionAsync();
                          setFilter((s) => ({
                            ...s,
                            includeArchived: value,
                            archivedOnly: value,
                            pinnedOnly: value ? false : s.pinnedOnly,
                          }));
                        }}
                      />
                    </Host>
                  </View>
                </View>

                {/* Section 4: Tags Filter */}
                {availableTags.length > 0 && (
                  <View className="gap-2.5 pt-2 border-t border-border">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <Tag size={13} color={colors.textSecondary} />
                        <Text className="text-xs font-semibold tracking-wider text-text-secondary">
                          Filter by Tag ({availableTags.length})
                        </Text>
                      </View>
                      {filter.tag && (
                        <Pressable
                          onPress={() => updateFilter("tag", null)}
                          hitSlop={6}>
                          <Text className="text-xs text-primary font-medium">
                            Clear tag
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    <View className="flex-row flex-wrap gap-2">
                      <Pressable
                        onPress={() => updateFilter("tag", null)}
                        className={`px-3 py-1.5 rounded-full border active:opacity-80 ${
                          filter.tag === null || filter.tag === undefined
                            ? "bg-background-selected border-primary"
                            : "bg-background-element border-border"
                        }`}>
                        <Text
                          className={`text-xs ${
                            filter.tag === null || filter.tag === undefined
                              ? "font-bold text-text"
                              : "font-normal text-text-secondary"
                          }`}>
                          All Tags
                        </Text>
                      </Pressable>

                      {availableTags.map((tag) => {
                        const isSelected = filter.tag === tag;
                        return (
                          <Pressable
                            key={tag}
                            onPress={() =>
                              updateFilter("tag", isSelected ? null : tag)
                            }
                            className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full border active:opacity-80 ${
                              isSelected
                                ? "bg-background-selected border-primary"
                                : "bg-background-element border-border"
                            }`}>
                            {isSelected && (
                              <Check
                                size={11}
                                color={colors.primary}
                                strokeWidth={2.5}
                              />
                            )}
                            <Text
                              className={`text-xs ${
                                isSelected
                                  ? "font-bold text-text"
                                  : "font-normal text-text-secondary"
                              }`}>
                              #{tag}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Bottom Apply CTA */}
              <Pressable
                onPress={() => handleApplyFilters(filter)}
                className="w-full h-12 rounded-2xl bg-primary items-center justify-center active:opacity-90 active:scale-[0.99] mt-2">
                <Text className="text-white font-semibold text-base">Done</Text>
              </Pressable>
            </View>
          </RNHostView>
    </BottomSheet>
  );
}
