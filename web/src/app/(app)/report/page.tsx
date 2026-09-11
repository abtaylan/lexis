'use client';

// app/(app)/report/page.tsx — "Raporum" (Kullanıcı Raporu) sayfası.
// İstatistik & Raporlama V2 öncelik #3, madde A: dönemsel (bu hafta/ay) tüm
// ilerleme özetini bir önceki eşit uzunluktaki döneme kıyasla % değişimiyle
// gösterir (bkz. backend: report_service.py::get_user_report,
// GET /stats/report?period=week|month). Mevcut /stats sayfası (grafikler,
// kelime türü dağılımı) değişmeden kalıyor — bu ayrı, "bu dönem nasıl
// geçti" özetine odaklanan bir sayfa.
import { useCallback, useEffect, useState } from 'react';
import {
  Clock, Flame, BookOpen, Gamepad2, Target, Map, Award, Trophy, Sparkles,
  ArrowUp, ArrowDown, Minus, Globe,
} from 'lucide-react';
import { clsx } from 'clsx';
import { statsApi, type UserReport } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { REPORT_L } from '@/lib/reportLocale';
import { PageHeader } from '@/components/layout/PageHeader';

type Period = 'week' | 'month';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(
      'bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5',
      className
    )}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="text-gray-400 dark:text-slate-500">{icon}</div>
      <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200">{title}</h2>
    </div>
  );
}

// previous=0 & current>0 ise backend _pct_change 100.0 döner ama bu durumda
// "yeni" etiketi göstermek daha doğru (bkz. report_service.py::_pct_change
// docstring'i) — bu yüzden pct'nin yanında ham previous değeri de kontrol
// ediliyor.
function ChangeBadge({ pct, previous, newLabel }: { pct: number | null; previous: number; newLabel: string }) {
  if (previous === 0) {
    if (pct === null) return null; // current de 0 — henüz veri yok, sessiz kal
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
        <Sparkles className="w-3 h-3" />
        {newLabel}
      </span>
    );
  }
  if (pct === null) return null;
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-gray-400 dark:text-slate-500">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  }
  const up = pct > 0;
  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 text-[11px] font-medium',
      up ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
    )}>
      {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {up ? '+' : ''}{pct}%
    </span>
  );
}

function StatBlock({
  label, value, unit, pct, previous, newLabel,
}: {
  label: string; value: number | string; unit?: string; pct?: number | null; previous?: number; newLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className="text-xl font-bold text-gray-800 dark:text-slate-100">{value}</span>
        {unit && <span className="text-xs text-gray-400 dark:text-slate-500">{unit}</span>}
        {pct !== undefined && previous !== undefined && newLabel !== undefined && (
          <ChangeBadge pct={pct} previous={previous} newLabel={newLabel} />
        )}
      </div>
    </div>
  );
}

