import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeStoreState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  mode: 'dark', // Default to signature Dark & Orange theme
  setMode: mode => set({ mode }),
  toggleTheme: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' }),
}));
