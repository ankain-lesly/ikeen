import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { syncApi } from "@/lib/sync/sync-api";
import { useSyncStore } from "@/lib/sync/use-sync";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  type?: "user" | "admin";
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isHydrated: false,
      setAuth: (user, token) => {
        syncApi.setToken(token);
        useSyncStore.getState().setStatus("idle");
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        syncApi.setToken(null);
        useSyncStore.getState().setStatus("offline");
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: "ikeen_auth_session",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          syncApi.setToken(state.token);
        } else {
          syncApi.setToken(null);
        }
        state?.setHydrated(true);
      },
    }
  )
);
