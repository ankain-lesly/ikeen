import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Clock, Plus } from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/lib/auth/auth-store';
import { agentApi } from '@/lib/api/agent-api';
import {
  ChatMessageList,
  ChatInputBar,
  ChatEmptyState,
  ConversationDrawer,
} from '@/components/chat';
import { toast } from '@/lib/toast';
import { fetch as expoFetch } from 'expo/fetch';
import { KeyboardGradualAnimation } from '@/components/keyboard-gradual-animation';
import { API_BASE_URL } from '@/lib/api/api-client';

export default function AgentScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { token } = useAuthStore();

  const { prompt: initialPrompt } = useLocalSearchParams<{ prompt?: string }>();
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [conversationTitle, setConversationTitle] = useState<string>('Brainstorm');
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [input, setInput] = useState('');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        fetch: (async (input, init) => {
          const res = await (expoFetch as unknown as typeof globalThis.fetch)(input, init);
          const headerConvId = res.headers.get('X-Agent-Conversation-Id');
          const headerTitle = res.headers.get('X-Agent-Conversation-Title');
          if (headerConvId && !conversationId) {
            setConversationId(headerConvId);
          }
          if (headerTitle) {
            try {
              setConversationTitle(decodeURIComponent(headerTitle));
            } catch {
              // ignore decode failure
            }
          }
          return res;
        }) as typeof globalThis.fetch,
        api: `${API_BASE_URL}/agent/chat`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        prepareSendMessagesRequest: ({ messages, body }) => {
          const rest = { ...(body ?? {}) } as Record<string, unknown>;
          delete rest.id;
          return {
            body: {
              ...rest,
              conversationId,
              messages,
            },
          };
        },
      }),
    [token, conversationId]
  );

  const {
    messages,
    sendMessage,
    status,
    stop,
    setMessages,
  } = useChat({
    transport,
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
      setTimeout(() => {
        setInput(initialPrompt);
      }, 50);
    }
  }, [initialPrompt]);

  const handleSelectConversation = async (id: string) => {
    try {
      setConversationId(id);
      const detail = await agentApi.getConversation(id, token);
      setConversationTitle(detail.title || 'Brainstorm');
      const loadedMessages = (detail.messages || (detail as unknown as { uiMessages?: unknown[] }).uiMessages) as any;
      if (Array.isArray(loadedMessages)) {
        setMessages(loadedMessages);
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
      {/* 🧭 Minimal Deep-Focused Header */}
      <View className="px-4 py-2.5 border-b border-border/60 flex-row items-center justify-between bg-background">
        {/* Left: Back Button */}
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.back();
          }}
          hitSlop={10}
          className="w-9 h-9 rounded-full items-center justify-center bg-background-element border border-border/80 active:bg-background-selected">
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>

        {/* Center: Title & Live Status */}
        <View className="flex-row items-center gap-2 max-w-[55%]">
          <View
            className={`w-2 h-2 rounded-full ${
              isLoading ? 'bg-primary animate-pulse' : 'bg-primary'
            }`}
          />
          <Text
            className="text-sm font-semibold text-text tracking-tight"
            numberOfLines={1}>
            {conversationTitle}
          </Text>
        </View>

        {/* Right: History & New Chat Actions */}
        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setIsDrawerVisible(true);
            }}
            hitSlop={8}
            accessibilityLabel="Chat History"
            className="w-9 h-9 rounded-full items-center justify-center bg-background-element border border-border/80 active:bg-background-selected">
            <Clock size={16} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={handleNewChat}
            hitSlop={8}
            accessibilityLabel="New Conversation"
            className="w-9 h-9 rounded-full items-center justify-center bg-background-element border border-border/80 active:bg-background-selected">
            <Plus size={17} color={colors.text} />
          </Pressable>
        </View>
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
        <KeyboardGradualAnimation />
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
