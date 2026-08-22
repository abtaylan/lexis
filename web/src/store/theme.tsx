'use client';

// src/store/theme.tsx — kullanıcının açık/koyu/sistem tema tercihi (web).
// Mobil taraftaki store/theme.tsx ile aynı API: mode (kullanıcı tercihi,
// localStorage'da kalıcı) + scheme (gerçekte uygulanan tema — 'system' ise
// prefers-color-scheme'e göre çözülür). Seçilen scheme <html data-theme="...">
// attribute'una yazılır; globals.css'teki @custom-variant dark bunu okuyarak
// tüm `dark:` Tailwind class'larını tetikler (bkz. layout.tsx'teki
// flash-önleyici init script).
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  scheme: ResolvedScheme;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);
export const THEME_STORAGE_KEY = 'lexis_theme_mode';

function getSystemScheme(): ResolvedScheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<ResolvedScheme>('light');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    } catch {
      /* localStorage kapalı olabilir (gizli sekme vb.) — sessizce yut */
    }
    setSystemScheme(getSystemScheme());

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemScheme(mql.matches ? 'dark' : 'light');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const scheme: ResolvedScheme = mode === 'system' ? systemScheme : mode;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', scheme);
  }, [scheme]);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, m);
    } catch {
      /* yut */
    }
  };

  const value = useMemo<ThemeContextType>(() => ({ mode, scheme, setMode }), [mode, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside ThemeProvider');
  return ctx;
}
