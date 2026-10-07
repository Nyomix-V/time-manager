// Mêmes valeurs que docs/maquettes/assets/style.css (et les variables Figma "Time Manager").
export const colors = {
  primary: '#3B5BDB',
  primarySoft: '#EDF2FF',
  primaryLight: '#BAC8FF',
  bg: '#F5F7FB',
  surface: '#FFFFFF',
  border: '#DEE2EA',
  text: '#1A1D29',
  muted: '#5C6378',
  onPrimary: '#FFFFFF',
  success: '#2B8A3E',
  successSoft: '#EBFBEE',
  warning: '#B35C00',
  warningSoft: '#FFF4E6',
  danger: '#C92A2A',
  dangerSoft: '#FFF5F5',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
