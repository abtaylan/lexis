// src/components/ReferralPromoCard.tsx — dashboard'da referans/davet
// programını daha görünür kılmak için kompakt promo banner'ı (24 Eylül
// 2026, Task #12: "Referral programını daha görünür kıl"). Programın
// kendisi zaten var (bkz. profile.tsx'teki tam bölüm + backend/app/api/
// routes/referrals.py) — burada YENİ bir özellik EKLENMİYOR, sadece
// dashboard'a (kullanıcının her gün gördüğü ekran) bir giriş noktası
// ekleniyor. DailyWordCard.tsx ile AYNI "soft-disable" deseni: kendi
// sorgusunu kendi yapar, referral_code gelmezse (henüz yüklenmedi/hata)
// hiçbir şey render etmez. Dokununca profile.tsx'teki tam bölüme gider
// (ayrı bir referral ekranı YOK, var olan akışı tekrar kullanıyoruz).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Gift, ChevronRight } from 'lucide-react-native';
import { referralsApi } from '@/api/referrals';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useLocale } from '@/i18n';
import { radius, spacing } from '@/constants/theme';

export function ReferralPromoCard() {
  const c = useThemeColors();
  const { mt } = useLocale();

  const { data: referrals } = useQuery({
    queryKey: ['my-referrals'],
    queryFn: referralsApi.getMine,
    retry: false,
  });

  if (!referrals?.referral_code) return null;

  return (
    <Pressable
      onPress={() => router.push('/(app)/profile')}
      style={({ pressed }) => [styles.wrap, { backgroundColor: c.primarySoft, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.icon, { backgroundColor: c.surface }]}>
        <Gift color={c.primary} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
          {mt('referralSectionTitle')}
        </Text>
        <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
          {mt('referralSectionDesc')}
        </Text>
        <View style={styles.ctaRow}>
          <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>{mt('referralDashboardCta')}</Text>
          <ChevronRight color={c.primary} size={14} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 4,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  icon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.xs },
});
