import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Trophy, ChevronRight, Users } from 'lucide-react-native';
import { leaguesApi } from '@/api/leagues';
import type { LeagueOverviewGroup } from '@/api/types';
import { LEAGUE_STRINGS, LEAGUE_TIER_NAMES } from '@/i18n/leagueStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LeagueTable } from '@/components/LeagueTable';

// ── Haftalık lig — web'deki app/(app)/league/page.tsx'in mobil karşılığı.
// Kullanıcının bu haftaki lig grubunu + CANLI (xp_events'ten hesaplanan,
// backend'in zaten xp'ye göre azalan sıralı döndürdüğü) liderlik tablosunu
// gösterir. Terfi/düşme haftalık kapanışta scheduled task tarafından
// işlenir (bkz. backend/app/api/routes/leagues.py docstring'i); bu ekran
// sadece MEVCUT durumu okur. Backend: /api/v1/leagues/me
//
// Faz 3f (10 Eylül 2026 kullanıcı isteği): "Lig tablosu daha güzel efektif
// gözükmeli" → sıralama tablosu gerçek bir spor ligi tablosu gibi yeniden
// tasarlandı (bkz. LeagueTable bileşeni, web'deki eşdeğeri). "Lig sayfasına
// girince tüm ligleri listele, lige tıklayınca o ligin içindeki user'ları
// sıralamayı puan durumunu falan göreyim" → "Diğer Ligler" önizleme
// kartları yerine tıklanabilir "Tüm Ligler" listesi (detay:
// app/(app)/league-detail.tsx — bu projede expo-router [id].tsx dinamik
// segmenti KULLANILMIYOR, bkz. duel-room.tsx'teki not; flat route +
// useLocalSearchParams deseni izleniyor).

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

export default function LeagueScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const t = LEAGUE_STRINGS[locale] ?? LEAGUE_STRINGS.tr;
  const tierNames = LEAGUE_TIER_NAMES[locale] ?? LEAGUE_TIER_NAMES.tr;

  const query = useQuery({ queryKey: ['league-me'], queryFn: leaguesApi.getMyLeague });
  const status = query.data;
  const overviewQuery = useQuery({ queryKey: ['league-overview'], queryFn: leaguesApi.getOverview });
  const overview = overviewQuery.data?.groups ?? [];

  const tierLabel = status ? (tierNames[status.tier_slug] ?? status.tier_slug) : '';

  // Ayni kademede (tier) birden fazla grup acilabildigi icin (bkz.
  // ensure_active_league_membership, kapasite dolunca yeni grup) her
  // satirda "Bronz · Grup 2" gibi ayirt edici bir numara gosterelim --
  // overview zaten backend'de tier_index sonra created_at'e gore sirali.
  const tierSeen: Record<string, number> = {};
  const overviewWithGroupIndex = overview.map((g: LeagueOverviewGroup) => {
    tierSeen[g.tier_slug] = (tierSeen[g.tier_slug] ?? 0) + 1;
    return { ...g, groupIndex: tierSeen[g.tier_slug] };
  });

  return (
    <ScreenContainer refreshing={query.isRefetching} onRefresh={query.refetch}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: c.warningSoft }]}>
          <Trophy color={c.warning} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{t.title}</Text>
          {status && (
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>
              {tierLabel} · {formatDateRange(status.week_start, status.week_end, locale)}
            </Text>
          )}
        </View>
      </View>

      {query.isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.warning} />
        </View>
      )}
      {query.isError && (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{t.error}</Text>
        </Card>
      )}
      {!query.isLoading && !query.isError && (!status || status.members.length === 0) && (
        <EmptyState title={t.empty} subtitle={t.emptySub} />
      )}

      {!query.isLoading && !query.isError && status && status.members.length > 0 && (
        <LeagueTable members={status.members} rankLabel={t.rankLabel} userLabel={t.userLabel} xpLabel={t.xpLabel} youLabel={t.youLabel} />
      )}

      {!query.isLoading && !query.isError && status && status.members.length > 6 && (
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

      {overviewWithGroupIndex.length > 0 && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm }}>
            {t.allLeaguesTitle}
          </Text>
          <Card style={{ paddingVertical: spacing.xs, paddingHorizontal: 0, gap: 0 }}>
            {overviewWithGroupIndex.map((g, idx) => (
              <Pressable
                key={g.league_id}
                onPress={() => router.push({ pathname: '/(app)/league-detail', params: { id: g.league_id } })}
                style={({ pressed }) => [
                  styles.overviewRow,
                  idx > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border } : null,
                  pressed ? { backgroundColor: c.background } : null,
                ]}
              >
                <View style={[styles.overviewIcon, { backgroundColor: c.warningSoft }]}>
                  <Trophy color={c.warning} size={16} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
                    <Text style={{ color: c.text, fontSize: 13, fontWeight: '700' }}>
                      {tierNames[g.tier_slug] ?? g.tier_slug}
                    </Text>
                    {tierSeen[g.tier_slug] > 1 && (
                      <Text style={{ color: c.textMuted, fontSize: 11 }}>
                        · {t.groupLabel} {g.groupIndex}
                      </Text>
                    )}
                    {g.is_mine && (
                      <View style={[styles.badge, { backgroundColor: c.primarySoft }]}>
                        <Text style={{ color: c.primary, fontSize: 9, fontWeight: '700' }}>{t.yourGroupBadge}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Users color={c.textMuted} size={11} />
                    <Text style={{ color: c.textMuted, fontSize: 11 }}>
                      {g.member_count} {t.membersSuffix}
                    </Text>
                  </View>
                </View>
                <ChevronRight color={c.textMuted} size={16} />
              </Pressable>
            ))}
          </Card>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  headerIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm },
  overviewIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
});
