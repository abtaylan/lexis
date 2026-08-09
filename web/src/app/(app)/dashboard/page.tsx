'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Clock, Target, Layers, Brain, CheckCircle2,
} from 'lucide-react';
import { statsApi, wordsApi } from '@/lib/api';
import type { Stats, Word, DailyProgress } from '@/types';

const DAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

function getWeekDays(history: DailyProgress[]): {
  label: string;
  count: number;
  isToday: boolean;
  done: boolean;
}[] {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = history.find((h) => h.date === dateStr);
    const isToday = d.toDateString() === today.toDateString();
    const isPast = d < today && !isToday;
    return {
      label: DAY_LABELS[i],
      count: entry?.words_added ?? 0,
      isToday,
      done: isPast && (entry?.words_added ?? 0) > 0,
    };
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats]             = useState<Stats | null>(null);
  const [dueWords, setDueWords]       = useState<Word[]>([]);
  const [history, setHistory]         = useState<DailyProgress[]>([]);
  const [recentWords, setRecentWords] = useState<Word[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [username, setUsername]       = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lexis_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setUsername(u.display_name || u.username || '');
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, due, hist, words] = await Promise.all([
          statsApi.getSummary(),
          wordsApi.getDue(),
          statsApi.getHistory(14),
          wordsApi.getAll({ page: 1, per_page: 4 }),
        ]);
        setStats(s);
        setDueWords(due);
        setHistory(hist);
        setRecentWords(words.items);
      } catch {
        setError('Veriler yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Yükleniyor…
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600 bg-red-50 rounded-xl">{error}</div>;
  }

  const goalPercent = stats
    ? Math.min(100, Math.round((stats.today_added / (stats.daily_goal || 1)) * 100))
    : 0;

  const weekDays = getWeekDays(history);

  const thisWeekTotal = weekDays.reduce((acc, d) => acc + d.count, 0);
  const lastWeekTotal = history
    .filter((h) => {
      const d = new Date(h.date);
      const today = new Date();
      const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 7 && diff < 14;
    })
    .reduce((acc, h) => acc + h.words_added, 0);

  const total       = stats?.total_words || 1;
  const newCount    = Math.max(0, total - (stats?.learning ?? 0) - (stats?.learned ?? 0));
  const learningPct = Math.round(((stats?.learning ?? 0) / total) * 100);
  const learnedPct  = Math.round(((stats?.learned  ?? 0) / total) * 100);
  const newPct      = Math.round((newCount / total) * 100);

  return (
    <div className="p-6 space-y-4 max-w-5xl">

      {/* Başlık */}
      <div className="mb-2">
        <p className="text-lg font-medium text-gray-900">
          Günaydın{username ? `, ${username}` : ''}
        </p>
        <p className="text-sm text-gray-400">İşte günlük öğrenme özetin.</p>
      </div>

      {/* Streak banner */}
      {(stats?.current_streak ?? 0) > 0 && (
        <div
          className="rounded-2xl border px-4 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(to right, #FAEEDA, #FAF0E0)', borderColor: '#FAC775' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: '#854F0B' }}>
              {stats!.current_streak} günlük seri devam ediyor!
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#BA7517' }}>
              Bugün de çalışarak serinizi koruyun
            </p>
          </div>
          <span className="text-3xl">🔥</span>
        </div>
      )}

      {/* 3 stat kart */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Toplam kelime',
            value: stats?.total_words ?? 0,
            sub: `+${thisWeekTotal} bu hafta`,
            icon: <BookOpen className="w-4 h-4" />,
            iconBg: '#E6F1FB', iconColor: '#185FA5',
          },
          {
            label: 'Bugün eklendi',
            value: stats?.today_added ?? 0,
            sub: `Hedef: ${stats?.daily_goal ?? 5}`,
            icon: <CheckCircle2 className="w-4 h-4" />,
            iconBg: '#EAF3DE', iconColor: '#3B6D11',
          },
          {
            label: 'Tekrar bekleyen',
            value: dueWords.length,
            sub: 'kelime sırada',
            icon: <Clock className="w-4 h-4" />,
            iconBg: '#EEEDFE', iconColor: '#534AB7',
          },
        ].map(({ label, value, sub, icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: iconBg, color: iconColor }}
            >
              {icon}
            </div>
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-medium text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Günlük hedef */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium text-gray-700">Günlük hedef</p>
            <p className="text-xs text-gray-400">
              {stats?.today_added ?? 0} / {stats?.daily_goal ?? 5} kelime
            </p>
          </div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: '#E6F1FB', color: '#185FA5' }}
          >
            {Math.max(0, (stats?.daily_goal ?? 5) - (stats?.today_added ?? 0))} kaldı
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-gray-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${goalPercent}%`, background: '#378ADD' }}
          />
        </div>
      </div>

      {/* Haftalık ilerleme */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Haftalık ilerleme</p>
        <div className="flex justify-between items-end pb-3">
          {weekDays.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400">{d.label}</span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={
                  d.isToday
                    ? { background: '#378ADD', color: '#fff' }
                    : d.done
                    ? { background: '#EAF3DE', color: '#3B6D11' }
                    : { background: '#F3F4F6', color: '#9CA3AF' }
                }
              >
                {d.isToday ? d.count : d.done ? '✓' : '—'}
              </div>
              <span
                className="text-xs"
                style={{
                  color: d.isToday ? '#378ADD' : '#9CA3AF',
                  fontWeight: d.isToday ? 500 : 400,
                }}
              >
                {d.isToday ? 'Bug.' : d.count > 0 ? d.count : '—'}
              </span>
            </div>
          ))}
        </div>
        <div className="h-px bg-gray-100 mb-3" />
        <div className="flex gap-4 text-xs text-gray-400">
          <span>Bu hafta: <strong className="text-gray-700">{thisWeekTotal} kelime</strong></span>
          <span>Geçen hafta: <strong className="text-gray-700">{lastWeekTotal} kelime</strong></span>
        </div>
      </div>

      {/* Hızlı aksiyonlar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Flashcard çalış',
            sub: `${dueWords.length} kart bekliyor`,
            icon: <Layers className="w-4 h-4" />,
            iconBg: '#E6F1FB', iconColor: '#185FA5',
            href: '/flashcards',
          },
          {
            label: 'Quiz başlat',
            sub: 'Bilgini test et',
            icon: <Brain className="w-4 h-4" />,
            iconBg: '#EEEDFE', iconColor: '#534AB7',
            href: '/quiz',
          },
          {
            label: 'Kelime ekle',
            sub: 'Listeyi genişlet',
            icon: <Target className="w-4 h-4" />,
            iconBg: '#E1F5EE', iconColor: '#0F6E56',
            href: '/words',
          },
        ].map(({ label, sub, icon, iconBg, iconColor, href }) => (
          <button
            key={label}
            onClick={() => router.push(href)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 text-left hover:border-gray-200 hover:shadow-md transition-all"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: iconBg, color: iconColor }}
            >
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Alt grid: Seviye dağılımı + Son eklenenler */}
      <div className="grid grid-cols-2 gap-3">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Seviye dağılımı</p>
          {[
            { label: 'Yeni',         count: newCount,          pct: newPct,      color: '#B5D4F4' },
            { label: 'Öğreniliyor',  count: stats?.learning ?? 0, pct: learningPct, color: '#9FE1CB' },
            { label: 'Öğrenildi',    count: stats?.learned  ?? 0, pct: learnedPct,  color: '#C0DD97' },
          ].map(({ label, count, pct, color }) => (
            <div key={label} className="flex items-center gap-2 mb-2 text-xs">
              <span className="w-20 text-gray-400 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="w-6 text-right text-gray-500">{count}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Son eklenen kelimeler</p>
          {recentWords.length === 0 ? (
            <p className="text-xs text-gray-400">Henüz kelime eklenmedi.</p>
          ) : (
            recentWords.map((w, i) => (
              <div
                key={w.id}
                className="flex items-center justify-between py-1.5 text-sm"
                style={{ borderBottom: i < recentWords.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-800">{w.word}</span>
                  {i === 0 && (
                    <span
                      className="rounded px-1.5 py-0.5"
                      style={{ background: '#EEEDFE', color: '#534AB7', fontSize: 10 }}
                    >
                      yeni
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{w.meaning_native || w.meaning}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Due banner */}
      {dueWords.length > 0 && (
        <div
          className="rounded-2xl border px-4 py-3 flex items-center justify-between"
          style={{ background: '#E6F1FB', borderColor: '#B5D4F4' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: '#185FA5' }}>
              {dueWords.length} kelime tekrar zamanı geldi
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#378ADD' }}>
              Şimdi çalışarak serinizi koruyun
            </p>
          </div>
          <button
            onClick={() => router.push('/flashcards')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ background: '#378ADD' }}
          >
            Başla
          </button>
        </div>
      )}
    </div>
  );
}
