import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react-native';
import { leaguesApi } from '@/api/leagues';
import type { LeagueStatusResponse } from '@/api/types';
import { LEAGUE_STRINGS, LEAGUE_TIER_NAMES } from '@/i18n/leagueStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { LeagueTable } from '@/components/LeagueTable';

// ── src/app/(app)/league-detail.tsx — Faz 3f (10 Eylül 2026 kullanıcı
// isteği: "lige tıklayınca o ligin içindeki user'ları sıralamayı puan
// durumunu falan göreyim"): league.tsx'teki "Tüm Ligler" listesinden
// tıklanan HERHANGİ bir aktif lig grubunun tam üye/sıralama tablosu —
// kullanıcının o gruba üye olması şart değil (salt-okunur gözat).
// Backend: GET /api/v1/leagues/{league_id}. Bu projede expo-router
// [id].tsx dinamik segmenti KULLANILMIYOR (bkz. duel-room.tsx'teki not),
// bunun yerine düz rota dosyası + useLocalSearchParams (user-profile.tsx
// ile aynı desen) kullanılıyor: router.push({ pathname: '/(app)/league-detail', params: { id } }).

function formatDateRange(startIso: string, endIso: string, locale: string): string {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  } catch {
    return '';
  }
}

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

  const load = useCallback(async () => {
    if (!leagueId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await leaguesApi.getDetail(leagueId);
      setStatus(res);
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
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>
                {formatDateRange(status.week_start, status.week_end, locale)}
              </Text>
            )}
          </View>
        </View>
        <Pressable onPress={load} style={styles.iconBtn} hitSlop={8}>
          <RefreshCw color={c.textMuted} size={16} />
        </Pressable>
      </View>

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
        <LeagueTable members={status.members} rankLabel={t.rankLabel} userLabel={t.userLabel} xpLabel={t.xpLabel} youLabel={t.youLabel} />
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
});
