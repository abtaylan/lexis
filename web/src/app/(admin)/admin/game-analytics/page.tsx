'use client';

import { useEffect, useState } from 'react';
import { Gamepad2, Loader2, Target } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { adminApi } from '@/lib/api';
import type { GameAnalytics } from '@/types';
import { useThemeMode } from '@/store/theme';

const MODE_LABELS: Record<string, string> = {
  wordle: 'Adam Asmaca', multiple_choice: 'Çoktan Seçmeli',
  typing: 'Yazma (henüz yok)', matching: 'Eşleştirme (henüz yok)',
  listening: 'Dinleme (henüz yok)', sprint: 'Sprint (henüz yok)',
};

export default function GameAnalyticsPage() {
  const [data, setData] = useState<GameAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { scheme } = useThemeMode();
  // bkz. admin/stats/page.tsx'teki aynı not — Recharts inline stil kullanıyor.
  const chartTheme = scheme === 'dark'
    ? { grid: '#334155', axis: '#64748b', tooltipBg: '#0f172a', tooltipBorder: '#334155', tooltipText: '#e2e8f0' }
    : { grid: '#f1f5f9', axis: '#94a3b8', tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0', tooltipText: '#1e293b' };

  useEffect(() => {
    adminApi.getGameAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-slate-500" /></div>;
  }
  if (!data) return null;

  const chartData = data.by_mode.map((m) => ({ mode: MODE_LABELS[m.mode] || m.mode, sessions: m.sessions }));
  const langData = Object.entries(data.by_learning_lang).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Oyun Analitiği</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Kelime tahmin oyunu — mod ve dil bazında kullanım</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <div className="w-12 h-12 rounded-xl bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center mb-4"><Gamepad2 className="w-6 h-6" /></div>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{data.total_sessions}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Toplam oyun oturumu</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
          <div className="w-12 h-12 rounded-xl bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center mb-4"><Target className="w-6 h-6" /></div>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{data.accuracy_percent}%</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Genel doğruluk ({data.total_attempts} deneme)</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Moda göre oturum sayısı</h2>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">typing/matching/listening/sprint henüz implemente edilmedi (bkz. Bölüm 5)</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="mode" tick={{ fontSize: 10, fill: chartTheme.axis }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: chartTheme.axis }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: `1px solid ${chartTheme.tooltipBorder}`, backgroundColor: chartTheme.tooltipBg, color: chartTheme.tooltipText }} labelStyle={{ color: chartTheme.tooltipText }} />
              <Bar dataKey="sessions" fill="#534AB7" radius={[6, 6, 0, 0]} name="Oturum" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Mod detayları</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800">
              {['Mod', 'Oturum', 'Tamamlanan', 'Ort. skor', 'Toplam XP'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.by_mode.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-slate-500">Henüz oyun verisi yok.</td></tr>
            ) : data.by_mode.map((m) => (
              <tr key={m.mode} className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 hover:dark:bg-slate-800">
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">{MODE_LABELS[m.mode] || m.mode}</td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">{m.sessions}</td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">{m.completed_sessions}</td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">{m.avg_score}</td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">{m.total_xp_earned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Dile göre oturum sayısı</h2>
        {langData.length === 0 ? <p className="text-sm text-gray-400 dark:text-slate-500">Henüz veri yok.</p> : (
          <div className="flex flex-wrap gap-2">
            {langData.map(([lang, count]) => (
              <span key={lang} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#EEEDFE] text-[#534AB7]">{lang}: {count}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
