'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Layers, HelpCircle, Gamepad2,
  CalendarDays, ShieldCheck, LogOut, User, BarChart3, Crown,
  Menu, X, Users,
} from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useLocale, type Locale } from '@/lib/i18n';
import { XPBar } from '@/components/layout/XPBar';
import { ThemeSwitch } from '@/components/ui';

// Merkezi i18n.tsx sözlüğüne dokunmadan yerel çeviri (forgot-password/reset-password/
// verify-otp sayfalarında kullanılan güvenli desenle aynı yaklaşım).
const GAME_LABEL: Record<Locale, string> = {
  tr: 'Kelime Oyunu',
  en: 'Word Game',
  ar: 'لعبة الكلمات',
  ru: 'Игра слов',
  de: 'Wortspiel',
  fr: 'Jeu de mots',
  es: 'Juego de palabras',
  it: 'Gioco di parole',
  ja: '単語ゲーム',
  pt: 'Jogo de Palavras',
};

// Madde 6, Faz 1 — Arkadaşlık + Takip + Profil görüntüleme
const FRIENDS_LABEL: Record<Locale, string> = {
  tr: 'Arkadaşlar',
  en: 'Friends',
  ar: 'الأصدقاء',
  ru: 'Друзья',
  de: 'Freunde',
  fr: 'Amis',
  es: 'Amigos',
  it: 'Amici',
  ja: '友達',
  pt: 'Amigos',
};

// Açık/koyu tema seçici etiketi — aynı yerel çeviri deseni (bkz. yukarısı).
const THEME_LABEL: Record<Locale, string> = {
  tr: 'Tema',
  en: 'Theme',
  ar: 'المظهر',
  ru: 'Тема',
  de: 'Thema',
  fr: 'Thème',
  es: 'Tema',
  it: 'Tema',
  ja: 'テーマ',
  pt: 'Tema',
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, locale } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sayfa değiştiğinde mobil menüyü otomatik kapat — render sırasında state
  // ayarlama (React'ın "adjusting state during render" deseni), effect içinde
  // setState'ten kaçınmak için (bkz. react-hooks/set-state-in-effect kuralı).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/words', label: t('words'), icon: BookOpen },
    { href: '/flashcards', label: t('flashcards'), icon: Layers },
    { href: '/quiz', label: t('quiz'), icon: HelpCircle },
    { href: '/game', label: GAME_LABEL[locale], icon: Gamepad2 },
    { href: '/friends', label: FRIENDS_LABEL[locale], icon: Users },
    { href: '/schedule', label: t('schedule'), icon: CalendarDays },
    { href: '/stats', label: t('stats'), icon: BarChart3 },
    { href: '/profile', label: t('profile'), icon: User },
  ];

  const handleLogout = () => { logout(); router.push('/login'); };

  const displayName = user?.display_name || user?.username || user?.email?.split('@')[0] || 'Kullanıcı';
  const avatarLetter = displayName[0].toUpperCase();

  return (
    <>
      {/* Mobil üst çubuk — sadece md altı genişliklerde görünür */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center px-4 z-40">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Menüyü aç"
          className="p-2 -ml-2 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Image src="/logo-icon.png" alt="Lexis" width={24} height={24} className="ml-2" />
        <span className="ml-1.5 text-lg font-bold text-blue-600 dark:text-blue-400 tracking-tight">Lexis</span>
      </div>

      {/* Karartma — mobil menü açıkken arka planı kapatır, dışına tıklayınca menüyü kapatır */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`flex flex-col w-60 min-h-screen bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 px-4 py-6 fixed left-0 top-0 z-50 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="mb-8 px-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Image src="/logo-icon.png" alt="Lexis" width={28} height={28} />
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">Lexis</span>
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Menüyü kapat"
            className="md:hidden p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </Link>
          );
        })}
      </nav>

      {/* Premium abonelik kısayolu */}
      <Link href="/premium"
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-3 ${
          user?.is_premium ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10 dark:hover:bg-amber-500/15' : 'text-slate-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
        }`}>
        <Crown className="w-4 h-4 shrink-0" />{user?.is_premium ? t('premiumActive') : t('premiumGet')}
      </Link>

      {/* Admin için ayrı yönetim paneline kısayol */}
      {user?.is_admin && (
        <Link href="/admin/users"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[#534AB7] bg-[#EEEDFE] hover:bg-[#e0ddfc] dark:text-[#8B82E8] dark:bg-[#211F3D] dark:hover:bg-[#2a2750] transition-colors mb-3">
          <ShieldCheck className="w-4 h-4 shrink-0" />{t('adminPanel')}
        </Link>
      )}

      <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
        {/* Madde: XPBar ön yüz bileşeni — hesap geneli seviye/XP göstergesi */}
        <XPBar compact />
        <div className="flex items-center justify-between px-2 mb-3">
          <span className="text-xs font-medium text-gray-400 dark:text-slate-500">{THEME_LABEL[locale]}</span>
          <ThemeSwitch />
        </div>
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">{avatarLetter}</div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{displayName}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />{t('logout')}
        </button>
      </div>
      </aside>
    </>
  );
}
