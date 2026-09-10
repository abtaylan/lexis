import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Swords, Plus, Users, UserPlus, Check, X, Clock, Trash2 } from 'lucide-react-native';
import { duelsApi } from '@/api/duels';
import { socialApi } from '@/api/social';
import { useAuth } from '@/store/auth';
import type { DuelResponse, DuelInviteItem, FriendshipItem } from '@/api/types';
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
// "/duel-room?id=..." ). Backend: /api/v1/duels/*
//
// Faz 3f (10 Eylül 2026 kullanıcı isteği — "düello isteği yollama ekranını
// göremedim" → "Evet, arkadaşa davet gönderme ekle"): "Arkadaşını Davet Et"
// (arkadaş çipi seç + gönder) ve "Bekleyen Davetler" (gelen: kabul/reddet,
// giden: iptal) bölümleri eklendi — web'deki AYNI /duels/invite* uçları
// (bkz. duels.py invite_friend_to_duel/list_my_duel_invites/accept_duel_invite).

export default function DuelsLobbyScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const ds = DUELS_STRINGS[locale] ?? DUELS_STRINGS.tr;

  const [selectedFriendUsername, setSelectedFriendUsername] = useState<string | null>(null);

  const duelsQuery = useQuery({ queryKey: ['duels-list'], queryFn: duelsApi.list });
  const friendsQuery = useQuery({ queryKey: ['friends-list'], queryFn: socialApi.getFriends });
  const invitesQuery = useQuery({ queryKey: ['duel-invites'], queryFn: duelsApi.listInvites });
  const friends = (friendsQuery.data ?? []).filter((f: FriendshipItem) => f.status === 'accepted');
  const invites = invitesQuery.data?.items ?? [];

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

  const inviteMutation = useMutation({
    mutationFn: (username: string) => duelsApi.invite(username),
    onSuccess: () => {
      setSelectedFriendUsername(null);
      qc.invalidateQueries({ queryKey: ['duel-invites'] });
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (inviteId: string) => duelsApi.acceptInvite(inviteId),
    onSuccess: (duel) => {
      router.push({ pathname: '/(app)/duel-room', params: { id: duel.id } });
    },
  });

  const declineInviteMutation = useMutation({
    mutationFn: (inviteId: string) => duelsApi.declineInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duel-invites'] }),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: string) => duelsApi.cancelInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duel-invites'] }),
  });

  // Faz 3f (10 Eylul 2026 kullanici istegi -- "duello olusturan kisi, odayi
  // silebilmeli"): sadece oda sahibi gorur, sadece 'waiting' odalar
  // silinebilir (bkz. backend duels.py cancel_duel).
  const cancelDuelMutation = useMutation({
    mutationFn: (duelId: string) => duelsApi.cancel(duelId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duels-list'] }),
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

      {/* Arkadaşını Davet Et (Faz 3f) */}
      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.sectionTitleRow}>
          <UserPlus color={c.primary} size={16} />
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{ds.inviteSectionTitle}</Text>
        </View>
        {friends.length === 0 ? (
          <Text style={{ color: c.textMuted, fontSize: 12 }}>{ds.noFriendsForInvite}</Text>
        ) : (
          <>
            <View style={styles.chipsWrap}>
              {friends.map((f: FriendshipItem) => {
                const selected = selectedFriendUsername === f.user.username;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setSelectedFriendUsername(f.user.username ?? null)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? c.primary : c.primarySoft,
                        borderColor: selected ? c.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? '#fff' : c.primary, fontSize: 12, fontWeight: '600' }}>
                      {f.user.display_name || f.user.username}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => selectedFriendUsername && inviteMutation.mutate(selectedFriendUsername)}
              disabled={!selectedFriendUsername || inviteMutation.isPending}
              style={[
                styles.sendInviteBtn,
                { backgroundColor: c.primarySoft, opacity: !selectedFriendUsername || inviteMutation.isPending ? 0.5 : 1 },
              ]}
            >
              {inviteMutation.isPending ? (
                <ActivityIndicator color={c.primary} size="small" />
              ) : (
                <UserPlus color={c.primary} size={14} />
              )}
              <Text style={{ color: c.primary, fontWeight: '700', fontSize: 12 }}>{ds.sendInviteBtn}</Text>
            </Pressable>
          </>
        )}
      </Card>

      {/* Bekleyen Davetler (Faz 3f) */}
      {invites.length > 0 && (
        <Card style={{ marginBottom: spacing.md }}>
          <View style={styles.sectionTitleRow}>
            <Clock color="#f59e0b" size={16} />
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{ds.pendingInvitesTitle}</Text>
          </View>
          {invites.map((inv: DuelInviteItem) => (
            <View key={inv.id} style={styles.inviteRow}>
              <Text style={{ color: c.text, fontSize: 13, flex: 1 }} numberOfLines={1}>
                <Text style={{ fontWeight: '700' }}>
                  {inv.other_user?.display_name || inv.other_user?.username || '—'}
                </Text>{' '}
                {inv.is_inviter ? ds.outgoingInviteLabel : ds.incomingInviteLabel}
              </Text>
              {inv.is_inviter ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ color: c.textMuted, fontSize: 11 }}>{ds.waitingBadge}</Text>
                  <Pressable
                    onPress={() => cancelInviteMutation.mutate(inv.id)}
                    disabled={cancelInviteMutation.isPending}
                    style={styles.iconBtn}
                  >
                    <X color={c.textMuted} size={16} />
                  </Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Pressable
                    onPress={() => acceptInviteMutation.mutate(inv.id)}
                    disabled={acceptInviteMutation.isPending}
                    style={[styles.acceptBtn, { backgroundColor: c.successSoft }]}
                  >
                    <Check color={c.success} size={14} />
                    <Text style={{ color: c.success, fontWeight: '700', fontSize: 11 }}>{ds.acceptBtn}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => declineInviteMutation.mutate(inv.id)}
                    disabled={declineInviteMutation.isPending}
                    style={styles.iconBtn}
                  >
                    <X color={c.textMuted} size={16} />
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </Card>
      )}

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
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
            {user && d.created_by === user.id && (
              <Pressable
                onPress={() => cancelDuelMutation.mutate(d.id)}
                disabled={cancelDuelMutation.isPending}
                style={[styles.iconBtn, { backgroundColor: c.dangerSoft, borderRadius: radius.full }]}
              >
                <Trash2 color={c.danger} size={15} />
              </Pressable>
            )}
          </View>
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
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, borderRadius: radius.full, borderWidth: 1 },
  sendInviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs + 2 },
  iconBtn: { padding: spacing.xs },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm, paddingVertical: spacing.md },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  joinBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, minWidth: 56, alignItems: 'center' },
});
