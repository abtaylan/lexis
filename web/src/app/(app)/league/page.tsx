'use client';

// app/(app)/league/page.tsx — V2 §6.3 Faz 3b/3e: Haftalık lig.
// Kullanıcının bu haftaki lig grubunu + CANLI (xp_events'ten hesaplanan,
// backend tarafından zaten xp'ye göre azalan sıralı döndürülen) liderlik
// tablosunu gösterir. Terfi/düşme haftalık kapanışta gerçekleşir (bkz.
// backend/league_weekly_rollover.py); bu sayfa sadece MEVCUT durumu okur.
// Backend: /api/v1/leagues/me + /api/v1/leagues/overview
//
// Faz 3 devamı (10 Eylül 2026 kullanıcı geri bildirimi):
// - "Lig sayfasına girince benim olduğum lig direk çıksın" → /me ve
//   /overview artık BAĞIMSIZ yükleniyor (ayrı loading state'leri) — benim
//   ligim, overview'in (genelde daha ağır) yanıtını beklemeden render
//   olur.
// - "Ligin üst kısmında tüm ligler yan yana olsun, ok tuşu ile
//   ilerleyerek diğer lig isimlerini göreyim" → dikey "Tüm Ligler"
//   listesinin yerini LeagueGroupStrip (yatay, ok butonlu) aldı.
// - "Benim lig sıralama kutusunun altında benim alt lig ve üst ligimin
//   ismi geçsin, tıklayarak o ligin içine girebileyim" → prev/next
//   kademe kutucukları eklendi (league/[id]/page.tsx ile aynı mantık).
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Trophy, RefreshCw, ChevronUp, ChevronDown, Users2 } from 'lucide-react';
import { leaguesApi } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { LEAGUE_L, TIER_NAMES, formatDateRange } from '@/lib/leagueLocale';
import { LeagueTable } from '@/components/league/LeagueTable';
import { LeagueGroupStrip } from '@/components/league/LeagueGroupStrip';
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
  const [meLoading, setMeLoading] = useState(true);
  const [meError, setMeError] = useState<string | null>(null);

  const [overview, setOverview] = useState<LeagueOverviewGroup[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const loadMe = useCallback(async () => {
    setMeLoading(true);
    setMeError(null);
    try {
      const res = await leaguesApi.getMyLeague();
      setStatus(res);
    } catch (err) {
      setMeError(errorDetail(err) || t.error);
    } finally {
      setMeLoading(false);
    }
  }, [t.error]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await leaguesApi.getOverview();
      setOverview(res.groups);
    } catch {
      // Overview ikincil bir bilgi -- basarisiz olursa sessizce bos birak,
      // asil "benim ligim" gorunumunu ETKILEMESIN.
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri cekme (fetch-on-effect) deseni; iki cagri KASITLI olarak birbirinden bagimsiz (Promise.all DEGIL) ki biri yavasken digeri beklemesin
    loadMe();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOverview();
  }, [loadMe, loadOverview]);

  const refresh = () => {
    loadMe();
    loadOverview();
  };

  const tierLabel = status ? (tierNames[status.tier_slug] ?? status.tier_slug) : '';

  const prevTierGroup = useMemo(
    () => (status ? overview.find((g) => g.tier_index === status.tier_index - 1) : undefined),
    [overview, status],
  );
  const nextTierGroup = useMemo(
    () => (status ? overview.find((g) => g.tier_index === status.tier_index + 1) : undefined),
    [overview, status],
  );

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
            {status && (
              <p className="text-sm text-gray-400 dark:text-slate-500">
                {tierLabel} · {status.group_name} · {formatDateRange(status.week_start, status.week_end, locale)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/league/custom')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 dark:text-purple-400 text-sm font-medium transition-colors"
          >
            <Users2 className="w-4 h-4" />
            {t.customLeaguesBtn}
          </button>
          <button
            type="button"
            onClick={refresh}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label={t.refreshBtn}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!overviewLoading && overview.length > 0 && (
        <LeagueGroupStrip
          groups={overview}
          tierNames={tierNames}
          currentLeagueId={status?.league_id}
          youLabel={t.youLabel}
          onSelect={(id) => router.push(`/league/${id}`)}
        />
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        {meLoading && <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">{t.loading}</p>}
        {!meLoading && meError && <p className="text-sm text-red-400 dark:text-red-300 py-8 text-center">{meError}</p>}
        {!meLoading && !meError && (!status || status.members.length === 0) && (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400 dark:text-slate-500">{t.empty}</p>
            <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">{t.emptySub}</p>
          </div>
        )}
        {!meLoading && !meError && status && status.members.length > 0 && (
          <LeagueTable
            members={status.members}
            rankLabel={t.rankLabel}
            userLabel={t.userLabel}
            xpLabel={t.xpLabel}
            youLabel={t.youLabel}
            gamesWonLabel={t.gamesWonLabel}
            duelsWonLabel={t.duelsWonLabel}
            flashcardsLabel={t.flashcardsLabel}
            weekStartIso={status.week_start}
            weekEndIso={status.week_end}
            locale={locale}
          />
        )}
      </div>

      {!meLoading && !meError && status && status.members.length > 6 && (
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

      {!meLoading && !meError && status && (prevTierGroup || nextTierGroup) && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!prevTierGroup}
            onClick={() => prevTierGroup && router.push(`/league/${prevTierGroup.league_id}`)}
            className="flex items-center gap-2 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left shadow-sm transition-colors enabled:hover:bg-gray-50 dark:enabled:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">{t.prevLeagueLabel}</div>
              <div className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                {prevTierGroup ? (tierNames[prevTierGroup.tier_slug] ?? prevTierGroup.tier_slug) : '—'}
              </div>
            </div>
          </button>
          <button
            type="button"
            disabled={!nextTierGroup}
            onClick={() => nextTierGroup && router.push(`/league/${nextTierGroup.league_id}`)}
            className="flex items-center justify-end gap-2 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-right shadow-sm transition-colors enabled:hover:bg-gray-50 dark:enabled:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">{t.nextLeagueLabel}</div>
              <div className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">
                {nextTierGroup ? (tierNames[nextTierGroup.tier_slug] ?? nextTierGroup.tier_slug) : '—'}
              </div>
            </div>
            <ChevronUp className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
}
