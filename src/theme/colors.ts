export const colors = {
  background: '#F7F1E8',
  surface: '#FFFFFF',
  surfaceAlt: '#EFE2D0',
  primary: '#7A4E2D',
  primaryDark: '#5C3A20',
  accent: '#C77752',
  success: '#6F8F72',
  textDark: '#2F241D',
  textSecondary: '#7B6A5C',
  textMuted: '#A89683',
  border: '#D8C7B3',
  error: '#B85C4A',
  warning: '#C99860',
  overlay: 'rgba(47, 36, 29, 0.45)',
} as const;

export type ColorName = keyof typeof colors;
