import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  FileQuestion,
  Pin,
  Search,
  Tag,
  X,
} from "lucide-react-native";
import {
  Button,
  Column,
  Host,
  Row,
  TextInput,
  type TextInputRef,
} from "@expo/ui";

import { NoteCard } from "@/components/notes/note-card";
import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import {
  createNote,
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  useLiveNotes,
} from "@/lib/queries/notes";
import { ListNotesOptions } from "@/lib/types/notes";
import { NotesFilterSheet } from "@/components/notes/notes-filter-sheet";

type ScopeFilter = "all" | "pinned" | "archived";

export default function SearchScreen() {
  const router = useRouter();
  const colors = useTheme();

  const inputRef = useRef<TextInputRef>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListNotesOptions>({});
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isFilterSheetPresented, setIsFilterSheetPresented] = useState(false);

  const handleTextChange = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.clear();
    setQuery("");
  }, []);

  // Reactive live query for notes matching search term
  const { data: rawNotes = [] } = useLiveNotes({
    search: query.trim() || undefined,
    includeArchived: scopeFilter === "archived",
    pinnedFirst: true,
    orderBy: "updatedAt",
    orderDirection: "desc",
    ...filter,
  });

  // Query all active notes to discover distinct tags dynamically
  const { data: allNotes = [] } = useLiveNotes({
    includeArchived: true,
  });

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const note of allNotes) {
      if (!note.tags) continue;
      try {
        const parsed = JSON.parse(note.tags);
        if (Array.isArray(parsed)) {
          for (const t of parsed) {
            if (typeof t === "string" && t.trim().length > 0) {
              tagSet.add(t.trim());
            }
          }
        }
      } catch {
        // Ignore unparseable tags
      }
    }
    return Array.from(tagSet);
  }, [allNotes]);

  // Filter notes based on scope and selected tag
  const filteredNotes = useMemo(() => {
    let list = rawNotes ?? [];

    if (scopeFilter === "pinned") {
      list = list.filter((n) => n.isPinned && !n.isArchived);
    } else if (scopeFilter === "archived") {
      list = list.filter((n) => n.isArchived);
    } else {
      list = list.filter((n) => !n.isArchived);
    }

    if (selectedTag) {
      list = list.filter((n) => {
        try {
          const parsed = JSON.parse(n.tags || "[]");
          return Array.isArray(parsed) && parsed.includes(selectedTag);
        } catch {
          return false;
        }
      });
    }

    return list;
  }, [rawNotes, scopeFilter, selectedTag]);

  // Note actions
  const handleTogglePin = useCallback(async (id: string) => {
    try {
      await togglePinNote(id);
    } catch {
      Alert.alert("Error", "Could not update pin state");
    }
  }, []);

  const handleToggleArchive = useCallback(async (id: string) => {
    try {
      await toggleArchiveNote(id);
    } catch {
      Alert.alert("Error", "Could not update archive state");
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to move this note to recently deleted?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await softDeleteNote(id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {
              Alert.alert("Error", "Could not delete note");
            }
          },
        },
      ],
    );
  }, []);

  const handleCreateNoteFromQuery = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newNote = await createNote({
        title: query.trim(),
        content: "",
        tags: selectedTag ? [selectedTag] : [],
      });
      router.replace({
        pathname: "/notes/[id]",
        params: { id: newNote.id },
      });
    } catch {
      Alert.alert("Error", "Failed to create note");
    }
  }, [query, selectedTag, router]);

  const handleScopeSelect = useCallback((scope: ScopeFilter) => {
    Haptics.selectionAsync();
    setScopeFilter(scope);
  }, []);

  const handleTagToggle = useCallback((tag: string) => {
    Haptics.selectionAsync();
    setSelectedTag((prev) => (prev === tag ? null : tag));
  }, []);

  const isSearchActive = query.trim().length > 0;

  return (
    <>
    {/* TODO: Fix Presentation */}
      <Stack>
        <Stack.Screen options={{ headerShown: false, presentation: "modal" }} />
      </Stack>
      <View className="flex-1 bg-background pt-safe pb-safe w-full max-w-200 mx-auto">
        {/* Search Header Bar */}
        <View className="px-4 pt-2 pb-3">
          <View className="flex-row items-center gap-2">
            {/* Back Navigation Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to notes"
              hitSlop={8}
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              className="min-w-11 min-h-11 items-center justify-center rounded-full active:opacity-70">
              <ArrowLeft size={22} color={colors.text} />
            </Pressable>

            {/* Search Input Box using Expo UI Host & TextInput */}
            <View className="flex-1 flex-row items-center bg-background-element border border-border rounded-2xl px-3 py-1 gap-2 min-h-[44px]">
              <Search size={18} color={colors.textSecondary} />

              <View className="flex-1 justify-center">
                <Host
                  matchContents={{ vertical: true }}
                  style={{ width: "100%" }}>
                  <TextInput
                    ref={inputRef}
                    defaultValue=""
                    placeholder="Search notes, tags, or content..."
                    placeholderTextColor={colors.textSecondary}
                    autoFocus
                    returnKeyType="search"
                    onChangeText={handleTextChange}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    style={{
                      backgroundColor: "transparent",
                    }}
                    textStyle={{
                      color: colors.text,
                      fontSize: 15,
                    }}
                  />
                </Host>
              </View>

              {/* Clear Button inside Input */}
              {isSearchActive && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search input"
                  hitSlop={8}
                  onPress={handleClear}
                  className="min-w-9 min-h-9 items-center justify-center rounded-full active:opacity-70">
                  <X size={16} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Expo UI Filter Button */}
            <View className="justify-center">
              <Host matchContents={{ vertical: true, horizontal: true }}>
                <Button
                  variant="text"
                  label="Filter"
                  onPress={() => {
                    // Haptics.selectionAsync();
                    setIsFilterSheetPresented(true);
                  }}
                  style={{
                    paddingHorizontal: 8,
                    height: 44,
                  }}
                />
              </Host>
            </View>
          </View>

          {/* Filter Scope and Tags Row */}
          <View className="mt-3">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="flex-row items-center gap-2 pr-4">
              {/* Scope: All */}
              <Pressable
                onPress={() => handleScopeSelect("all")}
                accessibilityRole="button"
                accessibilityState={{ selected: scopeFilter === "all" }}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full border items-center justify-center flex-row gap-1.5 active:opacity-80 ${
                  scopeFilter === "all"
                    ? "bg-background-selected border-primary"
                    : "bg-background-element border-border"
                }`}>
                <ThemedText
                  className={`text-xs font-medium ${
                    scopeFilter === "all"
                      ? "text-primary font-semibold"
                      : "text-text-secondary"
                  }`}>
                  All
                </ThemedText>
              </Pressable>

              {/* Scope: Pinned */}
              <Pressable
                onPress={() => handleScopeSelect("pinned")}
                accessibilityRole="button"
                accessibilityState={{ selected: scopeFilter === "pinned" }}
                className={`min-h-9 px-3.5 py-1.5 rounded-full border items-center justify-center flex-row gap-1.5 active:opacity-80 ${
                  scopeFilter === "pinned"
                    ? "bg-background-selected border-primary"
                    : "bg-background-element border-border"
                }`}>
                <Pin
                  size={12}
                  color={
                    scopeFilter === "pinned"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <ThemedText
                  className={`text-xs font-medium ${
                    scopeFilter === "pinned"
                      ? "text-primary font-semibold"
                      : "text-text-secondary"
                  }`}>
                  Pinned
                </ThemedText>
              </Pressable>

              {/* Scope: Archived */}
              <Pressable
                onPress={() => handleScopeSelect("archived")}
                accessibilityRole="button"
                accessibilityState={{ selected: scopeFilter === "archived" }}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-full border items-center justify-center flex-row gap-1.5 active:opacity-80 ${
                  scopeFilter === "archived"
                    ? "bg-background-selected border-primary"
                    : "bg-background-element border-border"
                }`}>
                <ThemedText
                  className={`text-xs font-medium ${
                    scopeFilter === "archived"
                      ? "text-primary font-semibold"
                      : "text-text-secondary"
                  }`}>
                  Archived
                </ThemedText>
              </Pressable>

              {/* Dynamic Tag Pills */}
              {availableTags.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <Pressable
                    key={tag}
                    onPress={() => handleTagToggle(tag)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className={`min-h-[36px] px-3 py-1.5 rounded-full border items-center justify-center flex-row gap-1 active:opacity-80 ${
                      isSelected
                        ? "bg-background-selected border-primary"
                        : "bg-background-element border-border"
                    }`}>
                    <Tag
                      size={11}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <ThemedText
                      className={`text-xs font-medium ${
                        isSelected
                          ? "text-primary font-semibold"
                          : "text-text-secondary"
                      }`}>
                      #{tag}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Results Header / Summary */}
        <View className="px-4 py-2.5 flex-row items-center justify-between border-b border-border/50">
          <ThemedText className="text-xs font-mono uppercase tracking-wider text-text-secondary">
            {isSearchActive
              ? `${filteredNotes.length} ${
                  filteredNotes.length === 1 ? "result" : "results"
                }`
              : "Recent Notes"}
          </ThemedText>

          {(selectedTag || scopeFilter !== "all") && (
            <Pressable
              hitSlop={8}
              onPress={() => {
                Haptics.selectionAsync();
                setScopeFilter("all");
                setSelectedTag(null);
              }}
              className="active:opacity-70">
              <ThemedText className="text-xs text-primary font-medium">
                Reset Filters
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* Result List or Empty State */}
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          contentContainerClassName="p-4 gap-2"
          renderItem={({ item }) => (
            <NoteCard
              note={item}
              onTogglePin={handleTogglePin}
              onToggleArchive={handleToggleArchive}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-16 px-6">
              <View className="w-16 h-16 rounded-full bg-background-element items-center justify-center mb-4">
                {isSearchActive ? (
                  <FileQuestion size={32} color={colors.textSecondary} />
                ) : (
                  <Search size={32} color={colors.textSecondary} />
                )}
              </View>

              <ThemedText className="text-lg font-bold text-center text-text mb-1.5">
                {isSearchActive ? "No matching notes" : "Search your notes"}
              </ThemedText>

              <ThemedText className="text-sm text-center text-text-secondary mb-6 leading-5 max-w-[280px]">
                {isSearchActive
                  ? `No notes match "${query}". Try searching with a different keyword or create a new note.`
                  : "Type in keywords, note titles, or select tags above to quickly find your notes."}
              </ThemedText>

              {/* {isSearchActive ? (
              <View className="">
                <Host matchContents>
                  <Column spacing={8}>
                    <Row spacing={8}>
                      <Button
                        variant="filled"
                        label={`Create "${query.slice(0, 18)}..."`}
                        onPress={handleCreateNoteFromQuery}
                        style={{
                          height: 44,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                        }}
                      />
                    </Row>
                    <Row spacing={8}>
                      <Button
                        variant="outlined"
                        label="Clear Search"
                        onPress={handleClear}
                        style={{
                          height: 44,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                        }}
                      />
                    </Row>
                  </Column>
                </Host>
              </View>
            ) : availableTags.length > 0 ? ( */}
              <View className="w-full mt-2">
                <Host matchContents>
                  <Column spacing={8}>
                    <Row spacing={8}>
                      <Button
                        variant="filled"
                        label={`Create "${query.slice(0, 18)}..."`}
                        onPress={handleCreateNoteFromQuery}
                        style={{
                          height: 44,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                        }}
                      />
                    </Row>
                    <Row spacing={8}>
                      <Button
                        variant="outlined"
                        label="Clear Search"
                        onPress={handleClear}
                        style={{
                          height: 44,
                          paddingHorizontal: 16,
                          borderRadius: 12,
                        }}
                      />
                    </Row>
                  </Column>
                </Host>
                <ThemedText className="text-xs font-mono uppercase text-text-secondary text-center mb-3">
                  Popular Tags
                </ThemedText>
                <View className="flex-row flex-wrap justify-center gap-2">
                  {availableTags.slice(0, 6).map((tag) => (
                    <Pressable
                      key={tag}
                      onPress={() => handleTagToggle(tag)}
                      className="px-3 py-1.5 rounded-xl bg-background-element border border-border flex-row items-center gap-1 active:opacity-70">
                      <Tag size={12} color={colors.textSecondary} />
                      <ThemedText className="text-xs text-text-secondary">
                        #{tag}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              {/* ) : null} */}
            </View>
          )}
        />

        {/* Notes Filter Sheet */}
        <NotesFilterSheet
          isPresented={isFilterSheetPresented}
          onDismiss={() => setIsFilterSheetPresented(false)}
          availableTags={availableTags}
          handleApplyFilters={(filter) => {
            setFilter(filter);
            setIsFilterSheetPresented(false);
          }}
        />
      </View>
    </>
  );
}
