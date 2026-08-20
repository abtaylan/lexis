'use client';

import { useEffect, useState } from 'react';
import { Crown, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { subscriptionApi } from '@/lib/api';
import { useT } from '@/lib/i18n';
import type { PlanInfo, SubscriptionStatus } from '@/types';

export default function PremiumPage() {
  const { t } = useT();
  const [plans, setPlans]     = useState<PlanInfo[]>([]);
  const [status, setStatus]   = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [notice, setNotice]   = useState('');
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [p, s] = await Promise.all([subscriptionApi.getPlans(), subscriptionApi.getStatus()]);
        setPlans(p);
        setStatus(s);
      } catch {
        setError('Premium bilgileri yüklenemedi.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCheckout = async (planCode: string) => {
    setBusyPlan(planCode);
    setNotice('');
    try {
      const res = await subscriptionApi.checkout(planCode);
      setNotice(res.message);
    } catch {
      setNotice('İstek gönderilemedi, lütfen tekrar dene.');
    } finally {
      setBusyPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">{t('app.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
          <Crown className="w-5 h-5 text-[#B45309]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('nav.premium')}</h1>
          <p className="text-sm text-gray-500">Lexis'ten en iyi şekilde faydalanmak için premium'a geç.</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-[#FAEEDA] text-[#854F0B] rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Mevcut durum */}
      <div className={`mt-6 rounded-2xl border p-5 flex items-center justify-between ${
        status?.is_premium ? 'bg-[#FEF3C7] border-[#FDE68A]' : 'bg-white border-gray-100'
      }`}>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {status?.is_premium ? 'Premium üyeliğin aktif' : 'Şu anda ücretsiz plandasın'}
          </p>
          {status?.is_premium && status?.premium_until && (
            <p className="text-xs text-gray-500 mt-0.5">
              Geçerlilik: {new Date(status.premium_until).toLocaleDateString('tr-TR')}
            </p>
          )}
          {!status?.is_premium && (
            <p className="text-xs text-gray-500 mt-0.5">Aşağıdaki planlardan birini seçerek premium'a geçebilirsin.</p>
          )}
        </div>
        {status?.is_premium && <Crown className="w-6 h-6 text-[#B45309]" />}
      </div>

      {notice && (
        <div className="mt-4 bg-[#E6F1FB] text-[#1d5a8f] rounded-xl px-4 py-3 text-sm">{notice}</div>
      )}

      {/* Planlar */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div key={plan.code} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{plan.name}</p>
              {plan.period === 'yearly' && (
                <span className="text-xs font-semibold text-[#3B6D11] bg-[#EAF3DE] px-2 py-0.5 rounded-full">En avantajlı</span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {plan.price_try.toLocaleString('tr-TR')}₺
              <span className="text-sm font-medium text-gray-400"> / {plan.period === 'monthly' ? 'ay' : 'yıl'}</span>
            </p>

            <ul className="mt-4 space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-[#3B6D11] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.code)}
              disabled={busyPlan === plan.code || status?.is_premium}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors"
            >
              {busyPlan === plan.code ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {status?.is_premium ? 'Zaten premium' : 'Satın al'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        Ödeme altyapısı (iyzico) şu an geliştirme aşamasında — satın alma isteğin kaydedilir, canlı ödeme akışı tamamlandığında bildirim alırsın.
      </p>
    </div>
  );
}
