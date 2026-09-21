import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  MessageSquare,
  Plus,
  X,
  Clock,
  MoreVertical,
} from 'lucide-react-native';
import { MenuView } from '@expo/ui/community/menu';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth/auth-store';
import { agentApi } from '@/lib/api/agent-api';
import type { ChatConversationSummary } from '@repo/types';
import { formatTimeAgo } from '@repo/utils/date';
import { toast } from '@/lib/toast';

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
  const { token } = useAuthStore();
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadConversations = useCallback(async () => {
      if (!token) return;
      try {
        setIsLoading(true);
        const res = await agentApi.listConversations(token, 40);
        setConversations(res.conversations || []);
      } catch {
        toast.error("Failed to load conversation history");
      } finally {
        setIsLoading(false);
      }
  }, [token]);

  useEffect(() => {
    if (isVisible) {
      loadConversations();
    }
  }, [isVisible, loadConversations]);

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
          onPress: async () => {
            try {
              await agentApi.deleteConversation(id, token);
              setConversations((prev) => prev.filter((c) => c.id !== id));
              if (activeConversationId === id) {
                onNewChat();
              }
              toast.success('Conversation deleted');
            } catch {
              toast.error('Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="bg-background rounded-t-3xl max-h-[82%] pt-3 pb-safe border-t border-border">
          {/* Subtle Drag Handle Indicator */}
          <View className="w-10 h-1 rounded-full bg-border self-center mb-3" />

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-3 border-b border-border/80">
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

          {/* List */}
          {isLoading ? (
            <View className="p-12 items-center justify-center">
              <ActivityIndicator size="small" color={colors.primary} />
              <Text className="text-xs text-text-secondary mt-2">
                Loading history...
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              ListEmptyComponent={
                <View className="py-12 items-center justify-center">
                  <MessageSquare size={28} color={colors.textSecondary} />
                  <Text className="text-sm font-medium text-text mt-2">
                    No conversations yet
                  </Text>
                  <Text className="text-xs text-text-secondary mt-1 text-center">
                    Start a brainstorm with iKeen to see it saved here.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isActive = item.id === activeConversationId;
                return (
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      onSelectConversation(item.id);
                      onClose();
                    }}
                    className="p-3.5 rounded-2xl border flex-row items-center justify-between active:bg-background-selected"
                    style={{
                      backgroundColor: isActive
                        ? colors.backgroundSelected
                        : colors.card,
                      borderColor: isActive ? colors.primary : colors.border,
                    }}>
                    <View className="flex-1 mr-3">
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
                    </View>

                    {/* Native Expo UI Context Menu for Actions */}
                    <MenuView
                      title="Conversation Options"
                      onPressAction={({ nativeEvent }) => {
                        if (nativeEvent.event === 'delete') {
                          handleDelete(item.id, item.title);
                        }
                      }}
                      actions={[
                        {
                          id: 'delete',
                          title: 'Delete Conversation',
                          attributes: {
                            destructive: true,
                          },
                        },
                      ]}>
                      <Pressable
                        hitSlop={8}
                        className="w-8 h-8 rounded-lg items-center justify-center active:bg-background-element">
                        <MoreVertical size={16} color={colors.textSecondary} />
                      </Pressable>
                    </MenuView>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
