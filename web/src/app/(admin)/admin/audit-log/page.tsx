'use client';

import { useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { AuditLogEntry } from '@/types';

const ACTION_LABELS: Record<string, string> = {
  'user.create': 'Kullanıcı oluşturuldu',
  'user.role_change': 'Rol değiştirildi',
  'user.deactivate': 'Kullanıcı deaktif edildi',
  'user.activate': 'Kullanıcı aktifleştirildi',
  'word_pool.create': 'Kelime havuzuna eklendi',
  'word_pool.update': 'Kelime havuzu güncellendi',
  'word_pool.delete': 'Kelime havuzundan pasif edildi',
};

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminApi.getAuditLog({ action: action || undefined, limit: 100 })
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
  useEffect(load, [action]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Denetim Kaydı</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Admin panel üzerinden yapılan tüm mutasyon işlemleri</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['', ...Object.keys(ACTION_LABELS)].map((a) => (
          <button key={a} onClick={() => setAction(a)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${action === a ? 'bg-[#534AB7] text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 hover:dark:bg-slate-700'}`}>
            {a ? (ACTION_LABELS[a] || a) : 'Tüm işlemler'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400 dark:text-slate-500" /></div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 flex items-center gap-2"><History className="w-4 h-4" />İşlem geçmişi</h2>
            <span className="text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{total} kayıt</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800">
                {['Tarih', 'Yapan', 'İşlem', 'Hedef', 'Detay'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-slate-500">Henüz kayıtlı işlem yok.</td></tr>
              ) : items.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 hover:dark:bg-slate-800">
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500">{new Date(a.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">{a.actor_email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#534AB7]">{ACTION_LABELS[a.action] || a.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 font-mono truncate max-w-[160px]">{a.target_type ? `${a.target_type}:${a.target_id}` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500 truncate max-w-[220px]">{a.detail ? JSON.stringify(a.detail) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
