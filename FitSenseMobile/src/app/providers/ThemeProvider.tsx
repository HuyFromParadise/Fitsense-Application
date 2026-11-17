import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { createTheme, type Theme } from '../../theme';
import { useThemeStore } from '../../stores/useThemeStore';

// FitSense Brand Identity: Athletic Black & Electric Flame Orange (Đen - Cam)
const ThemeContext = createContext<Theme>({
  ...createTheme(true),
  toggleTheme: () => {},
  themeMode: 'dark',
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const mode = useThemeStore(state => state.mode);
  const setMode = useThemeStore(state => state.setMode);
  const toggleTheme = useThemeStore(state => state.toggleTheme);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const theme: Theme = useMemo(
    () => ({
      ...createTheme(isDark),
      isDark,
      toggleTheme,
      themeMode: mode,
      setThemeMode: setMode,
    }),
    [isDark, mode, toggleTheme, setMode]
  );

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
