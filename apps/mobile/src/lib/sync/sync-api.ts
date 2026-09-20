import { apiClient } from '../api/api-client';
import { useAuthStore } from '../auth/auth-store';
import type { SyncPushPayload, SyncPullResponse, RealtimeAuthResponse } from '@repo/types';

export type { SyncPushPayload, SyncPullResponse, RealtimeAuthResponse };

export const syncApi = {
  push: async (payload: SyncPushPayload): Promise<{ success: boolean; serverTimestamp: string }> => {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error('Cannot sync: User not authenticated');
    return await apiClient.post('/sync/push', payload, { token });
  },

  pull: async (since?: string | null): Promise<SyncPullResponse> => {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error('Cannot sync: User not authenticated');
    const endpoint = since ? `/sync/pull?since=${encodeURIComponent(since)}` : '/sync/pull';
    return await apiClient.get<SyncPullResponse>(endpoint, { token });
  },

  getRealtimeAuth: async (): Promise<RealtimeAuthResponse> => {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error('Cannot authenticate Ably: User not authenticated');
    return await apiClient.get<RealtimeAuthResponse>('/sync/realtime-auth', { token });
  },
};
