'use client';

import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts';
import {
  BookOpen, CheckCircle2, RefreshCw, Flame, Loader2, TrendingUp,
  Gauge, Trophy, Sparkles,
} from 'lucide-react';
import { statsApi } from '@/lib/api';
import type { AnalyticsData } from '@/types';
import { useT } from '@/lib/i18n';

const C = {
  blue: '#378ADD', green: '#3B6D11', amber: '#854F0B',
  purple: '#534AB7', teal: '#0F6E56', gray: '#94a3b8', red: '#ef4444',
};
const TYPE_COLORS = ['#378ADD', '#534AB7', '#3B6D11', '#854F0B', '#0F6E56', '#94a3b8'];

// Backend'den gelen word_type değerleri (İngilizce, "diğer" hariç) sabit
// veri anahtarları — bunlar çevrilmez. Görüntülenen etiketler i18n'den gelir.
const TYPE_LABEL_KEYS: Record<string, string> = {
  noun: 'stats.wordTypeNoun',
  verb: 'stats.wordTypeVerb',
  adjective: 'stats.wordTypeAdjective',
  adverb: 'stats.wordTypeAdverb',
  'phrasal verb': 'stats.wordTypePhrasalVerb',
  idiom: 'stats.wordTypeIdiom',
  phrase: 'stats.wordTypePhrase',
  'diğer': 'stats.wordTypeOther',
};

const DATE_LOCALES: Record<string, string> = {
  tr: 'tr-TR', en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES',
  it: 'it-IT', ar: 'ar-SA', ru: 'ru-RU', ja: 'ja-JP',
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>{children}</div>;
}

function ChartTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-start gap-2 mb-4">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { t, lang } = useT();
  const [data, setData]     = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    statsApi.getAnalytics()
      .then(setData)
      .catch(() => setError(t('stats.loadError')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tl = (type: string) => {
    const key = TYPE_LABEL_KEYS[type];
    return key ? t(key) : type.charAt(0).toUpperCase() + type.slice(1);
  };
  const dateLocale = DATE_LOCALES[lang] ?? 'en-US';

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">{t('app.loading')}</span></div>
      </div>
    );
  }
  if (error) return <div className="p-6"><div className="bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-sm">{error}</div></div>;
  if (!data) return null;

  const totals = data.totals;
  const empty = totals.total === 0;

  const statusData = [
    { name: t('dashboard.learned'),  value: totals.learned,  color: C.green },
    { name: t('dashboard.learning'), value: totals.learning, color: C.amber },
    { name: t('stats.archived'),     value: totals.archived, color: C.gray },
  ].filter((d) => d.value > 0);

  const typeData = data.type_breakdown.map((d, i) => ({
    name: tl(d.word_type),
    toplam: d.total,
    oran: d.learn_rate,
    tekrar: d.avg_repetition,
    color: TYPE_COLORS[i % TYPE_COLORS.length],
  }));

  const trendData = data.daily_added.map((d) => ({
    name: new Date(d.date).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' }),
    eklenen: d.added,
  }));

  const progressData = data.daily_progress.slice(-21).map((d) => ({
    name: new Date(d.date).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' }),
    tekrar: d.words_reviewed,
    eklenen: d.words_added,
  }));

  const maxStreak = Math.max(0, ...data.daily_progress.map((d) => d.streak_day));
  const learnRate = totals.total > 0 ? Math.round((totals.learned / totals.total) * 100) : 0;

  const summary = [
    { label: t('dashboard.totalWords'), value: totals.total,    bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', icon: <BookOpen className="w-5 h-5" /> },
    { label: t('dashboard.learned'),    value: totals.learned,  bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]', icon: <CheckCircle2 className="w-5 h-5" /> },
    { label: t('dashboard.learning'),   value: totals.learning, bg: 'bg-[#FAEEDA]', text: 'text-[#854F0B]', icon: <RefreshCw className="w-5 h-5" /> },
    { label: t('stats.longestStreak'),  value: t('stats.streakValue', { n: maxStreak }), bg: 'bg-[#FEE2E2]', text: 'text-[#b91c1c]', icon: <Flame className="w-5 h-5" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('nav.stats')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('stats.subtitle')}</p>
      </div>

      {empty ? (
        <Card className="p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#E6F1FB] flex items-center justify-center"><Sparkles className="w-7 h-7 text-[#185FA5]" /></div>
          <p className="text-sm font-medium text-gray-700">{t('stats.emptyTitle')}</p>
          <p className="text-xs text-gray-400">{t('stats.emptySub')}</p>
        </Card>
      ) : (
        <>
          {/* Özet kartlar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.map((s) => (
              <Card key={s.label} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.text} flex items-center justify-center`}>{s.icon}</div>
                <div><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
              </Card>
            ))}
          </div>

          {/* Üst sıra: durum donut + öğrenme oranı */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <ChartTitle icon={<Gauge className="w-4 h-4" />} title={t('stats.statusDistributionTitle')} sub={t('stats.statusDistributionSub')} />
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center -mt-2">
                <p className="text-3xl font-bold text-[#3B6D11]">{learnRate}%</p>
                <p className="text-xs text-gray-400">{t('dashboard.learned')}</p>
              </div>
            </Card>

            {/* Kelime türüne göre öğrenme oranı — motive edici */}
            <Card className="lg:col-span-2">
              <ChartTitle icon={<Trophy className="w-4 h-4" />} title={t('stats.learnRateByTypeTitle')} sub={t('stats.learnRateByTypeSub')} />
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip formatter={(v) => [`${v}%`, t('stats.learnRateLabel')]} />
                  <Bar dataKey="oran" radius={[8, 8, 0, 0]}>
                    {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Orta sıra: tür dağılımı + öğrenme hızı (ort. tekrar) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <ChartTitle icon={<BookOpen className="w-4 h-4" />} title={t('stats.typeDistributionTitle')} sub={t('stats.typeDistributionSub')} />
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip formatter={(v) => [v, t('dashboard.wordsUnit')]} />
                  <Bar dataKey="toplam" radius={[0, 8, 8, 0]}>
                    {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <ChartTitle icon={<Gauge className="w-4 h-4" />} title={t('stats.learningSpeedTitle')} sub={t('stats.learningSpeedSub')} />
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [t('stats.repetitionsValue', { n: v as number }), t('stats.average')]} />
                  <Bar dataKey="tekrar" radius={[8, 8, 0, 0]} fill={C.purple} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Alt sıra: günlük eklenen trendi */}
          <Card>
            <ChartTitle icon={<TrendingUp className="w-4 h-4" />} title={t('stats.dailyAddedTitle')} sub={t('stats.dailyAddedSub')} />
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="grAdd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.blue} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v) => [t('stats.wordsValue', { n: v as number }), t('stats.added')]} />
                <Area type="monotone" dataKey="eklenen" stroke={C.blue} strokeWidth={2} fill="url(#grAdd)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Günlük tekrar aktivitesi */}
          {progressData.length > 0 && (
            <Card>
              <ChartTitle icon={<RefreshCw className="w-4 h-4" />} title={t('stats.studyActivityTitle')} sub={t('stats.studyActivitySub')} />
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={progressData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconType="circle" />
                  <Bar dataKey="eklenen" name={t('stats.added')}    radius={[6, 6, 0, 0]} fill={C.blue} />
                  <Bar dataKey="tekrar"  name={t('stats.repeated')} radius={[6, 6, 0, 0]} fill={C.green} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
