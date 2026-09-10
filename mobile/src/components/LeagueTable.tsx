import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { User as UserIcon } from 'lucide-react-native';
import type { LeagueMemberItem } from '@/api/types';
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

interface Props {
  members: LeagueMemberItem[];
  rankLabel: string;
  userLabel: string;
  xpLabel: string;
  youLabel: string;
}

export function LeagueTable({ members, rankLabel, userLabel, xpLabel, youLabel }: Props) {
  const c = useThemeColors();
  const memberCount = members.length;
  // Web'deki ile aynı oran (~1/3 terfi, ~1/3 düşme) — bkz. web LeagueTable
  // yorumu, gerçek terfi/düşme mantığı henüz backend'de yok, bu sadece
  // gelecekteki mekaniğin görsel ön izlemesi.
  const zoneSize = memberCount > 6 ? Math.max(1, Math.round(memberCount / 3)) : 0;

  return (
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
        return (
          <View
            key={m.user_id}
            style={[styles.row, { backgroundColor: rowBg, borderLeftColor: zoneColor }]}
          >
            <Text style={[styles.rankCell, { color: c.textSecondary }]}>{rank}</Text>
            <View style={styles.userCell}>
              <View style={[styles.avatar, { backgroundColor: c.background }]}>
                <UserIcon color={c.textMuted} size={13} />
              </View>
              <Text style={[styles.usernameText, { color: c.text }]} numberOfLines={1}>
                {m.username || '—'}
                {m.is_me ? <Text style={{ color: c.primary, fontWeight: '500', fontSize: 11 }}> ({youLabel})</Text> : null}
              </Text>
            </View>
            <Text style={[styles.xpCell, { color: c.textSecondary }]}>{m.xp}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  headerCellRank: { width: 28, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  headerCellUser: { flex: 1, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  headerCellXp: { width: 48, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', textAlign: 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm - 1,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 4,
  },
  rankCell: { width: 28, fontSize: 12, fontWeight: '700' },
  userCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  usernameText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  xpCell: { width: 48, fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
