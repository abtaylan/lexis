'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { Reveal } from './Reveal';
import { RibbonMotif } from './RibbonMotif';

/**
 * SSS bölümü: abrupt {isOpen && <div>} mount yerine .faq-collapse
 * (grid-template-rows: 0fr -> 1fr, globals.css) ile yumuşak yükseklik
 * geçişi, soru numaralandırması, hafif arka plan RibbonMotif vurgusu,
 * alternatif Reveal yönleri ve açık öğede canlanan marka rengi zemin.
 */
export function Faq() {
  const { t } = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const items = [
    { q: t('faqQ1'), a: t('faqA1') },
    { q: t('faqQ2'), a: t('faqA2') },
    { q: t('faqQ3'), a: t('faqA3') },
    { q: t('faqQ4'), a: t('faqA4') },
    { q: t('faqQ5'), a: t('faqA5') },
    { q: t('faqQ6'), a: t('faqA6') },
  ];

  return (
    <section id="faq" className="relative bg-gray-50 border-y border-gray-100 py-20 overflow-hidden">
      <RibbonMotif className="absolute -left-28 top-0 hidden w-72 h-[520px] sm:block" opacity={0.06} />

      <div className="relative mx-auto max-w-3xl px-5">
        <Reveal className="text-center">
          <h2 className="display text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">{t('faqTitle')}</h2>
          <p className="mt-3 text-lg text-gray-500">{t('faqSubtitle')}</p>
        </Reveal>

        <div className="mt-10 space-y-3">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <Reveal key={item.q} delay={i * 50} variant={i % 2 === 0 ? 'left' : 'right'}>
                <div
                  className={`rounded-2xl border shadow-sm overflow-hidden transition-colors duration-500 ${
                    isOpen ? 'border-[var(--brand-200)] bg-[var(--brand-50)]' : 'border-gray-100 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`display text-xs font-bold shrink-0 transition-colors duration-500 ${
                        isOpen ? 'text-[var(--brand-500)]' : 'text-gray-300'
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-gray-800">{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-all duration-500 ${
                        isOpen ? 'rotate-180 text-[var(--brand-500)]' : 'text-gray-400'
                      }`}
                    />
                  </button>

                  <div className={`faq-collapse ${isOpen ? 'is-open' : ''}`}>
                    <div className="faq-collapse-inner">
                      <div className="px-5 pb-4 pl-14 text-sm text-gray-500 leading-relaxed">{item.a}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
