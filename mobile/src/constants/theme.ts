// src/constants/theme.ts — Lexis marka renkleri (web'deki globals.css'ten
// aktarıldı: sky-blue ana renk + mor XP vurgusu + amber/yeşil/kırmızı durum
// renkleri). İki tema (light/dark) — sistem temasına göre otomatik.
export const colors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#F1F1F4',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    primary: '#378ADD',
    primaryPressed: '#2D73C4',
    primarySoft: '#E6F1FB',
    accent: '#534AB7',
    accentSoft: '#EEEDFE',
    success: '#3B6D11',
    successSoft: '#EAF3DE',
    warning: '#854F0B',
    warningSoft: '#FAEEDA',
    danger: '#DC2626',
    dangerSoft: '#FEF2F2',
    amber: '#D97706',
  },
  dark: {
    background: '#0B0F19',
    surface: '#141A26',
    border: '#232A38',
    text: '#F3F4F6',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    primary: '#4E9CEE',
    primaryPressed: '#3D82CE',
    primarySoft: '#132335',
    accent: '#8B82E8',
    accentSoft: '#211F3D',
    success: '#7BC24B',
    successSoft: '#182B10',
    warning: '#E3A63F',
    warningSoft: '#2E2210',
    danger: '#F87171',
    dangerSoft: '#2C1414',
    amber: '#F0B549',
  },
};

export type ThemeColors = typeof colors.light;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
