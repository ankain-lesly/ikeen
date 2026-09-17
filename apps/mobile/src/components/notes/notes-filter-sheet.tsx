import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Host,
  BottomSheet,
  Column,
  RNHostView,
  Switch,
  Checkbox,
  Row,
  Text as ExpoText,
} from "@expo/ui";
import * as Haptics from "expo-haptics";
import {
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
import { ListNotesOptions } from "@/lib/types/notes";
import { toggleable } from "@expo/ui/jetpack-compose/modifiers";

export interface NotesFilterSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  availableTags: string[];
  // Actions
  handleApplyFilters: (filter: ListNotesOptions) => void;
}

export function NotesFilterSheet({
  availableTags = [],
  isPresented,
  onDismiss,
  handleApplyFilters,
}: NotesFilterSheetProps) {
  const [filter, setFilter] = useState<ListNotesOptions>({});
  const colors = useTheme();

  const handleReset = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setFilter({});
  };

  const updateFilter = (key: keyof ListNotesOptions, value: any) => {
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

  // Determine if any non-default filters or sorts are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filter).some((key) =>
      Boolean(filter[key as keyof ListNotesOptions]),
    );
  }, [filter]);

  return (
    <Host matchContents>
      {isPresented && (
        <BottomSheet
          isPresented={isPresented}
          onDismiss={() => onDismiss()}
          showDragIndicator
          snapPoints={["half", "full"]}
          // showDragHandle
          // skipPartiallyExpanded
          containerColor={colors.card}>
          <Column
          // verticalArrangement={{ spacedBy: 16 }}
          // modifiers={[padding(16, 16, 16, 16)]}
          >
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
                        onPress={handleReset}
                        hitSlop={8}
                        className="flex-row items-center gap-1 px-2.5 py-1 rounded-lg bg-background-element active:opacity-70">
                        <RotateCcw size={12} color={colors.textSecondary} />
                        <Text className="text-xs font-medium text-text-secondary">
                          Reset
                        </Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={onDismiss}
                      hitSlop={8}
                      className="h-8 w-8 items-center justify-center rounded-full bg-background-element active:opacity-70">
                      <X size={16} color={colors.textSecondary} />
                    </Pressable>
                  </View>
                </View>

                <View
                  // showsVerticalScrollIndicator={false}
                  // contentContainerClassName="pt-4 pb-6 gap-5"
                  className="pt-4 pb-6 gap-5">
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
                          <ArrowDownWideNarrow
                            size={16}
                            color={colors.primary}
                          />
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

                  {/* Section 2: Pinned Preference */}
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
                            Pinned notes always precede regular notes
                          </Text>
                        </View>
                      </View>
                      <Host matchContents>
                        <Switch
                          // modifiers={}
                          value={!!filter.pinnedFirst}
                          onValueChange={(value) =>
                            updateFilter("pinnedFirst", value)
                          }
                        />
                      </Host>
                    </View>
                  </View>

                  {/* Section 3: Status / View Filter */}
                  <View className="gap-2.5 pt-2 border-t border-border">
                    <Text className="text-xs font-semibold tracking-wider text-text-secondary">
                      Note Status
                    </Text>

                    <Host matchContents>
                      <Column>
                        <Row
                          // verticalAlignment="center"
                          alignment="center"
                          modifiers={[
                            toggleable(
                              !!filter.pinnedFirst,
                              () =>
                                updateFilter(
                                  "pinnedFirst",
                                  !filter.pinnedFirst,
                                ),
                              {
                                role: "checkbox",
                              },
                            ),
                          ]}>
                          <Checkbox
                            value={!!filter.pinnedFirst}
                            onValueChange={(checked) =>
                              updateFilter("pinnedFirst", checked)
                            }
                          />
                          <ExpoText
                            textStyle={{
                              color: colors.text,
                              fontWeight: "600",
                            }}>
                            Pinned First
                          </ExpoText>
                        </Row>
                        <Row
                          // verticalAlignment="center"
                          alignment="center"
                          modifiers={[
                            toggleable(
                              !!filter.includeArchived,
                              () =>
                                updateFilter(
                                  "includeArchived",
                                  !filter.includeArchived,
                                ),
                              {
                                role: "checkbox",
                              },
                            ),
                          ]}>
                          <Checkbox
                            value={!!filter.includeArchived}
                            onValueChange={(checked) =>
                              updateFilter("includeArchived", checked)
                            }
                          />
                          <ExpoText
                            textStyle={{
                              color: colors.text,
                              fontWeight: "600",
                            }}>
                            Include Archived
                          </ExpoText>
                        </Row>
                      </Column>
                    </Host>
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
                            filter.tag === null
                              ? "bg-background-selected border-primary"
                              : "bg-background-element border-border"
                          }`}>
                          <Text
                            className={`text-xs ${
                              filter.tag === null
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
                  <Text className="text-white font-semibold text-base">
                    Done
                  </Text>
                </Pressable>
              </View>
            </RNHostView>
          </Column>
        </BottomSheet>
      )}
    </Host>
  );
}
