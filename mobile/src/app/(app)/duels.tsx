import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Swords, Plus, Users } from 'lucide-react-native';
import { duelsApi } from '@/api/duels';
import type { DuelResponse } from '@/api/types';
import { DUELS_STRINGS } from '@/i18n/duelsStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

// ── Düello lobisi — web'deki app/(app)/duels/page.tsx'in mobil karşılığı.
// Bekleyen ('waiting') odaların listesi + yeni oda açma/katılma. Oda içi
// akış (bekleme/aktif tur/bitiş) duel-room.tsx'te (bkz. dosyanın kendi
// başındaki not — expo-router bu projede [id].tsx dinamik segmentleri
// DEĞİL, user-profile.tsx/message-thread.tsx'teki gibi düz rota dosyası +
// useLocalSearchParams deseni kullanıyor, o yüzden "/duels/[id]" değil
// "/duel-room?id=..." ). Backend: /api/v1/duels/* ──

export default function DuelsLobbyScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const qc = useQueryClient();
  const ds = DUELS_STRINGS[locale] ?? DUELS_STRINGS.tr;

  const duelsQuery = useQuery({ queryKey: ['duels-list'], queryFn: duelsApi.list });

  const createMutation = useMutation({
    mutationFn: duelsApi.create,
    onSuccess: (duel) => {
      qc.invalidateQueries({ queryKey: ['duels-list'] });
      router.push({ pathname: '/(app)/duel-room', params: { id: duel.id } });
    },
  });

  const joinMutation = useMutation({
    mutationFn: (duelId: string) => duelsApi.join(duelId),
    onSuccess: (duel) => {
      router.push({ pathname: '/(app)/duel-room', params: { id: duel.id } });
    },
  });

  return (
    <ScreenContainer refreshing={duelsQuery.isRefetching} onRefresh={duelsQuery.refetch}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: c.primarySoft }]}>
            <Swords color={c.primary} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{ds.title}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>{ds.subtitle}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => createMutation.mutate()}
        disabled={createMutation.isPending}
        style={({ pressed }) => [
          styles.createBtn,
          { backgroundColor: c.primary, opacity: createMutation.isPending || pressed ? 0.8 : 1 },
        ]}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Plus color="#fff" size={16} />
        )}
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{ds.createBtn}</Text>
      </Pressable>

      {duelsQuery.isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}
      {duelsQuery.isError && (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{ds.error}</Text>
        </Card>
      )}
      {!duelsQuery.isLoading && !duelsQuery.isError && (duelsQuery.data?.items.length ?? 0) === 0 && (
        <EmptyState title={ds.empty} subtitle={ds.emptySub} />
      )}

      {(duelsQuery.data?.items ?? []).map((d: DuelResponse) => (
        <Card key={d.id} style={styles.rowCard}>
          <View style={styles.rowLeft}>
            <View style={[styles.avatar, { backgroundColor: c.primarySoft }]}>
              <Swords color={c.primary} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 14, textTransform: 'uppercase' }}>
                {d.learning_lang}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Users color={c.textMuted} size={12} />
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {d.participant_count}/{d.max_players} {ds.playersLabel}
                </Text>
              </View>
            </View>
          </View>
          <Pressable
            onPress={() => joinMutation.mutate(d.id)}
            disabled={joinMutation.isPending || d.participant_count >= d.max_players}
            style={[
              styles.joinBtn,
              { backgroundColor: c.primarySoft, opacity: joinMutation.isPending || d.participant_count >= d.max_players ? 0.5 : 1 },
            ]}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : (
              <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>{ds.joinBtn}</Text>
            )}
          </Pressable>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm, paddingVertical: spacing.md },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  joinBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, minWidth: 56, alignItems: 'center' },
});
