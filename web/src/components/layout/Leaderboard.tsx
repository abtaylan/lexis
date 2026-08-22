'use client';

// components/layout/Leaderboard.tsx — Rakip karşılaştırmalı sıralama.
// XPBar sadece kendi XP/seviye ilerlemeni gösterir; bu bileşen ona ek
// olarak diğer kullanıcılarla karşılaştırma sağlar: username, seviye,
// puan + Genel/Haftalık/Aylık sekmeler. Kendi satırın her zaman
// vurgulanır — top listede olmasan bile (backend "me" alanında ayrıca
// döner, bkz. backend/app/services/leaderboard_service.py).
//
// Backend: GET /stats/leaderboard?period=all|weekly|monthly&limit=N

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';
import { Trophy, Crown } from 'lucide-react';
import {
  statsApi,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardResponse,
} from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

// Merkezi i18n.tsx'e dokunmadan yerel çeviri — XPBar.tsx'teki XP_LABELS
// deseniyle aynı yaklaşım (bkz. Sidebar.tsx GAME_LABEL / LOCALE_MAP).
const LB_LABELS: Record<
  Locale,
  {
    title: string;
    tabAll: string;
    tabWeekly: string;
    tabMonthly: string;
    you: string;
    points: string;
    empty: string;
    loading: string;
    error: string;
  }
> = {
  tr: { title: 'Sıralama', tabAll: 'Genel', tabWeekly: 'Haftalık', tabMonthly: 'Aylık', you: 'Sen', points: 'puan', empty: 'Bu dönemde henüz kimse puan kazanmamış.', loading: 'Yükleniyor…', error: 'Sıralama yüklenemedi.' },
  en: { title: 'Leaderboard', tabAll: 'Overall', tabWeekly: 'Weekly', tabMonthly: 'Monthly', you: 'You', points: 'pts', empty: 'No one has scored yet this period.', loading: 'Loading…', error: 'Could not load the leaderboard.' },
  de: { title: 'Bestenliste', tabAll: 'Gesamt', tabWeekly: 'Wöchentlich', tabMonthly: 'Monatlich', you: 'Du', points: 'Pkt.', empty: 'In diesem Zeitraum hat noch niemand Punkte erzielt.', loading: 'Lädt…', error: 'Bestenliste konnte nicht geladen werden.' },
  fr: { title: 'Classement', tabAll: 'Général', tabWeekly: 'Hebdomadaire', tabMonthly: 'Mensuel', you: 'Toi', points: 'pts', empty: "Personne n'a encore marqué de points cette période.", loading: 'Chargement…', error: "Le classement n'a pas pu être chargé." },
  es: { title: 'Clasificación', tabAll: 'General', tabWeekly: 'Semanal', tabMonthly: 'Mensual', you: 'Tú', points: 'pts', empty: 'Nadie ha sumado puntos todavía en este período.', loading: 'Cargando…', error: 'No se pudo cargar la clasificación.' },
  it: { title: 'Classifica', tabAll: 'Generale', tabWeekly: 'Settimanale', tabMonthly: 'Mensile', you: 'Tu', points: 'pt', empty: 'Nessuno ha ancora ottenuto punti in questo periodo.', loading: 'Caricamento…', error: 'Impossibile caricare la classifica.' },
  ar: { title: 'لوحة المتصدرين', tabAll: 'عام', tabWeekly: 'أسبوعي', tabMonthly: 'شهري', you: 'أنت', points: 'نقطة', empty: 'لم يسجّل أحد نقاطًا بعد في هذه الفترة.', loading: 'جارٍ التحميل…', error: 'تعذّر تحميل لوحة المتصدرين.' },
  ru: { title: 'Рейтинг', tabAll: 'Общий', tabWeekly: 'Неделя', tabMonthly: 'Месяц', you: 'Вы', points: 'очк.', empty: 'В этом периоде пока никто не набрал очков.', loading: 'Загрузка…', error: 'Не удалось загрузить рейтинг.' },
  ja: { title: 'ランキング', tabAll: '総合', tabWeekly: '週間', tabMonthly: '月間', you: 'あなた', points: 'pt', empty: 'この期間はまだ誰もポイントを獲得していません。', loading: '読み込み中…', error: 'ランキングを読み込めませんでした。' },
};

