'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { LOGIN_URL, REGISTER_URL } from '@/lib/config';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const navItems = [
    { href: '#features', label: t('navFeatures') },
    { href: '#how', label: t('navHow') },
    { href: '#faq', label: t('navFaq') },
    { href: '#contact', label: t('navContact') },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <a href="#top" className="flex items-center gap-2 shrink-0">
          <Image src="/logo-icon.png" alt="Lexis" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-bold text-gray-900">Lexis</span>
        </a>

        <nav className="hidden md:flex items-center gap-7">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <a href={LOGIN_URL} className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors">
            {t('navLogin')}
          </a>
          <a
            href={REGISTER_URL}
            className="text-sm font-semibold text-white bg-[var(--brand-500)] hover:bg-[var(--brand-600)] rounded-full px-4 py-2 shadow-sm transition-colors"
          >
            {t('navRegister')}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100"
          aria-label="Menu"
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
