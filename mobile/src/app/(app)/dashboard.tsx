import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from '@/i18n';
import { FRIENDS_STRINGS } from '@/i18n/friendsStrings';
import { MESSAGES_STRINGS } from '@/i18n/messagesStrings';
import { statsApi } from '@/api/stats';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { XPBar } from '@/components/XPBar';
import { LeaderboardCard } from '@/components/LeaderboardCard';
import { AdBanner } from '@/components/ads/AdBanner';
import { bulkStorage } from '@/utils/storage';

const ASKED_KEY = 'lexis_notif_permission_asked';

export default function DashboardScreen() {
  const { t, locale } = useLocale();
  const c = useThemeColors();
  const { user } = useAuth();
  const fs = FRIENDS_STRINGS[locale] ?? FRIENDS_STRINGS.tr;
  const ms = MESSAGES_STRINGS[locale] ?? MESSAGES_STRINGS.tr;

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: statsApi.getSummary,
  });

  useEffect(() => {
    (async () => {
      const asked = await bulkStorage.getItem(ASKED_KEY);
      if (!asked) {
        const timer = setTimeout(() => router.push('/(app)/notification-permission'), 1200);
        return () => clearTimeout(timer);
      }
    })();
  }, []);

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={refetch}>
      <Text style={[styles.greeting, { color: c.text }]}>
        {t('greeting')}{user?.display_name ? `, ${user.display_name}` : ''} 👋
      </Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>{t('dailySummarySubtitle')}</Text>

      <XPBar />

      {stats && stats.current_streak > 0 && (
        <Card style={[styles.streakCard, { backgroundColor: c.warningSoft, borderColor: c.warningSoft }]}>
          <Text style={{ fontSize: 20 }}>🔥</Text>
          <Text style={{ color: c.warning, fontWeight: '600', fontSize: 13, flex: 1 }}>
            {stats.current_streak} {t('streakActive')}
          </Text>
        </Card>
      )}

      {!isLoading && stats && (
        <View style={styles.grid}>
          <StatTile label={t('totalWords')} value={String(stats.total_words)} color={c} />
          <StatTile label={t('addedToday')} value={String(stats.today_added)} color={c} />
          <StatTile label={t('dueReview')} value={String(stats.learning)} color={c} />
        </View>
      )}

      <LeaderboardCard />

      <View style={styles.actionsRow}>
        <ActionButton emoji="➕" label={t('addWordBtn')} onPress={() => router.push('/(app)/words')} color={c} />
        <ActionButton emoji="🎮" label={t('startBtn')} onPress={() => router.push('/(app)/game')} color={c} />
      </View>
      <View style={styles.actionsRow}>
        <ActionButton emoji="🧠" label={t('quiz')} onPress={() => router.push('/(app)/quiz')} color={c} />
        <ActionButton emoji="🗂️" label={t('flashcards')} onPress={() => router.push('/(app)/flashcards')} color={c} />
      </View>
      <View style={styles.actionsRow}>
        <ActionButton emoji="📊" label={t('stats')} onPress={() => router.push('/(app)/stats')} color={c} />
      </View>
      <View style={styles.actionsRow}>
        <ActionButton emoji="🤝" label={fs.title} onPress={() => router.push('/(app)/friends')} color={c} />
        <ActionButton emoji="💬" label={ms.inboxTitle} onPress={() => router.push('/(app)/messages')} color={c} />
      </View>
      <View style={styles.actionsRow}>
        <ActionButton emoji="👑" label="Premium" onPress={() => router.push('/(app)/premium')} color={c} />
      </View>

      <AdBanner style={{ marginTop: spacing.sm }} />
    </ScreenContainer>
  );
}

function StatTile({ label, value, color: c }: { label: string; value: string; color: ReturnType<typeof useThemeColors> }) {
  return (
    <Card style={styles.tile}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: c.primary }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </Card>
  );
}

function ActionButton({ emoji, label, onPress, color: c }: { emoji: string; label: string; onPress: () => void; color: ReturnType<typeof useThemeColors> }) {
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, { backgroundColor: c.primary }]}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: spacing.md },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, paddingVertical: spacing.sm },
  grid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tile: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.xl },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: radius.md },
});
