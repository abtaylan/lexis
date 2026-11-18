'use client';

// app/(app)/crossword/page.tsx — "Çengel Bulmaca" seviye listesi sayfası
// (18 Kasım 2026 kullanıcı isteği). mobile/src/app/(app)/crossword.tsx ile
// AYNI desen/davranış — 200 sabit seviye, 4 kademe, ilerleme kullanıcının
// genel kelime seviyesinden BAĞIMSIZ (her zaman 1'den başlar), seviyeler
// sırayla açılır.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Lock, Loader2, Puzzle } from 'lucide-react';
import { crosswordApi } from '@/lib/api';
import type { CrosswordLevelsResponse } from '@/types';
import { useLocale, type Locale } from '@/lib/i18n';

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    title: 'Çengel Bulmaca',
    subtitle: 'Kelimeleri bul, bulmacayı tamamla, XP kazan.',
    error: 'Bir şeyler ters gitti.',
    completeBonusTpl: 'Bulmaca bonusu: +{xp} XP',
  },
  en: {
    title: 'Hook Crossword',
    subtitle: 'Find the words, finish the puzzle, earn XP.',
    error: 'Something went wrong.',
    completeBonusTpl: 'Puzzle bonus: +{xp} XP',
  },
};

export default function CrosswordLevelsPage() {
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const [data, setData] = useState<CrosswordLevelsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    crosswordApi
      .levels()
      .then(setData)
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </Link>
        <div className="flex items-center gap-2">
          <Puzzle className="w-5 h-5 text-[#534AB7] dark:text-[#8B82E8]" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
        </div>
      </div>
      <p className="text-sm text-gray-400 dark:text-slate-500 -mt-3">{t.subtitle}</p>

      {!data && !error && (
        <div className="flex items-center justify-center py-16 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {data &&
        data.tiers.map((tier) => {
          const levels = Array.from({ length: tier.level_to - tier.level_from + 1 }, (_, i) => tier.level_from + i);
          return (
            <div
              key={tier.name}
              className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4"
            >
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">{tier.name}</h2>
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  {tier.level_from}–{tier.level_to}
                </span>
              </div>
              <p className="text-xs text-[#534AB7] dark:text-[#8B82E8] mb-3">
                {t.completeBonusTpl.replace('{xp}', String(tier.completion_xp))}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {levels.map((level) => {
                  const isLocked = level > data.current_level;
                  const isCurrent = level === data.current_level;
                  const isDone = level < data.current_level;

                  const base = 'w-11 h-9 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-colors';
                  const cls = isCurrent
                    ? `${base} bg-[#378ADD] border-[#378ADD] text-white`
                    : isDone
                      ? `${base} bg-[#EAF3DE] border-[#3B6D11]/30 text-[#3B6D11] hover:bg-[#dfeccb]`
                      : isLocked
                        ? `${base} bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-300 dark:text-slate-600 opacity-60 cursor-not-allowed`
                        : `${base} bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#378ADD] hover:bg-[#E6F1FB]`;

                  if (isLocked) {
                    return (
                      <div key={level} className={cls}>
                        <Lock className="w-3 h-3" />
                        {level}
                      </div>
                    );
                  }
                  return (
                    <Link key={level} href={`/crossword/${level}`} className={cls}>
                      {isDone && <CheckCircle2 className="w-3 h-3" />}
                      {level}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
