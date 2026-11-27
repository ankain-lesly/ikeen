import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { OptionSheet } from "@/components/ui/option-sheet";
import { useTheme } from "@/hooks/use-theme";
import { useLiveNotes, createNote, updateNote } from "@/lib/queries/notes";
import { createBlock, updateBlock, getNoteBlocks } from "@/lib/queries/note-blocks";
import {
  createDefaultMediaBlockInput,
  createDefaultTextBlockInput,
} from "@/components/notes/blocks/block-factories";
import { saveAssetToSandbox } from "@/lib/media/file-system";
import type { MediaItem, NoteBlock, NoteSelect as Note, NoteWithBlocks } from "@/lib/types/notes";
import type { ShareIntent, ShareIntentFile } from "expo-share-intent";
import { Host } from "@expo/ui/jetpack-compose";
import { Switch } from "@expo/ui";
import { router } from "expo-router";
import * as Haptics from "@/lib/haptics";
import * as Crypto from "expo-crypto";
import Toast from "react-native-toast-message";
import {
  Search,
  StickyNote,
  FileText,
  Image as ImageIcon,
  Link,
  Plus,
  X,
  File,
} from "lucide-react-native";

export type ShareIntentPayload = ShareIntent;

export interface ShareTargetSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  shareIntent: ShareIntentPayload | null;
  onResetIntent: () => void;
}

