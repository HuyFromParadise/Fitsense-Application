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

// Brand Identity: Athletic Black & Electric Flame Orange (Đen - Cam)
export const lightColors: ThemeColors = {
  primary: '#FF6B00',
  primaryPressed: '#E05A00',
  onPrimary: '#FFFFFF',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F5',
  border: '#E5E7EB',
  text: '#18181B',
  textMuted: '#71717A',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  onDanger: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  primary: '#FF6B00',
  primaryPressed: '#E05A00',
  onPrimary: '#FFFFFF',
  background: '#0E0E12',
  surface: '#18181D',
  surfaceAlt: '#24242C',
  border: '#2E2E38',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  onDanger: '#FFFFFF',
};
