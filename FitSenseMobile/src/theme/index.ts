import { darkColors, lightColors, type ThemeColors } from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

export { darkColors, lightColors, radius, spacing, typography };
export type { ThemeColors };

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export function createTheme(isDark: boolean): Theme {
  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
    spacing,
    radius,
    typography,
  };
}
