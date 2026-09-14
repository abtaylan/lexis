'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { LOGIN_URL, REGISTER_URL } from '@/lib/config';
import { RibbonMotif } from './RibbonMotif';
import { MagneticButton } from './MagneticButton';

export function Hero() {
  const { t, locale } = useLocale();
  const parallaxRef = useRef<HTMLDivElement>(null);

  // Lexis 12 dilde çalışıyor; ekran görüntüleri ise bunlardan 8'i için ayrı
  // çekildi (en/de/fr/es/it/ru/ar/ja). tr, pt, zh ve ko bilinçli olarak kök/
  // varsayılan sete (`public/screenshots/*.png`) düşer.
  const LOCALIZED_SCREENSHOTS = ['en', 'de', 'fr', 'es', 'it', 'ru', 'ar', 'ja'];
  const screenshotSrc = (name: string) =>
    LOCALIZED_SCREENSHOTS.includes(locale) ? `/screenshots/${locale}/${name}.png` : `/screenshots/${name}.png`;

  const stats = [
    { value: t('heroStat1Value'), label: t('heroStat1Label') },
    { value: t('heroStat2Value'), label: t('heroStat2Label') },
    { value: t('heroStat3Value'), label: t('heroStat3Label') },
  ];

  // Ekran görüntüsü çerçevesine hafif bir scroll-parallax uygular — sayfa
  // kaydırıldıkça görsel, çevresine göre biraz daha yavaş hareket eder.
  // prefers-reduced-motion'da tamamen devre dışı kalır.
  useEffect(() => {
    const el = parallaxRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = el.getBoundingClientRect();
        const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const clamped = Math.min(1, Math.max(0, progress));
        el.style.transform = `translateY(${(clamped - 0.5) * -32}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="top" className="relative overflow-hidden bg-[var(--navy-900)]">
      <RibbonMotif className="absolute right-[-40px] top-[-60px] h-[680px] w-[400px] hidden sm:block" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--navy-900)] to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-5 pt-16 pb-24 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div
              className="animate-fade-in inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-white/80"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--brand-400)]" />
              {t('heroBadge')}
            </div>

            <h1 className="display mask-reveal mt-6 text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.05]">
              <span style={{ animationDelay: '120ms' }}>{t('heroTitle')}</span>
            </h1>

            <p
              className="animate-fade-in mt-5 text-lg text-white/70 max-w-lg"
              style={{ animationDelay: '260ms' }}
            >
              {t('heroSubtitle')}
            </p>

            <div
              className="animate-fade-in mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '360ms' }}
            >
              <MagneticButton
                href={REGISTER_URL}
                className="items-center gap-2 rounded-full bg-white hover:bg-white/90 text-[var(--navy-900)] font-semibold px-6 py-3.5 shadow-lg"
              >
                {t('heroCtaPrimary')}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </MagneticButton>
              <MagneticButton
                href={LOGIN_URL}
                className="items-center gap-2 rounded-full border border-white/20 hover:border-white/40 text-white font-semibold px-6 py-3.5"
              >
                {t('heroCtaSecondary')}
              </MagneticButton>
            </div>

            <div
              className="animate-fade-in mt-10 grid grid-cols-3 gap-4 max-w-md"
              style={{ animationDelay: '440ms' }}
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="display text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-white/55 mt-0.5 leading-snug">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-float">
            <div ref={parallaxRef} className="relative mx-auto max-w-xl">
              <div
                className="relative rounded-[24px] p-3"
                style={{ background: 'rgba(255,255,255,0.03)', boxShadow: 'var(--shadow-navy-glow)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
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
      </div>
    </section>
  );
}