function topicLabel(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReportPage() {
  const { locale } = useLocale();
  const t = REPORT_L[locale] ?? REPORT_L.en;
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<UserReport | null>(null);
  const [error, setError] = useState(false);

  // league/page.tsx ile aynı desen (loadMe/loadOverview): veri çekme
  // mantığı bir useCallback içinde, effect sadece bunu çağırıyor (fetch-on-effect,
  // set-state-in-effect kuralı kasıtlı olarak devre dışı bırakıldı).
  const load = useCallback(() => {
    setData(null);
    setError(false);
    statsApi.getUserReport(period)
      .then(setData)
      .catch(() => setError(true));
  }, [period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/period degisince veri cekme (fetch-on-effect) deseni
    load();
  }, [load]);

  return (
    <div className="max-w-4xl">
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="flex items-center gap-2 mb-5">
        <button
          type="button"
          onClick={() => setPeriod('week')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            period === 'week'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
              : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
        >
          {t.weekTab}
        </button>
        <button
          type="button"
          onClick={() => setPeriod('month')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            period === 'month'
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
              : 'text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800'
          )}
        >
          {t.monthTab}
        </button>
      </div>

      {error ? (
        <Card className="text-center">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">{t.error}</p>
          <button
            type="button"
            onClick={load}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t.retryBtn}
          </button>
        </Card>
      ) : data === null ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">{t.loading}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <SectionTitle icon={<Clock className="w-4 h-4" />} title={t.sectionStudy} />
            <div className="grid grid-cols-2 gap-4">
              <StatBlock
                label={t.minutesLabel} value={data.study.minutes_current}
                pct={data.study.minutes_change_pct} previous={data.study.minutes_previous} newLabel={t.newLabel}
              />
              <StatBlock
                label={t.sessionsLabel} value={data.study.sessions_current}
                pct={data.study.sessions_change_pct} previous={data.study.sessions_previous} newLabel={t.newLabel}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Flame className="w-4 h-4" />} title={t.sectionStreak} />
            <div className="grid grid-cols-2 gap-4">
              <StatBlock label={t.currentStreakLabel} value={data.streak.current} unit={t.streakUnit} />
              <StatBlock label={t.longestStreakLabel} value={data.streak.longest} unit={t.streakUnit} />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<BookOpen className="w-4 h-4" />} title={t.sectionVocabulary} />
            <div className="grid grid-cols-2 gap-4">
              <StatBlock
                label={t.totalWordsLabel} value={data.vocabulary.total_words}
              />
              <StatBlock
                label={t.learnedWordsLabel}
                value={`${data.vocabulary.learned_words} (${data.vocabulary.learned_pct}%)`}
              />
              <StatBlock
                label={t.newWordsLabel} value={data.vocabulary.new_words_current}
                pct={data.vocabulary.new_words_change_pct} previous={data.vocabulary.new_words_previous} newLabel={t.newLabel}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Gamepad2 className="w-4 h-4" />} title={t.sectionGames} />
            <div className="grid grid-cols-2 gap-4">
              <StatBlock
                label={t.gameSessionsLabel} value={data.games.sessions_current}
                pct={data.games.sessions_change_pct} previous={data.games.sessions_previous} newLabel={t.newLabel}
              />
              <StatBlock label={t.avgScoreLabel} value={data.games.avg_score_current} />
            </div>
          </Card>

          <Card className="sm:col-span-2">
            <SectionTitle icon={<Target className="w-4 h-4" />} title={t.sectionExam} />
            <div className="mb-4">
              <StatBlock
                label={t.accuracyLabel}
                value={data.exam.accuracy_current !== null ? `${data.exam.accuracy_current}%` : '—'}
                pct={data.exam.accuracy_previous !== null && data.exam.accuracy_current !== null
                  ? data.exam.accuracy_current - data.exam.accuracy_previous : null}
                previous={data.exam.accuracy_previous ?? 0}
                newLabel={t.newLabel}
              />
            </div>
            {data.exam.weak_topics.length === 0 && data.exam.strong_topics.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.noTopicDataLabel}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    {t.weakTopicsLabel}
                  </h3>
                  <ul className="space-y-1.5">
                    {data.exam.weak_topics.map((topic) => (
                      <li key={topic.topic_tag} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-slate-300">{topicLabel(topic.topic_tag)}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {topic.accuracy}% · {topic.attempts} {t.attemptsUnit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    {t.strongTopicsLabel}
                  </h3>
                  <ul className="space-y-1.5">
                    {data.exam.strong_topics.map((topic) => (
                      <li key={topic.topic_tag} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-slate-300">{topicLabel(topic.topic_tag)}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {topic.accuracy}% · {topic.attempts} {t.attemptsUnit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <SectionTitle icon={<Map className="w-4 h-4" />} title={t.sectionQuests} />
            <div className="grid grid-cols-2 gap-4">
              <StatBlock
                label={t.questsCompletedLabel} value={data.quests.completed_current}
                pct={data.quests.completed_previous > 0
                  ? Math.round(((data.quests.completed_current - data.quests.completed_previous) / data.quests.completed_previous) * 100)
                  : null}
                previous={data.quests.completed_previous}
                newLabel={t.newLabel}
              />
              <StatBlock label={t.questsProgressLabel} value={`${data.quests.progress_pct}%`} />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Award className="w-4 h-4" />} title={t.sectionBadges} />
            <div className="grid grid-cols-2 gap-4">
              <StatBlock label={t.badgesTotalLabel} value={data.badges.total_earned} />
              <StatBlock label={t.badgesNewLabel} value={data.badges.earned_current} />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={<Trophy className="w-4 h-4" />} title={t.sectionLeague} />
            <div className="mb-3">
              <StatBlock label={t.currentTierLabel} value={data.league.current_tier ?? '—'} />
            </div>
            {data.league.history.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.noLeagueHistoryLabel}</p>
            ) : (
              <div>
                <h3 className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  {t.leagueHistoryLabel}
                </h3>
                <ul className="space-y-1.5">
                  {data.league.history.slice(0, 6).map((h, i) => (
                    <li key={`${h.week_start}-${i}`} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-slate-300">{h.tier_slug ?? '—'}</span>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {h.outcome === 'promoted' ? t.outcomePromoted
                          : h.outcome === 'demoted' ? t.outcomeDemoted
                          : t.outcomeStayed}
                        {h.final_rank != null ? ` · #${h.final_rank}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="sm:col-span-2">
            <SectionTitle icon={<Globe className="w-4 h-4" />} title={t.sectionPlatform} />
            {data.platform.cohort_size === 0 || data.platform.active_peers_current === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.noPlatformDataLabel}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatBlock
                    label={t.platformAvgMinutesLabel}
                    value={data.platform.avg_minutes_current ?? '—'}
                  />
                  <StatBlock
                    label={t.platformAvgNewWordsLabel}
                    value={data.platform.avg_new_words_current ?? '—'}
                  />
                  <StatBlock
                    label={t.platformAvgAccuracyLabel}
                    value={data.platform.avg_accuracy_current !== null ? `${data.platform.avg_accuracy_current}%` : '—'}
                  />
                  <StatBlock
                    label={t.platformXpPercentileLabel}
                    value={data.platform.xp_percentile !== null ? `%${data.platform.xp_percentile}` : '—'}
                    unit={data.platform.xp_percentile !== null ? t.percentileUnit : undefined}
                  />
                </div>
                {data.platform.same_country_cohort && (
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-3">{t.sameCountryNoteLabel}</p>
                )}
              </>
            )}
          </Card>

          <Card>
            <SectionTitle icon={<Sparkles className="w-4 h-4" />} title={t.sectionSubscription} />
            {data.subscription.is_premium ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{t.premiumActiveLabel}</span>
                {data.subscription.premium_until && (
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {t.premiumUntilTpl.replace('{date}', new Date(data.subscription.premium_until).toLocaleDateString(locale))}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-500 dark:text-slate-400">{t.freeLabel}</span>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
