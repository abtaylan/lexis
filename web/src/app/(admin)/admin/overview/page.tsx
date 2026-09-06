'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, UserCheck, BookOpen, Radio, Clock, CalendarCheck, Activity,
  Database, Loader2, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { adminApi } from '@/lib/api';
import type { AdminStats, SystemHealth, LiveActivity } from '@/types';
import { useThemeMode } from '@/store/theme';

// "Genel Bakış" — admin panelin yeni varsayılan iniş sayfası (4 Eylül 2026).
// Diğer sayfalar (İstatistikler, Sistem Sağlığı, Oyun Analitiği, ...) zaten
// detaylı veri sunuyordu; burada tek ekranda görülmesi istenen üç şey
// birleştirildi: (1) anlık/canlı aktif kullanıcı sayısı — profiles.last_seen_at
// üzerinden, önceden hiçbir yerden yazılmıyordu, core/auth.py'a eklendi;
// (2) genel kullanıcı/sistem özeti — mevcut endpoint'lerden; (3) hangi
// bölümün en çok kullanıldığı — yeni event-tracking altyapısı kurmadan,
// mevcut tablolardaki (words/game_sessions/xp_events/study_schedule/sosyal)
// benzersiz kullanıcı sayımından çıkarıldı (bkz. admin_platform.py::live_activity).
// NOT: Bu dosya i18n API'sine bağlı değil (bkz. layout.tsx'teki not) — admin
// panel iç kullanım için bilinçli olarak sabit Türkçe metin kullanıyor.
export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [live, setLive] = useState<LiveActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { scheme } = useThemeMode();
  const chartTheme = scheme === 'dark'
    ? { grid: '#334155', axis: '#64748b', axisAlt: '#94a3b8', tooltipBg: '#0f172a', tooltipBorder: '#334155', tooltipText: '#e2e8f0' }
    : { grid: '#f1f5f9', axis: '#94a3b8', axisAlt: '#475569', tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0', tooltipText: '#1e293b' };

  const loadAll = () => {
    Promise.all([adminApi.getStats(), adminApi.getSystemHealth(), adminApi.getLiveActivity()])
      .then(([s, h, l]) => { setStats(s); setHealth(h); setLive(l); })
      .catch(() => setError('Genel bakış verisi yüklenemedi.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
    // Anlık aktif kullanıcı sayısının "canlı" hissetmesi için 30 sn'de bir yenile.
    const interval = setInterval(() => {
      adminApi.getLiveActivity().then(setLive).catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Yükleniyor…</span></div>
      </div>
    );
  }
  if (error) return <div className="p-8"><div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl px-4 py-3 text-sm">{error}</div></div>;

  const liveCards: {
    label: string; hint: string | null; value: number; bg: string; text: string;
    icon: React.ReactNode; pulse: boolean;
  }[] = live ? [
    { label: 'Şu an aktif', hint: 'Son 5 dakika', value: live.online_now, bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]', icon: <Radio className="w-6 h-6" />, pulse: true },
    { label: 'Son 1 saatte aktif', hint: null, value: live.online_last_hour, bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', icon: <Clock className="w-6 h-6" />, pulse: false },
    { label: 'Bugün aktif', hint: null, value: live.active_today, bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]', icon: <CalendarCheck className="w-6 h-6" />, pulse: false },
  ] : [];

  const overallCards = stats ? [
    { label: 'Toplam kullanıcı', value: stats.total_users, icon: <Users className="w-5 h-5" /> },
    { label: 'Aktif kullanıcı', value: stats.active_users, icon: <UserCheck className="w-5 h-5" /> },
    { label: 'Toplam kelime', value: stats.total_words, icon: <BookOpen className="w-5 h-5" /> },
  ] : [];

  const featureData = live?.feature_usage_30d.map((f) => ({ feature: f.feature, users: f.users })) || [];
  const topFeature = featureData[0];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Genel Bakış</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Anlık aktiflik, platform özeti ve bölüm bazlı kullanım — tek ekranda</p>
      </div>

      {/* Anlık aktiflik */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">Anlık aktiflik</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {liveCards.map(({ label, hint, value, bg, text, icon, pulse }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${bg} ${text} flex items-center justify-center`}>{icon}</div>
                {pulse && value > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3B6D11] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3B6D11]" />
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{label}{hint ? ` · ${hint}` : ''}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
          &quot;Şu an aktif&quot; son 5 dakika içinde uygulamada bir istek yapan (web veya mobil) kullanıcı sayısıdır — 30 sn&apos;de bir otomatik yenilenir.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform özeti + sistem durumu */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">Platform özeti</h2>
            <div className="space-y-3">
              {overallCards.map(({ label, value, icon }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">{icon}{label}</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-slate-100">{value}</span>
                </div>
              ))}
            </div>
            <Link href="/admin/stats" className="mt-4 flex items-center gap-1 text-xs font-medium text-[#534AB7] hover:underline">
              Detaylı istatistikler (büyüme, dil dağılımı, retention) <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">Sistem durumu</h2>
            {health && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Activity className={`w-4 h-4 ${health.backend.status === 'ok' ? 'text-[#3B6D11]' : 'text-red-500'}`} />
                  <span className="text-gray-600 dark:text-slate-400">Backend</span>
                  <span className="ml-auto font-medium text-gray-900 dark:text-slate-100">{health.backend.status === 'ok' ? 'Çalışıyor' : 'Hata'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Database className={`w-4 h-4 ${health.database.status === 'ok' ? 'text-[#185FA5]' : 'text-red-500'}`} />
                  <span className="text-gray-600 dark:text-slate-400">Veritabanı</span>
                  <span className="ml-auto font-medium text-gray-900 dark:text-slate-100">
                    {health.database.status === 'ok' ? `${health.database.latency_ms ?? '—'} ms` : 'Hata'}
                  </span>
                </div>
              </div>
            )}
            <Link href="/admin/system-health" className="mt-4 flex items-center gap-1 text-xs font-medium text-[#534AB7] hover:underline">
              Entegrasyonlar ve arka plan işleri <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Bölüm bazlı kullanım */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">En çok kullanılan bölümler</h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
            Son 30 günde her bölümü kullanan benzersiz kullanıcı sayısı
            {topFeature && topFeature.users > 0 ? ` — en çok kullanılan: ${topFeature.feature}` : ''}
          </p>
          {featureData.some((f) => f.users > 0) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: chartTheme.axis }} />
                  <YAxis type="category" dataKey="feature" tick={{ fontSize: 11, fill: chartTheme.axisAlt }} width={150} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: `1px solid ${chartTheme.tooltipBorder}`, backgroundColor: chartTheme.tooltipBg, color: chartTheme.tooltipText }} labelStyle={{ color: chartTheme.tooltipText }} />
                  <Bar dataKey="users" fill="#534AB7" radius={[0, 6, 6, 0]} name="Kullanıcı" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-gray-400 dark:text-slate-500">Henüz yeterli veri yok.</p>}
          <Link href="/admin/game-analytics" className="mt-4 flex items-center gap-1 text-xs font-medium text-[#534AB7] hover:underline">
            Oyun modu bazında detay (mod, dil, doğruluk) <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
