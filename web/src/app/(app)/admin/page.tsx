'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, TrendingUp, Shield } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Card, Badge, Spinner, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !user.is_admin) router.replace('/dashboard');
  }, [user, router]);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.getUsers,
    enabled: !!user?.is_admin,
  });

  const { data: globalStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getGlobalStats,
    enabled: !!user?.is_admin,
  });

  if (!user?.is_admin) {
    return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  }

  return (
    <div>
      <PageHeader title="Admin Paneli" subtitle="Platform yönetimi" />

      {/* Global stats */}
      {globalStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Toplam Kullanıcı', value: globalStats.total_users ?? '—', icon: <Users size={18} />, color: 'bg-sky-50 text-sky-500' },
            { label: 'Toplam Kelime', value: globalStats.total_words ?? '—', icon: <BookOpen size={18} />, color: 'bg-violet-50 text-violet-500' },
            { label: 'Bugün Aktif', value: globalStats.active_today ?? '—', icon: <TrendingUp size={18} />, color: 'bg-emerald-50 text-emerald-500' },
            { label: 'Toplam Quiz', value: globalStats.total_quizzes ?? '—', icon: <Shield size={18} />, color: 'bg-amber-50 text-amber-500' },
          ].map((s) => (
            <Card key={s.label} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-xs text-slate-400">{s.label}</p>
                <p className="text-xl font-bold text-slate-800">{s.value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Users table */}
      <Card padding="none">
        <div className="px-5 py-4 border-b border-slate-50">
          <p className="font-semibold text-slate-700">Kullanıcılar</p>
        </div>

        {usersLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : !users?.length ? (
          <EmptyState icon={<Users size={24} />} title="Kullanıcı bulunamadı" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50">
                  {['Kullanıcı', 'E-posta', 'Kelime', 'Son Aktif', 'Rol'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(users as import('@/types').AdminUser[]).map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 text-xs font-bold flex-shrink-0">
                          {u.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-700">{u.username}</p>
                          {u.full_name && <p className="text-xs text-slate-400">{u.full_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{u.email}</td>
                    <td className="px-5 py-3 font-semibold text-slate-700">{u.word_count ?? 0}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {u.last_active ? new Date(u.last_active).toLocaleDateString('tr-TR') : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {u.is_admin
                        ? <Badge variant="danger">Admin</Badge>
                        : <Badge variant="default">Kullanıcı</Badge>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
