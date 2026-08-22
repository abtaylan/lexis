'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Globe, ChevronDown, Sparkles } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useLocale, LOCALE_META } from '@/lib/i18n';

function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
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
        onClick={() => setOpen((o) => !o)}
        title={t('interfaceLanguageLabel')}
        className="flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white hover:dark:bg-slate-900 hover:border-slate-300 transition-colors"
      >
        <Globe size={13} className="text-slate-400" />
        <span>{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 max-h-72 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-lg py-1.5 z-50">
          {LOCALE_META.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => { setLocale(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                l.code === locale ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 font-medium' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:dark:bg-slate-800'
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

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t, dir } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-500 to-sky-700 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white dark:bg-slate-900 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-white dark:bg-slate-900 blur-3xl" />
        </div>
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm p-1.5">
            <Image src="/logo-icon.png" alt="Lexis" width={28} height={28} />
          </div>
          <span className="text-2xl font-bold tracking-tight">Lexis</span>
        </div>

        {/* Headline */}
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-sky-50 mb-5">
            <Sparkles size={12} />
            {t('statLanguagesValue')}
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">
            {t('brandHeadlineLine1')}<br />{t('brandHeadlineLine2')}
          </h2>
          <p className="text-sky-100 text-lg leading-relaxed">
            {t('brandSubtitle')}
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: t('statAlgorithmLabel'), value: 'SM-2' },
              { label: t('statLanguagesLabel'), value: t('statLanguagesValue') },
              { label: t('statPlanLabel'), value: t('statPlanValue') },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <p className="text-xl font-bold leading-tight">{s.value}</p>
                <p className="text-sky-200 text-sm mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sky-200 text-sm relative">
          {t('copyrightTpl').replace('{year}', String(new Date().getFullYear()))}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col p-6">
        <div className="flex justify-end mb-4 lg:mb-2">
          <LanguageSwitcher />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md animate-fade-in" dir={dir}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
