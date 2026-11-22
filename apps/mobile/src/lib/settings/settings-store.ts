import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Uniwind } from 'uniwind';

export type AppTheme = 'system' | 'light' | 'dark';
export type DefaultNoteSort = 'updatedAt' | 'createdAt' | 'title';

export interface SettingsState {
  theme: AppTheme;
  defaultSort: DefaultNoteSort;
  hapticsEnabled: boolean;
  autoSyncOnCellular: boolean;
  scratchpadNoteId: string | null;

  setTheme: (theme: AppTheme) => void;
  setDefaultSort: (sort: DefaultNoteSort) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setAutoSyncOnCellular: (enabled: boolean) => void;
  setScratchpadNoteId: (scratchpadNoteId: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      defaultSort: 'updatedAt',
      hapticsEnabled: true,
      autoSyncOnCellular: true,
      scratchpadNoteId: null,

      setTheme: (theme: AppTheme) => {
        Uniwind.setTheme(theme);
        set({ theme });
      },

      setDefaultSort: (defaultSort: DefaultNoteSort) => {
        set({ defaultSort });
      },

      setHapticsEnabled: (hapticsEnabled: boolean) => {
        set({ hapticsEnabled });
      },

      setAutoSyncOnCellular: (autoSyncOnCellular: boolean) => {
        set({ autoSyncOnCellular });
      },

      setScratchpadNoteId: (scratchpadNoteId: string | null) => {
        set({ scratchpadNoteId });
      },
    }),
    {
      name: 'ikeen-app-settings',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          Uniwind.setTheme(state.theme);
        }
      },
    }
  )
);
