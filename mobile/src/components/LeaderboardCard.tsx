import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Crown } from 'lucide-react-native';
import { statsApi } from '@/api/stats';
import type { LeaderboardEntry, LeaderboardPeriod } from '@/api/types';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing, type ThemeColors } from '@/constants/theme';

// Satıra dokununca profile git — web'deki Leaderboard.tsx'in `Link href={`/u/${username}`}`
// davranışıyla aynı: "ben" satırı dahil her satır kendi public profiline gidiyor
// (bkz. friends.tsx'teki goToProfile ile aynı navigasyon deseni, 4 Eylül 2026).
function goToProfile(username?: string) {
  if (!username) return;
  router.push({ pathname: '/(app)/user-profile', params: { username } });
}

// Gümüş/bronz madalya renkleri — theme.ts'te bu ikisi için ayrı bir token
// yok (sadece `amber` altın için kullanılabiliyor), bu yüzden sadece podyum
// vurgusu amacıyla burada sabitlendi (27 Eylül 2026, "Sıralama - Çalışma
// Programı - Profil sayfalarını yapalım" isteği — Kelimeler sayfasındaki
// gradient hero + renkli vurgu deseni buraya da taşındı).
const SILVER = '#9AA6B2';
const SILVER_SOFT = '#EEF1F4';
const BRONZE = '#C2793D';
const BRONZE_SOFT = '#F8ECE1';
const GOLD_SOFT = '#FDF0D5';

type Colors = ThemeColors;

