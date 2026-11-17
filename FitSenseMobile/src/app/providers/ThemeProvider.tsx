import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { createTheme, type Theme } from '../../theme';

// FitSense Brand Identity: Athletic Black & Electric Flame Orange (Đen - Cam)
const ThemeContext = createContext<Theme>(createTheme(true));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  // Default to athletic dark mode (Đen - Cam), unless explicitly configured otherwise
  const theme = useMemo(() => createTheme(true), [scheme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
