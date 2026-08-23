// src/i18n/index.tsx — web'deki lib/i18n.tsx'in mobil karşılığı.
// Merkezi sözlük (translations.json — web'in dictionaries'inden birebir
// üretildi, 9 dil × 274 anahtar) + mobile-only ekler (mobileStrings) +
// oyun ekranı sözlüğü (gameStrings) + dashboard etiketleri tek yerden,
// tek bir useLocale() hook'u ile sunulur.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import { bulkStorage } from '@/utils/storage';
import { LOCALE_META, RTL_LOCALES, type Locale } from './locales';
import translationsJson from './translations.json';
import { MOBILE_STRINGS, type MobileStrings } from './mobileStrings';
import { GAME_STRINGS, type GameStrings } from './gameStrings';
import { XP_LABELS, LB_LABELS, BADGE_LABELS } from './dashboardStrings';

export type { Locale };
export { LOCALE_META };

type CentralDict = (typeof translationsJson)['tr'];
const centralDict = translationsJson as unknown as Record<Locale, CentralDict>;

const STORAGE_KEY = 'lexis_ui_locale';
const DEFAULT_LOCALE: Locale = 'tr';

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return out;
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  isRTL: boolean;
  /** Merkezi sözlük (web ile ortak) — dashboard/kelimeler/program/profil/auth metinleri. */
  t: (key: keyof CentralDict, vars?: Record<string, string | number>) => string;
  /** Mobile-only ekler (OTP, bildirim izni, ağ durumu vb.) */
  mt: (key: keyof MobileStrings, vars?: Record<string, string | number>) => string;
  /** Oyun ekranı sözlüğü. */
  gt: GameStrings;
  xpLabels: (typeof XP_LABELS)['tr'];
  lbLabels: (typeof LB_LABELS)['tr'];
  badgeLabels: (typeof BADGE_LABELS)['tr'];
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await bulkStorage.getItem(STORAGE_KEY);
      if (saved && LOCALE_META.some((l) => l.code === saved)) {
        setLocaleState(saved as Locale);
      }
      setLoaded(true);
    })();
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    bulkStorage.setItem(STORAGE_KEY, l);
    // NOT: I18nManager.forceRTL tam düzen (layout) çevirisi için uygulamanın
    // yeniden başlatılmasını gerektirir. Faz 1'de sadece metin hizalaması
    // isRTL bayrağıyla ekranlarda elle yönetiliyor; tam native RTL flip
    // ileride (Expo Updates reload ile) eklenebilir.
    const wantsRTL = RTL_LOCALES.includes(l);
    if (I18nManager.isRTL !== wantsRTL) {
      try {
        I18nManager.allowRTL(wantsRTL);
      } catch {
        /* yut */
      }
    }
  };

  const isRTL = RTL_LOCALES.includes(locale);

  const value = useMemo<LocaleContextType>(() => {
    const dict = centralDict[locale] ?? centralDict[DEFAULT_LOCALE];
    const mdict = MOBILE_STRINGS[locale] ?? MOBILE_STRINGS[DEFAULT_LOCALE];
    return {
      locale,
      setLocale,
      isRTL,
      t: (key, vars) => interpolate(String(dict[key] ?? ''), vars),
      mt: (key, vars) => interpolate(String(mdict[key] ?? ''), vars),
      gt: GAME_STRINGS[locale] ?? GAME_STRINGS[DEFAULT_LOCALE],
      xpLabels: XP_LABELS[locale] ?? XP_LABELS[DEFAULT_LOCALE],
      lbLabels: LB_LABELS[locale] ?? LB_LABELS[DEFAULT_LOCALE],
      badgeLabels: BADGE_LABELS[locale] ?? BADGE_LABELS[DEFAULT_LOCALE],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, isRTL]);

  if (!loaded) return null;

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
