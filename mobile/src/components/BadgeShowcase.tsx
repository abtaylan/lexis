// src/components/BadgeShowcase.tsx — web'deki components/layout/BadgeShowcase.tsx'in
// mobil karşılığı. Kullanıcının kazandığı rozetleri (bkz.
// backend/app/services/badge_service.py) profil ekranında ızgara halinde
// gösterir. Backend: GET /stats/badges. XPBar.tsx'teki desenle aynı: react-query
// + useThemeColors + i18n/dashboardStrings.ts'teki merkezi BADGE_LABELS.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/api/stats';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';

export function BadgeShowcase() {
  const { locale, badgeLabels } = useLocale();
  const c = useThemeColors();
  const { data: badges, isLoading } = useQuery({
    queryKey: ['badges'],
    queryFn: statsApi.getBadges,
  });

  // Rozet adı/açıklaması artık badges tablosunda 10 dilin tamamında var
  // (bkz. backend/app/services/badge_service.py) — sadece tr/en özel durumu
  // yerine doğrudan aktif arayüz diline göre seçiyoruz, İngilizce'ye düşerek.
  const nameKey = `name_${locale}`;
  const descKey = `description_${locale}`;

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={[styles.title, { color: c.textMuted }]}>{badgeLabels.title}</Text>
      {isLoading || !badges ? (
        <Text style={{ color: c.textMuted, fontSize: 13 }}>{badgeLabels.loading}</Text>
      ) : badges.length === 0 ? (
        <Text style={{ color: c.textMuted, fontSize: 13 }}>{badgeLabels.empty}</Text>
      ) : (
        <View style={styles.grid}>
          {badges.map((b, i) => {
            const badge = b.badges as Record<string, unknown> | undefined;
            const name = (badge?.[nameKey] || badge?.name_en || b.badge_code) as string;
            void ((badge?.[descKey] || badge?.description_en || '') as string); // erişilebilirlik için ileride kullanılabilir
            return (
              <View
                key={`${b.badge_code}-${b.period_key ?? 'once'}-${i}`}
                style={[styles.badge, { backgroundColor: c.warningSoft, borderColor: c.border }]}
              >
                <Text style={styles.emoji}>{badge?.icon_emoji ?? '🏅'}</Text>
                <Text numberOfLines={2} style={[styles.badgeName, { color: c.text }]}>
                  {name}
                </Text>
                {b.period_key ? (
                  <Text style={[styles.periodKey, { color: c.textMuted }]}>{b.period_key}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    width: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  emoji: { fontSize: 22 },
  badgeName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  periodKey: { fontSize: 9 },
});
