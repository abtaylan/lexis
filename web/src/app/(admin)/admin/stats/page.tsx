'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, BookOpen, TrendingUp, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from 'recharts';
import { adminApi } from '@/lib/api';
import type { AdminStats, DetailedStats } from '@/types';

// NOT: Bu sayfa önceden artık var olmayan bir i18n API'sine (useT/t) bağlıydı
// — bkz. app/(admin)/layout.tsx'teki not. Admin panel iç kullanım için
// olduğundan burada bilinçli olarak sabit Türkçe metin kullanılıyor.
export default function AdminStatsPage() {
  const [stats, setStats]     = useState<AdminStats | null>(null);
  const [detailed, setDetailed] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.getDetailedStats(30)])
      .then(([s, d]) => { setStats(s); setDetailed(d); })
      .catch(() => setError('İstatistikler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Yükleniyor…</span></div>
      </div>
    );
  }

  if (error) return <div className="p-8"><div className="bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-sm">{error}</div></div>;

  const cards = stats ? [
    { label: 'Toplam kullanıcı', value: stats.total_users,  bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', icon: <Users className="w-6 h-6" /> },
    { label: 'Aktif kullanıcı', value: stats.active_users, bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]', icon: <UserCheck className="w-6 h-6" /> },
    { label: 'Toplam kelime', value: stats.total_words,  bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]', icon: <BookOpen className="w-6 h-6" /> },
    { label: 'Bugün eklenen', value: stats.words_today,  bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]', icon: <TrendingUp className="w-6 h-6" /> },
  ] : [];

  const learningLangData = detailed
    ? Object.entries(detailed.language_distribution.learning_lang)
        .sort((a, b) => b[1] - a[1])
        .map(([lang, count]) => ({ lang, count }))
    : [];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">İstatistikler</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform geneli kullanım özeti</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, bg, text, icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`w-12 h-12 rounded-xl ${bg} ${text} flex items-center justify-center mb-4`}>{icon}</div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Aktiflik oranı</h2>
        {stats && stats.total_users > 0 ? (
          <div>
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>{stats.active_users} / {stats.total_users} aktif</span>
              <span className="font-semibold text-[#3B6D11]">{Math.round((stats.active_users / stats.total_users) * 100)}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-3 rounded-full bg-[#3B6D11] transition-all duration-700" style={{ width: `${(stats.active_users / stats.total_users) * 100}%` }} />
            </div>
          </div>
        ) : <p className="text-sm text-gray-400">Henüz veri yok.</p>}
      </div>

      {/* Büyüme grafiği */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Büyüme — günlük yeni kullanıcı</h2>
        <p className="text-xs text-gray-400 mb-4">Son 30 gün</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={detailed?.growth || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
              <Line type="monotone" dataKey="new_users" stroke="#534AB7" strokeWidth={2} dot={false} name="Yeni kullanıcı" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dil dağılımı */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Dil dağılımı</h2>
          <p className="text-xs text-gray-400 mb-4">Aktif öğrenilen diller (kullanıcı sayısı)</p>
          {learningLangData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={learningLangData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="lang" tick={{ fontSize: 11, fill: '#475569' }} width={36} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" fill="#534AB7" radius={[0, 6, 6, 0]} name="Kullanıcı" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-gray-400">Henüz veri yok.</p>}
        </div>

        {/* Retention */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Retention (7 günlük)</h2>
          <p className="text-xs text-gray-400 mb-4">{detailed?.retention.definition}</p>
          {detailed && detailed.retention.eligible_users > 0 ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>{detailed.retention.active_last_7_days} / {detailed.retention.eligible_users} aktif</span>
                  <span className="font-semibold text-[#185FA5]">{detailed.retention.retention_rate_percent}%</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-3 rounded-full bg-[#185FA5] transition-all duration-700" style={{ width: `${Math.min(detailed.retention.retention_rate_percent, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xl font-bold text-gray-900">{detailed.retention.eligible_users}</p>
                  <p className="text-xs text-gray-500">7+ gün önce kayıtlı</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xl font-bold text-gray-900">{detailed.retention.active_last_7_days}</p>
                  <p className="text-xs text-gray-500">Son 7 günde aktif</p>
                </div>
              </div>
            </div>
          ) : <p className="text-sm text-gray-400">Henüz yeterli veri yok (7+ gün önce kayıtlı kullanıcı bekleniyor).</p>}
        </div>
      </div>
    </div>
  );
}
