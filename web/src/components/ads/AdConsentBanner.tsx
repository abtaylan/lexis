'use client';

// components/ads/AdConsentBanner.tsx — KVKK/GDPR reklam onayı banner'ı.
// Kullanıcı henüz karar vermemişse (useAdConsent().consent === null) sayfanın
// altında sabit bir şerit olarak görünür; Kabul/Reddet seçimi
// lib/adConsent.tsx üzerinden localStorage'a yazılır ve AdBanner.tsx bu
// karara göre AdSense script'ini yükleyip yüklememeye karar verir.
//
// Merkezi i18n.tsx sözlüğüne dokunmadan yerel çeviri — XPBar.tsx/
// BadgeShowcase.tsx'teki desenle aynı yaklaşım.
import { useAdConsent } from '@/lib/adConsent';
import { useLocale, type Locale } from '@/lib/i18n';

const CONSENT_LABELS: Record<Locale, { text: string; accept: string; reject: string }> = {
  tr: {
    text: 'Lexis\'i ücretsiz sunabilmek için kişiselleştirilmiş reklamlar gösteriyoruz. Reklam çerezlerine izin vermek ister misin? Reddetmen hesabını veya öğrenme verilerini hiçbir şekilde etkilemez.',
    accept: 'Kabul Et',
    reject: 'Reddet',
  },
  en: {
    text: "We show personalized ads to keep Lexis free. Do you consent to advertising cookies? Declining won't affect your account or learning data in any way.",
    accept: 'Accept',
    reject: 'Decline',
  },
  de: {
    text: 'Wir zeigen personalisierte Werbung, um Lexis kostenlos anbieten zu können. Stimmst du Werbe-Cookies zu? Eine Ablehnung wirkt sich nicht auf dein Konto oder deine Lerndaten aus.',
    accept: 'Akzeptieren',
    reject: 'Ablehnen',
  },
  fr: {
    text: "Nous affichons des publicités personnalisées pour proposer Lexis gratuitement. Acceptes-tu les cookies publicitaires ? Un refus n'affecte en rien ton compte ou tes données d'apprentissage.",
    accept: 'Accepter',
    reject: 'Refuser',
  },
  es: {
    text: 'Mostramos anuncios personalizados para poder ofrecer Lexis gratis. ¿Aceptas las cookies publicitarias? Rechazarlas no afecta a tu cuenta ni a tus datos de aprendizaje.',
    accept: 'Aceptar',
    reject: 'Rechazar',
  },
  it: {
    text: 'Mostriamo annunci personalizzati per offrire Lexis gratuitamente. Accetti i cookie pubblicitari? Rifiutare non influisce in alcun modo sul tuo account o sui tuoi dati di apprendimento.',
    accept: 'Accetta',
    reject: 'Rifiuta',
  },
  ar: {
    text: 'نعرض إعلانات مخصصة لنتمكن من تقديم Lexis مجانًا. هل توافق على ملفات تعريف الارتباط الإعلانية؟ الرفض لا يؤثر على حسابك أو بيانات تعلمك بأي شكل.',
    accept: 'موافق',
    reject: 'رفض',
  },
  ru: {
    text: 'Мы показываем персонализированную рекламу, чтобы Lexis оставался бесплатным. Согласны ли вы на рекламные файлы cookie? Отказ никак не повлияет на ваш аккаунт или данные обучения.',
    accept: 'Принять',
    reject: 'Отклонить',
  },
  ja: {
    text: 'Lexisを無料で提供するためにパーソナライズ広告を表示しています。広告Cookieに同意しますか?拒否してもアカウントや学習データには一切影響しません。',
    accept: '同意する',
    reject: '拒否する',
  },
};

export function AdConsentBanner() {
  const { consent, loaded, accept, reject } = useAdConsent();
  const { locale } = useLocale();
  const labels = CONSENT_LABELS[locale] ?? CONSENT_LABELS.en;

  if (!loaded || consent !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-600 dark:text-slate-300 sm:pr-4">{labels.text}</p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={reject}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {labels.reject}
          </button>
          <button
            type="button"
            onClick={accept}
            className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-700"
          >
            {labels.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
