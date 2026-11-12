export interface ThemeColors {
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  onDanger: string;
}

export const lightColors: ThemeColors = {
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  onPrimary: '#FFFFFF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  onDanger: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  primary: '#60A5FA',
  primaryPressed: '#3B82F6',
  onPrimary: '#0B1220',
  background: '#0B1220',
  surface: '#111C2E',
  surfaceAlt: '#17263C',
  border: '#24374F',
  text: '#E2E8F0',
  textMuted: '#94A3B8',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  onDanger: '#0B1220',
};
