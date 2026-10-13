// src/components/ads/RewardedAdButton.tsx — "Reklam izle, bonus XP kazan".
// Premium kullanıcıya, reklam yüklenmemişse ya da günlük hak bittiyse hiçbir
// şey render etmez. Ödül sunucuda verilir (POST /ads/reward, günde 5 sınır).
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { adsApi } from '@/api/ads';
import { isRewardedAvailable, showRewardedAd } from '@/lib/adsManager';

type S = { label: string; earned: string };
const STR: Record<string, S> = {
  tr: { label: 'Reklam izle, +10 XP kazan', earned: '+10 XP kazandın! 🎉' },
  en: { label: 'Watch an ad, earn +10 XP', earned: 'You earned +10 XP! 🎉' },
  de: { label: 'Werbung ansehen, +10 XP verdienen', earned: 'Du hast +10 XP verdient! 🎉' },
  fr: { label: 'Regarder une pub, gagner +10 XP', earned: 'Tu as gagné +10 XP ! 🎉' },
  es: { label: 'Ver un anuncio, ganar +10 XP', earned: '¡Ganaste +10 XP! 🎉' },
  it: { label: 'Guarda un annuncio, ottieni +10 XP', earned: 'Hai guadagnato +10 XP! 🎉' },
  pt: { label: 'Assista a um anúncio, ganhe +10 XP', earned: 'Você ganhou +10 XP! 🎉' },
  ru: { label: 'Посмотреть рекламу, +10 XP', earned: 'Ты получил +10 XP! 🎉' },
  ar: { label: 'شاهد إعلانًا واكسب +10 نقاط خبرة', earned: 'لقد ربحت +10 نقاط خبرة! 🎉' },
  ja: { label: '広告を見て +10 XP をゲット', earned: '+10 XP を獲得しました！🎉' },
};

export function RewardedAdButton() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const s = STR[locale] ?? STR.en;
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [earned, setEarned] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    if (user?.is_premium) return;
    let cancelled = false;
    // Reklam arka planda yükleniyor; birkaç kez yoklayıp hazır olunca göster.
    const check = () => { if (!cancelled) setAvailable(isRewardedAvailable()); };
    check();
    const id = setInterval(check, 2000);
    adsApi.rewardStatus().then((r) => { if (!cancelled && r.remaining <= 0) setExhausted(true); }).catch(() => {});
    return () => { cancelled = true; clearInterval(id); };
  }, [user?.is_premium]);

  if (user?.is_premium || exhausted) return null;
  if (earned) {
    return <Text style={{ color: c.success, fontWeight: '700', textAlign: 'center', marginTop: spacing.sm }}>{s.earned}</Text>;
  }
  if (!available) return null;

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const watched = await showRewardedAd();
      if (!watched) return;
      const res = await adsApi.claimReward();
      setEarned(true);
      if (res.remaining <= 0) setExhausted(true);
      queryClient.invalidateQueries({ queryKey: ['xp'] });
      queryClient.invalidateQueries({ queryKey: ['stats-summary'] });
    } catch {
      setExhausted(true); // 429 vb. — günlük sınır / hız sınırı
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button title={s.label} variant="secondary" onPress={onPress} loading={busy} />
    </>
  );
}
