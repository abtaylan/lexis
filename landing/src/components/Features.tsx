'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, Gamepad2, CalendarDays, Trophy, Users, Globe2 } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { Reveal } from './Reveal';

const COLORS = [
  { bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]' },
  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]' },
  { bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]' },
  { bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]' },
  { bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]' },
  { bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]' },
];

/**
 * Özellikler bölümü, klasik kart ızgarası yerine "sabitlenen görsel panel +
 * kaydırınca değişen metin bloğu" (scrollytelling) kurgusuyla anlatılıyor:
 * sağdaki her blok görünüm alanının ortasına geldiğinde soldaki panel o
 * özelliğin ikonuna/rengine çapraz geçişle (crossfade) döner.
 */
export function Features() {
  const { t } = useLocale();
  const [active, setActive] = useState(0);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  const items = [
    { icon: BookOpen, title: t('f1Title'), desc: t('f1Desc') },
    { icon: Gamepad2, title: t('f2Title'), desc: t('f2Desc') },
    { icon: CalendarDays, title: t('f3Title'), desc: t('f3Desc') },
    { icon: Trophy, title: t('f4Title'), desc: t('f4Desc') },
    { icon: Users, title: t('f5Title'), desc: t('f5Desc') },
    { icon: Globe2, title: t('f6Title'), desc: t('f6Desc') },
  ];

  useEffect(() => {
    const els = blockRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24">
      <Reveal className="max-w-2xl mb-16">
        <h2 className="display text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">{t('featuresTitle')}</h2>
        <p className="mt-3 text-lg text-gray-500">{t('featuresSubtitle')}</p>
      </Reveal>

      <div className="grid gap-12 lg:grid-cols-[380px_1fr]">
        <div className="hidden lg:block">
          <div className="sticky-panel relative h-[380px]">
            {items.map((item, i) => (
              <div key={item.title} className={`crossfade-item ${active === i ? 'is-active' : ''}`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${COLORS[i].bg} ${COLORS[i].text}`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <div className="mt-6 text-xs font-bold text-gray-300 display">{String(i + 1).padStart(2, '0')} / 06</div>
                <h3 className="display mt-2 text-2xl font-bold text-gray-900">{item.title}</h3>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col">
          {/* Mobilde sticky panel yok; ikon her blokta kendi içinde gösterilir. */}
          {items.map((item, i) => (
            <div
              key={item.title}
              ref={(el) => { blockRefs.current[i] = el; }}
              data-index={i}
              className="min-h-[56vh] lg:min-h-[62vh] flex flex-col justify-center border-t border-gray-100 first:border-t-0"
            >
              <div className={`lg:hidden w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${COLORS[i].bg} ${COLORS[i].text}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <Reveal>
                <h3 className="display text-xl lg:text-2xl font-bold text-gray-900">{item.title}</h3>
                <p className="mt-3 text-base text-gray-500 leading-relaxed max-w-md">{item.desc}</p>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
