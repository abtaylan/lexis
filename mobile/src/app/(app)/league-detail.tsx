import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, RefreshCw, Trophy } from 'lucide-react-native';
import { leaguesApi } from '@/api/leagues';
import type { LeagueOverviewGroup, LeagueStatusResponse } from '@/api/types';
import { LEAGUE_STRINGS, LEAGUE_TIER_NAMES, formatDateRange } from '@/i18n/leagueStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { LeagueTable } from '@/components/LeagueTable';
import { LeagueGroupStrip } from '@/components/LeagueGroupStrip';

// ── src/app/(app)/league-detail.tsx — Faz 3f (10 Eylül 2026 kullanıcı
// isteği: "lige tıklayınca o ligin içindeki user'ları sıralamayı puan
// durumunu falan göreyim"): league.tsx'teki "Tüm Ligler" listesinden
// tıklanan HERHANGİ bir aktif lig grubunun tam üye/sıralama tablosu —
// kullanıcının o gruba üye olması şart değil (salt-okunur gözat).
// Backend: GET /api/v1/leagues/{league_id}. Bu projede expo-router
// [id].tsx dinamik segmenti KULLANILMIYOR (bkz. duel-room.tsx'teki not),
// bunun yerine düz rota dosyası + useLocalSearchParams (user-profile.tsx
// ile aynı desen) kullanılıyor: router.push({ pathname: '/(app)/league-detail', params: { id } }).

function errorDetail(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : '';
}

export default function LeagueDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const leagueId = typeof idParam === 'string' ? idParam : '';
  const { locale } = useLocale();
  const c = useThemeColors();
  const t = LEAGUE_STRINGS[locale] ?? LEAGUE_STRINGS.tr;
  const tierNames = LEAGUE_TIER_NAMES[locale] ?? LEAGUE_TIER_NAMES.tr;

  const [status, setStatus] = useState<LeagueStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Faz 3 devami (10 Eylul 2026 -- "buradan bu liglere tiklayarak gecis
  // saglansin"): bir alt/bir ust kademenin bu haftaki ILK grubuna hizli
  // gecis -- overview zaten tier_index sonra created_at'e gore sirali.
  const [overviewGroups, setOverviewGroups] = useState<LeagueOverviewGroup[]>([]);

  const load = useCallback(async () => {
    if (!leagueId) return;
    setLoading(true);
    setError(null);
    try {
      const [res, overview] = await Promise.all([
        leaguesApi.getDetail(leagueId),
        leaguesApi.getOverview().catch(() => null),
      ]);
      setStatus(res);
      if (overview) setOverviewGroups(overview.groups);
    } catch (err) {
      setError(errorDetail(err) || t.detailError);
    } finally {
      setLoading(false);
    }
  }, [leagueId, t.detailError]);

  useEffect(() => {
    load();
  }, [load]);

  const tierLabel = status ? (tierNames[status.tier_slug] ?? status.tier_slug) : '';

  const prevTierGroup = useMemo(
    () => (status ? overviewGroups.find((g) => g.tier_index === status.tier_index - 1) : undefined),
    [overviewGroups, status],
  );
  const nextTierGroup = useMemo(
    () => (status ? overviewGroups.find((g) => g.tier_index === status.tier_index + 1) : undefined),
    [overviewGroups, status],
  );
  const goToGroup = (g: LeagueOverviewGroup) =>
    router.push({ pathname: '/(app)/league-detail', params: { id: g.league_id } });

  return (
    <ScreenContainer refreshing={false} onRefresh={load}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft color={c.textMuted} size={18} />
          </Pressable>
          <View style={[styles.headerIcon, { backgroundColor: c.warningSoft }]}>
            <Trophy color={c.warning} size={18} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
              {status ? tierLabel : t.title}
            </Text>
            {status && (
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                {status.group_name} · {formatDateRange(status.week_start, status.week_end, locale)}
              </Text>
            )}
          </View>
        </View>
        <Pressable onPress={load} style={styles.iconBtn} hitSlop={8}>
          <RefreshCw color={c.textMuted} size={16} />
        </Pressable>
      </View>

      {overviewGroups.length > 0 && (
        <View style={{ marginBottom: spacing.md }}>
          <LeagueGroupStrip
            groups={overviewGroups}
            tierNames={tierNames}
            currentLeagueId={status?.league_id}
            youLabel={t.youLabel}
            onSelect={(id) => router.push({ pathname: '/(app)/league-detail', params: { id } })}
          />
        </View>
      )}

      {loading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.warning} />
        </View>
      )}
      {!loading && error && (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{error}</Text>
        </Card>
      )}
      {!loading && !error && status && status.members.length > 0 && (
        <LeagueTable members={status.members} rankLabel={t.rankLabel} userLabel={t.userLabel} xpLabel={t.xpLabel} youLabel={t.youLabel} weekStartIso={status.week_start} weekEndIso={status.week_end} locale={locale} />
      )}

      {!loading && !error && status && status.members.length > 6 && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.success }]} />
            <Text style={{ color: c.textMuted, fontSize: 11 }}>{t.promoteHint}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c.danger }]} />
            <Text style={{ color: c.textMuted, fontSize: 11 }}>{t.demoteHint}</Text>
          </View>
        </View>
      )}

      {!loading && !error && status && (prevTierGroup || nextTierGroup) && (
        <View style={styles.tierNavRow}>
          <Pressable
            disabled={!prevTierGroup}
            onPress={() => prevTierGroup && goToGroup(prevTierGroup)}
            style={({ pressed }) => [
              styles.tierNavCard,
              { borderColor: c.border, backgroundColor: c.surface },
              !prevTierGroup ? { opacity: 0.4 } : null,
              pressed && prevTierGroup ? { backgroundColor: c.background } : null,
            ]}
          >
            <ChevronDown color={c.textMuted} size={14} />
            <View style={{ minWidth: 0 }}>
              <Text style={{ color: c.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{t.prevLeagueLabel}</Text>
              <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                {prevTierGroup ? (tierNames[prevTierGroup.tier_slug] ?? prevTierGroup.tier_slug) : '—'}
              </Text>
            </View>
          </Pressable>
          <Pressable
            disabled={!nextTierGroup}
            onPress={() => nextTierGroup && goToGroup(nextTierGroup)}
            style={({ pressed }) => [
              styles.tierNavCard,
              { borderColor: c.border, backgroundColor: c.surface, justifyContent: 'flex-end' },
              !nextTierGroup ? { opacity: 0.4 } : null,
              pressed && nextTierGroup ? { backgroundColor: c.background } : null,
            ]}
          >
            <View style={{ minWidth: 0, alignItems: 'flex-end' }}>
              <Text style={{ color: c.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>{t.nextLeagueLabel}</Text>
              <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                {nextTierGroup ? (tierNames[nextTierGroup.tier_slug] ?? nextTierGroup.tier_slug) : '—'}
              </Text>
            </View>
            <ChevronUp color={c.textMuted} size={14} />
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  backBtn: { padding: 2 },
  headerIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { padding: spacing.xs },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  tierNavRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  tierNavCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 2 },
});
