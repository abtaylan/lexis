'use client';

import { ClipboardCheck, BookOpenCheck, Target, ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { REGISTER_URL } from '@/lib/config';
import { Reveal } from './Reveal';
import { RibbonMotif } from './RibbonMotif';
import { MagneticButton } from './MagneticButton';

/**
 * Sınav Hazırlık (YDS/YÖKDİL) tanıtım bölümü — Cta.tsx'teki lacivert
 * "spotlight" kartıyla aynı dilde (RibbonMotif + navy-900), ama daha büyük:
 * rozet + başlık + 3 istatistik + 3 madde + CTA. Uygulamanın büyüyen
 * özellik setini (soru bankası, gramer rehberi, kişiselleştirilmiş öneri)
 * anlatmak için Features/Showcase'den sonra, Header nav + Footer'a da
 * bağlı ("Sınav Hazırlık").
 */
export function ExamPrep() {
  const { t } = useLocale();

  const stats = [
    { value: t('examStat1Value'), label: t('examStat1Label') },
    { value: t('examStat2Value'), label: t('examStat2Label') },
    { value: t('examStat3Value'), label: t('examStat3Label') },
  ];

  const points = [
    { icon: ClipboardCheck, title: t('examPoint1Title'), desc: t('examPoint1Desc') },
    { icon: BookOpenCheck, title: t('examPoint2Title'), desc: t('examPoint2Desc') },
    { icon: Target, title: t('examPoint3Title'), desc: t('examPoint3Desc') },
  ];

  return (
    <section id="exam-prep" className="mx-auto max-w-6xl px-5 py-20">
      <Reveal variant="scale">
        <div className="relative overflow-hidden rounded-[32px] bg-[var(--navy-900)] px-8 py-14 sm:px-14 sm:py-16">
          <RibbonMotif className="absolute right-[-60px] top-[-90px] h-[460px] w-[280px]" opacity={0.45} />
          <div className="absolute left-[-110px] bottom-[-120px] h-[420px] w-[260px] rotate-180">
            <RibbonMotif className="h-full w-full" opacity={0.18} />
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white/80">
              {t('examBadge')}
            </div>

            <h2 className="display mt-5 max-w-2xl text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {t('examTitle')}
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-white/70">{t('examSubtitle')}</p>

            <div className="mt-9 grid grid-cols-3 gap-4 max-w-lg border-t border-white/10 pt-7">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="display text-2xl sm:text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-white/55 mt-1 leading-snug">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {points.map((p) => (
                <div key={p.title}>
                  <div className="w-11 h-11 rounded-xl bg-white/[0.08] text-white flex items-center justify-center">
                    <p.icon className="w-5 h-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm text-white/60 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            <MagneticButton
              href={REGISTER_URL}
              className="relative mt-11 items-center gap-2 rounded-full bg-white text-[var(--navy-900)] font-semibold px-6 py-3.5 shadow-lg"
            >
              {t('examCta')}
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </MagneticButton>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
