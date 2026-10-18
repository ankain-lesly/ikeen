import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Keyboard,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  TextInputEndEditingEvent,
  View,
} from "react-native";
import { router, useNavigation } from "expo-router";
import * as Haptics from "@/lib/haptics";
import {
  ChevronDown,
  ChevronLeft,
  Folder,
  Pin,
  Plus,
  Sparkles,
  X,
} from "lucide-react-native";
import { NoteBottomToolBar } from "@/components/notes/note-accessory-bar";
import { NoteInfoSheet } from "@/components/notes/note-info-sheet";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "@/lib/toast";
import {
  createNote,
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  updateNote,
} from "@/lib/queries/notes";
import { useLiveFolder } from "@/lib/queries/folders";
import type { Note } from "@/lib/types/notes";
import { NotesOptionsDropdown } from "@/components/notes/notes-options-dropdown";
import { MoveToFolderSheet } from "@/components/notes/move-to-folder-sheet";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { KeyboardGradualAnimation } from "@/components/keyboard-gradual-animation";
import {
  MarkdownBody,
  MarkdownEditor,
  type MarkdownEditorHandle,
  type MarkdownFormatAction,
} from "@/components/markdown";
import { Card } from "../ui/card";
import * as Crypto from "expo-crypto";
import { log } from "@repo/utils";
import { useAuthStore } from "@/lib/auth/auth-store";

