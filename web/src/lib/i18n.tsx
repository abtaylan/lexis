'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from '@/store/auth';

export type Locale = 'tr' | 'en' | 'ar' | 'ru' | 'de' | 'fr' | 'es' | 'it';

const RTL_LOCALES: Locale[] = ['ar'];

type TranslationKey =
  | 'dashboard'
  | 'words'
  | 'flashcards'
  | 'quiz'
  | 'schedule'
  | 'stats'
  | 'profile'
  | 'premiumGet'
  | 'premiumActive'
  | 'adminPanel'
  | 'logout'
  | 'loading';

type Dictionary = Record<TranslationKey, string>;

const dictionaries: Record<Locale, Dictionary> = {
  tr: {
    dashboard: 'Dashboard',
    words: 'Kelimeler',
    flashcards: 'Flashcards',
    quiz: 'Quiz',
    schedule: 'Program',
    stats: 'İstatistik',
    profile: 'Profil',
    premiumGet: 'Premium’a Geç',
    premiumActive: 'Premium Üyesin',
    adminPanel: 'Yönetim Paneli',
    logout: 'Çıkış Yap',
    loading: 'Yükleniyor…',
  },
  en: {
    dashboard: 'Dashboard',
    words: 'Words',
    flashcards: 'Flashcards',
    quiz: 'Quiz',
    schedule: 'Schedule',
    stats: 'Statistics',
    profile: 'Profile',
    premiumGet: 'Go Premium',
    premiumActive: 'Premium Member',
    adminPanel: 'Admin Panel',
    logout: 'Log Out',
    loading: 'Loading…',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    words: 'الكلمات',
    flashcards: 'البطاقات التعليمية',
    quiz: 'اختبار',
    schedule: 'البرنامج',
    stats: 'الإحصائيات',
    profile: 'الملف الشخصي',
    premiumGet: 'الترقية إلى بريميوم',
    premiumActive: 'عضو بريميوم',
    adminPanel: 'لوحة الإدارة',
    logout: 'تسجيل الخروج',
    loading: 'جارٍ التحميل…',
  },
  ru: {
    dashboard: 'Панель',
    words: 'Слова',
    flashcards: 'Карточки',
    quiz: 'Тест',
    schedule: 'Расписание',
    stats: 'Статистика',
    profile: 'Профиль',
    premiumGet: 'Перейти на Premium',
    premiumActive: 'Premium активен',
    adminPanel: 'Панель администратора',
    logout: 'Выйти',
    loading: 'Загрузка…',
  },
  de: {
    dashboard: 'Dashboard',
    words: 'Wörter',
    flashcards: 'Karteikarten',
    quiz: 'Quiz',
    schedule: 'Zeitplan',
    stats: 'Statistik',
    profile: 'Profil',
    premiumGet: 'Premium werden',
    premiumActive: 'Premium-Mitglied',
    adminPanel: 'Admin-Bereich',
    logout: 'Abmelden',
    loading: 'Wird geladen…',
  },
  fr: {
    dashboard: 'Tableau de bord',
    words: 'Mots',
    flashcards: 'Cartes mémo',
    quiz: 'Quiz',
    schedule: 'Programme',
    stats: 'Statistiques',
    profile: 'Profil',
    premiumGet: 'Passer à Premium',
    premiumActive: 'Membre Premium',
    adminPanel: "Panneau d'administration",
    logout: 'Déconnexion',
    loading: 'Chargement…',
  },
  es: {
    dashboard: 'Panel',
    words: 'Palabras',
    flashcards: 'Tarjetas',
    quiz: 'Cuestionario',
    schedule: 'Horario',
    stats: 'Estadísticas',
    profile: 'Perfil',
    premiumGet: 'Hazte Premium',
    premiumActive: 'Miembro Premium',
    adminPanel: 'Panel de administración',
    logout: 'Cerrar sesión',
    loading: 'Cargando…',
  },
  it: {
    dashboard: 'Dashboard',
    words: 'Parole',
    flashcards: 'Flashcard',
    quiz: 'Quiz',
    schedule: 'Programma',
    stats: 'Statistiche',
    profile: 'Profilo',
    premiumGet: 'Passa a Premium',
    premiumActive: 'Membro Premium',
    adminPanel: 'Pannello admin',
    logout: 'Esci',
    loading: 'Caricamento…',
  },
};

interface LocaleContextType {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

function resolveLocale(code?: string): Locale {
  if (code && code in dictionaries) return code as Locale;
  return 'tr';
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const locale = resolveLocale(user?.native_lang);
  const dir: 'ltr' | 'rtl' = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const value = useMemo<LocaleContextType>(() => ({
    locale,
    dir,
    t: (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
  }), [locale, dir]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
