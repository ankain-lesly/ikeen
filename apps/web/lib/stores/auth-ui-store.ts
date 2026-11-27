"use client";

import { create } from "zustand";

export type AuthModalMode = "login" | "register";

interface AuthUiState {
  isAuthOpen: boolean;
  authMode: AuthModalMode;
  openAuth: (mode?: AuthModalMode) => void;
  closeAuth: () => void;
}

export const useAuthUiStore = create<AuthUiState>((set) => ({
  isAuthOpen: false,
  authMode: "login",
  openAuth: (authMode = "login") => set({ isAuthOpen: true, authMode }),
  closeAuth: () => set({ isAuthOpen: false }),
}));
