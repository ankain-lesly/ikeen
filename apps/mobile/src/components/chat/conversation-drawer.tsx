import React from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  MessageSquare,
  Plus,
  X,
  Clock,
  Trash2,
} from 'lucide-react-native';
import { Host, BottomSheet, RNHostView } from '@expo/ui';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeAgo } from '@repo/utils/date';
import {
  useConversationsQuery,
  useDeleteConversationMutation,
} from '@/lib/queries/agents'

interface ConversationDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

export function ConversationDrawer({
  isVisible,
  onClose,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ConversationDrawerProps) {
  const colors = useTheme();
  const { width } = useWindowDimensions();

  // 🚀 React Query: Automatically cached, fetched, and refreshed
  const {
    data: conversations = [],
    isLoading,
    refetch,
  } = useConversationsQuery(40, isVisible);

  const deleteMutation = useDeleteConversationMutation();

  const handleDelete = (id: string, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${title || 'this conversation'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(
              { id, title },
              {
                onSuccess: () => {
                  if (activeConversationId === id) {
                    onNewChat();
                  }
                },
              }
            );
          },
        },
      ]
    );
  };

  return (
    <Host matchContents>
      {isVisible && (
        <BottomSheet
          isPresented={isVisible}
          onDismiss={onClose}
          snapPoints={['half', 'full']}
          showDragIndicator={true}
          containerColor={colors.background}
          contentPadding={0}>
          <RNHostView>
            <View
              className="flex-1 bg-background px-4 pt-2 pb-safe"
              style={{ width }}>
              {/* Header Bar */}
            <View className="flex-row items-center justify-between pb-3 border-b border-border/80">
              <View className="flex-row items-center gap-2">
                <Text className="text-base font-semibold text-text">
                  History
                </Text>
                {conversations.length > 0 && (
                  <View className="px-2 py-0.5 rounded-full bg-background-element border border-border/60">
                    <Text className="text-[11px] font-medium text-text-secondary">
                      {conversations.length}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onNewChat();
                    onClose();
                  }}
                  hitSlop={6}
                  className="px-3 py-1.5 rounded-xl bg-background-element border border-border/80 flex-row items-center gap-1.5 active:bg-background-selected">
                  <Plus size={14} color={colors.text} />
                  <Text className="text-xs font-semibold text-text">New Chat</Text>
                </Pressable>

                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  className="w-8 h-8 rounded-full bg-background-element items-center justify-center active:bg-background-selected">
                  <X size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {/* Conversations List */}
            {isLoading && conversations.length === 0 ? (
              <View className="py-16 items-center justify-center">
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-xs text-text-secondary mt-2">
                  Loading history...
                </Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
                showsVerticalScrollIndicator={false}
                // style={{maxHeight: 300}}
                onRefresh={refetch}
                refreshing={isLoading}
                ListEmptyComponent={
                  <View className="py-16 items-center justify-center">
                    <MessageSquare size={28} color={colors.textSecondary} />
                    <Text className="text-sm font-medium text-text mt-2">
                      No conversations yet
                    </Text>
                    <Text className="text-xs text-text-secondary mt-1 text-center max-w-[240px]">
                      Start a brainstorm with iKeen to see it saved here.
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isActive = item.id === activeConversationId;
                  return (
                    <View
                      className="p-3 rounded-2xl border flex-row items-center justify-between"
                      style={{
                        backgroundColor: isActive
                          ? colors.backgroundSelected
                          : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                      }}>
                      {/* Left: Tappable Conversation Area */}
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync();
                          onSelectConversation(item.id);
                          onClose();
                        }}
                        className="flex-1 mr-2 py-0.5">
                        <View className="flex-row items-center gap-1.5">
                          {isActive && (
                            <View className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                          <Text
                            className="text-sm font-medium text-text flex-1"
                            numberOfLines={1}>
                            {item.title || 'Untitled Brainstorm'}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-1 mt-1 pl-0.5">
                          <Clock size={11} color={colors.textSecondary} />
                          <Text className="text-[11px] text-text-secondary">
                            {formatTimeAgo(item.updatedAt)}
                          </Text>
                        </View>
                      </Pressable>

                      {/* Right: Direct Delete Action (Sibling with hitSlop) */}
                      <Pressable
                        onPress={() => handleDelete(item.id, item.title)}
                        hitSlop={12}
                        accessibilityLabel="Delete Conversation"
                        className="w-8 h-8 rounded-lg items-center justify-center bg-background-element active:bg-background-selected">
                        <Trash2 size={15} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </RNHostView>
      </BottomSheet>
    )}
    </Host>
  );
}
