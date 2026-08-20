'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, BookOpen, TrendingUp, Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AdminStats } from '@/types';
import { useT } from '@/lib/i18n';

export default function AdminStatsPage() {
  const [stats, setStats]   = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const { t } = useT();

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(() => setError(t('admin.stats.loadError')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">{t('app.loading')}</span></div>
      </div>
    );
  }

  if (error) return <div className="p-8"><div className="bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-sm">{error}</div></div>;

  const cards = stats ? [
    { label: t('admin.stats.totalUsers'), value: stats.total_users,  bg: 'bg-[#E6F1FB]', text: 'text-[#185FA5]', icon: <Users className="w-6 h-6" /> },
    { label: t('admin.stats.activeUsers'), value: stats.active_users, bg: 'bg-[#EAF3DE]', text: 'text-[#3B6D11]', icon: <UserCheck className="w-6 h-6" /> },
    { label: t('admin.stats.totalWords'), value: stats.total_words,  bg: 'bg-[#EEEDFE]', text: 'text-[#534AB7]', icon: <BookOpen className="w-6 h-6" /> },
    { label: t('admin.stats.addedToday'), value: stats.words_today,  bg: 'bg-[#E1F5EE]', text: 'text-[#0F6E56]', icon: <TrendingUp className="w-6 h-6" /> },
  ] : [];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.stats.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t('admin.stats.subtitle')}</p>
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
        <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('admin.stats.activityRateTitle')}</h2>
        {stats && stats.total_users > 0 ? (
          <div>
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>{t('admin.stats.activeOfTotal', { active: stats.active_users, total: stats.total_users })}</span>
              <span className="font-semibold text-[#3B6D11]">{Math.round((stats.active_users / stats.total_users) * 100)}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-3 rounded-full bg-[#3B6D11] transition-all duration-700" style={{ width: `${(stats.active_users / stats.total_users) * 100}%` }} />
            </div>
          </div>
        ) : <p className="text-sm text-gray-400">{t('admin.stats.noData')}</p>}
      </div>
    </div>
  );
}
