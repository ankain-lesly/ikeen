import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { agentApi } from '@/lib/api/agent.api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { toast } from '@/lib/toast';
import type { ChatConversationSummary, ChatConversationDetail } from '@repo/types';

export const agentQueryKeys = {
  all: ['agent'] as const,
  conversations: () => [...agentQueryKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...agentQueryKeys.all, 'conversation', id] as const,
};

export function useInfiniteConversations(pageSize = 20) {
  const { token } = useAuthStore();

  return useInfiniteQuery({
    queryKey: [...agentQueryKeys.conversations(), 'infinite', pageSize],
    queryFn: async ({ pageParam = 0 }) => {
      if (!token) return { conversations: [], total: 0 };
      return agentApi.listConversations(token, pageSize, pageParam);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (sum, p) => sum + (p.conversations?.length ?? 0),
        0
      );
      return loadedCount < (lastPage?.total ?? 0) ? loadedCount : undefined;
    },
    enabled: Boolean(token),
  });
}

export function useConversationsQuery(limit = 40, enabled = true) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: agentQueryKeys.conversations(),
    queryFn: async (): Promise<ChatConversationSummary[]> => {
      if (!token) return [];
      const res = await agentApi.listConversations(token, limit);
      return res.conversations || [];
    },
    enabled: Boolean(token) && enabled,
  });
}

export function useConversationDetailQuery(id?: string, enabled = true) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: agentQueryKeys.conversation(id || ''),
    queryFn: async (): Promise<ChatConversationDetail | null> => {
      if (!token || !id) return null;
      return agentApi.getConversation(id, token);
    },
    enabled: Boolean(token && id) && enabled,
  });
}

export function useDeleteConversationMutation() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id }: { id: string; title?: string }) => {
      if (!token) throw new Error('Authentication required');
      return agentApi.deleteConversation(id, token);
    },
    onSuccess: (_, variables) => {
      // Optimistically or reactively remove from cache
      queryClient.setQueryData<ChatConversationSummary[]>(
        agentQueryKeys.conversations(),
        (old) => (old ? old.filter((item) => item.id !== variables.id) : [])
      );
      // Invalidate to guarantee fresh sync
      queryClient.invalidateQueries({ queryKey: agentQueryKeys.conversations() });
      toast.success('Conversation deleted');
    },
    onError: (err) => {
      console.log('[🚨] Delete conversation failed:', err);
      toast.error('Failed to delete conversation');
    },
  });
}
