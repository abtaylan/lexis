// src/store/theme.tsx — kullanıcının açık/koyu/sistem tema tercihi.
// useThemeColors() artık doğrudan react-native'in useColorScheme()'ine değil,
// bu context'e bakıyor: kullanıcı "system" seçerse cihaz temasını izler,
// "light"/"dark" seçerse cihaz ne olursa olsun o temada sabit kalır.
// Tercih AsyncStorage'da (bulkStorage) kalıcı olarak saklanır — bkz. i18n/index.tsx
// içindeki LocaleProvider ile aynı desen (kayıtlı değer yüklenene kadar null döner).
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { bulkStorage } from '@/utils/storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

interface ThemeContextType {
  /** Kullanıcının seçtiği tercih (persisted). */
  mode: ThemeMode;
  /** Gerçekte uygulanan tema — mode 'system' ise cihaz temasına göre çözülür. */
  scheme: ResolvedScheme;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);
const STORAGE_KEY = 'lexis_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await bulkStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
      setLoaded(true);
    })();
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    bulkStorage.setItem(STORAGE_KEY, m);
  };

  const scheme: ResolvedScheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo<ThemeContextType>(() => ({ mode, scheme, setMode }), [mode, scheme]);

  // LocaleProvider ile aynı desen: kayıtlı tercih yüklenene kadar render etme
  // (aksi halde bir an için yanlış temayla flash olur).
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside ThemeProvider');
  return ctx;
}
