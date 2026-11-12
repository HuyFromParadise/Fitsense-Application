import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { createTheme, type Theme } from '../../theme';

const ThemeContext = createContext<Theme>(createTheme(false));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(() => createTheme(scheme === 'dark'), [scheme]);

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