export function LeaderboardCard({ limit = 20 }: { limit?: number }) {
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

  // İlk 3'ü podyuma, kalanını normal satır listesine ayır — rank alanı
  // backend'den zaten sıralı geldiği için ekstra bir sort'a gerek yok.
  const top3 = (data?.top ?? []).filter((e) => e.rank <= 3);
  const rest = (data?.top ?? []).filter((e) => e.rank > 3);

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={[c.primary, c.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIconWrap}>
            <Trophy color="#FFFFFF" size={20} />
          </View>
          <Text style={styles.heroTitle}>{lbLabels.title}</Text>
        </View>

        <View style={styles.tabsRow}>
          {tabs.map((tb) => {
            const active = period === tb.key;
            return (
              <Pressable
                key={tb.key}
                onPress={() => setPeriod(tb.key)}
                style={[
                  styles.tab,
                  active
                    ? { backgroundColor: '#FFFFFF', shadowColor: '#000000' }
                    : { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? c.primary : '#FFFFFF' }}>
                  {tb.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <Text style={[styles.stateText, { color: c.textMuted }]}>{lbLabels.loading}</Text>
        )}
        {isError && (
          <Text style={[styles.stateText, { color: c.danger }]}>{lbLabels.error}</Text>
        )}
        {!isLoading && !isError && data && data.top.length === 0 && (
          <Text style={[styles.stateText, { color: c.textMuted }]}>{lbLabels.empty}</Text>
        )}

        {!isLoading && !isError && top3.length > 0 && (
          <Podium entries={top3} c={c} pointsLabel={lbLabels.points} />
        )}

        {!isLoading && !isError && rest.length > 0 && (
          <View style={styles.listGroup}>
            {rest.map((entry) => (
              <Row
                key={entry.user_id}
                entry={entry}
                isMe={entry.user_id === data?.me.user_id}
                youLabel={lbLabels.you}
                pointsLabel={lbLabels.points}
                c={c}
              />
            ))}
          </View>
        )}

        {!isLoading && !isError && data && !data.me.in_top && (
          <View style={styles.meGroup}>
            <Text style={[styles.sep, { color: c.textMuted }]}>···</Text>
            <Row entry={data.me} isMe youLabel={lbLabels.you} pointsLabel={lbLabels.points} c={c} highlight />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Podyum: 2. - 1. - 3. sırasıyla (klasik podyum düzeni), 1. sıra ortada ve
// daha yüksek/vurgulu. Boş bir sıra varsa (ör. toplam katılımcı 2 kişiyse)
// o slot'u tamamen render etmeden atlıyoruz — layout kaymasın diye eşit
// genişlikte boş bir View bırakıyoruz.
function Podium({ entries, c, pointsLabel }: { entries: LeaderboardEntry[]; c: Colors; pointsLabel: string }) {
  const byRank = (r: number) => entries.find((e) => e.rank === r);
  const order: Array<{ entry?: LeaderboardEntry; rank: 1 | 2 | 3 }> = [
    { entry: byRank(2), rank: 2 },
    { entry: byRank(1), rank: 1 },
    { entry: byRank(3), rank: 3 },
  ];

  return (
    <View style={styles.podiumRow}>
      {order.map(({ entry, rank }) => {
        if (!entry) {
          return <View key={rank} style={styles.podiumSlot} />;
        }
        const medal =
          rank === 1
            ? { fg: c.amber, soft: GOLD_SOFT }
            : rank === 2
              ? { fg: SILVER, soft: SILVER_SOFT }
              : { fg: BRONZE, soft: BRONZE_SOFT };
        const initial = (entry.username || '?').charAt(0).toUpperCase();
        const isFirst = rank === 1;
        return (
          <Pressable
            key={entry.user_id}
            onPress={() => goToProfile(entry.username)}
            style={({ pressed }) => [styles.podiumSlot, pressed && { opacity: 0.7 }]}
          >
            {isFirst && <Crown color={c.amber} size={18} style={styles.podiumCrown} />}
            <View
              style={[
                styles.podiumAvatar,
                isFirst && styles.podiumAvatarFirst,
                { backgroundColor: medal.soft, borderColor: medal.fg },
              ]}
            >
              <Text style={{ fontSize: isFirst ? 20 : 16, fontWeight: '700', color: medal.fg }}>{initial}</Text>
            </View>
            <View style={[styles.podiumRankBadge, { backgroundColor: medal.fg }]}>
              <Text style={styles.podiumRankText}>{rank}</Text>
            </View>
            <Text style={[styles.podiumName, { color: c.text }]} numberOfLines={1}>
              {entry.username}
            </Text>
            <Text style={[styles.podiumXp, { color: c.textMuted }]}>
              {entry.xp.toLocaleString()} {pointsLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({
  entry,
  isMe,
  youLabel,
  pointsLabel,
  c,
  highlight,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
  youLabel: string;
  pointsLabel: string;
  c: Colors;
  highlight?: boolean;
}) {
  const initial = (entry.username || '?').charAt(0).toUpperCase();
  const emphasized = isMe || highlight;
  return (
    <Pressable
      onPress={() => goToProfile(entry.username)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.surface, shadowColor: '#000000' },
        emphasized && { backgroundColor: c.warningSoft, borderColor: c.warning, borderWidth: 1.5 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.rank, { color: c.textMuted }]}>{entry.rank}</Text>
      <View style={[styles.avatar, { backgroundColor: c.border }]}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSecondary }}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }} numberOfLines={1}>
          {entry.username} {isMe ? `(${youLabel})` : ''}
        </Text>
        <Text style={{ fontSize: 11, color: c.textMuted }}>Lv. {entry.level}</Text>
      </View>
      <Text style={{ fontSize: 13, fontWeight: '700', color: c.primary }}>
        {entry.xp.toLocaleString()} {pointsLabel}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radius.xl + 4,
    borderBottomRightRadius: radius.xl + 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  heroIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  tabsRow: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, paddingVertical: 8, borderRadius: radius.md, alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  stateText: { fontSize: 13, textAlign: 'center', paddingVertical: spacing.xl },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.lg },
  podiumSlot: { flex: 1, alignItems: 'center' },
  podiumCrown: { marginBottom: 2 },
  podiumAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  podiumAvatarFirst: { width: 64, height: 64, borderRadius: 32, borderWidth: 3 },
  podiumRankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    marginBottom: 6,
  },
  podiumRankText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
  podiumName: { fontSize: 13, fontWeight: '700', maxWidth: 92 },
  podiumXp: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  listGroup: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  rank: { width: 22, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  meGroup: { marginTop: spacing.sm },
  sep: { textAlign: 'center', fontSize: 13, marginBottom: spacing.sm },
});
