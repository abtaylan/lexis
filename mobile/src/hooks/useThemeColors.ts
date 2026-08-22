import { colors, type ThemeColors } from '@/constants/theme';
import { useThemeMode } from '@/store/theme';

export function useThemeColors(): ThemeColors {
  const { scheme } = useThemeMode();
  return colors[scheme];
}
