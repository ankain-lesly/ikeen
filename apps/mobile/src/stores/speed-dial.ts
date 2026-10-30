import { create } from "zustand";

interface SpeedDialState {
  isOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
}

export const useSpeedDialStore = create<SpeedDialState>((set) => ({
  isOpen: false,
  toggleMenu: () => set((state) => ({ isOpen: !state.isOpen })),
  closeMenu: () => set({ isOpen: false }),
}));
