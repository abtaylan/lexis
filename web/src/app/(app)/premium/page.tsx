'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Crown, Check, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Spinner, Badge } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { subscriptionApi } from '@/lib/api';
import type { PricingPlan, SubscriptionStatus } from '@/types';

const FEATURES = [
  'Kelime öğrenirken reklam görmezsin',
  'Kelime tahmin oyununda ekstra XP',
  'Haftalık/aylık lider tablosu ödüllerine katılım önceliği',
  'Tüm günlük aktivite modüllerine sınırsız erişim',
];

function injectAndRunScripts(container: HTMLDivElement) {
  const scripts = Array.from(container.querySelectorAll('script'));
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
    newScript.text = oldScript.textContent || '';
    oldScript.replaceWith(newScript);
  });
}

export default function PremiumPage() {
  const { user, updateUser } = useAuth();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [error, setError] = useState('');
  const checkoutContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [plansRes, statusRes] = await Promise.all([
          subscriptionApi.getPlans(),
          subscriptionApi.getStatus(),
        ]);
        setPlans(plansRes);
        setSubStatus(statusRes);
        updateUser({ is_premium: statusRes.is_premium, premium_until: statusRes.premium_until });
      } catch {
        setError('Plan bilgileri alınamadı.');
      } finally {
        setLoading(false);
      }
    })();
  }, [updateUser]);

  const handleCheckout = async (planCode: 'monthly' | 'yearly') => {
    setError('');
    setCheckingOut(planCode);
    try {
      const res = await subscriptionApi.checkout(planCode);
      if (res.payment_page_url) {
        window.location.href = res.payment_page_url;
        return;
      }
      if (res.checkout_form_content && checkoutContainerRef.current) {
        checkoutContainerRef.current.innerHTML = res.checkout_form_content;
        injectAndRunScripts(checkoutContainerRef.current);
      } else {
        setError('Ödeme formu oluşturulamadı.');
      }
    } catch {
      setError('Ödeme başlatılamadı, lütfen tekrar deneyin.');
    } finally {
      setCheckingOut(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Aboneliğini iptal etmek istediğine emin misin? Dönem sonuna kadar premium erişimin devam eder.')) return;
    try {
      await subscriptionApi.cancel();
      const statusRes = await subscriptionApi.getStatus();
      setSubStatus(statusRes);
    } catch {
      setError('Abonelik iptal edilemedi.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center"><Spinner size="lg" /></div>
    );
  }

  const isPremium = !!subStatus?.is_premium;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title="Lexis Premium" subtitle="Reklamsız, sınırsız kelime öğrenme deneyimi" />

      {statusParam === 'success' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
          Ödemen alındı, premium üyeliğin aktifleşti 🎉
        </div>
      )}
      {statusParam === 'failed' && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">
          Ödeme tamamlanamadı. Tekrar deneyebilirsin.
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {isPremium ? (
        <Card className="p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Premium üyesin</p>
              <p className="text-sm text-slate-400">
                {subStatus?.premium_until && `Dönem sonu: ${new Date(subStatus.premium_until).toLocaleDateString('tr-TR')}`}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleCancel}>Aboneliği İptal Et</Button>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {plans.map((plan) => (
              <Card key={plan.code} className="p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-slate-500">{plan.interval_label}</span>
                  {plan.code === 'yearly' && <Badge variant="warning">En avantajlı</Badge>}
                </div>
                <p className="text-3xl font-bold text-slate-800 mb-4">
                  {plan.price.toFixed(2)} <span className="text-base font-normal text-slate-400">{plan.currency}</span>
                </p>
                <Button
                  variant="primary"
                  className="mt-auto"
                  loading={checkingOut === plan.code}
                  onClick={() => handleCheckout(plan.code)}
                >
                  {plan.interval_label} Abone Ol
                </Button>
              </Card>
            ))}
          </div>

          <Card className="p-6 mb-8">
            <p className="font-semibold text-slate-800 mb-3">Premium ile neler değişir?</p>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />{f}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-slate-400">
                <X className="w-4 h-4 mt-0.5 shrink-0" />Premium olmayan hesaplarda kenar reklamları gösterilir
              </li>
            </ul>
          </Card>
        </>
      )}

      {/* iyzico checkout form buraya enjekte edilir */}
      <div ref={checkoutContainerRef} id="iyzipay-checkout-form" />
    </div>
  );
}
