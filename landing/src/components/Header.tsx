'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { LOGIN_URL, REGISTER_URL } from '@/lib/config';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Koyu (lacivert) Hero'nun üstündeyken şeffaf/açık renkli, Hero'yu geçince
  // opak/koyu metinli görünüme döner — bkz. Hero.tsx section#top.
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const hero = document.getElementById('top');
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const navItems = [
    { href: '#features', label: t('navFeatures') },
    { href: '#exam-prep', label: t('navExam') },
    { href: '#how', label: t('navHow') },
    { href: '#faq', label: t('navFaq') },
    { href: '#contact', label: t('navContact') },
  ];

  const dark = overHero;

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-300 ${
        dark
          ? 'bg-[var(--navy-900)]/70 border-white/10'
          : `bg-white/80 ${scrolled ? 'border-gray-200 header-elevated' : 'border-gray-100'}`
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <a href="#top" className="flex items-center gap-2 shrink-0">
          <Image src="/logo-icon.png" alt="Lexis" width={32} height={32} className="rounded-lg" />
          <span className={`display text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Lexis</span>
        </a>

        <nav aria-label="Ana menü" className="hidden md:flex items-center gap-7">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                dark ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <a
            href={LOGIN_URL}
            className={`text-sm font-medium px-3 py-2 transition-colors ${
              dark ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('navLogin')}
          </a>
          <a
            href={REGISTER_URL}
            className={`text-sm font-semibold rounded-full px-4 py-2 shadow-sm transition-colors ${
              dark ? 'bg-white text-[var(--navy-900)] hover:bg-white/90' : 'text-white bg-[var(--brand-500)] hover:bg-[var(--brand-600)]'
            }`}
          >
            {t('navRegister')}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`md:hidden flex items-center justify-center w-9 h-9 rounded-lg ${
            dark ? 'text-white hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
          }`}
          aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-5 py-4 space-y-3">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-gray-700 py-1.5"
            >
              {item.label}
            </a>
          ))}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <LanguageSwitcher />
            <div className="flex items-center gap-2">
              <a href={LOGIN_URL} className="text-sm font-medium text-gray-600 px-3 py-2">{t('navLogin')}</a>
              <a href={REGISTER_URL} className="text-sm font-semibold text-white bg-[var(--brand-500)] rounded-full px-4 py-2">
                {t('navRegister')}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
