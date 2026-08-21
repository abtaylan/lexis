'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Loader2, TrendingUp, Users, Wallet } from 'lucide-react';
import { adminApi } from '@/lib/api';
import type { Payment, PaymentsSummary } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[#EAF3DE] text-[#3B6D11]',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
  expired: 'bg-gray-100 text-gray-500',
  failed: 'bg-red-50 text-red-600',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      adminApi.getPayments(statusFilter ? { status_filter: statusFilter } : undefined),
      adminApi.getPaymentsSummary(),
    ])
      .then(([p, s]) => { setPayments(p); setSummary(s); })
      .catch(() => setError('Ödeme bilgileri yüklenemedi.'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
  useEffect(load, [statusFilter]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ödemeler</h1>
        <p className="text-sm text-gray-500 mt-0.5">iyzico abonelik ve ödeme takibi</p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-12 h-12 rounded-xl bg-[#EEEDFE] text-[#534AB7] flex items-center justify-center mb-4"><CreditCard className="w-6 h-6" /></div>
            <p className="text-3xl font-bold text-gray-900">{summary.total_subscriptions}</p>
            <p className="text-sm text-gray-500 mt-1">Toplam abonelik kaydı</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-12 h-12 rounded-xl bg-[#EAF3DE] text-[#3B6D11] flex items-center justify-center mb-4"><Users className="w-6 h-6" /></div>
            <p className="text-3xl font-bold text-gray-900">{summary.by_status.active || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Aktif abone</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-12 h-12 rounded-xl bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center mb-4"><Wallet className="w-6 h-6" /></div>
            <p className="text-3xl font-bold text-gray-900">₺{summary.mrr_estimate.toLocaleString('tr-TR')}</p>
            <p className="text-sm text-gray-500 mt-1">Tahmini aylık gelir (MRR)</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="w-12 h-12 rounded-xl bg-[#E6F1FB] text-[#185FA5] flex items-center justify-center mb-4"><TrendingUp className="w-6 h-6" /></div>
            <p className="text-3xl font-bold text-gray-900">{summary.active_by_plan.yearly || 0}/{summary.active_by_plan.monthly || 0}</p>
            <p className="text-sm text-gray-500 mt-1">Yıllık / Aylık aktif</p>
          </div>
        </div>
      )}

      <div className="bg-amber-50 text-amber-700 rounded-2xl px-4 py-3 text-sm">
        iyzico henüz sandbox anahtarlarıyla test edilmedi — canlı ödeme akışı doğrulanana kadar buradaki veriler test/boş olabilir (bkz. Bölüm 4: iyzico canlı doğrulama).
      </div>

      <div className="flex gap-2">
        {['', 'active', 'pending', 'cancelled', 'expired', 'failed'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[#534AB7] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {s || 'Tümü'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 rounded-2xl px-4 py-3 text-sm">{error}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Kullanıcı', 'E-posta', 'Plan', 'Durum', 'Dönem sonu', 'Oluşturulma'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">Henüz abonelik kaydı yok.</td></tr>
              ) : payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.display_name || p.username || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{p.plan_code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{p.current_period_end ? new Date(p.current_period_end).toLocaleDateString('tr-TR') : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