export function ShareTargetSheet({
  isPresented,
  onDismiss,
  shareIntent,
  onResetIntent,
}: ShareTargetSheetProps) {
  const colors = useTheme();
  const [activeTab, setActiveTab] = useState<"create" | "update">("create");
  const [createAsBlock, setCreateAsBlock] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive initial note title from shared content
  const initialTitle = useMemo(() => {
    if (!shareIntent) return "Shared Note";
    if (shareIntent.meta?.title) {
      return shareIntent.meta.title;
    }
    if (shareIntent.webUrl) {
      try {
        const parsed = new URL(shareIntent.webUrl);
        return `Link: ${parsed.hostname}`;
      } catch {
        return "Shared Link";
      }
    }
    if (shareIntent.text) {
      const firstLine = shareIntent.text.trim().split("\n")[0]?.trim();
      return firstLine && firstLine.length > 0
        ? firstLine.slice(0, 40)
        : "Shared Note";
    }
    if (shareIntent.files && shareIntent.files.length > 0) {
      const first = shareIntent.files[0];
      return (
        first?.fileName ||
        (shareIntent.type === "media" ? "Shared Media" : "Shared File")
      );
    }
    return "Shared Note";
  }, [shareIntent]);

  const [noteTitle, setNoteTitle] = useState(initialTitle);

  // Live notes list for search picker
  const { data: notes = [], isLoading } = useLiveNotes({
    includeArchived: true,
    includeDeleted: false,
    withBlocks: false,
  });

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const title = (n.title || "Untitled note").toLowerCase();
      const content = (n.content || "").toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [notes, search]);

  const handleFinish = useCallback(
    (targetNoteId: string, title: string) => {
      onResetIntent();
      onDismiss();
      Toast.show({
        type: "success",
        text1: "Saved to iKeen",
        text2: title || "Untitled Note",
      });
      router.push({
        pathname: "/notes/[id]",
        params: { id: targetNoteId },
      });
    },
    [onResetIntent, onDismiss],
  );

  // Process shared files into persisted MediaItems
  const processSharedMediaFiles = useCallback(async (): Promise<MediaItem[]> => {
    if (!shareIntent?.files || shareIntent.files.length === 0) return [];

    const items: MediaItem[] = [];

    for (const file of shareIntent.files) {
      try {
        const isImage =
          shareIntent.type === "media" ||
          file.mimeType?.startsWith("image/");

        const saved = await saveAssetToSandbox(
          file.path,
          isImage ? "images" : "files",
          file.fileName,
        );

        items.push({
          id: Crypto.randomUUID(),
          mediaType: isImage ? "image" : "file",
          localUri: saved.localUri,
          name: saved.name,
          metadata: {
            size: saved.size,
            mimeType: file.mimeType,
            width: file.width ?? undefined,
            height: file.height ?? undefined,
          },
        });
      } catch (err) {
        console.warn("[ShareTarget] Failed to save shared file to sandbox:", err);
      }
    }

    return items;
  }, [shareIntent]);

  // ACTION 1: Create New Note
  const handleCreateNewNote = async () => {
    if (!shareIntent || isSubmitting) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const hasFiles = Boolean(
        shareIntent.files && shareIntent.files.length > 0,
      );
      const textContent = shareIntent.text || shareIntent.webUrl || "";

      const created = await createNote({
        title: noteTitle.trim() || initialTitle,
        content: textContent,
      });

      if (hasFiles) {
        const mediaItems = await processSharedMediaFiles();
        if (mediaItems.length > 0) {
          await createBlock(created.id, createDefaultMediaBlockInput(mediaItems));
        }
      }

      handleFinish(created.id, created.title);
    } catch (err) {
      console.error("[ShareTarget] Failed to create note:", err);
      Toast.show({
        type: "error",
        text1: "Error creating note",
        text2: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ACTION 2: Append or Add Block to Existing Note
  const handleSelectExistingNote = async (targetNote: Note | NoteWithBlocks) => {
    if (!shareIntent || isSubmitting) return;
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const hasFiles = Boolean(
        shareIntent.files && shareIntent.files.length > 0,
      );
      const textContent = shareIntent.text || shareIntent.webUrl || "";

      if (hasFiles) {
        const mediaItems = await processSharedMediaFiles();
        if (mediaItems.length > 0) {
          if (createAsBlock) {
            // User choice: create dedicated separate media block
            await createBlock(
              targetNote.id,
              createDefaultMediaBlockInput(mediaItems),
            );
          } else {
            // User choice: append to existing media block if one exists
            const existingBlocks = await getNoteBlocks(targetNote.id);
            const existingMediaBlock = existingBlocks.find(
              (b): b is NoteBlock & { type: "media"; content: MediaItem[] } =>
                b.type === "media" && Array.isArray(b.content),
            );

            if (existingMediaBlock) {
              const updatedContent = [
                ...existingMediaBlock.content,
                ...mediaItems,
              ];
              await updateBlock(existingMediaBlock.id, {
                content: updatedContent,
              });
            } else {
              await createBlock(
                targetNote.id,
                createDefaultMediaBlockInput(mediaItems),
              );
            }
          }
        }
      }

      if (textContent) {
        if (createAsBlock) {
          // User choice: create dedicated text block
          const blockInput = createDefaultTextBlockInput();
          blockInput.content = textContent;
          await createBlock(targetNote.id, blockInput);
        } else {
          // User choice: append to note content body
          const nextContent = targetNote.content
            ? `${targetNote.content}\n\n${textContent}`
            : textContent;
          await updateNote(targetNote.id, { content: nextContent });
        }
      }

      handleFinish(targetNote.id, targetNote.title);
    } catch (err) {
      console.error("[ShareTarget] Failed to update existing note:", err);
      Toast.show({
        type: "error",
        text1: "Error saving to note",
        text2: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shareIntent) return null;

  const isMedia = shareIntent.type === "media" || shareIntent.type === "file";
  const displaySnippet = shareIntent.text || shareIntent.webUrl;

  return (
    <OptionSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      snapPoints={["half", "full"]}
      title="Share to iKeen"
      matchHTMLContents={false}>
      <View className="w-full gap-3 pt-1">
        {/* Shared Asset Preview Card */}
        <View className="bg-background-element border border-border/80 rounded-xl p-3 gap-2">
          <View className="flex-row items-center gap-2">
            {shareIntent.type === "media" && (
              <ImageIcon size={15} color={colors.primary} />
            )}
            {shareIntent.type === "weburl" && (
              <Link size={15} color={colors.primary} />
            )}
            {shareIntent.type === "text" && (
              <FileText size={15} color={colors.primary} />
            )}
            {shareIntent.type === "file" && (
              <File size={15} color={colors.primary} />
            )}
            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Incoming {shareIntent.type ?? "content"}
            </Text>
          </View>

          {/* Text / URL Snippet */}
          {displaySnippet && (
            <Text
              numberOfLines={3}
              className="text-xs font-mono text-text leading-relaxed">
              {displaySnippet}
            </Text>
          )}

          {/* Image Thumbnail Preview */}
          {shareIntent.type === "media" && shareIntent.files && (
            <View className="flex-row gap-2 mt-1">
              {shareIntent.files.slice(0, 3).map((f: ShareIntentFile, idx: number) => (
                <Image
                  key={idx}
                  source={{ uri: f.path }}
                  style={{ width: 64, height: 64, borderRadius: 8 }}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}

          {/* File item preview */}
          {shareIntent.type === "file" && shareIntent.files?.[0] && (
            <Text numberOfLines={1} className="text-xs font-medium text-text">
              {shareIntent.files[0].fileName || "Attached file"}
            </Text>
          )}
        </View>

        {/* Tab Switcher: "New Note" vs "Add to Existing" */}
        <View className="flex-row bg-background-element border border-border/80 rounded-xl p-1">
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("create");
            }}
            className={`flex-1 py-2 rounded-lg items-center justify-center ${
              activeTab === "create" ? "bg-primary" : "bg-transparent"
            }`}>
            <Text
              className={`text-xs font-semibold ${
                activeTab === "create"
                  ? "text-primary-foreground"
                  : "text-text-secondary"
              }`}>
              Create New Note
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("update");
            }}
            className={`flex-1 py-2 rounded-lg items-center justify-center ${
              activeTab === "update" ? "bg-primary" : "bg-transparent"
            }`}>
            <Text
              className={`text-xs font-semibold ${
                activeTab === "update"
                  ? "text-primary-foreground"
                  : "text-text-secondary"
              }`}>
              Add to Existing
            </Text>
          </Pressable>
        </View>

        {/* TAB 1: Create New Note Form */}
        {activeTab === "create" ? (
          <View className="gap-3 pt-1">
            <View className="gap-1.5">
              <Text className="text-xs font-semibold text-text-secondary">
                Note Title
              </Text>
              <TextInput
                value={noteTitle}
                onChangeText={setNoteTitle}
                placeholder="Note title..."
                placeholderTextColor={colors.textSecondary}
                className="bg-background-element border border-border/80 rounded-xl px-3 h-11 text-sm text-text font-medium"
              />
            </View>

            <Pressable
              onPress={handleCreateNewNote}
              disabled={isSubmitting}
              className="bg-primary h-11 rounded-xl items-center justify-center flex-row gap-2 active:opacity-85 mt-2">
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Plus size={16} color="#000000" />
              )}
              <Text className="text-sm font-bold text-primary-foreground">
                {isSubmitting ? "Creating..." : "Save New Note"}
              </Text>
            </Pressable>
          </View>
        ) : (
          /* TAB 2: Add to Existing Note */
          <View className="gap-3 pt-1 flex-1">
            {/* User Choice Toggle: Separate Block vs Append to Body/Media */}
            <View className="flex-row items-center justify-between bg-background-element border border-border/80 rounded-xl p-3">
              <View className="flex-1 pr-3">
                <Text className="text-xs font-semibold text-text">
                  {isMedia
                    ? "Create new media block"
                    : "Create new text block"}
                </Text>
                <Text className="text-[11px] text-text-secondary mt-0.5">
                  {isMedia
                    ? createAsBlock
                      ? "Create a separate block for incoming files"
                      : "Append files into existing media block if found"
                    : createAsBlock
                      ? "Create a separate text block"
                      : "Append to note content body"}
                </Text>
              </View>
              <Host matchContents>
                <Switch
                  value={createAsBlock}
                  onValueChange={(val) => {
                    Haptics.selectionAsync();
                    setCreateAsBlock(val);
                  }}
                />
              </Host>
            </View>

            {/* Note Search Input */}
            <View className="flex-row items-center bg-background-element border border-border/80 rounded-xl px-3 h-10 gap-2">
              <Search size={15} color={colors.textSecondary} />
              <TextInput
                placeholder="Search note to update..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                className="flex-1 text-sm text-text font-normal"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={6}>
                  <X size={14} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Note Picker List */}
            <FlatList
              data={filteredNotes}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
              style={{ maxHeight: 300 }}
              ListEmptyComponent={
                <View className="py-8 items-center justify-center">
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text className="text-xs text-text-secondary">
                      No matching notes found
                    </Text>
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectExistingNote(item)}
                  disabled={isSubmitting}
                  className="p-3 rounded-xl border border-border/70 bg-background-element active:bg-background-selected flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1 min-w-0 mr-2">
                    <View className="w-8 h-8 rounded-lg bg-background border border-border/60 items-center justify-center shrink-0">
                      <StickyNote size={15} color={colors.primary} />
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text
                        numberOfLines={1}
                        className="text-sm font-semibold text-text">
                        {item.title || "Untitled note"}
                      </Text>
                      {item.content ? (
                        <Text
                          numberOfLines={1}
                          className="text-xs text-text-secondary mt-0.5">
                          {item.content.trim()}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text className="text-[10px] text-text-secondary shrink-0">
                    {new Date(item.updatedAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}
      </View>
    </OptionSheet>
  );
}
