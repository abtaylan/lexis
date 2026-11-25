'use client';

// components/layout/WeakDifficultyCard.tsx — V2 madde #6 (Faz 2): oyunlarda
// en çok yanlış yapılan zorluk seviyesi özeti. Önceden dashboard'da gömülüydü;
// 25 Kasım 2026 ana sayfa sadeleştirmesinde (kullanıcı isteği: "ana sayfa da
// çok karışık ... sol menüde hangi başlık ile ilgiliyse oraya alalım") /game
// sayfasına taşındı -- zaten dashboard'daki eski "Oyun Oyna" CTA'sı da bu
// sayfaya yönlendiriyordu. CefrBadge/XPBar/StreakHeatmap/Leaderboard ile AYNI
// self-contained "soft-disable" deseni: kendi API çağrısını kendi yapar, veri
// yoksa (henüz oyun oynanmamışsa) hiçbir şey göstermez.
import { useEffect, useState } from 'react';
import { gamesApi } from '@/lib/api';
import type { WeakDifficultyItem } from '@/types';
import { useLocale, type Locale } from '@/lib/i18n';

const WEAK_DIFFICULTY_STRINGS: Partial<Record<Locale, { title: string; subtitle: string; accuracyTpl: string; levelLabels: Record<string, string> }>> = {
  tr: {
    title: 'Zayıf Zorluk Seviyen',
    subtitle: 'Oyunlarda en çok yanlış yaptığın zorluk seviyeleri',
    accuracyTpl: 'Doğruluk: %{percent}',
    levelLabels: { beginner: 'Başlangıç', intermediate: 'Orta', advanced: 'İleri' },
  },
  en: {
    title: 'Your Weak Difficulty Level',
    subtitle: 'Difficulty levels you miss most in games',
    accuracyTpl: 'Accuracy: {percent}%',
    levelLabels: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
  },
};

export function WeakDifficultyCard() {
  const { locale } = useLocale();
  const [items, setItems] = useState<WeakDifficultyItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    gamesApi
      .weakDifficulty(30, 3)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch(() => {
        /* veri yoksa (henüz oyun oynanmamış) widget gösterilmez */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;
  const t = WEAK_DIFFICULTY_STRINGS[locale] ?? WEAK_DIFFICULTY_STRINGS.tr!;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-left w-full">
      <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{t.title}</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{t.subtitle}</p>
      <div className="flex flex-col gap-2 mt-3">
        {items.map((item) => (
          <div
            key={item.difficulty_level}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 dark:border-slate-800 p-3"
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
              {t.levelLabels[item.difficulty_level] ?? item.difficulty_level}
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
              {t.accuracyTpl.replace('{percent}', String(Math.round(item.accuracy_ratio * 100)))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
