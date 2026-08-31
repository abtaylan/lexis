'use client';

// components/layout/BadgeShowcase.tsx — Kullanıcının kazandığı rozetleri
// (bkz. backend/app/services/badge_service.py) profil sayfasında ızgara
// halinde gösterir. Backend: GET /stats/badges.
//
// XPBar.tsx'teki desenle aynı: merkezi i18n.tsx'e dokunmadan yerel çeviri
// sözlüğü kullanılıyor.

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { statsApi, type UserBadge } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

const BADGE_LABELS: Record<Locale, { title: string; empty: string; loading: string }> = {
  tr: { title: 'Rozetlerim', empty: 'Henüz rozet kazanmadın — çalışmaya devam!', loading: 'Yükleniyor…' },
  en: { title: 'My Badges', empty: "You haven't earned a badge yet — keep going!", loading: 'Loading…' },
  de: { title: 'Meine Abzeichen', empty: 'Du hast noch kein Abzeichen verdient — mach weiter!', loading: 'Lädt…' },
  fr: { title: 'Mes badges', empty: "Tu n'as pas encore gagné de badge — continue !", loading: 'Chargement…' },
  es: { title: 'Mis insignias', empty: 'Aún no has ganado ninguna insignia — ¡sigue así!', loading: 'Cargando…' },
  it: { title: 'I miei badge', empty: 'Non hai ancora guadagnato un badge — continua così!', loading: 'Caricamento…' },
  ar: { title: 'أوسمتي', empty: 'لم تحصل على وسام بعد — واصل التقدم!', loading: 'جارٍ التحميل…' },
  ru: { title: 'Мои значки', empty: 'Вы ещё не заработали значок — продолжайте!', loading: 'Загрузка…' },
  ja: { title: 'マイバッジ', empty: 'まだバッジを獲得していません — がんばって!', loading: '読み込み中…' },
  pt: { title: 'As Minhas Insígnias', empty: 'Ainda não ganhaste nenhuma insígnia — continua!', loading: 'A carregar…' },
};

interface BadgeShowcaseProps {
  className?: string;
}

export function BadgeShowcase({ className }: BadgeShowcaseProps) {
  const { locale } = useLocale();
  const labels = BADGE_LABELS[locale] ?? BADGE_LABELS.en;
  const [badges, setBadges] = useState<UserBadge[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    statsApi
      .getBadges()
      .then((res) => {
        if (!cancelled) setBadges(res);
      })
      .catch(() => {
        // Sessizce boş listeye düş — rozet gösterimi kritik yol değil
        // (XPBar.tsx'teki "istek başarısız olursa hiçbir şey gösterme"
        // yaklaşımından farklı olarak burada boş-durum mesajı daha uygun,
        // çünkü kart zaten profil sayfasında sabit bir yer kaplıyor).
        if (!cancelled) setBadges([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Rozet adı/açıklaması artık badges tablosunda 10 dilin tamamında var
  // (bkz. backend/app/services/badge_service.py) — sadece tr/en özel durumu
  // yerine doğrudan aktif arayüz diline göre seçiyoruz, İngilizce'ye düşerek.
  const nameKey = `name_${locale}`;
  const descKey = `description_${locale}`;

  return (
    <div className={clsx('bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4', className)}>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{labels.title}</h2>
      {badges === null ? (
        <p className="text-sm text-gray-400">{labels.loading}</p>
      ) : badges.length === 0 ? (
        <p className="text-sm text-gray-400">{labels.empty}</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {badges.map((b, i) => {
            const badge = b.badges as Record<string, unknown> | undefined;
            const name = (badge?.[nameKey] || badge?.name_en || b.badge_code) as string;
            const desc = (badge?.[descKey] || badge?.description_en || '') as string;
            return (
              <div
                key={`${b.badge_code}-${b.period_key ?? 'once'}-${i}`}
                title={desc}
                className="flex flex-col items-center gap-1 rounded-xl border border-amber-100 bg-amber-50 p-3 text-center"
              >
                <span className="text-2xl leading-none">{badge?.icon_emoji ?? '🏅'}</span>
                <span className="text-[11px] font-medium text-gray-700 leading-tight line-clamp-2">{name}</span>
                {b.period_key && <span className="text-[10px] text-gray-400">{b.period_key}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
