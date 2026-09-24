'use client';

// components/layout/ReferralPromoCard.tsx — dashboard'da referans/davet
// programını daha görünür kılmak için kompakt promo kartı (24 Eylül 2026,
// Task #12: "Referral programını daha görünür kıl"). Programın kendisi
// zaten var (bkz. profile/page.tsx'teki tam bölüm + backend/app/api/
// routes/referrals.py) — burada YENİ bir özellik EKLENMİYOR, sadece
// dashboard'a (kullanıcının her gün gördüğü sayfa) bir giriş noktası
// ekleniyor. DailyWordCard.tsx ile AYNI self-contained "soft-disable"
// deseni: referral_code gelmezse/hata durumunda kart hiç gösterilmez.
// Tıklanınca /profile#referral'a gider (ayrı bir referral sayfası YOK,
// var olan bölüme yönlendiriyoruz).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, ChevronRight } from 'lucide-react';
import { referralsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { ReferralsSummary } from '@/types';

const LABELS: Partial<Record<Locale, { title: string; desc: string; cta: string }>> = {
  tr: {
    title: 'Arkadaşını Davet Et',
    desc: 'Kodunu paylaş: arkadaşın 3 günlük seriye ulaşınca sana +30 XP ve 3 gün ücretsiz Premium, ona +15 XP verilir.',
    cta: 'Şimdi Davet Et',
  },
  en: {
    title: 'Invite a Friend',
    desc: "Share your code: once your friend hits a 3-day streak, you get +30 XP and 3 days of free Premium, they get +15 XP.",
    cta: 'Invite Now',
  },
  de: {
    title: 'Freund einladen',
    desc: 'Teile deinen Code: Sobald dein Freund eine 3-Tage-Serie erreicht, erhältst du +30 XP und 3 Tage kostenloses Premium, er/sie +15 XP.',
    cta: 'Jetzt einladen',
  },
  fr: {
    title: 'Invite un ami',
    desc: 'Partage ton code : dès que ton ami atteint une série de 3 jours, tu gagnes +30 XP et 3 jours de Premium gratuit, il/elle gagne +15 XP.',
    cta: 'Inviter maintenant',
  },
  es: {
    title: 'Invita a un amigo',
    desc: 'Comparte tu código: cuando tu amigo alcance una racha de 3 días, tú ganas +30 XP y 3 días de Premium gratis, él/ella gana +15 XP.',
    cta: 'Invitar ahora',
  },
  it: {
    title: 'Invita un amico',
    desc: 'Condividi il tuo codice: quando il tuo amico raggiunge una serie di 3 giorni, tu ricevi +30 XP e 3 giorni di Premium gratis, lui/lei riceve +15 XP.',
    cta: 'Invita ora',
  },
  ar: {
    title: 'ادعُ صديقًا',
    desc: 'شارك رمزك: عندما يصل صديقك إلى سلسلة 3 أيام، تحصل أنت على +30 نقطة خبرة و3 أيام بريميوم مجانًا، ويحصل هو/هي على +15 نقطة خبرة.',
    cta: 'ادعُ الآن',
  },
  ru: {
    title: 'Пригласи друга',
    desc: 'Поделись своим кодом: как только твой друг достигнет серии в 3 дня, ты получишь +30 XP и 3 дня бесплатного Premium, а он/она — +15 XP.',
    cta: 'Пригласить сейчас',
  },
  ja: {
    title: '友達を招待',
    desc: 'コードをシェアしよう:友達が3日連続達成すると、あなたに+30XPと3日間の無料プレミアム、友達に+15XPが付与されます。',
    cta: '今すぐ招待',
  },
  pt: {
    title: 'Convida um Amigo',
    desc: 'Partilha o teu código: quando o teu amigo atingir uma sequência de 3 dias, tu ganhas +30 XP e 3 dias de Premium grátis, ele/ela ganha +15 XP.',
    cta: 'Convidar agora',
  },
};

export function ReferralPromoCard() {
  const { locale } = useLocale();
  const [data, setData] = useState<ReferralsSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    referralsApi
      .getMine()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        /* soft-disable -- referral_code henuz atanmadiysa/hata durumunda kart hic gosterilmez */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || !data?.referral_code) return null;

  const t = LABELS[locale] ?? LABELS.tr!;

  return (
    <Link
      href="/profile"
      className="flex items-start gap-4 bg-[#EAF3FC] dark:bg-[#378ADD]/10 rounded-2xl border border-transparent px-4 py-3 hover:border-[#378ADD] transition-colors"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-slate-900 text-[#378ADD] shrink-0">
        <Gift className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t.title}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.desc}</p>
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#378ADD] mt-1.5">
          {t.cta}
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </Link>
  );
}
