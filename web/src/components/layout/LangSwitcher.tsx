'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SUPPORTED_UI_LANGS, UI_LANG_META, useGuestUiLang, useT } from '@/lib/i18n';

/**
 * Login / Register sayfaları için misafir arayüz dili seçici.
 * Seçim `useGuestUiLang()` üzerinden localStorage'a yazılır ve aynı sekmedeki
 * tüm `useT()` kullanan bileşenlere anında yayılır.
 */
export function LangSwitcher({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const [lang, setLang] = useGuestUiLang();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const meta = UI_LANG_META[lang];
  const isDark = variant === 'dark';

  return (
    <div ref={ref} className="relative" aria-label={t('auth.langSwitcher.ariaLabel')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
          isDark
            ? 'text-white/90 hover:bg-white/10'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <span className="text-base leading-none">{meta.flag}</span>
        <span>{meta.nativeName}</span>
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg z-50">
          {SUPPORTED_UI_LANGS.map((code) => {
            const m = UI_LANG_META[code];
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLang(code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 ${
                  code === lang ? 'font-semibold text-sky-600' : 'text-slate-700'
                }`}
              >
                <span className="text-base leading-none">{m.flag}</span>
                <span>{m.nativeName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
