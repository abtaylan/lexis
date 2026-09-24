'use client';

// components/layout/DailyWordCard.tsx — dashboard'da "Günlük Kelime Avı"
// (24 Eylül 2026, Madde 2 seçimi) için kompakt durum kartı.
//
// CefrBadge.tsx / XPBar.tsx ile AYNI self-contained "soft-disable" deseni:
// kendi API çağrısını kendi yapar, veri gelmeden/hata durumunda (ya da
// backend bugünün kelimesini henüz üretmediyse — cron gecikmesi/uygun
// kelime yokluğu) sessizce hiçbir şey göstermez. Kart sadece ÖZET durumu
// gösterir (çözüldü mü / kaç hak kaldı / seri kaçıncı gün) — asıl harf
// tahmini oyunu /daily-word sayfasında.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Sparkles } from 'lucide-react';
import { dailyChallengeApi, type DailyChallengeState } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

const LABELS: Partial<Record<Locale, { title: string; solved: string; failed: string; pending: string; play: string; streakSuffix: string }>> = {
  tr: {
    title: 'Günlük Kelime Avı',
    solved: 'Bugünü çözdün!',
    failed: 'Bugünkü kelime kaçtı',
    pending: 'Bugünün kelimesi seni bekliyor',
    play: 'Oyna',
    streakSuffix: 'gün seri',
  },
  en: {
    title: 'Daily Word Hunt',
    solved: "You solved today's word!",
    failed: "Today's word got away",
    pending: "Today's word is waiting",
    play: 'Play',
    streakSuffix: 'day streak',
  },
};

export function DailyWordCard() {
  const { locale } = useLocale();
  const [state, setState] = useState<DailyChallengeState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dailyChallengeApi
      .today()
      .then((res) => {
        if (!cancelled) setState(res);
      })
      .catch(() => {
        /* soft-disable -- bugünün kelimesi henüz üretilmemiş/hata durumunda kart hiç gösterilmez */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !state) return null;

  const t = LABELS[locale] ?? LABELS.tr!;
  const statusText = state.is_complete ? t.solved : state.is_failed ? t.failed : t.pending;
  const remainingGuesses = state.max_wrong_guesses - state.wrong_guesses;

  return (
    <Link
      href="/daily-word"
      className="flex items-center gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm px-4 py-3 hover:border-[#378ADD] transition-colors"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FDF3E7] dark:bg-amber-500/10 text-[#B8720A] dark:text-amber-400 shrink-0">
        <Sparkles className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t.title}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {statusText}
          {!state.is_complete && !state.is_failed && (
            <span className="text-gray-400 dark:text-slate-500"> · {remainingGuesses}/{state.max_wrong_guesses}</span>
          )}
        </p>
      </div>
      {state.streak > 0 && (
        <div className="flex items-center gap-1 text-xs font-semibold text-orange-500 shrink-0">
          <Flame className="w-4 h-4 fill-orange-400 text-orange-400" />
          {state.streak}
        </div>
      )}
      {!state.is_complete && !state.is_failed && (
        <span className="text-xs font-semibold text-[#378ADD] shrink-0">{t.play}</span>
      )}
    </Link>
  );
}
