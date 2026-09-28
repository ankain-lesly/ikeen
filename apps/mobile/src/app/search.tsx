import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ArrowLeft,
  FileQuestion,
  Search,
  SlidersHorizontalIcon,
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

import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { createNote, searchNotes, useLiveNotes } from "@/lib/queries/notes";
import { ListNotesOptions, Note } from "@/lib/types/notes";
import { NotesFilterSheet } from "@/components/notes/notes-filter-sheet";
import { NoteGridContainer } from "@/components/notes/notes-grid-container";
import { useRecentSearches } from "@/hooks/use-recent-search";
import { capitalize } from "@repo/utils";

export default function SearchScreen() {
  const router = useRouter();
  const colors = useTheme();

  const [notes, setNotes] = useState<Note[]>([]);

  const inputRef = useRef<TextInputRef>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListNotesOptions>({});
  const [isFilterSheetPresented, setIsFilterSheetPresented] = useState(false);

  // Search history
  const { deleteSearch, history, saveSearch } = useRecentSearches();

  // const handleTextChange = useCallback((text: string) => {
  //   setQuery(text);
  // }, []);

  const handleClear = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.clear();
    inputRef.current?.focus();
    setQuery("");
  }, []);

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
    let list = notes ?? [];

    if (filter.pinnedFirst) {
      list = list.filter((n) => n.isPinned && !n.isArchived);
    } else if (filter.includeArchived) {
      list = list.filter((n) => n.isArchived);
    } else {
      list = list.filter((n) => !n.isArchived);
    }

    if (filter.tag) {
      list = list.filter((n) => {
        try {
          const parsed = JSON.parse(n.tags || "[]");
          return Array.isArray(parsed) && parsed.includes(filter.tag);
        } catch {
          return false;
        }
      });
    }

    return list;
  }, [notes, filter]);

  const handleCreateNoteFromQuery = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newNote = await createNote({
        title: query.trim(),
        content: "",
        tags: filter.tag ? [filter.tag] : [],
      });
      router.replace({
        pathname: "/notes/[id]",
        params: { id: newNote.id },
      });
    } catch {
      Alert.alert("Error", "Failed to create note");
    }
  }, [query, filter.tag, router]);

  const handleSearch = useCallback(
    async (t: string, f: ListNotesOptions = {}) => {
     // Query notes
      const res = await searchNotes(t, filter);

      // Save Search
      if (res?.length > 0)
        await saveSearch(t);
      
      // Update state
      setNotes(res);
      setQuery(t);
      setFilter(f);
      Keyboard.dismiss();
    },
    [filter, saveSearch],
  );

  const isSearchActive = query.trim().length > 0;

  // Determine if any non-default filters or sorts are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filter).some((key) =>
      Boolean(filter[key as keyof ListNotesOptions]),
    );
  }, [filter]);

  return (
    <>
      <View className="flex-1 bg-background pt-safe pb-safe w-full max-w-200 mx-auto">
        {/* Search Header Bar */}
        <View className="px-4 pt-2 pb-3">
          <View className="flex-row items-center justify-between gap-2">
            {/* Back Navigation Button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to notes"
              hitSlop={8}
              onPress={() => {
                Haptics.selectionAsync();
                router.back();
              }}
              className="w-11 h-11 items-center justify-center rounded-full active:opacity-70">
              <ArrowLeft size={22} color={colors.text} />
            </Pressable>

            <ThemedText type="subtitle">Search</ThemedText>

            <View className="w-11" />
          </View>

          {/* Search Input Box using Expo UI Host & TextInput */}
          <View className="flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center bg-background-element border border-border rounded-full px-3 py-2 gap-2 h-12">
              <Search size={18} color={colors.textSecondary} />
              <View className="flex-1 justify-center px-4">
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
                    // onChangeText={handleTextChange}
                    onSubmitEditing={(t) => handleSearch(t)}
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
              {/* // Toolset */}
              <View className="flex-row gap-1.5 items-center">
                {/* Clear Button inside Input */}
                {isSearchActive && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search input"
                    hitSlop={8}
                    onPress={handleClear}
                    className="w-9 h-9 items-center justify-center rounded-full">
                    <X size={16} color={colors.textSecondary} />
                  </Pressable>
                )}
                {/* Expo UI Filter Button */}
                <View className="justify-center relative">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search input"
                    hitSlop={8}
                    onPress={() => setIsFilterSheetPresented(true)}
                    className="w-9 h-9 items-center justify-center rounded-full relative">
                    <SlidersHorizontalIcon
                      size={16}
                      color={
                        hasActiveFilters ? colors.primary : colors.textSecondary
                      }
                    />
                    {hasActiveFilters && (
                      <View className="p-1 rounded-full bg-red-500 absolute top-2 right-2" />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Results Header / Summary */}
        <View className="border-b border-border/50">
          <View className="px-4 py-2.5 flex-row items-center justify-between">
            <ThemedText className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              {isSearchActive
                ? `${filteredNotes.length} ${
                    filteredNotes.length === 1 ? "result" : "results"
                  }`
                : "Recent Notes"}
            </ThemedText>

            {hasActiveFilters && (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFilter({});
                  setNotes([]);
                }}
                className="active:opacity-70">
                <ThemedText className="text-xs text-primary font-medium">
                  Clear All
                </ThemedText>
              </Pressable>
            )}
          </View>

          {!notes.length && !!history.length && (
            <View className="flex-row gap-1 flex-wrap px-5 pb-2">
              {history.map((term) => (
                <Pressable
                  key={term}
                  onPress={() => {
                    // setQuery(term);
                    inputRef.current?.focus();
                    handleSearch(term);
                    // inputRef.current?.setSelection(0,-1)
                  }}
                  className="px-3 py-1.5 rounded-full bg-background-element border border-border flex-row items-center gap-1">
                  <ThemedText className="text-sm text-text-secondary">
                    {capitalize(term)}
                  </ThemedText>
                  <Pressable
                    key={term}
                    onPress={async () => await deleteSearch(term)}
                    className="p-1.5 items-center">
                    <X size={12} color={colors.textSecondary} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Recent search */}

        {/* Result List or Empty State */}
        <NoteGridContainer
          data={filteredNotes}
          filter={filter}
          updateFilter={(key, val) => setFilter((p) => ({ ...p, [key]: val }))}
          empty={
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

              <ThemedText className="text-sm text-center text-text-secondary mb-6 leading-5 max-w-70">
                {isSearchActive
                  ? `No notes match "${query}". Try searching with a different keyword or create a new note.`
                  : "Type in keywords, note titles, or select tags above to quickly find your notes."}
              </ThemedText>

              {isSearchActive ? (
                <View className="">
                  <Host matchContents>
                    <Column spacing={8}>
                      <Row spacing={8}>
                        <Button
                          variant="filled"
                          label={`Create note "${query.slice(0, 18)}..."`}
                          onPress={handleCreateNoteFromQuery}
                          style={{
                            height: 44,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                          }}
                        />
                      </Row>
                      {/* <Row spacing={8}>
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
                      </Row> */}
                    </Column>
                  </Host>
                </View>
              ) : availableTags.length > 0 ? (
                <View className="w-full mt-2">
                  <ThemedText className="text-xs font-mono uppercase text-text-secondary text-center mb-3">
                    Popular Tags
                  </ThemedText>
                  <View className="flex-row flex-wrap justify-center gap-2">
                    {availableTags.slice(0, 6).map((tag) => (
                      <Pressable
                        key={tag}
                        onPress={() => {
                          handleSearch("", { tag });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-background-element border border-border flex-row items-center gap-1 active:opacity-70">
                        <Tag size={12} color={colors.textSecondary} />
                        <ThemedText className="text-xs text-text-secondary">
                          #{tag}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          }
        />

        {/* Notes Filter Sheet */}
        <NotesFilterSheet
          isPresented={isFilterSheetPresented}
          onDismiss={() => setIsFilterSheetPresented(false)}
          availableTags={availableTags}
          handleApplyFilters={(filter) => {
            // setFilter(filter);
            setIsFilterSheetPresented(false);
            // setTimeout(() => {
            handleSearch("", filter);
            // }, 50);
          }}
        />
      </View>
    </>
  );
}
