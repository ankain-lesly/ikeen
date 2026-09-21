import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { useChat } from '@ai-sdk/react';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { History, Plus, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth/auth-store';
import { AGENT_BASE_URL } from '@/lib/api/api-client';
import { agentApi } from '@/lib/api/agent-api';
import {
  ChatMessageList,
  ChatInputBar,
  ChatEmptyState,
  ConversationDrawer,
} from '@/components/chat';
import { toast } from '@/lib/toast';

export default function AgentScreen() {
  const colors = useTheme();
  const { token } = useAuthStore();

  const { prompt: initialPrompt } = useLocalSearchParams<{ prompt?: string }>();
  const [conversationId, setConversationId] = useState<string | undefined>(
    undefined
  );
  const [conversationTitle, setConversationTitle] =
    useState<string>('Brainstorm');
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [input, setInput] = useState('');

  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = useChat({
    // @ts-expect-error - passed down to default transport
    api: AGENT_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: { conversationId },
    id: conversationId,
    onError: (error: Error) => {
      console.log('[Agent Chat Error]:', error);
      toast.error('Failed to get response from iKeen');
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    try {
      await sendMessage({ text: trimmed });
    } catch {
      toast.error('Could not send message');
    }
  };

  useEffect(() => {
    if (initialPrompt && typeof initialPrompt === 'string') {
      setInput(initialPrompt);
    }
  }, [initialPrompt, setInput]);

  const handleSelectConversation = async (id: string) => {
    try {
      setConversationId(id);
      const detail = await agentApi.getConversation(id, token);
      setConversationTitle(detail.title || 'Brainstorm');
      if (Array.isArray(detail.messages)) {
        setMessages(detail.messages as any);
      }
    } catch {
      toast.error('Failed to load selected conversation');
    }
  };

  const handleNewChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConversationId(undefined);
    setConversationTitle('Brainstorm');
    setMessages([]);
    setInput('');
  };

  const handleSelectPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <View className="flex-1 bg-background pt-safe">
      {/* 🚀 Header */}
      <View className="px-4 pb-3 border-b border-border/80 flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setIsDrawerVisible(true);
          }}
          hitSlop={8}
          className="p-2 rounded-xl bg-background-element border border-border flex-row items-center gap-1.5 active:bg-background-selected">
          <History size={16} color={colors.text} />
          <Text className="text-xs font-semibold text-text">History</Text>
        </Pressable>

        <View className="flex-row items-center gap-1.5">
          <Sparkles size={16} color={colors.primary} />
          <Text
            className="text-base font-bold text-text max-w-[180px]"
            numberOfLines={1}>
            {conversationTitle}
          </Text>
        </View>

        <Pressable
          onPress={handleNewChat}
          hitSlop={8}
          className="p-2 rounded-xl bg-background-element border border-border flex-row items-center gap-1 active:bg-background-selected">
          <Plus size={16} color={colors.text} />
          <Text className="text-xs font-semibold text-text">New</Text>
        </Pressable>
      </View>

      {/* 💬 Chat Messages + Input */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          ListEmptyComponent={
            <ChatEmptyState onSelectPrompt={handleSelectPrompt} />
          }
        />

        <ChatInputBar
          input={input}
          onChangeText={setInput}
          onSubmit={() => handleSubmit()}
          isLoading={isLoading}
          onStop={stop}
        />
      </KeyboardAvoidingView>

      {/* 📁 Slide-over Conversation Drawer */}
      <ConversationDrawer
        isVisible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        activeConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />
    </View>
  );
}
