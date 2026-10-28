import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Archive, FileText, Pin } from "lucide-react-native";

import { useTheme } from "@/hooks/use-theme";
import {
  InfiniteRecentNotesResult,
  RecentNote,
  useInfiniteRecentNotes,
} from "@/lib/queries/notes";
import { formatTimeAgo } from "@repo/utils/date";
import { ThemedText } from "./ui/themed-text";

export interface RecentNotesProps {
  pagination?: InfiniteRecentNotesResult;
  pageSize?: number;
}

export function RecentNotes({
  pagination: propPagination,
  pageSize = 20,
}: RecentNotesProps) {
  const colors = useTheme();
  const router = useRouter();

  // Progressive live query pagination instance (uses prop if coordinated by parent scroll container)
  const defaultPagination = useInfiniteRecentNotes(pageSize);
  const activePagination = propPagination ?? defaultPagination;
  const { notes, isLoadingMore } = activePagination;

  return (
    <View className="px-2 pt-1 pb-4">
      {/* Header with Title and Note Counts */}
      <View className="flex-row items-center justify-between px-3 mb-2">
        <ThemedText type="subtitle" className="font-medium text-base">
          Recent Notes
        </ThemedText>
        {/* {totalCount > 0 && (
          <Text className="text-[10px] font-mono text-text-secondary">
            {notes.length}
            {notes.length < totalCount ? ` / ${totalCount}` : ""}
          </Text>
        )} */}
      </View>

      {/* Empty State */}
      {notes.length === 0 ? (
        <View className="px-3 py-3 items-center justify-center">
          <Text className="text-xs text-text-secondary">No notes yet</Text>
        </View>
      ) : (
        <View className="gap-0.5">
          {notes.map((note: RecentNote) => (
            <TouchableOpacity
              key={note.id}
              activeOpacity={0.7}
              onPress={() => {
                router.push(`/notes/${note.id}`);
              }}
              className="relative flex-row items-center py-2 px-3 rounded-xl active:bg-background-element">
              <Text
                numberOfLines={1}
                className="flex-1 text-sm font-normal text-text mr-2">
                {note.title}
              </Text>

              <Text className="text-[10px] font-mono text-text-secondary shrink-0">
                {formatTimeAgo(note.updatedAt, { year: false, time:false })}
              </Text>

              <View className="absolute -right-6 w-5 h-5 items-center justify-center mr-2 shrink-0">
                {note.isArchived ? (
                  <Archive size={14} color={colors.textSecondary} />
                ) : note.isPinned ? (
                  <Pin size={14} color={colors.textSecondary} />
                ) : null}
              </View>
            </TouchableOpacity>
          ))}

          {/* Progressive Loading Indicator at End of Feed */}
          {isLoadingMore && (
            <View className="py-3 items-center justify-center">
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}
