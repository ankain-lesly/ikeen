import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputEndEditingEvent,
  View,
} from "react-native";
import { router, useNavigation } from "expo-router";
import * as Haptics from "@/lib/haptics";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  Folder,
  MoreHorizontal,
  Pin,
  Plus,
  Sparkles,
  X,
} from "lucide-react-native";
import { OptionSheet, type SheetAction } from "@/components/ui/option-sheet";
import { NoteBottomToolBar } from "@/components/notes/note-accessory-bar";
import { NoteInfoSheet } from "@/components/notes/note-info-sheet";
import { useTheme } from "@/hooks/use-theme";
import { useDoubleTap } from "@/hooks/use-double-tap";
import { toast } from "@/lib/toast";
import {
  createNote,
  getNoteById,
  moveNoteToFolder,
  updateNote,
} from "@/lib/queries/notes";
import { useLiveFolder } from "@/lib/queries/folders";
import type {
  CreateBlockInput,
  MediaBlock as MediaBlockType,
  MediaItem,
  NoteSelect,
} from "@/lib/types/notes";
import { NotesOptionsDropdown } from "@/components/notes/notes-options-dropdown";
import {
  NoteRemindersSection,
  type NoteRemindersSectionHandle,
} from "./note-reminders-section";
import { log } from "@repo/utils";

import { MoveToFolderSheet } from "@/components/notes/move-to-folder-sheet";
import { AudioRecordingSheet } from "@/components/notes/audio-recording-sheet";
import { GestureDetector } from "react-native-gesture-handler";
import { KeyboardGradualAnimation } from "@/components/keyboard-gradual-animation";
import { type MarkdownFormatAction } from "@/components/markdown";
import {
  BlockContainer,
  createDefaultChecklistBlockInput,
  createDefaultMediaBlockInput,
  createDefaultTextBlockInput,
  type BlockContainerHandle,
} from "@/components/notes/blocks";
import {
  createBlock,
  formatNoteWithBlocks,
  updateBlock,
  useLiveNoteBlocks,
} from "@/lib/queries/note-blocks";
import {
  pickDocumentFile,
  pickImagesFromLibrary,
  takePhotoWithCamera,
} from "@/lib/media/pickers";
import { Card } from "../ui/card";
import * as Crypto from "expo-crypto";
import { countWords } from "@repo/utils/string";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useNoteActions } from "@/hooks/use-note-actions";

import { HeaderGradient } from "@/hooks/use-header-inset";

export interface ScratchpadActions {
  onChangeNote?: () => void;
  onMoveToAllNotes?: () => void;
  onReset?: () => void;
}

export interface NoteEditorProps {
  note?: NoteSelect;
  variant?: "default" | "scratchpad";
  onBack?: () => void;
  scratchpadActions?: ScratchpadActions;
}

