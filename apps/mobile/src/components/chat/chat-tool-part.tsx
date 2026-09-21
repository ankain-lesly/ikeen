import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  FileText,
  Search,
  Sparkles,
  Folder,
  Brain,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Pin,
  Archive,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

export interface ToolPartProps {
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  state?: 'call' | 'partial-call' | 'result' | 'output-available' | string;
}

export function ChatToolPart({ toolName, args = {}, result, state }: ToolPartProps) {
  const colors = useTheme();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const isRunning = state === 'call' || state === 'partial-call';

  const handleOpenNote = (noteId: string) => {
    Haptics.selectionAsync();
    router.push({
      pathname: '/notes/[id]',
      params: { id: noteId },
    });
  };

  // 1. Note Creation / Update Tool Card
  if (toolName === 'createNote' || toolName === 'updateNote') {
    const noteResult = result as {
      success?: boolean;
      note?: { id: string; title: string; folderId?: string };
    } | null;

    const note = noteResult?.note;
    const noteId = note?.id || (args.noteId as string);
    const title = note?.title || (args.title as string) || 'Untitled Note';

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <CheckCircle2 size={14} color={colors.primary} />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {toolName === 'createNote' ? 'Note Created' : 'Note Updated'}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={1}
                ellipsizeMode="tail">
                {title}
              </Text>
            </View>
          </View>

          {noteId && !isRunning && (
            <Pressable
              onPress={() => handleOpenNote(noteId)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
              <Text className="text-xs font-medium text-primary">Open</Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // 2. Note Search Tool Card
  if (toolName === 'searchNotes') {
    const searchResult = result as {
      count?: number;
      notes?: Array<{ id: string; title: string; folderName?: string }>;
    } | null;

    const query = (args.query as string) || '';
    const notes = searchResult?.notes || [];
    const count = searchResult?.count ?? notes.length;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              <Search size={14} color={colors.textSecondary} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isRunning ? 'Searching Notes...' : `Found ${count} Note${count === 1 ? '' : 's'}`}
              </Text>
              {query ? (
                <Text
                  className="text-xs text-text-secondary italic"
                  numberOfLines={1}>
                  "{query}"
                </Text>
              ) : null}
            </View>
          </View>

          {notes.length > 0 && (
            <View className="p-1">
              {isExpanded ? (
                <ChevronUp size={15} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={15} color={colors.textSecondary} />
              )}
            </View>
          )}
        </Pressable>

        {isExpanded && notes.length > 0 && (
          <View className="mt-2.5 pt-2 border-t border-border/60 gap-1.5">
            {notes.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => handleOpenNote(n.id)}
                className="flex-row items-center justify-between p-2 rounded-xl bg-background border border-border/40 active:bg-background-selected">
                <View className="flex-row items-center gap-2 flex-1 mr-2">
                  <FileText size={13} color={colors.textSecondary} />
                  <Text
                    className="text-xs font-medium text-text flex-1"
                    numberOfLines={1}>
                    {n.title}
                  </Text>
                </View>
                {n.folderName && (
                  <Text className="text-[10px] text-text-secondary">
                    {n.folderName}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  // 3. Context Memory Recorded
  if (toolName === 'recordMemory') {
    const memory = (args.content as string) || '';
    return (
      <View className="my-1.5 px-3 py-2 rounded-xl bg-background-element border border-border/80 flex-row items-center gap-2">
        <Brain size={13} color={colors.primary} />
        <Text
          className="text-xs text-text-secondary flex-1"
          numberOfLines={2}>
          Saved context: <Text className="text-text font-medium">{memory}</Text>
        </Text>
      </View>
    );
  }

  // 4. Organize Note Tool
  if (toolName === 'organizeNote') {
    const folderName = (args.folderName as string) || 'Folder';
    return (
      <View className="my-1.5 px-3 py-2 rounded-xl bg-background-element border border-border/80 flex-row items-center gap-2">
        <Folder size={13} color={colors.primary} />
        <Text className="text-xs text-text flex-1">
          Organized note into <Text className="font-semibold">{folderName}</Text>
        </Text>
      </View>
    );
  }

  // 5. Create Folder Tool
  if (toolName === 'createFolder') {
    const folderResult = result as {
      ok?: boolean;
      folder?: { id: string; name: string; color?: string; icon?: string };
      name?: string;
      alreadyExisted?: boolean;
    } | null;

    const folderName =
      folderResult?.folder?.name || folderResult?.name || (args.name as string) || 'New Folder';
    const folderColor = folderResult?.folder?.color || (args.color as string) || colors.primary;
    const isAlreadyExisted = folderResult?.alreadyExisted;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 mr-2">
            <View
              style={{ backgroundColor: `${folderColor}20`, borderColor: `${folderColor}40` }}
              className="w-7 h-7 rounded-lg border items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={folderColor} />
              ) : (
                <Folder size={14} color={folderColor} />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isAlreadyExisted ? 'Existing Folder Linked' : 'Folder Created'}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={1}>
                {folderName}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // 6. Update Folder Tool
  if (toolName === 'updateFolder') {
    const folderResult = result as {
      ok?: boolean;
      folder?: { id: string; name: string; color?: string; icon?: string };
      name?: string;
    } | null;

    const folderName =
      folderResult?.folder?.name || folderResult?.name || (args.name as string) || 'Folder';
    const folderColor = folderResult?.folder?.color || (args.color as string) || colors.primary;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
          <View
            style={{ backgroundColor: `${folderColor}20`, borderColor: `${folderColor}40` }}
            className="w-7 h-7 rounded-lg border items-center justify-center">
            {isRunning ? (
              <Loader2 size={14} color={folderColor} />
            ) : (
              <Folder size={14} color={folderColor} />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
              Folder Updated
            </Text>
            <Text className="text-xs font-semibold text-text" numberOfLines={1}>
              {folderName}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // 7. Pin Note Tool
  if (toolName === 'pinNote') {
    const noteResult = result as { noteId?: string; title?: string; isPinned?: boolean } | null;
    const title = noteResult?.title || (args.title as string) || 'Note';
    const isPinned =
      noteResult?.isPinned !== undefined ? noteResult.isPinned : args.isPinned !== false;

    return (
      <View className="my-1.5 px-3 py-2 rounded-xl bg-background-element border border-border/80 flex-row items-center gap-2">
        <Pin size={13} color={colors.primary} />
        <Text className="text-xs text-text flex-1" numberOfLines={1}>
          {isPinned ? 'Pinned ' : 'Unpinned '}
          <Text className="font-semibold">{title}</Text>
        </Text>
      </View>
    );
  }

  // 8. Archive Note Tool
  if (toolName === 'archiveNote') {
    const noteResult = result as { noteId?: string; title?: string; isArchived?: boolean } | null;
    const title = noteResult?.title || (args.title as string) || 'Note';
    const isArchived =
      noteResult?.isArchived !== undefined ? noteResult.isArchived : args.isArchived !== false;

    return (
      <View className="my-1.5 px-3 py-2 rounded-xl bg-background-element border border-border/80 flex-row items-center gap-2">
        <Archive size={13} color={colors.primary} />
        <Text className="text-xs text-text flex-1" numberOfLines={1}>
          {isArchived ? 'Archived ' : 'Restored '}
          <Text className="font-semibold">{title}</Text>
        </Text>
      </View>
    );
  }

  // 9. Generic Tool Fallback
  return (
    <View className="my-1 px-3 py-1.5 rounded-xl bg-background-element border border-border/60 flex-row items-center gap-2">
      <Sparkles size={12} color={colors.primary} />
      <Text className="text-[11px] font-mono text-text-secondary flex-1">
        {toolName} {isRunning ? 'executing...' : 'completed'}
      </Text>
    </View>
  );
}
