'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Crown, Check, X, Lock } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Spinner, Badge } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { subscriptionApi } from '@/lib/api';
import type { PricingPlan, SubscriptionStatus } from '@/types';
import { useLocale, type Locale } from '@/lib/i18n';

// Yerel tarih biçimi için toLocaleDateString hedef locale'i — interfaceLanguageLabel
// vb. gibi ayrı bir sözlük anahtarı gerektirmiyor, sadece Intl için doğru kodu seçiyor.
const DATE_LOCALE: Record<Locale, string> = {
  tr: 'tr-TR', en: 'en-US', ar: 'ar-SA', ru: 'ru-RU',
  de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', ja: 'ja-JP',
};

// lexiswords.com (landing) üzerindeki yasal sayfalar — 28 Ağustos 2026 oturumunda
// eklendi. app.lexiswords.com ayrı bir Vercel projesi olduğundan mutlak URL kullanılıyor.
const LEGAL_SITE_URL = process.env.NEXT_PUBLIC_LEGAL_SITE_URL || 'https://lexiswords.com';
const DISTANCE_SALES_URL = `${LEGAL_SITE_URL}/mesafeli-satis-sozlesmesi`;
const PRIVACY_URL = `${LEGAL_SITE_URL}/gizlilik-politikasi`;
const REFUND_URL = `${LEGAL_SITE_URL}/teslimat-iade-sartlari`;

function injectAndRunScripts(container: HTMLDivElement) {
  const scripts = Array.from(container.querySelectorAll('script'));
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
    newScript.text = oldScript.textContent || '';
    oldScript.replaceWith(newScript);
  });
}

// iyzico "Logo Paketi" + kart ağı logoları — güvenlik/marka rozetleri.
// visa.svg/mastercard.svg/amex.png resmi marka merkezlerinden (Wikimedia Commons
// üzerinden doğrulanmış güncel logolar) 29 Ağustos 2026'da alındı. troy.svg TROY'un
// resmi medya merkezinden (troyodeme.com/tr/troy-hakkinda/medya-merkezi) 30 Ağustos
// 2026'da alındı — iyzico'nun kendi entegrasyonunda da aynı şekilde marka izni
// alınmadan kullanıldığı için burada da doğrudan eklendi.
function PaymentTrustBadges() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex items-center gap-4 flex-wrap justify-center">
        <Image src="/payment/iyzico.svg" alt="iyzico ile Öde" width={120} height={42} className="h-8 w-auto" />
        <Image src="/payment/visa.svg" alt="Visa" width={52} height={17} className="h-5 w-auto" />
        <Image src="/payment/mastercard.svg" alt="Mastercard" width={52} height={32} className="h-7 w-auto" />
        <Image src="/payment/amex.png" alt="American Express" width={52} height={52} className="h-7 w-auto rounded" />
        <Image src="/payment/troy.svg" alt="Troy" width={71} height={33} className="h-7 w-auto" />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Lock className="w-3.5 h-3.5" />
        <span>256-bit SSL ile güvenli ödeme — kart bilgileriniz tarafımızca saklanmaz.</span>
      </div>
    </div>
  );
}

