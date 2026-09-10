'use client';

// app/(app)/league/page.tsx — V2 §6.3 Faz 3b/3e: Haftalık lig.
// Kullanıcının bu haftaki lig grubunu + CANLI (xp_events'ten hesaplanan,
// backend tarafından zaten xp'ye göre azalan sıralı döndürülen) liderlik
// tablosunu gösterir. Terfi/düşme haftalık kapanışta scheduled task
// tarafından işlenir (bkz. backend/app/api/routes/leagues.py docstring'i);
// bu sayfa sadece MEVCUT durumu okur, promote/demote mantığı burada YOK.
// Backend: /api/v1/leagues/me (bkz. backend/app/api/routes/leagues.py)

import { useEffect, useState, useCallback } from 'react';
import { AxiosError } from 'axios';
import { Trophy, RefreshCw, User as UserIcon } from 'lucide-react';
import { leaguesApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { LeagueStatusResponse } from '@/types';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

// migration 041_leagues_schema.sql'deki 6 sabit kademeyle birebir eşleşir
// (slug -> tier_index: bronze=0 ... master=5). Yeni bir kademe eklenirse
// HEM o migration'a HEM buraya eklenmeli.
const TIER_NAMES: Record<Locale, Record<string, string>> = {
  tr: { bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', platinum: 'Platin', diamond: 'Elmas', master: 'Usta' },
  en: { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum', diamond: 'Diamond', master: 'Master' },
  de: { bronze: 'Bronze', silver: 'Silber', gold: 'Gold', platinum: 'Platin', diamond: 'Diamant', master: 'Meister' },
  fr: { bronze: 'Bronze', silver: 'Argent', gold: 'Or', platinum: 'Platine', diamond: 'Diamant', master: 'Maître' },
  es: { bronze: 'Bronce', silver: 'Plata', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante', master: 'Maestro' },
  it: { bronze: 'Bronzo', silver: 'Argento', gold: 'Oro', platinum: 'Platino', diamond: 'Diamante', master: 'Maestro' },
  ar: { bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي', platinum: 'بلاتيني', diamond: 'ماسي', master: 'أستاذ' },
  ru: { bronze: 'Бронза', silver: 'Серебро', gold: 'Золото', platinum: 'Платина', diamond: 'Алмаз', master: 'Мастер' },
  ja: { bronze: 'ブロンズ', silver: 'シルバー', gold: 'ゴールド', platinum: 'プラチナ', diamond: 'ダイヤモンド', master: 'マスター' },
  pt: { bronze: 'Bronze', silver: 'Prata', gold: 'Ouro', platinum: 'Platina', diamond: 'Diamante', master: 'Mestre' },
};

const L: Record<Locale, Record<string, string>> = {
  tr: {
    title: 'Lig', subtitleWeek: 'hafta',
    loading: 'Yükleniyor…', error: 'Bir şeyler ters gitti.', refreshBtn: 'Yenile',
    youLabel: 'sen', xpLabel: 'XP', rankLabel: 'Sıra',
    empty: 'Henüz bir lig grubuna atanmadın.', emptySub: 'XP kazanmaya başladığında otomatik olarak eklenirsin.',
    promoteHint: 'İlk 3 → terfi', demoteHint: 'Son 3 → düşüş',
  },
  en: {
    title: 'League', subtitleWeek: 'week',
    loading: 'Loading…', error: 'Something went wrong.', refreshBtn: 'Refresh',
    youLabel: 'you', xpLabel: 'XP', rankLabel: 'Rank',
    empty: "You haven't been placed in a league group yet.", emptySub: "You'll be added automatically once you start earning XP.",
    promoteHint: 'Top 3 → promote', demoteHint: 'Bottom 3 → demote',
  },
  de: {
    title: 'Liga', subtitleWeek: 'Woche',
    loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.', refreshBtn: 'Aktualisieren',
    youLabel: 'du', xpLabel: 'XP', rankLabel: 'Rang',
    empty: 'Du wurdest noch keiner Ligagruppe zugewiesen.', emptySub: 'Du wirst automatisch hinzugefügt, sobald du XP sammelst.',
    promoteHint: 'Top 3 → Aufstieg', demoteHint: 'Letzte 3 → Abstieg',
  },
  fr: {
    title: 'Ligue', subtitleWeek: 'semaine',
    loading: 'Chargement…', error: "Une erreur s'est produite.", refreshBtn: 'Actualiser',
    youLabel: 'toi', xpLabel: 'XP', rankLabel: 'Rang',
    empty: "Tu n'as pas encore été placé dans un groupe de ligue.", emptySub: 'Tu seras ajouté automatiquement dès que tu gagneras des XP.',
    promoteHint: 'Top 3 → promotion', demoteHint: 'Derniers 3 → relégation',
  },
  es: {
    title: 'Liga', subtitleWeek: 'semana',
    loading: 'Cargando…', error: 'Algo salió mal.', refreshBtn: 'Actualizar',
    youLabel: 'tú', xpLabel: 'XP', rankLabel: 'Puesto',
    empty: 'Todavía no te han asignado a un grupo de liga.', emptySub: 'Se te añadirá automáticamente en cuanto empieces a ganar XP.',
    promoteHint: 'Top 3 → ascenso', demoteHint: 'Últimos 3 → descenso',
  },
  it: {
    title: 'Lega', subtitleWeek: 'settimana',
    loading: 'Caricamento…', error: 'Qualcosa è andato storto.', refreshBtn: 'Aggiorna',
    youLabel: 'tu', xpLabel: 'XP', rankLabel: 'Posizione',
    empty: 'Non sei ancora stato assegnato a un gruppo di lega.', emptySub: 'Sarai aggiunto automaticamente non appena inizierai a guadagnare XP.',
    promoteHint: 'Top 3 → promozione', demoteHint: 'Ultimi 3 → retrocessione',
  },
  ar: {
    title: 'الدوري', subtitleWeek: 'أسبوع',
    loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.', refreshBtn: 'تحديث',
    youLabel: 'أنت', xpLabel: 'XP', rankLabel: 'الترتيب',
    empty: 'لم يتم تعيينك بعد إلى مجموعة دوري.', emptySub: 'سيتم إضافتك تلقائياً بمجرد أن تبدأ بكسب نقاط الخبرة.',
    promoteHint: 'أفضل 3 → ترقية', demoteHint: 'آخر 3 → هبوط',
  },
  ru: {
    title: 'Лига', subtitleWeek: 'неделя',
    loading: 'Загрузка…', error: 'Что-то пошло не так.', refreshBtn: 'Обновить',
    youLabel: 'ты', xpLabel: 'XP', rankLabel: 'Место',
    empty: 'Ты ещё не попал в группу лиги.', emptySub: 'Ты будешь добавлен автоматически, как только начнёшь получать XP.',
    promoteHint: 'Топ-3 → повышение', demoteHint: 'Последние 3 → понижение',
  },
  ja: {
    title: 'リーグ', subtitleWeek: '週',
    loading: '読み込み中…', error: '問題が発生しました。', refreshBtn: '更新',
    youLabel: 'あなた', xpLabel: 'XP', rankLabel: '順位',
    empty: 'まだリーググループに配属されていません。', emptySub: 'XPを獲得し始めると自動的に追加されます。',
    promoteHint: '上位3人 → 昇格', demoteHint: '下位3人 → 降格',
  },
  pt: {
    title: 'Liga', subtitleWeek: 'semana',
    loading: 'Carregando…', error: 'Algo deu errado.', refreshBtn: 'Atualizar',
    youLabel: 'você', xpLabel: 'XP', rankLabel: 'Posição',
    empty: 'Você ainda não foi colocado em um grupo de liga.', emptySub: 'Você será adicionado automaticamente assim que começar a ganhar XP.',
    promoteHint: 'Top 3 → promoção', demoteHint: 'Últimos 3 → rebaixamento',
  },
};

function formatDateRange(startIso: string, endIso: string, locale: Locale): string {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  } catch {
    return '';
  }
}

export default function LeaguePage() {
  const { locale } = useLocale();
  const t = L[locale];
  const tierNames = TIER_NAMES[locale];

  const [status, setStatus] = useState<LeagueStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await leaguesApi.getMyLeague();
      setStatus(res);
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
  const rankOf = (index: number) => index + 1;
  const memberCount = status?.members.length ?? 0;
  const promoteCutoff = Math.max(1, Math.ceil(memberCount / 3));
  const demoteCutoff = Math.max(1, Math.ceil(memberCount / 3));

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
          <div className="space-y-1">
            {status.members.map((m, idx) => {
              const rank = rankOf(idx);
              const isPromoteZone = rank <= promoteCutoff && memberCount > 3;
              const isDemoteZone = rank > memberCount - demoteCutoff && memberCount > 3;
              return (
                <div
                  key={m.user_id}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg ${
                    m.is_me
                      ? 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-200 dark:ring-blue-500/30'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 text-center text-xs font-semibold shrink-0 ${
                        isPromoteZone
                          ? 'text-green-600 dark:text-green-400'
                          : isDemoteZone
                            ? 'text-red-500 dark:text-red-400'
                            : 'text-gray-400 dark:text-slate-500'
                      }`}
                    >
                      {rank}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {m.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- dış kaynaklı avatar URL'i (kullanıcı yükledi), next/image domain whitelist gerektirir; diğer sayfalarda da aynı desen kullanılmıyor, basit <img> yeterli
                        <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                      {m.username || '—'}
                      {m.is_me && <span className="ml-1.5 text-xs font-normal text-blue-600 dark:text-blue-400">({t.youLabel})</span>}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 shrink-0">
                    {m.xp} <span className="text-xs font-normal text-gray-400 dark:text-slate-500">{t.xpLabel}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !error && status && status.members.length > 3 && (
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
