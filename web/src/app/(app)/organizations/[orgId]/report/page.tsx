'use client';

// app/(app)/organizations/[orgId]/report/page.tsx — Kurum Raporu.
// İstatistik & Raporlama V2 öncelik #3, madde B: bir kurumun (organizations/
// organization_members, bkz. backend routes/organizations.py) TÜM üyeleri
// genelinde dönemsel (bu hafta/ay) bir özet — çalışma süresi, doğruluk, en
// aktif üyeler, kurum genelinde zayıf konular, kazanılan rozetler.
//
// KAPSAM NOTU: organizations.py backend'i var ama kurum OLUŞTURMA/üye DAVET/
// listeleme için HİÇ web ekranı yok (V2 öncelik #4 "B2B Kurumsal Lig
// arayüzü" — bilinçli olarak ayrı ve henüz başlanmadı). Bu yüzden bu sayfa
// Sidebar'a EKLENMEDİ — şu an sadece org_id'yi bilen bir kurum
// yöneticisinin doğrudan URL ile erişebileceği işlevsel bir rapor. Öncelik
// #4 (kurum listesi/switcher) eklendiğinde buraya bir link konacak.
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Clock, Target, BookOpen, Users, Award, TrendingUp,
  ArrowUp, ArrowDown, Minus, Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';
import { organizationsApi, type OrganizationReport } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { ORG_REPORT_L } from '@/lib/orgReportLocale';
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

function ChangeBadge({ pct, previous, newLabel }: { pct: number | null; previous: number; newLabel: string }) {
  if (previous === 0) {
    if (pct === null) return null;
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

export default function OrganizationReportPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const { locale } = useLocale();
  const t = ORG_REPORT_L[locale] ?? ORG_REPORT_L.en;
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<OrganizationReport | null>(null);
  const [error, setError] = useState<'forbidden' | 'generic' | null>(null);

  const load = useCallback(() => {
    setData(null);
    setError(null);
    organizationsApi.getReport(orgId, period)
      .then(setData)
      .catch((e) => setError(e?.response?.status === 403 ? 'forbidden' : 'generic'));
  }, [orgId, period]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/period degisince veri cekme (fetch-on-effect) deseni, bkz. report/page.tsx ve league/page.tsx
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
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
            {error === 'forbidden' ? t.forbiddenError : t.error}
          </p>
          {error === 'generic' && (
            <button
              type="button"
              onClick={load}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t.retryBtn}
            </button>
          )}
        </Card>
      ) : data === null ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">{t.loading}</p>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-slate-100">{data.org.name}</h2>
                {data.org.plan && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mt-0.5">{data.org.plan}</p>
                )}
              </div>
              <div className="flex items-center gap-6">
                <StatBlock label={t.memberCountLabel} value={data.member_count} />
                <StatBlock label={t.activeMemberCountLabel} value={data.active_member_count} />
              </div>
            </div>
          </Card>

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
              <SectionTitle icon={<Target className="w-4 h-4" />} title={t.sectionAccuracy} />
              <StatBlock
                label={t.accuracyLabel}
                value={data.accuracy.current !== null ? `${data.accuracy.current}%` : '—'}
              />
            </Card>

            <Card>
              <SectionTitle icon={<BookOpen className="w-4 h-4" />} title={t.sectionVocabulary} />
              <StatBlock
                label={t.newWordsLabel} value={data.vocabulary.new_words_current}
                pct={data.vocabulary.new_words_change_pct} previous={data.vocabulary.new_words_previous} newLabel={t.newLabel}
              />
            </Card>

            <Card>
              <SectionTitle icon={<Award className="w-4 h-4" />} title={t.sectionBadges} />
              <StatBlock label={t.badgesEarnedLabel} value={data.badges_earned_current} />
            </Card>
          </div>

          <Card>
            <SectionTitle icon={<TrendingUp className="w-4 h-4" />} title={t.sectionTopLearners} />
            {data.top_learners.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.noTopLearnersLabel}</p>
            ) : (
              <ul className="space-y-1.5">
                {data.top_learners.map((l, i) => (
                  <li key={l.user_id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-slate-300">
                      {i + 1}. {l.username ?? l.user_id.slice(0, 8)}
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                      {l.xp_gained} {t.xpUnit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle icon={<Users className="w-4 h-4" />} title={t.sectionWeakTopics} />
            {data.weak_topics.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.noWeakTopicsLabel}</p>
            ) : (
              <ul className="space-y-1.5">
                {data.weak_topics.map((topic) => (
                  <li key={topic.topic_tag} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-slate-300">{topicLabel(topic.topic_tag)}</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {topic.accuracy}% · {topic.attempts} {t.attemptsUnit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
