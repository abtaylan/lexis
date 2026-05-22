'use client';

import Link from 'next/link';
import {
  BookOpen, BrainCircuit, Layers, Target,
  TrendingUp, Flame, CheckCircle2, Clock
} from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useStats, useStatsHistory } from '@/hooks/useStats';
import { useDueWords } from '@/hooks/useWords';
import { Card, ProgressBar, Badge, Spinner, Button } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';

function StatCard({ icon, label, value, sub, color = 'sky' }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    sky:     'bg-sky-50 text-sky-500',
    green:   'bg-emerald-50 text-emerald-500',
    amber:   'bg-amber-50 text-amber-500',
    purple:  'bg-violet-50 text-violet-500',
  };
  return (
    <Card className="flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function QuickAction({ href, icon, label, desc, color }: {
  href: string; icon: React.ReactNode; label: string; desc: string; color: string;
}) {
  return (
    <Link href={href}>
      <Card hover className="flex items-center gap-4 h-full">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="font-semibold text-slate-700 text-sm">{label}</p>
          <p className="text-xs text-slate-400">{desc}</p>
        </div>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: history } = useStatsHistory(14);
  const { data: dueWords } = useDueWords();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Günaydın';
    if (h < 18) return 'İyi öğleden sonralar';
    return 'İyi akşamlar';
  };

  const chartData = (history ?? []).map((d: import('@/types').DailyProgress) => ({
    date: new Date(d.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
    Kelime: d.words_studied,
    Doğruluk: d.correct_answers && d.total_answers
      ? Math.round((d.correct_answers / d.total_answers) * 100)
      : 0,
  }));

  return (
    <div className="stagger">
      <PageHeader
        title={`${greeting()}, ${user?.full_name || user?.username} 👋`}
        subtitle="İşte günlük öğrenme özetin."
      />

      {/* Stats */}
      {statsLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<BookOpen size={18} />}
            label="Toplam Kelime"
            value={stats.total_words}
            color="sky"
          />
          <StatCard
            icon={<Flame size={18} />}
            label="Günlük Seri"
            value={`${stats.streak_days} gün`}
            sub={stats.longest_streak > stats.streak_days ? `En uzun: ${stats.longest_streak}` : '🏆 Rekoru kırıyorsun!'}
            color="amber"
          />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            label="Bugün Çalışılan"
            value={stats.words_learned_today}
            sub={`Hedef: ${stats.daily_goal}`}
            color="green"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Tekrar Bekleyen"
            value={dueWords?.length ?? stats.words_due_today}
            sub="kelime sırada"
            color="purple"
          />
        </div>
      )}

      {/* Daily progress */}
      {stats && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">Günlük Hedef</p>
              <p className="text-xs text-slate-400">{stats.words_learned_today} / {stats.daily_goal} kelime</p>
            </div>
            {stats.words_learned_today >= stats.daily_goal ? (
              <Badge variant="success">✅ Tamamlandı</Badge>
            ) : (
              <Badge variant="primary">{stats.daily_goal - stats.words_learned_today} kaldı</Badge>
            )}
          </div>
          <ProgressBar
            value={stats.words_learned_today}
            max={stats.daily_goal}
            color={stats.words_learned_today >= stats.daily_goal ? 'green' : 'blue'}
            size="md"
            showLabel
          />
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <QuickAction
          href="/flashcards"
          icon={<Layers size={20} className="text-sky-600" />}
          label="Flashcard Çalış"
          desc={`${dueWords?.length ?? 0} kart bekliyor`}
          color="bg-sky-50"
        />
        <QuickAction
          href="/quiz"
          icon={<BrainCircuit size={20} className="text-violet-600" />}
          label="Quiz Başlat"
          desc="Bilgini test et"
          color="bg-violet-50"
        />
        <QuickAction
          href="/words"
          icon={<Target size={20} className="text-emerald-600" />}
          label="Kelime Ekle"
          desc="Cambridge'den otomatik"
          color="bg-emerald-50"
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Son 14 Gün</p>
              <p className="text-xs text-slate-400">Günlük çalışma geçmişin</p>
            </div>
            <TrendingUp size={16} className="text-slate-300" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorWord" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
                cursor={{ stroke: '#e2e8f0' }}
              />
              <Area
                type="monotone"
                dataKey="Kelime"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#colorWord)"
                dot={{ fill: '#0ea5e9', r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Due words reminder */}
      {dueWords && dueWords.length > 0 && (
        <Card className="mt-4 border-sky-100 bg-sky-50/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-700 text-sm">
                🎯 {dueWords.length} kelime tekrar zamanı geldi
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Şimdi çalışarak serinizi koru
              </p>
            </div>
            <Link href="/flashcards">
              <Button size="sm">Başla</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
