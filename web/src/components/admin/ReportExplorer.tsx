'use client';

// Admin panel — İstatistikler sayfası görünüm seçici + Raporlar sayfası
// entegrasyonu (kullanıcı isteği, 18 Eylül 2026 — "İstatistik & Analitik
// Kataloğu" doc, Ek kapsam madde 1-2). Kullanıcı ARA + SEÇ, seçilen
// kullanıcı/kurum için mevcut UserReport/OrganizationReport (haftalık/
// aylık) görüntülenir — aynı veri kaynağı kullanıcının kendi "Raporum"
// sayfasıyla paylaşılıyor (backend: admin_platform.py::admin_user_report /
// admin_organization_report). Admin panel iç kullanım olduğu için (10
// dilli web raporlarının aksine) bilinçli olarak sadece Türkçe.

import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, User as UserIcon, Building2 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { adminApi } from '@/lib/api';
import type {
  UserReport, OrganizationReport, AdminOrganizationItem, UserGrowthReport, UserGrowthReportDailyPoint,
} from '@/lib/api';
import type { AdminUser } from '@/types';
import { useThemeMode } from '@/store/theme';

function PeriodToggle({ period, onChange }: { period: 'week' | 'month'; onChange: (p: 'week' | 'month') => void }) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden text-sm">
      {(['week', 'month'] as const).map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 font-medium transition-colors ${
            period === p
              ? 'bg-[#534AB7] text-white'
              : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:bg-gray-50 hover:dark:bg-slate-800'
          }`}
        >
          {p === 'week' ? 'Haftalık' : 'Aylık'}
        </button>
      ))}
    </div>
  );
}

// Recharts inline stil kabul ediyor, Tailwind `dark:` class'ı değil — admin
// panelin sistem-geneli sayfasındaki (app/(admin)/admin/stats/page.tsx)
// chartTheme deseniyle birebir aynı renkler burada da kullanılıyor (grafik
// ekleme, kullanıcı isteği 18 Eylül 2026 — "bu tablo daha da genişlemeli
// ... grafik vs falan da ekle").
type ChartTheme = {
  grid: string; axis: string; axisAlt: string; tooltipBg: string; tooltipBorder: string; tooltipText: string;
};

function useChartTheme(): ChartTheme {
  const { scheme } = useThemeMode();
  return scheme === 'dark'
    ? { grid: '#334155', axis: '#64748b', axisAlt: '#94a3b8', tooltipBg: '#0f172a', tooltipBorder: '#334155', tooltipText: '#e2e8f0' }
    : { grid: '#f1f5f9', axis: '#94a3b8', axisAlt: '#475569', tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0', tooltipText: '#1e293b' };
}

function tooltipStyle(t: ChartTheme) {
  return {
    contentStyle: { fontSize: 12, borderRadius: 12, border: `1px solid ${t.tooltipBorder}`, backgroundColor: t.tooltipBg, color: t.tooltipText },
    labelStyle: { color: t.tooltipText },
  };
}

function topicLabel(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Konu doğruluğu için sabit, hiç temalanmayan durum renkleri (dataviz skill'i
// — "status palette (fixed, never themed)"): kategorik bir seri değil, her
// çubuk KENDİ eşik değerine göre boyanıyor, bu yüzden çubuklar arası CVD
// ayrımı gerekmiyor — yine de her çubuk hem etiketli (konu adı + %) hem de
// altta bir renk lejandıyla destekleniyor (renk asla tek başına anlam
// taşımıyor).
const ACCURACY_COLORS = { weak: '#d03b3b', mid: '#fab219', strong: '#0ca30c' } as const;

function accuracyColor(value: number): string {
  if (value < 50) return ACCURACY_COLORS.weak;
  if (value < 75) return ACCURACY_COLORS.mid;
  return ACCURACY_COLORS.strong;
}

type TopicAccuracyItem = { topic_tag: string; attempts: number; accuracy: number };

function TopicAccuracyChart({
  weak, strong, chartTheme,
}: {
  weak: TopicAccuracyItem[]; strong: TopicAccuracyItem[]; chartTheme: ChartTheme;
}) {
  const merged = useMemo(() => {
    const byTag = new Map<string, TopicAccuracyItem>();
    [...weak, ...strong].forEach((t) => byTag.set(t.topic_tag, t));
    return Array.from(byTag.values()).sort((a, b) => a.accuracy - b.accuracy);
  }, [weak, strong]);

  if (!merged.length) {
    return <p className="text-xs text-gray-400 dark:text-slate-500">Henüz yeterli konu verisi yok.</p>;
  }

  return (
    <div>
      <div style={{ height: Math.max(merged.length * 32, 80) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={merged} layout="vertical" margin={{ left: 10, right: 28, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `%${v}`} tick={{ fontSize: 10, fill: chartTheme.axis }} />
            <YAxis type="category" dataKey="topic_tag" tickFormatter={topicLabel} tick={{ fontSize: 11, fill: chartTheme.axisAlt }} width={110} />
            <Tooltip
              {...tooltipStyle(chartTheme)}
              labelFormatter={(v) => topicLabel(String(v))}
              formatter={(value, _name, item) => [`%${value} (${item.payload.attempts} deneme)`, 'Doğruluk']}
            />
            <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} name="Doğruluk">
              {merged.map((t) => <Cell key={t.topic_tag} fill={accuracyColor(t.accuracy)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-400 dark:text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: ACCURACY_COLORS.weak }} />Zayıf (&lt;%50)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: ACCURACY_COLORS.mid }} />Orta (%50-74)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: ACCURACY_COLORS.strong }} />Güçlü (%75+)</span>
      </div>
    </div>
  );
}

// "Sen" / "Platform ortalaması" karşılaştırması — admin/stats sayfasındaki
// mevcut düz div tabanlı ilerleme çubuğu deseniyle aynı (recharts değil):
// "Sen" dolu mor, "Ortalama" nötr gri — iki farklı renk tonu KIYASLANMIYOR
// (CVD'ye duyarlı bir kategorik çift değil), her satır zaten kendi metin
// etiketini taşıyor.
function ComparisonMeter({
  label, you, avg, formatValue,
}: {
  label: string; you: number; avg: number | null; formatValue?: (n: number) => string;
}) {
  const fmt = formatValue ?? ((n: number) => `${n}`);
  const max = Math.max(you, avg ?? 0, 1);
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 dark:text-slate-300 mb-1.5">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-gray-400 dark:text-slate-500 shrink-0">Sen</span>
          <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-2.5 rounded-full bg-[#534AB7] transition-all duration-700" style={{ width: `${(you / max) * 100}%` }} />
          </div>
          <span className="w-14 text-right text-[11px] font-medium text-gray-700 dark:text-slate-300 shrink-0">{fmt(you)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-[11px] text-gray-400 dark:text-slate-500 shrink-0">Ortalama</span>
          <div className="flex-1 h-2.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
            {avg !== null && <div className="h-2.5 rounded-full bg-gray-300 dark:bg-slate-600 transition-all duration-700" style={{ width: `${(avg / max) * 100}%` }} />}
          </div>
          <span className="w-14 text-right text-[11px] text-gray-400 dark:text-slate-500 shrink-0">{avg !== null ? fmt(avg) : '—'}</span>
        </div>
      </div>
    </div>
  );
}

// Kelime hazinesi ilerleme çubuğu — admin/stats sayfasındaki "Aktiflik
// oranı" çubuğuyla BİREBİR aynı renk/desen (#3B6D11 yeşil, gri track).
function VocabularyBar({ total, learned, pct: learnedPct }: { total: number; learned: number; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1.5">
        <span>{learned} / {total} kelime öğrenildi</span>
        <span className="font-semibold text-[#3B6D11]">%{learnedPct}</span>
      </div>
      <div className="h-2.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-2.5 rounded-full bg-[#3B6D11] transition-all duration-700" style={{ width: `${Math.min(learnedPct, 100)}%` }} />
      </div>
    </div>
  );
}

// Tarih aralığı gelişim raporunda (GrowthReportCards) günlük/haftalık trend
// grafikleri — backend'in zaten çekilmiş session/kelime satırlarından
// türettiği sıfır-doldurmalı seri (bkz. user_report_service.py::
// get_user_growth_report). Tek seri olduğu için (dataviz skill'i: "a single
// series needs no legend box") her mini grafiğin kendi başlığı seriyi
// adlandırıyor, ayrı bir lejant yok. İki metrik farklı ölçekte olduğu için
// (dakika vs kelime sayısı) ÇİFT EKSENLİ TEK grafik yerine iki AYRI grafik
// kullanılıyor (dataviz skill'i: "never a dual-axis chart").
function DailyTrendCharts({ daily, chartTheme }: { daily: UserGrowthReportDailyPoint[]; chartTheme: ChartTheme }) {
  const hasData = daily.some((d) => d.study_minutes > 0 || d.new_words > 0);
  if (!daily.length || !hasData) {
    return <p className="text-xs text-gray-400 dark:text-slate-500">Bu aralıkta henüz grafiğe yetecek veri yok.</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-2">Çalışma süresi (dakika)</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.axis }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: chartTheme.axis }} allowDecimals={false} width={28} />
              <Tooltip {...tooltipStyle(chartTheme)} />
              <Line type="monotone" dataKey="study_minutes" stroke="#534AB7" strokeWidth={2} dot={false} name="Dakika" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-2">Yeni kelime</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.axis }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: chartTheme.axis }} allowDecimals={false} width={28} />
              <Tooltip {...tooltipStyle(chartTheme)} />
              <Line type="monotone" dataKey="new_words" stroke="#0F6E56" strokeWidth={2} dot={false} name="Yeni kelime" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function pct(n: number | null): string {
  return n === null ? '—' : `${n >= 0 ? '+' : ''}${n}%`;
}

export function UserReportCards({ report, chartTheme }: { report: UserReport; chartTheme: ChartTheme }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Çalışma süresi" value={`${report.study.minutes_current} dk`} sub={pct(report.study.minutes_change_pct)} />
        <StatCard label="Kelime hazinesi" value={report.vocabulary.total_words} sub={`%${report.vocabulary.learned_pct} öğrenildi`} />
        <StatCard label="Seri" value={`${report.streak.current} gün`} sub={`en uzun: ${report.streak.longest}`} />
        <StatCard
          label="Sınav/konu doğruluğu"
          value={report.exam.accuracy_current !== null ? `%${report.exam.accuracy_current}` : '—'}
          sub={report.exam.accuracy_previous !== null ? `önceki: %${report.exam.accuracy_previous}` : undefined}
        />
        <StatCard label="Oyun ort. skor" value={report.games.avg_score_current} sub={`${report.games.sessions_current} oturum`} />
        <StatCard label="Görev ilerlemesi" value={`%${report.quests.progress_pct}`} sub={`${report.quests.completed_total} tamamlandı`} />
        <StatCard label="Rozetler" value={report.badges.total_earned} sub={`bu dönem: +${report.badges.earned_current}`} />
        <StatCard label="Lig" value={report.league.current_tier || '—'} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Kelime hazinesi ilerlemesi</p>
        <VocabularyBar total={report.vocabulary.total_words} learned={report.vocabulary.learned_words} pct={report.vocabulary.learned_pct} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-0.5">Konu doğruluğu</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-2">
          Sınav ve konu pratiğinde yeterli denemesi olan konular, doğruluk oranına göre sıralı.
        </p>
        <TopicAccuracyChart weak={report.exam.weak_topics} strong={report.exam.strong_topics} chartTheme={chartTheme} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-0.5">Platform karşılaştırması</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-3">
          {report.platform.xp_percentile !== null
            ? `Platformdaki kullanıcıların %${report.platform.xp_percentile}'inden daha fazla XP kazanmış (kıyaslanan aktif kohort: ${report.platform.cohort_size} kullanıcı).`
            : 'Yüzdelik dilim için yeterli platform verisi yok.'}
        </p>
        {report.platform.cohort_size === 0 || report.platform.active_peers_current === 0 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500">Henüz karşılaştırılacak yeterli platform verisi yok.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <ComparisonMeter label="Çalışma süresi (dk)" you={report.study.minutes_current} avg={report.platform.avg_minutes_current} />
            <ComparisonMeter label="Yeni kelime" you={report.vocabulary.new_words_current} avg={report.platform.avg_new_words_current} />
            <ComparisonMeter
              label="Doğruluk" you={report.exam.accuracy_current ?? 0} avg={report.platform.avg_accuracy_current}
              formatValue={(n) => `%${n}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function OrgReportCards({ report, chartTheme }: { report: OrganizationReport; chartTheme: ChartTheme }) {
  const learnerData = useMemo(
    () => report.top_learners.map((m) => ({ name: m.username || 'İsimsiz üye', xp: m.xp_gained })),
    [report.top_learners]
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Üye sayısı" value={report.member_count} sub={`aktif: ${report.active_member_count}`} />
        <StatCard label="Çalışma süresi" value={`${report.study.minutes_current} dk`} sub={pct(report.study.minutes_change_pct)} />
        <StatCard label="Konu doğruluğu" value={report.accuracy.current !== null ? `%${report.accuracy.current}` : '—'} />
        <StatCard label="Yeni kelime" value={report.vocabulary.new_words_current} sub={pct(report.vocabulary.new_words_change_pct)} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-0.5">En aktif üyeler</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-2">Bu dönemde en çok XP kazanan üyeler.</p>
        {learnerData.length ? (
          <div style={{ height: Math.max(learnerData.length * 32, 80) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={learnerData} layout="vertical" margin={{ left: 10, right: 28, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: chartTheme.axis }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: chartTheme.axisAlt }} width={110} />
                <Tooltip {...tooltipStyle(chartTheme)} formatter={(value) => [`${value} XP`, 'Kazanılan']} />
                <Bar dataKey="xp" fill="#534AB7" radius={[0, 6, 6, 0]} name="XP" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-gray-400 dark:text-slate-500">Veri yok.</p>}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-0.5">Kurum geneli zayıf konular</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-2">Üyelerin ortalamada en çok zorlandığı konular.</p>
        <TopicAccuracyChart weak={report.weak_topics} strong={[]} chartTheme={chartTheme} />
      </div>

      <p className="text-xs text-gray-400 dark:text-slate-500">
        Rapor paylaşımına onay veren üye: {report.consent_summary.consented_count} / {report.consent_summary.total_count}
      </p>
    </div>
  );
}

export function GrowthReportCards({ report, chartTheme }: { report: UserGrowthReport; chartTheme: ChartTheme }) {
  const start = report.range.start.slice(0, 10);
  const end = report.range.end.slice(0, 10);
  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-400 dark:text-slate-500">{start} → {end}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Çalışma süresi" value={`${report.study_minutes} dk`} />
        <StatCard label="Kelime hazinesi" value={report.vocabulary.total_words} sub={`%${report.vocabulary.learned_pct} öğrenildi, +${report.vocabulary.new_words_in_range} yeni`} />
        <StatCard label="Güncel seri" value={`${report.streak_current} gün`} />
        <StatCard label="Sınav/konu doğruluğu" value={report.exam.accuracy !== null ? `%${report.exam.accuracy}` : '—'} />
        <StatCard label="Oyun ort. skor" value={report.games.avg_score} sub={`${report.games.sessions} oturum`} />
        <StatCard label="Tamamlanan görev" value={report.quests_completed_in_range} />
        <StatCard label="Kazanılan rozet" value={report.badges_earned_in_range} />
        <StatCard label="Toplam XP" value={report.total_xp} sub={report.league_current_tier || undefined} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1.5">Kelime hazinesi ilerlemesi</p>
        <VocabularyBar total={report.vocabulary.total_words} learned={report.vocabulary.learned_words} pct={report.vocabulary.learned_pct} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-0.5">Zaman içindeki gelişim</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-2">
          Seçilen tarih aralığındaki günlük çalışma süresi ve eklenen yeni kelime sayısı (uzun aralıklarda haftalık toplamlara düşer).
        </p>
        <DailyTrendCharts daily={report.daily} chartTheme={chartTheme} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-0.5">Konu doğruluğu</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-2">
          Sınav ve konu pratiğinde yeterli denemesi olan konular, doğruluk oranına göre sıralı.
        </p>
        <TopicAccuracyChart weak={report.exam.weak_topics} strong={report.exam.strong_topics} chartTheme={chartTheme} />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-0.5">Platform karşılaştırması</p>
        <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-3">
          {report.platform.xp_percentile !== null
            ? `Platformdaki kullanıcıların %${report.platform.xp_percentile}'inden daha fazla XP kazanmış (güncel durum, kıyaslanan aktif kohort: ${report.platform.cohort_size} kullanıcı).`
            : 'Yüzdelik dilim için yeterli platform verisi yok.'}
        </p>
        {report.platform.cohort_size === 0 || report.platform.active_peers_current === 0 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500">Henüz karşılaştırılacak yeterli platform verisi yok.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <ComparisonMeter label="Çalışma süresi (dk)" you={report.study_minutes} avg={report.platform.avg_minutes_current} />
            <ComparisonMeter label="Yeni kelime" you={report.vocabulary.new_words_in_range} avg={report.platform.avg_new_words_current} />
            <ComparisonMeter
              label="Doğruluk" you={report.exam.accuracy ?? 0} avg={report.platform.avg_accuracy_current}
              formatValue={(n) => `%${n}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function UserReportExplorer() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [mode, setMode] = useState<'week' | 'month' | 'growth'>('week');
  const [report, setReport] = useState<UserReport | null>(null);
  const [growthStart, setGrowthStart] = useState('');
  const [growthEnd, setGrowthEnd] = useState('');
  const [growthReport, setGrowthReport] = useState<UserGrowthReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const chartTheme = useChartTheme();

  useEffect(() => {
    adminApi.getUsers().then(setUsers).catch(() => {}).finally(() => setLoadingUsers(false));
  }, []);

  useEffect(() => {
    if (!selected || mode === 'growth') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seçim/periyot değişince yeniden çekme (fetch-on-effect) deseni
    setLoadingReport(true);
    setError('');
    adminApi.getUserReport(selected.id, mode)
      .then(setReport)
      .catch(() => setError('Rapor yüklenemedi.'))
      .finally(() => setLoadingReport(false));
  }, [selected, mode]);

  useEffect(() => {
    if (!selected || mode !== 'growth') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seçim/tarih aralığı değişince yeniden çekme (fetch-on-effect) deseni
    setLoadingReport(true);
    setError('');
    adminApi.getUserGrowthReport(selected.id, growthStart || undefined, growthEnd || undefined)
      .then(setGrowthReport)
      .catch(() => setError('Rapor yüklenemedi.'))
      .finally(() => setLoadingReport(false));
  }, [selected, mode, growthStart, growthEnd]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return users.filter((u) =>
      (u.display_name || '').toLowerCase().includes(q)
      || (u.username || '').toLowerCase().includes(q)
      || (u.email || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [users, query]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center"><UserIcon className="w-5 h-5" /></div>
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Kullanıcı raporu</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500">Bir kullanıcı seç, kendi &quot;Raporum&quot; sayfasındaki verileri veya kayıttan bugüne/özel tarih aralığındaki gelişimini gör.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={selected ? (selected.display_name || selected.username || selected.email) : query}
            onChange={(e) => { setSelected(null); setReport(null); setGrowthReport(null); setQuery(e.target.value); }}
            placeholder="İsim, kullanıcı adı veya e-posta ara…"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/30"
          />
          {!selected && results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setSelected(u); setQuery(''); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 hover:dark:bg-slate-800 flex flex-col"
                >
                  <span className="text-gray-900 dark:text-slate-100 font-medium">{u.display_name || u.username || '(isim yok)'}</span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden text-sm">
          {([
            { key: 'week' as const, label: 'Haftalık' },
            { key: 'month' as const, label: 'Aylık' },
            { key: 'growth' as const, label: 'Kayıttan bugüne / özel aralık' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`px-3 py-1.5 font-medium transition-colors whitespace-nowrap ${
                mode === key
                  ? 'bg-[#534AB7] text-white'
                  : 'bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:bg-gray-50 hover:dark:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'growth' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="text-gray-500 dark:text-slate-400">Başlangıç (boş = kayıt tarihi):</label>
          <input type="date" value={growthStart} onChange={(e) => setGrowthStart(e.target.value)}
            className="px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100" />
          <label className="text-gray-500 dark:text-slate-400">Bitiş (boş = bugün):</label>
          <input type="date" value={growthEnd} onChange={(e) => setGrowthEnd(e.target.value)}
            className="px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100" />
        </div>
      )}

      {loadingUsers && <p className="text-xs text-gray-400 dark:text-slate-500">Kullanıcı listesi yükleniyor…</p>}
      {!selected && !loadingUsers && <p className="text-sm text-gray-400 dark:text-slate-500">Bir kullanıcı seçmek için yukarıdan ara.</p>}
      {loadingReport && <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {selected && mode !== 'growth' && report && !loadingReport && <UserReportCards report={report} chartTheme={chartTheme} />}
      {selected && mode === 'growth' && growthReport && !loadingReport && <GrowthReportCards report={growthReport} chartTheme={chartTheme} />}
    </div>
  );
}

export function OrgReportExplorer() {
  const [orgs, setOrgs] = useState<AdminOrganizationItem[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [report, setReport] = useState<OrganizationReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const chartTheme = useChartTheme();

  useEffect(() => {
    adminApi.listOrganizations().then(setOrgs).catch(() => {}).finally(() => setLoadingOrgs(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seçim/periyot değişince yeniden çekme (fetch-on-effect) deseni
    setLoadingReport(true);
    setError('');
    adminApi.getOrganizationReportAdmin(selectedId, period)
      .then(setReport)
      .catch(() => setError('Rapor yüklenemedi.'))
      .finally(() => setLoadingReport(false));
  }, [selectedId, period]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-[#EAF3DE] text-[#3B6D11] flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
        <div>
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Kurum raporu</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500">Bir kurum seç, kurum geneli ilerleme raporunu gör.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setReport(null); }}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#534AB7]/30"
        >
          <option value="">Kurum seç…</option>
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name} ({o.member_count} üye)</option>
          ))}
        </select>
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>

      {loadingOrgs && <p className="text-xs text-gray-400 dark:text-slate-500">Kurum listesi yükleniyor…</p>}
      {!selectedId && !loadingOrgs && <p className="text-sm text-gray-400 dark:text-slate-500">Bir kurum seçmek için yukarıdan seç.</p>}
      {loadingReport && <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {selectedId && report && !loadingReport && <OrgReportCards report={report} chartTheme={chartTheme} />}
    </div>
  );
}
