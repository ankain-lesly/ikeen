import { AGENT_BASE_URL, request } from './api-client';
import type {
  ChatConversationsResponse,
  ChatConversationDetail,
  AgentStatusResponse,
} from '@repo/types';

export const agentApi = {
  getStatus: (token?: string | null): Promise<AgentStatusResponse> =>
    request<AgentStatusResponse>(`${AGENT_BASE_URL}/status`, { token }),

  listConversations: (
    token?: string | null,
    limit = 20,
    offset = 0
  ): Promise<ChatConversationsResponse> =>
    request<ChatConversationsResponse>(
      `${AGENT_BASE_URL}/conversations?limit=${limit}&offset=${offset}`,
      { token }
    ),

  getConversation: (
    id: string,
    token?: string | null
  ): Promise<ChatConversationDetail> =>
    request<ChatConversationDetail>(`${AGENT_BASE_URL}/conversations/${id}`, {
      token,
    }),

  deleteConversation: (
    id: string,
    token?: string | null
  ): Promise<{ success: boolean; id: string }> =>
    request<{ success: boolean; id: string }>(
      `${AGENT_BASE_URL}/conversations/${id}`,
      { method: 'DELETE', token }
    ),
};
