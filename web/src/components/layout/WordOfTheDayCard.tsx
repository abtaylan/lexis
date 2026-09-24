'use client';

// components/layout/WordOfTheDayCard.tsx — dashboard "Günün Kelimesi" kartı
// (Madde 5, 24 Eylül 2026). Kullanıcının zaten e-postada aldığı günlük
// kelime içeriğini (bkz. backend/send_daily_word_email.py,
// word_of_the_day_service.py) dashboard'da da gösterir. Salt okunur —
// hiçbir şeyi güncellemez.
//
// CefrBadge/XPBar/DailyWordCard ile AYNI self-contained "soft-disable"
// deseni: kendi API çağrısını kendi yapar, found=false ya da hata
// durumunda sessizce hiçbir şey göstermez.
import { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { wordsApi } from '@/lib/api';
import type { WordOfTheDayResult } from '@/types';
import { useLocale, type Locale } from '@/lib/i18n';

const LABELS: Partial<Record<Locale, { title: string; example: string; tip: string }>> = {
  tr: {
    title: 'Günün Kelimesi',
    example: 'Örnek',
    tip: 'İpucu',
  },
  en: {
    title: 'Word of the Day',
    example: 'Example',
    tip: 'Tip',
  },
};

export function WordOfTheDayCard() {
  const { locale } = useLocale();
  const [data, setData] = useState<WordOfTheDayResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    wordsApi
      .wordOfTheDay()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        /* soft-disable -- günün kelimesi henüz üretilmemiş/hata durumunda kart hiç gösterilmez */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !data || !data.found) return null;

  const t = LABELS[locale] ?? LABELS.tr!;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#EAF3FC] dark:bg-[#378ADD]/10 text-[#378ADD] shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{t.title}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">{data.word}</p>
        </div>
        {data.level && (
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 shrink-0">
            {data.level}
          </span>
        )}
      </div>

      {data.meaning_native && (
        <p className="text-sm text-gray-700 dark:text-slate-300 mb-1">{data.meaning_native}</p>
      )}

      {data.example_1_target && (
        <p className="text-xs text-gray-500 dark:text-slate-400 italic mb-0.5">
          {t.example}: “{data.example_1_target}”
        </p>
      )}
      {data.example_1_native && (
        <p className="text-xs text-gray-400 dark:text-slate-500 italic mb-1">{data.example_1_native}</p>
      )}

      {data.grammar_note_native && (
        <p className="text-xs text-[#378ADD] mt-1">
          <span className="font-semibold">{t.tip}:</span> {data.grammar_note_native}
        </p>
      )}
    </div>
  );
}
