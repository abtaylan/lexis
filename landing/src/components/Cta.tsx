'use client';

import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { REGISTER_URL } from '@/lib/config';

export function Cta() {
  const { t } = useLocale();

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[var(--brand-500)] to-[var(--accent-600)] px-8 py-16 text-center sm:px-16">
        <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10" />
        <div aria-hidden className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/10" />
        <h2 className="relative text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{t('ctaTitle')}</h2>
        <p className="relative mt-3 text-lg text-white/85 max-w-xl mx-auto">{t('ctaSubtitle')}</p>
        <a
          href={REGISTER_URL}
          className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white text-[var(--accent-600)] font-semibold px-7 py-3.5 shadow-lg hover:shadow-xl transition-shadow"
        >
          {t('ctaButton')}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </a>
      </div>
    </section>
  );
}
