'use client';

// app/(app)/league/page.tsx — V2 §6.3 Faz 3b/3e: Haftalık lig.
// Kullanıcının bu haftaki lig grubunu + CANLI (xp_events'ten hesaplanan,
// backend tarafından zaten xp'ye göre azalan sıralı döndürülen) liderlik
// tablosunu gösterir. Terfi/düşme haftalık kapanışta scheduled task
// tarafından işlenir (bkz. backend/app/api/routes/leagues.py docstring'i);
// bu sayfa sadece MEVCUT durumu okur, promote/demote mantığı burada YOK.
// Backend: /api/v1/leagues/me + /api/v1/leagues/overview
//
// Faz 3f (10 Eylül 2026 kullanıcı isteği): "Lig tablosu daha güzel
// efektif gözükmeli" → sıralama tablosu gerçek bir spor ligi tablosu
// gibi yeniden tasarlandı (bkz. LeagueTable bileşeni). "Lig sayfasına
// girince tüm ligleri listele, lige tıklayınca o ligin içindeki
// user'ları sıralamayı puan durumunu falan göreyim" → "Diğer Ligler"
// önizleme kartları yerine tıklanabilir "Tüm Ligler" listesi (detay:
// app/(app)/league/[id]/page.tsx).

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Trophy, RefreshCw, ChevronRight, Users } from 'lucide-react';
import { leaguesApi } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { LEAGUE_L, TIER_NAMES, formatDateRange } from '@/lib/leagueLocale';
import { LeagueTable } from '@/components/league/LeagueTable';
import type { LeagueStatusResponse, LeagueOverviewGroup } from '@/types';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

export default function LeaguePage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = LEAGUE_L[locale];
  const tierNames = TIER_NAMES[locale];

  const [status, setStatus] = useState<LeagueStatusResponse | null>(null);
  const [overview, setOverview] = useState<LeagueOverviewGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, overviewRes] = await Promise.all([leaguesApi.getMyLeague(), leaguesApi.getOverview()]);
      setStatus(res);
      setOverview(overviewRes.groups);
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    load();
  }, [load]);

  const tierLabel = status ? (tierNames[status.tier_slug] ?? status.tier_slug) : '';

  // Ayni kademede (tier) birden fazla grup acilabildigi icin (bkz.
  // ensure_active_league_membership, kapasite dolunca yeni grup) her
  // satirda "Bronz · Grup 2" gibi ayirt edici bir numara gosterelim --
  // overview zaten backend'de tier_index sonra created_at'e gore sirali.
  const tierSeen: Record<string, number> = {};
  const overviewWithGroupIndex = overview.map((g) => {
    tierSeen[g.tier_slug] = (tierSeen[g.tier_slug] ?? 0) + 1;
    return { ...g, groupIndex: tierSeen[g.tier_slug] };
  });

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
            {status && (
              <p className="text-sm text-gray-400 dark:text-slate-500">
                {tierLabel} · {formatDateRange(status.week_start, status.week_end, locale)}
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
        {!loading && !error && (!status || status.members.length === 0) && (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400 dark:text-slate-500">{t.empty}</p>
            <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">{t.emptySub}</p>
          </div>
        )}
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

      {!loading && !error && overviewWithGroupIndex.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400">{t.allLeaguesTitle}</h2>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm divide-y divide-gray-100 dark:divide-slate-800">
            {overviewWithGroupIndex.map((g) => (
              <button
                key={g.league_id}
                type="button"
                onClick={() => router.push(`/league/${g.league_id}`)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                      {tierNames[g.tier_slug] ?? g.tier_slug}
                      {tierSeen[g.tier_slug] > 1 && (
                        <span className="text-xs font-normal text-gray-400 dark:text-slate-500">
                          · {t.groupLabel} {g.groupIndex}
                        </span>
                      )}
                      {g.is_mine && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                          {t.yourGroupBadge}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" />
                      {g.member_count} {t.membersSuffix}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
