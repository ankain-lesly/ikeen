"use client";

import { create } from "zustand";

export type NoteSortField = "updatedAt" | "createdAt" | "title";
export type SortDirection = "desc" | "asc";

interface WorkspaceUiState {
  searchQuery: string;
  sortBy: NoteSortField;
  sortDirection: SortDirection;
  isMobileNavOpen: boolean;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: NoteSortField) => void;
  setSortDirection: (direction: SortDirection) => void;
  setMobileNavOpen: (open: boolean) => void;
  resetFilters: () => void;
}

export const useWorkspaceStore = create<WorkspaceUiState>((set) => ({
  searchQuery: "",
  sortBy: "updatedAt",
  sortDirection: "desc",
  isMobileNavOpen: false,
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortDirection: (sortDirection) => set({ sortDirection }),
  setMobileNavOpen: (isMobileNavOpen) => set({ isMobileNavOpen }),
  resetFilters: () =>
    set({ searchQuery: "", sortBy: "updatedAt", sortDirection: "desc" }),
}));
