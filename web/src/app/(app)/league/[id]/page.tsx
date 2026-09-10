'use client';

// app/(app)/league/[id]/page.tsx — Faz 3f (10 Eylül 2026 kullanıcı
// isteği: "lige tıklayınca o ligin içindeki user'ları sıralamayı puan
// durumunu falan göreyim"): app/(app)/league/page.tsx'teki "Tüm Ligler"
// listesinden tıklanan HERHANGİ bir aktif lig grubunun tam üye/sıralama
// tablosu — kullanıcının o gruba üye olması şart değil (salt-okunur
// gözat). Backend: GET /api/v1/leagues/{league_id}.

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Trophy, ArrowLeft, RefreshCw } from 'lucide-react';
import { leaguesApi } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { LEAGUE_L, TIER_NAMES, formatDateRange } from '@/lib/leagueLocale';
import { LeagueTable } from '@/components/league/LeagueTable';
import type { LeagueStatusResponse } from '@/types';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

export default function LeagueDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { locale } = useLocale();
  const t = LEAGUE_L[locale];
  const tierNames = TIER_NAMES[locale];

  const [status, setStatus] = useState<LeagueStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await leaguesApi.getDetail(params.id);
      setStatus(res);
    } catch (err) {
      setError(errorDetail(err) || t.detailError);
    } finally {
      setLoading(false);
    }
  }, [params.id, t.detailError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    load();
  }, [load]);

  const tierLabel = status ? (tierNames[status.tier_slug] ?? status.tier_slug) : '';

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/league')}
            className="p-2 -ml-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label={t.backBtn}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{status ? tierLabel : t.title}</h1>
            {status && (
              <p className="text-sm text-gray-400 dark:text-slate-500">
                {formatDateRange(status.week_start, status.week_end, locale)}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label={t.refreshBtn}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        {loading && <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">{t.loading}</p>}
        {!loading && error && <p className="text-sm text-red-400 dark:text-red-300 py-8 text-center">{error}</p>}
        {!loading && !error && status && status.members.length > 0 && (
          <LeagueTable members={status.members} rankLabel={t.rankLabel} userLabel={t.userLabel} xpLabel={t.xpLabel} youLabel={t.youLabel} />
        )}
      </div>

      {!loading && !error && status && status.members.length > 6 && (
        <div className="flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {t.promoteHint}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {t.demoteHint}
          </span>
        </div>
      )}
    </div>
  );
}
