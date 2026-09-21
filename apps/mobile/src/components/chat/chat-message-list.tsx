import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import type { UIMessage } from '@ai-sdk/react';
import { useTheme } from '@/hooks/use-theme';
import { ChatToolPart } from './chat-tool-part';
import { IKeenMascot } from '@/components/ikeen-mascot';

interface MessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  ListEmptyComponent?: React.ReactElement;
}

export function ChatMessageList({
  messages,
  isLoading,
  ListEmptyComponent,
}: MessageListProps) {
  const colors = useTheme();
  const listRef = useRef<FlatList>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading]);

  const renderItem = ({ item }: { item: UIMessage }) => {
    const isUser = item.role === 'user';

    // Tool invocations can exist either directly on the message or inside parts
    const toolInvocations: any[] = [];

    if (item.toolInvocations) {
      toolInvocations.push(...item.toolInvocations);
    }

    if (Array.isArray(item.parts)) {
      for (const part of item.parts) {
        if (part.type === 'tool-invocation' && part.toolInvocation) {
          toolInvocations.push(part.toolInvocation);
        }
      }
    }

    if (isUser) {
      return (
        <View className="flex-row justify-end mb-4 px-4">
          <View className="max-w-[82%] px-4 py-3 rounded-2xl rounded-tr-sm bg-background-element border border-border/60">
            <Text className="text-sm font-normal text-text leading-relaxed">
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

    // Assistant Message
    return (
      <View className="mb-5 px-4">
        {/* Assistant Header Avatar */}
        <View className="flex-row items-center gap-2 mb-1.5">
          <View className="w-5 h-5 rounded-full bg-background-element border border-border items-center justify-center overflow-hidden">
            <IKeenMascot size={20} />
          </View>
          <Text className="text-xs font-semibold text-text-secondary">
            iKeen
          </Text>
        </View>

        {/* Tool Cards (if any) */}
        {toolInvocations.length > 0 && (
          <View className="mb-2">
            {toolInvocations.map((t, idx) => (
              <ChatToolPart
                key={t.toolCallId || `${item.id}-tool-${idx}`}
                toolName={t.toolName}
                args={t.args}
                result={t.result}
                state={t.state}
              />
            ))}
          </View>
        )}

        {/* Text Content */}
        {item.content ? (
          <View className="pl-7 pr-2">
            <Text className="text-sm font-normal text-text leading-relaxed">
              {item.content}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: 16,
        paddingBottom: 24,
      }}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={
        isLoading && messages[messages.length - 1]?.role === 'user' ? (
          <View className="flex-row items-center gap-2 px-6 py-2">
            <View className="w-5 h-5 rounded-full bg-background-element border border-border items-center justify-center overflow-hidden">
              <IKeenMascot size={20} />
            </View>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-xs text-text-secondary ml-1">
              Thinking...
            </Text>
          </View>
        ) : null
      }
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
    />
  );
}
