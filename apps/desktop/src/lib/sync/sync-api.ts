import type { SyncPushPayload, SyncPushResponse, SyncPullResponse, RealtimeAuthResponse } from '@repo/types';

export const DEFAULT_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

class SyncApiClient {
  private baseUrl: string = DEFAULT_API_URL;
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('ikeen_api_url');
      if (storedUrl) this.baseUrl = storedUrl;
      const storedToken = localStorage.getItem('ikeen_auth_token');
      if (storedToken) this.token = storedToken;
    }
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      localStorage.setItem('ikeen_api_url', this.baseUrl);
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('ikeen_auth_token', token);
      } else {
        localStorage.removeItem('ikeen_auth_token');
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return Boolean(this.token);
  }

  async push(payload: SyncPushPayload): Promise<SyncPushResponse> {
    const url = `${this.baseUrl}/sync/push`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      const err = new Error(`Push sync failed: ${res.status} ${errorText}`);
      (err as any).status = res.status;
      throw err;
    }

    return await res.json();
  }

  async pull(since?: string | null): Promise<SyncPullResponse> {
    const endpoint = since
      ? `${this.baseUrl}/sync/pull?since=${encodeURIComponent(since)}`
      : `${this.baseUrl}/sync/pull`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      const err = new Error(`Pull sync failed: ${res.status} ${errorText}`);
      (err as any).status = res.status;
      throw err;
    }

    return await res.json();
  }

  async getRealtimeAuth(): Promise<RealtimeAuthResponse> {
    const url = `${this.baseUrl}/sync/realtime-auth`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        return { enabled: false, error: `Realtime auth HTTP error: ${res.status}` };
      }

      return await res.json();
    } catch (err: unknown) {
      return {
        enabled: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const syncApi = new SyncApiClient();
