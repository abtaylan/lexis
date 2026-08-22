'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { NotificationLogEntry } from '@/types';

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent: <CheckCircle2 className="w-3.5 h-3.5" />,
  failed: <XCircle className="w-3.5 h-3.5" />,
  skipped: <MinusCircle className="w-3.5 h-3.5" />,
};
const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-[#EAF3DE] text-[#3B6D11]',
  failed: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
  skipped: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
};

export default function NotificationsLogPage() {
  const [items, setItems] = useState<NotificationLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [channel, setChannel] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.getNotificationsLog({ channel: channel || undefined, status_filter: statusFilter || undefined, limit: 100 })
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
  useEffect(load, [channel, statusFilter]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Bildirim Logları</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">OTP, hatırlatma e-postaları ve sosyal medya gönderimleri</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', 'email', 'telegram', 'slack'].map((c) => (
          <button key={c} onClick={() => setChannel(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${channel === c ? 'bg-[#534AB7] text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 hover:dark:bg-slate-700'}`}>
            {c || 'Tüm kanallar'}
          </button>
        ))}
        <span className="w-px bg-gray-200 dark:bg-slate-700 mx-1" />
        {['', 'sent', 'failed', 'skipped'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-gray-900 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 hover:dark:bg-slate-700'}`}>
            {s || 'Tüm durumlar'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-slate-500" /></div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2"><Bell className="w-4 h-4" />Gönderim geçmişi</h2>
            <span className="text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{total} kayıt</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800">
                {['Tarih', 'Kanal', 'Kategori', 'Alıcı', 'Durum'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-slate-500">Henüz kayıt yok.</td></tr>
              ) : items.map((n) => (
                <tr key={n.id} className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 hover:dark:bg-slate-800">
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500">{new Date(n.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-700 dark:text-slate-300">{n.channel}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">{n.category}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 truncate max-w-[220px]">{n.recipient || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[n.status] || 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'}`}>
                      {STATUS_ICON[n.status]}{n.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