export function NoteEditor({ note: initialNote }: { note?: Note }) {
  const colors = useTheme();

  const { user } = useAuthStore();

  // Local note state
  const [note, setNote] = useState({
    ...(initialNote || {}),
    id: initialNote?.id || Crypto.randomUUID(),
    title: initialNote?.title || "",
    content: initialNote?.content || "",
    tags: (() => {
      try {
        const parsed: string[] = JSON.parse(initialNote?.tags || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })(),
    isPinned: !!initialNote?.isPinned,
    isArchived: !!initialNote?.isArchived,
    folderId: initialNote?.folderId,
    userId: user?.id,
  });

  // Track Notes Edit, Touched State
  const [isNewDraft, setIsNewDraft] = useState(!initialNote);
  const [hasEdited, setHasEdited] = useState(!initialNote);
  const [isEditing, setIsEditing] = useState(!initialNote);
  const [focusTarget, setFocusTarget] = useState<"title" | "content" | null>(
    null,
  );

  // Update Notes Field - MAIN local update mechanism
  const updateNoteState = useCallback((key: keyof typeof note, value: any) => {
    setNote((prev) => ({ ...prev, [key]: value }));
    setHasEdited(true);
  }, []);

  // Sheet
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [isMoveFolderSheetVisible, setIsMoveFolderSheetVisible] =
    useState(false);
  const [newTagInputVisible, setNewTagInputVisible] = useState(false);

  const { data: currentFolder } = useLiveFolder(note?.folderId || "");

  // const isEditingRef = useRef(isEditing);
  const navigation = useNavigation();

  // const leavingRef = useRef(false);
  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<MarkdownEditorHandle>(null);
  const tagInputRef = useRef<TextInput>(null);
  const leavingRef = useRef(false);

  // Refs for persistence and effect dependencies
  // const latestNoteRef = useRef({ ...note });
  // const hasEditedRef = useRef(hasEdited);
  // const isDeletedRef = useRef(false);
  // const idRef = useRef(note.id);
  // const creatingRef = useRef<Promise<string> | null>(null);

  // Keep refs up-to-date with state
  // useEffect(() => {
  //   isEditingRef.current = isEditing;
  // }, [isEditing]);
  // useEffect(() => {
  //   latestNoteRef.current = { ...note };
  // }, [note]);
  // useEffect(() => {
  //   hasEditedRef.current = hasEdited;
  // }, [hasEdited]);
  // useEffect(() => {
  //   idRef.current = note.id;
  // }, [note.id]);

  // Save function: uses up-to-date refs and state
  const saveNote = useCallback(
    async (_data?: typeof note) => {
      // Check State
      if (!hasEdited) return;

      const data = note;
      log({
        message: ">>> LOG: Saving...",
        mode: _data ? "external" : "internal",
      });

      const isEmpty =
        !data.title?.trim() &&
        !data.content?.trim() &&
        (!data.tags || data.tags.length === 0);

      if (isEmpty) return;

      try {
        if (isNewDraft) {
          const created = await createNote({
            id: data.id,
            title: data.title || "",
            content: data.content || "",
            tags: data.tags || [],
            isPinned: !!data.isPinned,
            isArchived: !!data.isArchived,
            folderId: data.folderId,
            userId: data?.userId,
          });
          setNote((prev) => ({
            ...prev,
            createdAt: created.createdAt,
            updateAt: created.updatedAt,
          }));
          setIsNewDraft(false);
        } else {
          await updateNote(data.id, {
            title: data.title || "",
            content: data.content || "",
            tags: data.tags || [],
            isPinned: !!data.isPinned,
            isArchived: !!data.isArchived,
            folderId: data.folderId,
          });
        }
        setHasEdited(false);
      } catch (err) {
        console.log("[🚨] Failed to save note:", err);
      } finally {
        setIsNewDraft(false);
        log({
          message: `>>> LOG: New Note ${isNewDraft ? "Created" : "Update"}`,
        });
      }
    },
    [hasEdited, isNewDraft, note],
  );

  // useEffect(() => {
  //   return () => {
  //     log({ message: ">>> LOG: Save Note on unmount" });
  //     void saveNote().catch((err) => {
  //       console.log("[🚨] Failed to save note on unmount:", err);
  //     });
  //   };
  // }, [saveNote]);

  // NOTES: Keep Until further notice
  // const flushEditorMarkdown = useCallback(async () => {
  //   if (!isEditingRef.current) return;
  //   try {
  //     const markdown = await contentInputRef.current?.getMarkdown();
  //     if (markdown == null || markdown === note.content) return;
  //     updateNoteState("content", markdown);
  //   } catch {
  //     // Keep the last onChangeMarkdown snapshot.
  //   }
  // }, [note.content, updateNoteState]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "background") return;
      void (async () => {
        await saveNote();
        log({ message: ">>> LOG: Save Note on state", state });
      })();
    });
    return () => subscription.remove();
  }, [saveNote]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (leavingRef.current || !hasEdited) return;
      e.preventDefault();
      leavingRef.current = true;
      void (async () => {
        try {
          await saveNote();
          log({ message: ">>> LOG: Save Note on back button" });
        } finally {
          navigation.dispatch(e.data.action);
        }
      })();
    });
    return unsubscribe;
  }, [hasEdited, navigation, saveNote]);

  const startEditing = useCallback(
    (target: "title" | "content" = "content") => {
      setFocusTarget(target);
      setIsEditing(true);
    },
    [],
  );

  useEffect(() => {
    if (isEditing && focusTarget) {
      const timer = setTimeout(() => {
        if (focusTarget === "title") {
          titleInputRef.current?.focus();
        } else {
          contentInputRef.current?.focus();
        }
        setFocusTarget(null);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing, focusTarget]);

  const handleDoneEditing = useCallback(async () => {
    Keyboard.dismiss();
    // await flushEditorMarkdown();
    setIsEditing(false);
    // if (hasEditedRef.current) {
    await saveNote(note);
    // toast.success("Note saved");
    // }
  }, [saveNote, note]);

  const handleTitleChange = (newTitle: string) => {
    updateNoteState("title", newTitle);
  };

  const handleContentChange = useCallback(
    (newContent: string) => {
      updateNoteState("content", newContent);
    },
    [updateNoteState],
  );

  const formatContent = useCallback((action: MarkdownFormatAction) => {
    contentInputRef.current?.format(action);
  }, []);

  const openTagPrompt = useCallback(() => {
    setNewTagInputVisible(true);
  }, []);

  const editContent = useCallback(() => {
    startEditing("title");
  }, [startEditing]);

  const handleTogglePin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextPinned = !note.isPinned;
    updateNoteState("isPinned", nextPinned);
    if (note.id) {
      try {
        await togglePinNote(note.id);
      } catch {
        updateNoteState("isPinned", !nextPinned);
      }
    }
  };

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: note.title.trim() || "Untitled Note",
        message: `${note.title}\n\n${note.content}`,
      });
    } catch {
      // Ignored
    }
  }, [note.title, note.content]);

  const handleDelete = () => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsEditing(false);
          try {
            await softDeleteNote(note.id);
            toast.info("Note deleted");
            router.back();
          } catch {
            // isDeletedRef.current = false;
            Alert.alert("Error", "Could not delete note");
          }
        },
      },
    ]);
  };

  const handleAddTag = (e: TextInputEndEditingEvent) => {
    const text = e.nativeEvent.text;
    const trimmed = text.trim().toLowerCase().replace(/^#/, "");
    if (trimmed && !note.tags.includes(trimmed)) {
      const updatedTags = [...note.tags, trimmed];
      updateNoteState("tags", updatedTags);

      tagInputRef.current?.clear();
      // tagInputRef?.current?.focus();
    } else {
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedTags = note.tags.filter((t) => t !== tagToRemove);
    updateNoteState("tags", updatedTags);
  };

  const wordCount = useMemo(() => {
    const trimmed = note.content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [note.content]);

  // Handle Tap Gestures
  const combinedGestures = useMemo(() => {
    const singleTap = Gesture.Tap();
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        "worklet";
        scheduleOnRN(startEditing, "content");
      });

    return Gesture.Exclusive(doubleTap, singleTap);
  }, [startEditing]);

  return (
    <View className="flex-1 bg-background pt-safe w-full">
      {/* Navigation Bar */}
      <View className="h-12 flex-row items-center justify-between px-3.5">
        {/* Back Button */}
        <View className="flex-row items-center justify-between gap-2">
          <Pressable
            className="flex-row p-2 rounded-full justify-center items-center gap-2"
            onPress={() => router.back()}
            hitSlop={8}>
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>

          {/* Folder */}
          <View>
            <Pressable
              onPress={() => setIsMoveFolderSheetVisible(true)}
              hitSlop={4}
              className="flex-row items-center gap-1.5 px-2 py-0.5 rounded-md bg-background-element_border-border active:opacity-70">
              <Folder
                size={16}
                color={currentFolder?.color || colors.textSecondary}
              />
              <Text
                className="text-sm font-semibold"
                numberOfLines={1}
                style={{
                  color: currentFolder?.color || colors.textSecondary,
                }}>
                {currentFolder ? currentFolder.name : "Unorganized"}
              </Text>
              <ChevronDown size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Right Header Action Icons */}
        <View className="flex-row items-center gap-2">
          <Card className="px-3 flex-row items-center gap-4 rounded-full">
            {/* Pin */}
            <Pressable className="" onPress={handleTogglePin}>
              <Pin
                size={20}
                color={note.isPinned ? colors.primary : colors.text}
                fill={note.isPinned ? colors.primary : undefined}
              />
            </Pressable>

            {/* Brainstorm with iKeen */}
            <Pressable
              className=""
              onPress={() => {
                void (async () => {
                  // await flushEditorMarkdown();
                  router.push({
                    pathname: "/agent",
                    params: {
                      prompt: `Let's brainstorm on my note "${note.title || "Untitled Note"}" with ID "${note.id}"`,
                    },
                  });
                })();
              }}
              hitSlop={8}>
              <Sparkles size={20} color={colors.primary} />
            </Pressable>

            {/* Mode Toggle Button: "Edit" in View Mode, "Done" in Edit Mode */}
            {isEditing ? (
              <Pressable className="" onPress={handleDoneEditing}>
                <Text className="text-sm h-5 font-bold text-foreground">
                  Done
                </Text>
              </Pressable>
            ) : (
              <Pressable className="" onPress={() => startEditing("content")}>
                <Text className="text-sm h-5 font-semibold text-foreground">
                  Edit
                </Text>
              </Pressable>
            )}
          </Card>
          {/* Dropdown */}
          <NotesOptionsDropdown
            variant="sheet"
            lastEdited={note?.updatedAt}
            isDeleted={false}
            noteId={note.id ?? ""}
            isPinned={note.isPinned}
            onTogglePin={handleTogglePin}
            isArchived={note.isArchived}
            onToggleArchive={async () => {
              updateNoteState("isArchived", !note.isArchived);
              if (note.id) {
                try {
                  await toggleArchiveNote(note.id);
                } catch {
                  updateNoteState("isArchived", note.isArchived);
                }
              }
            }}
            onDelete={isNewDraft ? undefined : handleDelete}
            onShare={handleShare}
            onShowInfo={() => setInfoSheetVisible(true)}
            onMoveToFolder={() => setIsMoveFolderSheetVisible(true)}
          />
        </View>
      </View>

      {/* Note Writing / Reading Canvas */}
      <View className="flex-1 px-2">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 border_border-border rounded-2xl"
          contentContainerClassName="px-3 pt-4"
          keyboardShouldPersistTaps="handled">
          {/* Metadata and Title */}
          <View className="pt-2 mb-2">
            {/* Title Input */}
            {isEditing ? (
              <TextInput
                ref={titleInputRef}
                className="text-2xl font-bold leading-8 tracking-tight py-1 text-text"
                placeholder={"Untitled note"}
                placeholderTextColor={colors.textSecondary}
                value={note.title}
                onChangeText={handleTitleChange}
                returnKeyType="next"
                onSubmitEditing={() => contentInputRef.current?.focus()}
                multiline
                editable={isEditing}
                pointerEvents={isEditing ? "auto" : "none"}
              />
            ) : (
              <GestureDetector gesture={combinedGestures}>
                <Text
                  onPress={() => setFocusTarget("title")}
                  className="text-2xl font-bold leading-8 tracking-tight py-1 text-text">
                  {note.title || "Untitled note"}
                </Text>
              </GestureDetector>
            )}
          </View>

          {/* Tags */}
          <View className="mb-4">
            {note.tags.length > 0 || isEditing ? (
              <View className="flex-row flex-wrap items-center gap-1.5 mb-1">
                {note.tags.map((tag) =>
                  isEditing ? (
                    <View
                      key={tag}
                      className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border bg-background-element active:opacity-80">
                      <Text className="text-xs font-medium text-text">
                        #{tag}
                      </Text>
                      <Pressable
                        hitSlop={8}
                        onPress={() => handleRemoveTag(tag)}>
                        <X size={12} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ) : (
                    <View
                      key={tag}
                      className="flex-row items-center px-2.5 py-1 rounded-xl border border-border bg-background-element">
                      <Text className="text-xs font-medium text-text">
                        #{tag}
                      </Text>
                    </View>
                  ),
                )}

                {isEditing &&
                  (newTagInputVisible ? (
                    <View className="flex-row items-center px-2 h-6.5 rounded-xl border border-primary bg-background-element">
                      <Text className="text-xs text-text-secondary">#</Text>
                      <TextInput
                        ref={tagInputRef}
                        className="text-xs py-0 px-0.5 min-w-10 text-text"
                        placeholder="tag"
                        placeholderTextColor={colors.textSecondary}
                        // value={newTagText}
                        // onChangeText={setNewTagText}
                        autoFocus
                        // blurOnSubmit={false}
                        submitBehavior="submit"
                        // onSubmitEditing handles when the user presses the keyboard "Done" / "Return" button
                        onSubmitEditing={handleAddTag}
                        // onEndEditing handles when the user clicks away or dismisses the input
                        onEndEditing={handleAddTag}
                        returnKeyType="done"
                        autoCapitalize="none"
                      />
                    </View>
                  ) : (
                    <Pressable
                      className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl border border-dashed border-border bg-background-element active:opacity-70"
                      onPress={() => {
                        Haptics.selectionAsync();
                        setNewTagInputVisible(true);
                      }}>
                      <Plus size={12} color={colors.textSecondary} />
                      <Text className="text-xs font-medium text-text-secondary">
                        Tag
                      </Text>
                    </Pressable>
                  ))}
              </View>
            ) : null}
          </View>

          {/* Editor Content | Blocks */}
          {isEditing ? (
            <MarkdownEditor
              ref={contentInputRef}
              defaultValue={note.content}
              placeholder="Start typing..."
              onChangeText={handleContentChange}
            />
          ) : note.content.trim() ? (
            <View className="w-full min-w-0 pb-24">
              <MarkdownBody source={note.content} />
            </View>
          ) : (
            <GestureDetector gesture={combinedGestures}>
              <View className="w-full min-w-0 pb-24">
                <Text className="text-base leading-6 text-text-secondary">
                  Start typing...
                </Text>
              </View>
            </GestureDetector>
          )}
        </ScrollView>
      </View>
      {/* Accessory / Toolbar depending on mode */}
      <NoteBottomToolBar
        isEditing={isEditing}
        isSaving={false}
        onFormat={formatContent}
        onOpenTagPrompt={openTagPrompt}
        onDismiss={handleDoneEditing}
        wordCount={wordCount}
        onStartEditing={editContent}
        onShare={handleShare}
        isPinned={note.isPinned}
        onTogglePin={handleTogglePin}
      />
      {/* Note Info Details Modal Sheet */}
      <NoteInfoSheet
        note={note}
        visible={infoSheetVisible}
        folderName={currentFolder?.name}
        onClose={() => setInfoSheetVisible(false)}
        onOpenMoveToFolder={() => setIsMoveFolderSheetVisible(true)}
      />
      {/* Move to Folder Selector Sheet */}
      <MoveToFolderSheet
        isPresented={isMoveFolderSheetVisible}
        onDismiss={() => setIsMoveFolderSheetVisible(false)}
        currentFolderId={note?.folderId}
        onSelectFolder={async (newFolderId) => {
          if (!note.id) return;
          try {
            // await moveNoteToFolder(note.id, newFolderId);
            updateNoteState("folderId", newFolderId);
            toast.success("Folder updated");
          } catch {
            toast.error("Failed to move note");
          }
        }}
      />
      <KeyboardGradualAnimation />
    </View>
  );
}