interface LeaderboardProps {
  /** Kaç satır gösterilecek (kendi satırın, top listenin dışındaysa buna ek olarak ayrıca gösterilir). */
  limit?: number;
  className?: string;
}

export function Leaderboard({ limit = 10, className }: LeaderboardProps) {
  const { locale } = useLocale();
  const labels = LB_LABELS[locale] ?? LB_LABELS.en;

  const [period, setPeriod] = useState<LeaderboardPeriod>('all');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    setLoading(true);
    setError(false);
    statsApi
      .getLeaderboard(period, limit)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, limit]);

  const tabs: { key: LeaderboardPeriod; label: string }[] = [
    { key: 'all', label: labels.tabAll },
    { key: 'weekly', label: labels.tabWeekly },
    { key: 'monthly', label: labels.tabMonthly },
  ];

  const meInTop = data?.me?.in_top ?? false;

  return (
    <div className={clsx('bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4', className)}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
        <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
        {labels.title}
      </h3>

      <div className="flex gap-1 mb-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setPeriod(t.key)}
            className={clsx(
              'flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors',
              period === t.key ? 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 shadow-sm' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 hover:dark:text-slate-400'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-xs text-gray-400 dark:text-slate-500 py-4 text-center">{labels.loading}</p>}
      {!loading && error && <p className="text-xs text-red-400 dark:text-red-300 py-4 text-center">{labels.error}</p>}
      {!loading && !error && data && data.top.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-slate-500 py-4 text-center">{labels.empty}</p>
      )}

      {!loading && !error && data && data.top.length > 0 && (
        <div className="space-y-1">
          {data.top.map((entry) => (
            <LeaderboardRow
              key={entry.user_id}
              entry={entry}
              isMe={entry.user_id === data.me.user_id}
              youLabel={labels.you}
              pointsLabel={labels.points}
            />
          ))}
          {!meInTop && (
            <>
              <div className="text-center text-gray-300 dark:text-slate-600 text-xs py-0.5">···</div>
              <LeaderboardRow entry={data.me} isMe youLabel={labels.you} pointsLabel={labels.points} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  isMe,
  youLabel,
  pointsLabel,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  youLabel: string;
  pointsLabel: string;
}) {
  const initial = (entry.username || '?').charAt(0).toUpperCase();

  // Madde 6, Faz 1 — satıra tıklayınca herkese açık profile git (istatistik +
  // çalışma programı + arkadaşlık/takip aksiyonları, bkz. u/[username]/page.tsx).
  // username her zaman dolu olmalı (handle_new_user trigger'ı kayıtta atıyor).
  return (
    <Link
      href={`/u/${entry.username}`}
      className={clsx(
        'flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors',
        isMe ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/30' : 'hover:bg-slate-50 hover:dark:bg-slate-800'
      )}
    >
      <span
        className={clsx(
          'w-5 flex items-center justify-center text-xs font-semibold shrink-0',
          entry.rank === 1
            ? 'text-amber-500 dark:text-amber-400'
            : entry.rank === 2
              ? 'text-slate-400'
              : entry.rank === 3
                ? 'text-orange-400'
                : 'text-gray-400 dark:text-slate-500'
        )}
      >
        {entry.rank <= 3 ? <Crown className="w-3.5 h-3.5" /> : entry.rank}
      </span>
      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-slate-400 shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
          {entry.username}
          {isMe && (
            <span className="ml-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 align-middle">
              ({youLabel})
            </span>
          )}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500">Lv. {entry.level}</p>
      </div>
      <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 shrink-0">
        {entry.xp.toLocaleString()} {pointsLabel}
      </span>
    </Link>
  );
}
