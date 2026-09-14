'use client';

import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { REGISTER_URL } from '@/lib/config';
import { Reveal } from './Reveal';
import { RibbonMotif } from './RibbonMotif';
import { MagneticButton } from './MagneticButton';

export function Cta() {
  const { t } = useLocale();

  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal variant="scale">
        <div className="relative overflow-hidden rounded-[32px] bg-[var(--navy-900)] px-8 py-20 text-center sm:px-16">
          <RibbonMotif className="absolute right-[-60px] top-[-80px] h-[420px] w-[260px]" opacity={0.5} />
          <div className="absolute left-[-100px] bottom-[-100px] h-[420px] w-[260px] rotate-180">
            <RibbonMotif className="h-full w-full" opacity={0.25} />
          </div>
          <h2 className="display relative text-3xl sm:text-4xl font-bold text-white tracking-tight">{t('ctaTitle')}</h2>
          <p className="relative mt-3 text-lg text-white/70 max-w-xl mx-auto">{t('ctaSubtitle')}</p>
          <MagneticButton
            href={REGISTER_URL}
            className="relative mt-8 items-center gap-2 rounded-full bg-white text-[var(--navy-900)] font-semibold px-7 py-3.5 shadow-lg"
          >
            {t('ctaButton')}
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </MagneticButton>
        </div>
      </Reveal>
    </section>
  );
}
