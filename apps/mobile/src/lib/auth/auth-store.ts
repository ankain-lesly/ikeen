import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/api-client';

const TOKEN_KEY = 'ikeen_auth_jwt_token';
const USER_KEY = 'ikeen_auth_user_cache';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

interface AuthResponse {
  user: UserProfile;
  accessToken: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  init: () => Promise<void>;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  init: async () => {
    try {
      set({ isLoading: true, error: null });

      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);

      if (!storedToken) {
        set({ token: null, user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      let parsedUser: UserProfile | null = null;
      if (storedUser) {
        try {
          parsedUser = JSON.parse(storedUser);
        } catch {
          // ignore cache parse error
        }
      }

      // Fast optimistic load from cache
      set({
        token: storedToken,
        user: parsedUser,
        isAuthenticated: true,
        isLoading: false,
      });

      // Verify token in background with backend
      try {
        const freshUser = await apiClient.get<UserProfile>('/auth/me', { token: storedToken });
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(freshUser));
        set({ user: freshUser, isAuthenticated: true });
      } catch (err: any) {
        // If 401 Unauthorized, token has expired
        if (err?.status === 401) {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(USER_KEY);
          set({ token: null, user: null, isAuthenticated: false });
        }
      }
    } catch {
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async ({ email, password }) => {
    try {
      set({ isLoading: true, error: null });

      const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });

      await SecureStore.setItemAsync(TOKEN_KEY, res.accessToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.user));

      set({
        token: res.accessToken,
        user: res.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message = err?.message || 'Login failed. Please check your credentials.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async ({ name, email, password }) => {
    try {
      set({ isLoading: true, error: null });

      const res = await apiClient.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
      });

      await SecureStore.setItemAsync(TOKEN_KEY, res.accessToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.user));

      set({
        token: res.accessToken,
        user: res.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message = err?.message || 'Registration failed. Please try again.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // ignore deletion errors
    } finally {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