export default function PremiumPage() {
  const { updateUser } = useAuth();
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');

  const FEATURES = [t('premiumFeature1'), t('premiumFeature2'), t('premiumFeature3'), t('premiumFeature4')];

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [error, setError] = useState('');
  // Döviz bazlı fiyatlandırma — backend sadece .env'de fiyat/ref tanımlı olan
  // para birimlerini döner. Bugün için (TRY dışında hiçbir şey yapılandırılmadıysa)
  // bu her zaman tek elemanlı ['TRY'] olur ve seçici hiç görünmez.
  const [selectedCurrency, setSelectedCurrency] = useState<string>('TRY');
  // iyzico üye iş yeri gerekliliği: satın alma öncesi Mesafeli Satış Sözleşmesi
  // onayı zorunlu (bkz. lexis_kalan_isler — "iyzico'da özel yeni API key'leri" maddesi).
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const checkoutContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [plansRes, statusRes] = await Promise.all([
          subscriptionApi.getPlans(),
          subscriptionApi.getStatus(),
        ]);
        setPlans(plansRes);
        const currencies = Array.from(new Set(plansRes.map((p) => p.currency)));
        if (currencies.length && !currencies.includes('TRY')) {
          setSelectedCurrency(currencies[0]);
        }
        setSubStatus(statusRes);
        updateUser({ is_premium: statusRes.is_premium, premium_until: statusRes.premium_until });
      } catch {
        setError(t('premiumPlansLoadError'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 't' kasıtlı dışarıda: dahil edilirse arayüz dili değiştiğinde plan/abonelik durumu gereksiz yere yeniden çekilir
  }, [updateUser]);

  const handleCheckout = async (planId: string) => {
    if (!agreedToTerms) {
      setError('Devam etmek için Mesafeli Satış Sözleşmesi\'ni onaylamanız gerekiyor.');
      return;
    }
    setError('');
    setCheckingOut(planId);
    try {
      const res = await subscriptionApi.checkout(planId);
      if (res.payment_page_url) {
        window.location.assign(res.payment_page_url);
        return;
      }
      if (res.checkout_form_content && checkoutContainerRef.current) {
        checkoutContainerRef.current.innerHTML = res.checkout_form_content;
        injectAndRunScripts(checkoutContainerRef.current);
      } else {
        setError(t('premiumCheckoutFormError'));
      }
    } catch {
      setError(t('premiumCheckoutStartError'));
    } finally {
      setCheckingOut(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm(t('premiumCancelConfirm'))) return;
    try {
      await subscriptionApi.cancel();
      const statusRes = await subscriptionApi.getStatus();
      setSubStatus(statusRes);
    } catch {
      setError(t('premiumCancelError'));
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center"><Spinner size="lg" /></div>
    );
  }

  const isPremium = !!subStatus?.is_premium;
  const currencies = Array.from(new Set(plans.map((p) => p.currency)));
  const visiblePlans = plans.filter((p) => p.currency === selectedCurrency);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader title="Lexis Premium" subtitle={t('premiumPageSubtitle')} />

      {statusParam === 'success' && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm">
          {t('premiumSuccessMsg')}
        </div>
      )}
      {statusParam === 'failed' && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
          {t('premiumFailedMsg')}
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm">{error}</div>
      )}

      {isPremium ? (
        <Card className="p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">{t('premiumActive')}</p>
              <p className="text-sm text-slate-400">
                {subStatus?.premium_until && t('premiumPeriodEndTpl').replace('{date}', new Date(subStatus.premium_until).toLocaleDateString(DATE_LOCALE[locale]))}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleCancel}>{t('premiumCancelBtn')}</Button>
        </Card>
      ) : (
        <>
          {currencies.length > 1 && (
            <div className="flex gap-2 mb-4">
              {currencies.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCurrency(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selectedCurrency === c
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {visiblePlans.map((plan) => (
              <Card key={plan.id} className="p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="text-sm font-medium text-slate-500">{plan.interval_label}</span>
                  {plan.code === 'yearly' && <Badge variant="warning">{t('premiumBestValueBadge')}</Badge>}
                </div>
                <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                  {plan.price.toFixed(2)} <span className="text-base font-normal text-slate-400">{plan.currency}</span>
                </p>
                <Button
                  variant="primary"
                  className="mt-auto"
                  loading={checkingOut === plan.id}
                  disabled={!agreedToTerms}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {t('premiumSubscribeBtnTpl').replace('{interval}', plan.interval_label)}
                </Button>
              </Card>
            ))}
          </div>

          {/* iyzico üye iş yeri gerekliliği: satın almadan önce Mesafeli Satış
              Sözleşmesi onayı zorunlu tutuluyor. */}
          <label className="flex items-start gap-2.5 mb-6 text-sm text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <a href={DISTANCE_SALES_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">
                Mesafeli Satış Sözleşmesi
              </a>
              {'’ni ve '}
              <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">
                Gizlilik Politikası
              </a>
              {'’nı okudum, dijital hizmetin onayımla anında ifasına başlanacağını ve bu nedenle cayma hakkımı kaybedeceğimi kabul ediyorum.'}
            </span>
          </label>

          <Card className="p-6 mb-6">
            <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t('premiumFeaturesTitle')}</p>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />{f}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-slate-400">
                <X className="w-4 h-4 mt-0.5 shrink-0" />{t('premiumNoAdsNegative')}
              </li>
            </ul>
          </Card>

          <PaymentTrustBadges />

          <p className="text-center text-xs text-slate-400 mb-2">
            Sorularınız için <a href={REFUND_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">iade koşullarına</a> göz atabilirsiniz.
          </p>
        </>
      )}

      {/* iyzico checkout form buraya enjekte edilir */}
      <div ref={checkoutContainerRef} id="iyzipay-checkout-form" />
    </div>
  );
}
