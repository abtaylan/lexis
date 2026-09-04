'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Crown, Check, X, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, Card, Spinner } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { subscriptionApi } from '@/lib/api';
import type { SubscriptionStatus } from '@/types';
import { useLocale, type Locale } from '@/lib/i18n';

// Yerel tarih biçimi için toLocaleDateString hedef locale'i — interfaceLanguageLabel
// vb. gibi ayrı bir sözlük anahtarı gerektirmiyor, sadece Intl için doğru kodu seçiyor.
const DATE_LOCALE: Record<Locale, string> = {
  tr: 'tr-TR', en: 'en-US', ar: 'ar-SA', ru: 'ru-RU',
  de: 'de-DE', fr: 'fr-FR', es: 'es-ES', it: 'it-IT', ja: 'ja-JP', pt: 'pt-PT',
};

// lexiswords.com (landing) üzerindeki yasal sayfalar — 28 Ağustos 2026 oturumunda
// eklendi. app.lexiswords.com ayrı bir Vercel projesi olduğundan mutlak URL kullanılıyor.
const LEGAL_SITE_URL = process.env.NEXT_PUBLIC_LEGAL_SITE_URL || 'https://lexiswords.com';
const REFUND_URL = `${LEGAL_SITE_URL}/teslimat-iade-sartlari`;

// Store bağlantıları — mobil-yönlendirme CTA'sı için. App Store id'si App Store
// Connect'teki uygulama künyesinden, Play Store paket adı build config'inden alındı.
const APP_STORE_URL = 'https://apps.apple.com/app/id6806612758';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.lexis.mobile';

// 4 Eylül 2026 KARARI: Premium üyelik satışı artık YALNIZCA mobil uygulamadan
// (App Store / Google Play IAP) yapılıyor. Sebep: iyzico'nun Subscription API'si
// (checkout-form) vergi mükellefiyeti/şirket gerektiriyor, oysa mobil IAP + GVK
// mükerrer 20/B istisnası şahıs olarak (şirketsiz) sürdürülebiliyor. Web'de artık
// fiyat/checkout gösterilmiyor; kullanıcı mobil uygulamaya yönlendiriliyor. Mobil
// üzerinden alınan premium, ortak `profiles.is_premium` alanı sayesinde web
// profiline zaten otomatik yansıyor (bkz. backend subscription.py /me).
function redirectToMobileApp() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  window.alert(
    'Premium üyelik artık yalnızca Lexis mobil uygulaması üzerinden satın alınabiliyor. Şimdi mobil uygulamaya yönlendirileceksiniz.'
  );

  if (isIOS) {
    window.location.href = APP_STORE_URL;
  } else if (isAndroid) {
    window.location.href = PLAY_STORE_URL;
  } else {
    // Masaüstü — hangi mağazaya gideceği belli değil, iniş sayfasına yönlendir
    // (indirme rozetleri orada).
    window.location.href = LEGAL_SITE_URL;
  }
}

export default function PremiumPage() {
  const { updateUser } = useAuth();
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');

  const FEATURES = [t('premiumFeature1'), t('premiumFeature2'), t('premiumFeature3'), t('premiumFeature4')];

  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const statusRes = await subscriptionApi.getStatus();
        setSubStatus(statusRes);
        updateUser({ is_premium: statusRes.is_premium, premium_until: statusRes.premium_until });
      } catch {
        setError(t('premiumPlansLoadError'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 't' kasıtlı dışarıda: dahil edilirse arayüz dili değiştiğinde abonelik durumu gereksiz yere yeniden çekilir
  }, [updateUser]);

  const handleCancel = async () => {
    if (!confirm(t('premiumCancelConfirm'))) return;
    setCancelling(true);
    try {
      const res = await subscriptionApi.cancel();
      window.alert(res.message);
      const statusRes = await subscriptionApi.getStatus();
      setSubStatus(statusRes);
    } catch {
      setError(t('premiumCancelError'));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center"><Spinner size="lg" /></div>
    );
  }

  const isPremium = !!subStatus?.is_premium;
  // 'ios' | 'android' — bu abonelik mobil store IAP'ından geliyor, iyzico'dan
  // değil. bkz. backend SubscriptionStatus.store notu.
  const isMobileManaged = subStatus?.store === 'ios' || subStatus?.store === 'android';
  const mobileStoreName = subStatus?.store === 'ios' ? 'App Store' : 'Google Play';

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
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
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
            {!isMobileManaged && (
              <Button variant="outline" loading={cancelling} onClick={handleCancel}>{t('premiumCancelBtn')}</Button>
            )}
          </div>
          {isMobileManaged && (
            <p className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 flex items-start gap-2">
              <Smartphone className="w-4 h-4 mt-0.5 shrink-0" />
              Bu abonelik mobil uygulama üzerinden ({mobileStoreName}) satın alındı. Yönetmek veya iptal etmek için
              cihazınızdaki {mobileStoreName} abonelik ayarlarını kullanın.
            </p>
          )}
        </Card>
      ) : (
        <>
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

          <Card className="p-6 mb-6 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              Premium üyelik artık yalnızca mobil uygulamadan alınıyor
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Üyeliğinizi Lexis mobil uygulaması üzerinden (App Store / Google Play) başlatabilirsiniz.
              Mobilden satın aldığınız Premium, bu web profilinize otomatik olarak yansır.
            </p>
            <Button variant="primary" onClick={redirectToMobileApp}>
              Mobil Uygulamada Aç
            </Button>
          </Card>

          <p className="text-center text-xs text-slate-400 mb-2">
            Sorularınız için <a href={REFUND_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">iade koşullarına</a> göz atabilirsiniz.
          </p>
        </>
      )}
    </div>
  );
}