export function NoteEditor({
  note: initialNote,
  variant = "default",
  onBack,
  scratchpadActions,
}: NoteEditorProps) {
  const isScratchpad = variant === "scratchpad";
  const colors = useTheme();
  const { user } = useAuthStore();
  const [isScratchpadOptionsOpen, setIsScratchpadOptionsOpen] = useState(false);

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
    createdAt: initialNote?.createdAt || "",
    updatedAt: initialNote?.updatedAt || "",
  });

  // Track Notes Edit, Touched State
  const [isNewDraft, setIsNewDraft] = useState(!initialNote);
  const [hasEdited, setHasEdited] = useState(!initialNote);
  const [isEditing, setIsEditing] = useState(
    isScratchpad ? true : !initialNote,
  );
  const lastAppliedUpdatedAtRef = useRef<string>(initialNote?.updatedAt || "");

  // Sync inbound note updates (e.g. title/tags/folder from cloud pull) only when initialNote is strictly newer
  useEffect(() => {
    if (!initialNote?.updatedAt || hasEdited) return;
    if (
      initialNote.updatedAt !== lastAppliedUpdatedAtRef.current &&
      (!note.updatedAt || initialNote.updatedAt > note.updatedAt)
    ) {
      lastAppliedUpdatedAtRef.current = initialNote.updatedAt;
      setNote((prev) => ({
        ...prev,
        title: initialNote.title || "",
        content: initialNote.content || "",
        tags: (() => {
          try {
            const parsed: string[] = JSON.parse(initialNote.tags || "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
        isPinned: !!initialNote.isPinned,
        isArchived: !!initialNote.isArchived,
        folderId: initialNote.folderId,
        updatedAt: initialNote.updatedAt,
      }));
    }
  }, [initialNote, initialNote?.updatedAt, hasEdited, note.updatedAt]);

  // Update Notes Field - MAIN local update mechanism
  const updateNoteState = useCallback((key: keyof typeof note, value: any) => {
    setNote((prev) => ({ ...prev, [key]: value }));
    setHasEdited(true);
  }, []);

  // Sheets & Tag Input
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [isMoveFolderSheetVisible, setIsMoveFolderSheetVisible] =
    useState(false);
  const [newTagInputVisible, setNewTagInputVisible] = useState(false);
  const [isAudioRecordingOpen, setIsAudioRecordingOpen] = useState(false);
  const [targetAudioBlockId, setTargetAudioBlockId] = useState<string | null>(
    null,
  );
  const remindersSectionRef = useRef<NoteRemindersSectionHandle>(null);

  const { data: currentFolder } = useLiveFolder(note?.folderId || "");
  const { data: liveBlocks } = useLiveNoteBlocks(note.id);

  // Once any block is created, `createBlock` has already persisted the parent note in SQLite
  const isUnpersistedDraft = isNewDraft && liveBlocks.length === 0;

  const navigation = useNavigation();

  const titleInputRef = useRef<TextInput>(null);
  const tagInputRef = useRef<TextInput>(null);
  const blockContainerRef = useRef<BlockContainerHandle>(null);
  const leavingRef = useRef(false);

  // Save function: flushes staged block edits and persists note metadata
  const saveNote = useCallback(
    async (_data?: typeof note) => {
      await blockContainerRef.current?.flushBlocks();

      if (!hasEdited) return;

      const data = note;
      log({
        message: ">>> LOG: Saving...",
        mode: _data ? "external" : "internal",
      });

      const isEmpty =
        !data.title?.trim() &&
        !data.content?.trim() &&
        (!data.tags || data.tags.length === 0) &&
        liveBlocks.length === 0;

      try {
        const existingNote = isNewDraft ? await getNoteById(data.id) : null;
        const shouldCreate = isNewDraft && !existingNote;

        if (shouldCreate && isEmpty) return;

        if (shouldCreate) {
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
          lastAppliedUpdatedAtRef.current = created.updatedAt;
          setNote((prev) => ({
            ...prev,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          }));
          setIsNewDraft(false);
        } else {
          const updated = await updateNote(data.id, {
            title: data.title || "",
            content: data.content || "",
            tags: data.tags || [],
            isPinned: !!data.isPinned,
            isArchived: !!data.isArchived,
            folderId: data.folderId,
          });
          lastAppliedUpdatedAtRef.current = updated.updatedAt;
          setNote((prev) => ({
            ...prev,
            updatedAt: updated.updatedAt,
          }));
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
    [hasEdited, isNewDraft, liveBlocks.length, note],
  );

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
      if (leavingRef.current) return;
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
  }, [navigation, saveNote]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleDoneEditing = useCallback(async () => {
    Keyboard.dismiss();
    await saveNote(note);
    setIsEditing(false);
  }, [saveNote, note]);

  const scratchpadOptionsActions: SheetAction[] = useMemo(
    () => [
      {
        label: "Reset Scratchpad",
        color: "#ef4444",
        icon: <MoreHorizontal size={18} color="#ef4444" />,
        onPress: async () => {
          setIsScratchpadOptionsOpen(false);
          await saveNote();
          scratchpadActions?.onReset?.();
        },
      },
    ],
    [saveNote, scratchpadActions],
  );

  const handleTitleChange = (newTitle: string) => {
    updateNoteState("title", newTitle);
  };

  const formatContent = useCallback((action: MarkdownFormatAction) => {
    blockContainerRef.current?.formatContent(action);
  }, []);

  const openTagPrompt = useCallback(() => {
    setNewTagInputVisible(true);
  }, []);

  const handleAddBlock = useCallback(
    async (input: CreateBlockInput, label: string) => {
      try {
        await createBlock(note.id, input);
        setHasEdited(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (err) {
        console.error(`[NoteEditor] Failed to add ${label}:`, err);
        toast.error(`Failed to add ${label}`);
      }
    },
    [note.id],
  );

  const handleAddTextBlock = useCallback(
    () => handleAddBlock(createDefaultTextBlockInput(), "text block"),
    [handleAddBlock],
  );

  const handleAddCheckboxBlock = useCallback(
    () => handleAddBlock(createDefaultChecklistBlockInput(), "checkbox block"),
    [handleAddBlock],
  );

  const handleAppendMediaItems = useCallback(
    async (newItems: MediaItem[]) => {
      if (newItems.length === 0) return;
      try {
        await createBlock(note.id, createDefaultMediaBlockInput(newItems));

        setHasEdited(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (err) {
        console.error("[NoteEditor] Failed to create media block:", err);
        toast.error("Failed to add media");
      }
    },
    [note.id],
  );

  const handleTakePhoto = useCallback(async () => {
    const photo = await takePhotoWithCamera();
    if (photo) await handleAppendMediaItems([photo]);
  }, [handleAppendMediaItems]);

  const handlePickMedia = useCallback(async () => {
    const picked = await pickImagesFromLibrary({ allowsMultiple: true });
    if (picked.length > 0) await handleAppendMediaItems(picked);
  }, [handleAppendMediaItems]);

  const handleAttachFile = useCallback(async () => {
    const files = await pickDocumentFile();
    if (files.length > 0) await handleAppendMediaItems(files);
  }, [handleAppendMediaItems]);

  const shareableContent = useMemo(
    () => formatNoteWithBlocks(note.content, liveBlocks),
    [liveBlocks, note.content],
  );

  const handleDeleteSuccess = useCallback(() => {
    leavingRef.current = true;
    setIsEditing(false);
    router.back();
  }, []);

  const actions = useNoteActions({
    noteId: note.id ?? "",
    title: note.title,
    content: shareableContent,
    isPinned: note.isPinned,
    isArchived: note.isArchived,
    isDeleted: false,
    isNewDraft: isUnpersistedDraft,
    onUpdateState: updateNoteState,
    onDeleteSuccess: handleDeleteSuccess,
  });

  const handleTogglePin = actions.handleTogglePin;
  const handleShare = actions.handleShareNote;

  const handleAddTag = (e: TextInputEndEditingEvent) => {
    const text = e.nativeEvent.text;
    const trimmed = text.trim().toLowerCase().replace(/^#/, "");
    if (trimmed && !note.tags.includes(trimmed)) {
      const updatedTags = [...note.tags, trimmed];
      updateNoteState("tags", updatedTags);
      tagInputRef.current?.clear();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedTags = note.tags.filter((t) => t !== tagToRemove);
    updateNoteState("tags", updatedTags);
  };

  const wordCount = useMemo(
    () => countWords(shareableContent),
    [shareableContent],
  );

  const noteWithFullContent = useMemo(
    () => ({ ...note, content: shareableContent }),
    [note, shareableContent],
  );

  const titleDoubleTapGesture = useDoubleTap(startEditing);

  const headerHeight = 46;
  return (
    <View className="flex-1 pt-safe w-full">
      {/* Navigation Bar */}
      <View
        className="flex-row items-center justify-between px-3.5 absolute top-safe w-full z-10"
        style={{ height: headerHeight }}>
        <HeaderGradient
          featherOffset={2}
          colors={[colors.background, colors.background, "transparent"]}
          locations={[0.0, 0.35, 1]}
        />
        {/* Back Button & Title / Folder */}
        <View className="flex-row items-center justify-between gap-2">
          <Pressable
            className="flex-row p-2 rounded-full justify-center items-center gap-2"
            onPress={() => (onBack ? onBack() : router.back())}
            hitSlop={8}>
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>

          {isScratchpad ? (
            <View>
              <Text className="text-lg font-bold text-text">Scratchpad</Text>
            </View>
          ) : (
            <View>
              <Pressable
                onPress={() => setIsMoveFolderSheetVisible(true)}
                hitSlop={4}
                className="flex-row items-center gap-1.5 px-2 py-0.5 rounded-md active:opacity-70">
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
          )}
        </View>

        {/* Right Header Action Icons */}
        <View className="flex-row items-center gap-2">
          <Card className="px-3 flex-row items-center gap-4 rounded-full">
            {/* Pin */}
            {!isScratchpad && (
              <Pressable onPress={handleTogglePin}>
                <Pin
                  size={20}
                  color={note.isPinned ? colors.primary : colors.text}
                  fill={note.isPinned ? colors.primary : undefined}
                />
              </Pressable>
            )}

            {/* Brainstorm with iKeen */}
            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/agent",
                  params: {
                    prompt: `Let's brainstorm on my note "${note.title || "Untitled Note"}" with ID "${note.id}"`,
                  },
                });
              }}
              hitSlop={8}>
              <Sparkles size={20} color={colors.primary} />
            </Pressable>

            {/* Mode Toggle Button: "Edit" in View Mode, "Done" in Edit Mode */}
            {isEditing ? (
              <Pressable onPress={handleDoneEditing}>
                <Text className="text-sm h-5 font-bold text-foreground">
                  Done
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={startEditing}>
                <Text className="text-sm h-5 font-semibold text-foreground">
                  Edit
                </Text>
              </Pressable>
            )}
          </Card>
          {/* Dropdown */}
          {!isScratchpad ? (
            <NotesOptionsDropdown
              variant="sheet"
              lastEdited={note?.updatedAt}
              isNewDraft={isUnpersistedDraft}
              note={noteWithFullContent}
              onUpdateState={updateNoteState}
              onDeleteSuccess={handleDeleteSuccess}
              onReminder={
                !isUnpersistedDraft
                  ? () => remindersSectionRef.current?.openAddReminder()
                  : undefined
              }
              onShowInfo={() => setInfoSheetVisible(true)}
              onMoveToFolder={() => setIsMoveFolderSheetVisible(true)}
            />
          ) : (
            // {/* Scratchpad Options Sheet Trigger */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setIsScratchpadOptionsOpen(true);
              }}
              hitSlop={8}
              className="w-8 h-8 rounded-full items-center justify-center active:bg-background-element">
              <MoreHorizontal size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Note Writing / Reading Canvas */}
      <View className="flex-1 px-2">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 rounded-2xl"
          contentContainerClassName="px-3 pb-32"
          contentContainerStyle={{
            paddingTop: 16 + headerHeight,
          }}
          keyboardShouldPersistTaps="handled">
          {/* Metadata and Title */}
          {!isScratchpad && (
            <View className="pt-2 mb-2">
              {/* Title Input */}
              {isEditing ? (
                <TextInput
                  ref={titleInputRef}
                  className="text-2xl font-normal leading-8 tracking-tight py-1 text-text"
                  placeholder={isScratchpad ? "Scratchpad" : "Untitled note"}
                  placeholderTextColor={colors.textSecondary}
                  value={note.title}
                  onChangeText={handleTitleChange}
                  onBlur={() => {
                    if (hasEdited) void saveNote();
                  }}
                  returnKeyType="next"
                  onSubmitEditing={() =>
                    blockContainerRef.current?.focusContent()
                  }
                  multiline
                  editable={isEditing}
                  pointerEvents={isEditing ? "auto" : "none"}
                />
              ) : (
                <GestureDetector gesture={titleDoubleTapGesture}>
                  <Text className="text-2xl font-normal leading-8 tracking-tight py-1 text-text">
                    {note.title ||
                      (isScratchpad ? "Scratchpad" : "Untitled note")}
                  </Text>
                </GestureDetector>
              )}
            </View>
          )}

          {/* Tags (Hidden in scratchpad mode) */}
          {!isScratchpad && (
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
                          autoFocus
                          submitBehavior="submit"
                          onSubmitEditing={handleAddTag}
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
          )}

          {/* Block-Based Content Experience */}
          <BlockContainer
            liveBlocks={liveBlocks}
            ref={blockContainerRef}
            note={note}
            isEditing={isEditing}
            onContentChange={(t) => updateNoteState("content", t)}
            onStartEditing={startEditing}
            onRequestRecordAudio={(blockId) => {
              setTargetAudioBlockId(blockId);
              setIsAudioRecordingOpen(true);
            }}
          />

          {/* Dedicated Reminders Section */}
          <NoteRemindersSection
            ref={remindersSectionRef}
            noteId={note.id}
            noteTitle={note.title}
          />
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
        onStartEditing={startEditing}
        onShare={handleShare}
        isPinned={note.isPinned}
        onTogglePin={handleTogglePin}
        onAddTextBlock={handleAddTextBlock}
        onAddCheckboxBlock={handleAddCheckboxBlock}
        onAddMedia={handlePickMedia}
        onTakePhoto={handleTakePhoto}
        onAttachFile={handleAttachFile}
        onRecordAudio={() => {
          setTargetAudioBlockId(null);
          setIsAudioRecordingOpen(true);
        }}
      />
      {/* Note Info Details Modal Sheet */}
      <NoteInfoSheet
        note={noteWithFullContent}
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
            updateNoteState("folderId", newFolderId);
            if (!isUnpersistedDraft && !isEditing) {
              await moveNoteToFolder(note.id, newFolderId);
            }
            toast.success("Folder updated");
          } catch {
            toast.error("Failed to move note");
          }
        }}
      />
      {/* Audio Recording Sheet */}
      <AudioRecordingSheet
        visible={isAudioRecordingOpen}
        onDismiss={() => {
          setIsAudioRecordingOpen(false);
          setTargetAudioBlockId(null);
        }}
        onFinished={async (recordingItem) => {
          if (targetAudioBlockId) {
            const targetBlock = liveBlocks.find(
              (b): b is MediaBlockType =>
                b.id === targetAudioBlockId && b.type === "media",
            );
            if (targetBlock) {
              await updateBlock(targetBlock.id, {
                content: [recordingItem, ...targetBlock.content],
              });
              setHasEdited(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTargetAudioBlockId(null);
              return;
            }
          }
          await handleAppendMediaItems([recordingItem]);
          setTargetAudioBlockId(null);
        }}
      />
      {/* Scratchpad Options Sheet */}
      {isScratchpad ? (
        <OptionSheet
          isPresented={isScratchpadOptionsOpen}
          onDismiss={() => setIsScratchpadOptionsOpen(false)}
          title="Scratchpad Options"
          actions={scratchpadOptionsActions}
        />
      ) : null}

      <KeyboardGradualAnimation />
    </View>
  );
}
