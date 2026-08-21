'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LOCALE_META, useLocale } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LOCALE_META.find((l) => l.code === locale) ?? LOCALE_META[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-44 max-h-80 overflow-y-auto rounded-2xl border border-gray-100 bg-white py-1.5 shadow-lg z-50">
          {LOCALE_META.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLocale(l.code); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-sm text-left transition-colors ${
                l.code === locale ? 'bg-[var(--accent-50)] text-[var(--accent-600)] font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
