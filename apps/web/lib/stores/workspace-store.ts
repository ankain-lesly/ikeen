"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NoteSortField = "updatedAt" | "createdAt" | "title";
export type SortDirection = "desc" | "asc";
export type NotesViewMode = "cards" | "list";

interface WorkspaceUiState {
  sortBy: NoteSortField;
  sortDirection: SortDirection;
  viewMode: NotesViewMode;
  isMobileNavOpen: boolean;
  isQuickSwitcherOpen: boolean;
  setSortBy: (sortBy: NoteSortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  setViewMode: (mode: NotesViewMode) => void;
  setMobileNavOpen: (open: boolean) => void;
  setQuickSwitcherOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceUiState>()(
  persist(
    (set) => ({
      sortBy: "updatedAt",
      sortDirection: "desc",
      viewMode: "cards",
      isMobileNavOpen: false,
      isQuickSwitcherOpen: false,
      setSortBy: (sortBy) => set({ sortBy }),
      setSortDirection: (sortDirection) => set({ sortDirection }),
      setViewMode: (viewMode) => set({ viewMode }),
      setMobileNavOpen: (isMobileNavOpen) => set({ isMobileNavOpen }),
      setQuickSwitcherOpen: (isQuickSwitcherOpen) =>
        set({ isQuickSwitcherOpen }),
    }),
    {
      name: "ikeen_workspace_prefs",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sortBy: state.sortBy,
        sortDirection: state.sortDirection,
        viewMode: state.viewMode,
      }),
    },
  ),
);
