import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { User as UserIcon, ChevronUp, ChevronDown, Clock, Gamepad2, Swords } from 'lucide-react-native';
import type { LeagueMemberItem } from '@/api/types';
import type { Locale } from '@/i18n/locales';
import { formatTimeRemaining, formatDateRange } from '@/i18n/leagueStrings';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';

// ── src/components/LeagueTable.tsx — Lig grubu sıralama tablosu, web'deki
// components/league/LeagueTable.tsx'in RN karşılığı. Faz 3f (10 Eylül 2026
// kullanıcı isteği — "Lig tablosu daha güzel efektif gözükmeli, çok basit
// sade olmuş" + Trendyol Süper Lig ekran görüntüleri referans verildi):
// gerçek bir spor ligi tablosu gibi — başlık satırı, terfi/düşme bölgeleri
// sol kenarda renkli bir şeritle, zebra çizgili satırlar. app/(app)/league.tsx
// (kendi ligin) VE app/(app)/league-detail.tsx (herhangi bir lig grubunun
// detayı) tarafından ORTAK kullanılıyor.
//
// Faz 3 devamı (10 Eylül 2026 — "sıralama tablosunu biraz daha
// ayrıntılandır, yeni özellikler ekle"): ilk 3 sıraya madalya, her
// satıra bir üstündeki kullanıcıya XP farkı, terfi/düşme bölgelerinde
// küçük bir ok rozeti, ve (weekEndIso verilirse) tablonun üstünde
// haftanın ne zaman biteceğini gösteren bir sayaç — web ile birebir
// aynı mantık (bkz. web LeagueTable yorumu).
//
// Faz 3 devamı — ikinci geri bildirim (10 Eylül 2026): "tabloda
// başlangıç bitiş tarihleri görülmeli" → üstteki şerit artık
// (weekStartIso de verilirse) net tarih aralığını da gösteriyor.
// "kazanılan oyun, kazanılan düello sayısal değerleri konulmalı" →
// kullanıcı adının altına küçük 🎮/⚔ sayaçları eklendi (telefon
// genişliğinde ayrı sütunlara yer yok, bkz. web'deki sm:hidden
// fallback ile AYNI kompakt gösterim).

interface Props {
  members: LeagueMemberItem[];
  rankLabel: string;
  userLabel: string;
  xpLabel: string;
  youLabel: string;
  weekStartIso?: string;
  weekEndIso?: string;
  locale?: Locale;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeagueTable({
  members, rankLabel, userLabel, xpLabel, youLabel, weekStartIso, weekEndIso, locale,
}: Props) {
  const c = useThemeColors();
  const memberCount = members.length;
  // Web'deki ile aynı oran (~1/3 terfi, ~1/3 düşme) — bkz. web LeagueTable
  // yorumu, gerçek terfi/düşme mantığı bkz. backend/league_weekly_rollover.py.
  const zoneSize = memberCount > 6 ? Math.max(1, Math.round(memberCount / 3)) : 0;
  const timeRemaining = weekEndIso && locale ? formatTimeRemaining(weekEndIso, locale) : '';
  const dateRange = weekStartIso && weekEndIso && locale ? formatDateRange(weekStartIso, weekEndIso, locale) : '';

  return (
    <View>
      {!!(dateRange || timeRemaining) && (
        <View style={styles.timeRow}>
          <Clock color={c.textMuted} size={12} />
          <Text style={{ color: c.textMuted, fontSize: 11 }}>
            {dateRange}
            {dateRange && timeRemaining ? ' · ' : ''}
            {timeRemaining}
          </Text>
        </View>
      )}
      <View style={[styles.wrap, { borderColor: c.border }]}>
        <View style={[styles.headerRow, { backgroundColor: c.background, borderBottomColor: c.border }]}>
          <Text style={[styles.headerCellRank, { color: c.textMuted }]}>{rankLabel}</Text>
          <Text style={[styles.headerCellUser, { color: c.textMuted }]}>{userLabel}</Text>
          <Text style={[styles.headerCellXp, { color: c.textMuted }]}>{xpLabel}</Text>
        </View>
        {members.map((m, idx) => {
          const rank = idx + 1;
          const isPromoteZone = zoneSize > 0 && rank <= zoneSize;
          const isDemoteZone = zoneSize > 0 && rank > memberCount - zoneSize;
          const zoneColor = isPromoteZone ? c.success : isDemoteZone ? c.danger : 'transparent';
          const rowBg = m.is_me ? c.primarySoft : idx % 2 === 1 ? c.background : c.surface;
          const medal = MEDALS[idx];

          let gapNode: React.ReactNode = null;
          if (memberCount > 1) {
            if (idx === 0) {
              const lead = m.xp - members[1].xp;
              if (lead > 0) {
                gapNode = <Text style={{ color: c.success, fontSize: 9, fontWeight: '700' }}>+{lead}</Text>;
              }
            } else {
              const gap = members[idx - 1].xp - m.xp;
              if (gap > 0) {
                gapNode = <Text style={{ color: c.textMuted, fontSize: 9, fontWeight: '600' }}>-{gap}</Text>;
              }
            }
          }

          return (
            <View
              key={m.user_id}
              style={[styles.row, { backgroundColor: rowBg, borderLeftColor: zoneColor }]}
            >
              <View style={styles.rankCell}>
                {medal ? (
                  <Text style={{ fontSize: 13 }}>{medal}</Text>
                ) : (
                  <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '700' }}>{rank}</Text>
                )}
                {isPromoteZone && <ChevronUp color={c.success} size={11} />}
                {isDemoteZone && <ChevronDown color={c.danger} size={11} />}
              </View>
              <View style={styles.userCell}>
                <View style={[styles.avatar, { backgroundColor: c.background }]}>
                  <UserIcon color={c.textMuted} size={13} />
                </View>
                <View style={{ minWidth: 0, flexShrink: 1 }}>
                  <Text style={[styles.usernameText, { color: c.text }]} numberOfLines={1}>
                    {m.username || '—'}
                    {m.is_me ? <Text style={{ color: c.primary, fontWeight: '500', fontSize: 11 }}> ({youLabel})</Text> : null}
                  </Text>
                  {(m.games_won > 0 || m.duels_won > 0) && (
                    <View style={styles.miniStatsRow}>
                      <Gamepad2 color={c.textMuted} size={9} />
                      <Text style={{ color: c.textMuted, fontSize: 9 }}>{m.games_won}</Text>
                      <Swords color={c.textMuted} size={9} />
                      <Text style={{ color: c.textMuted, fontSize: 9 }}>{m.duels_won}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.xpCell}>
                <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '700' }}>{m.xp}</Text>
                {gapNode}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.xs, paddingHorizontal: 2 },
  wrap: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  headerCellRank: { width: 34, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  headerCellUser: { flex: 1, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  headerCellXp: { width: 52, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm - 1,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 4,
  },
  rankCell: { width: 34, flexDirection: 'row', alignItems: 'center', gap: 2 },
  userCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  usernameText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  miniStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 1 },
  xpCell: { width: 52, alignItems: 'flex-end' },
});
