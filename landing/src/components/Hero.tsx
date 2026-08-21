'use client';

import Image from 'next/image';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { LOGIN_URL, REGISTER_URL } from '@/lib/config';

export function Hero() {
  const { t, locale } = useLocale();
  // 9 dilin tamamı için (tr varsayılan + en/de/fr/es/it/ru/ar/ja) ayrı ekran
  // görüntüleri çekildi (bkz. lexis_kalan_isler_guncel.md, Madde 5 — tamamlandı).
  const LOCALIZED_SCREENSHOTS = ['en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ja'];
  const screenshotSrc = (name: string) =>
    LOCALIZED_SCREENSHOTS.includes(locale) ? `/screenshots/${locale}/${name}.png` : `/screenshots/${name}.png`;

  const stats = [
    { value: t('heroStat1Value'), label: t('heroStat1Label') },
    { value: t('heroStat2Value'), label: t('heroStat2Label') },
    { value: t('heroStat3Value'), label: t('heroStat3Label') },
  ];

  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 h-[420px] bg-gradient-to-b from-[var(--brand-100)] via-[var(--brand-50)] to-transparent"
      />
      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 shadow-sm px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-600)]">
              <Sparkles className="w-3.5 h-3.5" />
              {t('heroBadge')}
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
              {t('heroTitle')}
            </h1>
            <p className="mt-5 text-lg text-gray-500 max-w-lg">
              {t('heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={REGISTER_URL}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white font-semibold px-6 py-3.5 shadow-lg shadow-sky-500/20 transition-colors"
              >
                {t('heroCtaPrimary')}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </a>
              <a
                href={LOGIN_URL}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white hover:border-gray-300 text-gray-700 font-semibold px-6 py-3.5 transition-colors"
              >
                {t('heroCtaSecondary')}
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-extrabold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-snug">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-in" style={{ animationDelay: '120ms' }}>
            <div className="relative mx-auto max-w-xl rounded-[28px] border border-gray-100 bg-white shadow-2xl shadow-slate-300/40 p-3 animate-float">
              <Image
                src={screenshotSrc('dashboard')}
                alt="Lexis Dashboard"
                width={900}
                height={577}
                className="rounded-2xl w-full h-auto"
                priority
              />
            </div>
            <div
              aria-hidden
              className="absolute -bottom-6 -left-6 hidden sm:flex items-center gap-2 rounded-2xl bg-white border border-gray-100 shadow-lg px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--accent-50)] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[var(--accent-600)]" />
              </div>
              <div className="text-xs">
                <div className="font-semibold text-gray-900">+120 XP</div>
                <div className="text-gray-400">Bugün</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
