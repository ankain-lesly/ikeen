import { create } from "zustand";

export type ClientGuideTab = "claude" | "cursor" | "cline" | "curl";

interface KeysUIState {
  isCreateOpen: boolean;
  isRevealOpen: boolean;
  isAuthOpen: boolean;
  authMode: "login" | "register";
  revealedKey: {
    name: string;
    fullKey: string;
    keyPrefix: string;
  } | null;
  activeGuideTab: ClientGuideTab;
  selectedKeyPrefix: string | null;
  activeSnippetKey: string | null;

  openCreate: () => void;
  closeCreate: () => void;
  openReveal: (key: { name: string; fullKey: string; keyPrefix: string }) => void;
  closeReveal: () => void;
  openAuth: (mode?: "login" | "register") => void;
  closeAuth: () => void;
  setActiveGuideTab: (tab: ClientGuideTab) => void;
  setSelectedKeyPrefix: (prefix: string | null) => void;
  setActiveSnippetKey: (key: string | null) => void;
}

export const useKeysStore = create<KeysUIState>((set) => ({
  isCreateOpen: false,
  isRevealOpen: false,
  isAuthOpen: false,
  authMode: "login",
  revealedKey: null,
  activeGuideTab: "claude",
  selectedKeyPrefix: null,
  activeSnippetKey: null,

  openCreate: () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
  openReveal: (revealedKey) =>
    set({
      isRevealOpen: true,
      revealedKey,
      selectedKeyPrefix: revealedKey.keyPrefix,
      activeSnippetKey: revealedKey.fullKey,
    }),
  closeReveal: () => set({ isRevealOpen: false, revealedKey: null }),
  openAuth: (authMode = "login") => set({ isAuthOpen: true, authMode }),
  closeAuth: () => set({ isAuthOpen: false }),
  setActiveGuideTab: (activeGuideTab) => set({ activeGuideTab }),
  setSelectedKeyPrefix: (selectedKeyPrefix) => set({ selectedKeyPrefix }),
  setActiveSnippetKey: (activeSnippetKey) => set({ activeSnippetKey }),
}));
