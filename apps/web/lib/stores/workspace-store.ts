"use client";

import { create } from "zustand";

export type NoteSortField = "updatedAt" | "createdAt" | "title";
export type SortDirection = "desc" | "asc";

interface WorkspaceUiState {
  sortBy: NoteSortField;
  sortDirection: SortDirection;
  isMobileNavOpen: boolean;
  isQuickSwitcherOpen: boolean;
  setSortBy: (sortBy: NoteSortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  setMobileNavOpen: (open: boolean) => void;
  setQuickSwitcherOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceUiState>((set) => ({
  sortBy: "updatedAt",
  sortDirection: "desc",
  isMobileNavOpen: false,
  isQuickSwitcherOpen: false,
  setSortBy: (sortBy) => set({ sortBy }),
  setSortDirection: (sortDirection) => set({ sortDirection }),
  setMobileNavOpen: (isMobileNavOpen) => set({ isMobileNavOpen }),
  setQuickSwitcherOpen: (isQuickSwitcherOpen) => set({ isQuickSwitcherOpen }),
}));
