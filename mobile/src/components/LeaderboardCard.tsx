import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/api/stats';
import type { LeaderboardEntry, LeaderboardPeriod } from '@/api/types';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';

export function LeaderboardCard({ limit = 5 }: { limit?: number }) {
  const { lbLabels } = useLocale();
  const c = useThemeColors();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['leaderboard', period, limit],
    queryFn: () => statsApi.getLeaderboard(period, limit),
  });

  const tabs: { key: LeaderboardPeriod; label: string }[] = [
    { key: 'all', label: lbLabels.tabAll },
    { key: 'weekly', label: lbLabels.tabWeekly },
    { key: 'monthly', label: lbLabels.tabMonthly },
  ];

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ color: c.text, fontWeight: '600', fontSize: 14, marginBottom: spacing.sm }}>
        🏆 {lbLabels.title}
      </Text>
      <View style={[styles.tabsRow, { backgroundColor: c.background }]}>
        {tabs.map((tb) => (
          <Pressable
            key={tb.key}
            onPress={() => setPeriod(tb.key)}
            style={[styles.tab, period === tb.key && { backgroundColor: c.surface }]}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: period === tb.key ? c.text : c.textMuted }}>
              {tb.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading && <Text style={{ color: c.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: spacing.md }}>{lbLabels.loading}</Text>}
      {isError && <Text style={{ color: c.danger, fontSize: 12, textAlign: 'center', paddingVertical: spacing.md }}>{lbLabels.error}</Text>}
      {!isLoading && !isError && data && data.top.length === 0 && (
        <Text style={{ color: c.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: spacing.md }}>{lbLabels.empty}</Text>
      )}
      {!isLoading && !isError && data && data.top.length > 0 && (
        <View style={{ marginTop: spacing.sm, gap: 4 }}>
          {data.top.map((entry) => (
            <Row key={entry.user_id} entry={entry} isMe={entry.user_id === data.me.user_id} youLabel={lbLabels.you} pointsLabel={lbLabels.points} />
          ))}
          {!data.me.in_top && (
            <>
              <Text style={{ textAlign: 'center', color: c.textMuted, fontSize: 12 }}>···</Text>
              <Row entry={data.me} isMe youLabel={lbLabels.you} pointsLabel={lbLabels.points} />
            </>
          )}
        </View>
      )}
    </Card>
  );
}

function Row({ entry, isMe, youLabel, pointsLabel }: { entry: LeaderboardEntry; isMe: boolean; youLabel: string; pointsLabel: string }) {
  const c = useThemeColors();
  const initial = (entry.username || '?').charAt(0).toUpperCase();
  return (
    <View style={[styles.row, isMe && { backgroundColor: c.warningSoft, borderRadius: radius.md }]}>
      <Text style={[styles.rank, { color: entry.rank <= 3 ? c.warning : c.textMuted }]}>
        {entry.rank <= 3 ? '👑' : entry.rank}
      </Text>
      <View style={[styles.avatar, { backgroundColor: c.border }]}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSecondary }}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }} numberOfLines={1}>
          {entry.username} {isMe ? `(${youLabel})` : ''}
        </Text>
        <Text style={{ fontSize: 11, color: c.textMuted }}>Lv. {entry.level}</Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSecondary }}>
        {entry.xp.toLocaleString()} {pointsLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', borderRadius: radius.md, padding: 4, gap: 2 },
  tab: { flex: 1, paddingVertical: 6, borderRadius: radius.sm, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6, paddingHorizontal: 6 },
  rank: { width: 20, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
