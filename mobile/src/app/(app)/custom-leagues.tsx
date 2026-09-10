import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Users2, Plus, Users, Check, X, Clock, Crown } from 'lucide-react-native';
import { customLeaguesApi } from '@/api/customLeagues';
import type { CustomLeagueInviteItem, CustomLeagueItem } from '@/api/types';
import { CUSTOM_LEAGUE_STRINGS } from '@/i18n/customLeagueStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

// ── Özel lig listesi — web'deki app/(app)/league/custom/page.tsx'in mobil
// karşılığı. V2 Faz 3 devamı (10 Eylül 2026 kullanıcı isteği — "kendi
// arkadaşlarımdan oluşan özel lig kurup kendi aramızda yarışabilmeliyim").
// UI deseni duels.tsx ile aynı (oda listesi + bekleyen davetler), tek fark
// oluşturma için bir isim istenmesi ve davetin (custom-league-detail.tsx
// içinde) arkadaş-only olmayıp sistemdeki HERHANGİ bir kullanıcıya
// gönderilebilmesi. Backend: /api/v1/custom-leagues/*

export default function CustomLeaguesScreen() {
  const { locale } = useLocale();
  const c = useThemeColors();
  const qc = useQueryClient();
  const t = CUSTOM_LEAGUE_STRINGS[locale] ?? CUSTOM_LEAGUE_STRINGS.tr;

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState(false);

  const leaguesQuery = useQuery({ queryKey: ['custom-leagues-mine'], queryFn: customLeaguesApi.listMine });
  const invitesQuery = useQuery({ queryKey: ['custom-league-invites'], queryFn: customLeaguesApi.listInvites });
  const leagues = leaguesQuery.data?.items ?? [];
  const invites = invitesQuery.data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (name: string) => customLeaguesApi.create(name),
    onSuccess: (league) => {
      qc.invalidateQueries({ queryKey: ['custom-leagues-mine'] });
      setShowCreateForm(false);
      setNewName('');
      router.push({ pathname: '/(app)/custom-league-detail', params: { id: league.id } });
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (inviteId: string) => customLeaguesApi.acceptInvite(inviteId),
    onSuccess: (league) => {
      qc.invalidateQueries({ queryKey: ['custom-league-invites'] });
      router.push({ pathname: '/(app)/custom-league-detail', params: { id: league.id } });
    },
  });

  const declineInviteMutation = useMutation({
    mutationFn: (inviteId: string) => customLeaguesApi.declineInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-league-invites'] }),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId: string) => customLeaguesApi.cancelInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-league-invites'] }),
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    createMutation.mutate(newName.trim());
  };

  return (
    <ScreenContainer refreshing={leaguesQuery.isRefetching} onRefresh={leaguesQuery.refetch}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: c.accentSoft }]}>
          <Users2 color={c.accent} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }}>{t.title}</Text>
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>{t.subtitle}</Text>
        </View>
      </View>

      {!showCreateForm && (
        <Pressable
          onPress={() => setShowCreateForm(true)}
          style={({ pressed }) => [styles.createBtn, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Plus color="#fff" size={16} />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t.createBtn}</Text>
        </Pressable>
      )}

      {showCreateForm && (
        <Card style={{ marginBottom: spacing.md }}>
          <TextInput
            value={newName}
            onChangeText={(v) => {
              setNewName(v);
              setNameError(false);
            }}
            placeholder={t.namePlaceholder}
            placeholderTextColor={c.textMuted}
            maxLength={60}
            style={[styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.background }]}
          />
          {nameError && <Text style={{ color: c.danger, fontSize: 11, marginTop: 4 }}>{t.nameRequired}</Text>}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm }}>
            <Pressable
              onPress={() => {
                setShowCreateForm(false);
                setNewName('');
                setNameError(false);
              }}
              style={styles.cancelBtn}
            >
              <Text style={{ color: c.textMuted, fontWeight: '600', fontSize: 12 }}>{t.createCancelBtn}</Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              disabled={createMutation.isPending}
              style={[styles.submitBtn, { backgroundColor: c.accent, opacity: createMutation.isPending ? 0.7 : 1 }]}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Plus color="#fff" size={14} />
              )}
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{t.createSubmitBtn}</Text>
            </Pressable>
          </View>
        </Card>
      )}

      {invites.length > 0 && (
        <Card style={{ marginBottom: spacing.md }}>
          <View style={styles.sectionTitleRow}>
            <Clock color="#f59e0b" size={16} />
            <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{t.pendingInvitesTitle}</Text>
          </View>
          {invites.map((inv: CustomLeagueInviteItem) => (
            <View key={inv.id} style={styles.inviteRow}>
              <Text style={{ color: c.text, fontSize: 13, flex: 1 }} numberOfLines={2}>
                <Text style={{ fontWeight: '700' }}>{inv.league_name}</Text>
                {' — '}
                {inv.is_received ? (
                  <>
                    <Text style={{ fontWeight: '700' }}>
                      {inv.inviter_display_name || inv.inviter_username || '—'}
                    </Text>{' '}
                    {t.incomingInviteLabel}
                  </>
                ) : (
                  <>
                    <Text style={{ fontWeight: '700' }}>
                      {inv.invitee_display_name || inv.invitee_username || '—'}
                    </Text>{' '}
                    {t.outgoingInviteLabel}
                  </>
                )}
              </Text>
              {inv.is_received ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Pressable
                    onPress={() => acceptInviteMutation.mutate(inv.id)}
                    disabled={acceptInviteMutation.isPending}
                    style={[styles.acceptBtn, { backgroundColor: c.successSoft }]}
                  >
                    <Check color={c.success} size={14} />
                    <Text style={{ color: c.success, fontWeight: '700', fontSize: 11 }}>{t.acceptBtn}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => declineInviteMutation.mutate(inv.id)}
                    disabled={declineInviteMutation.isPending}
                    style={styles.iconBtn}
                  >
                    <X color={c.textMuted} size={16} />
                  </Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ color: c.textMuted, fontSize: 11 }}>{t.waitingBadge}</Text>
                  <Pressable
                    onPress={() => cancelInviteMutation.mutate(inv.id)}
                    disabled={cancelInviteMutation.isPending}
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

      {leaguesQuery.isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.accent} />
        </View>
      )}
      {leaguesQuery.isError && (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{t.error}</Text>
        </Card>
      )}
      {!leaguesQuery.isLoading && !leaguesQuery.isError && leagues.length === 0 && (
        <EmptyState title={t.empty} subtitle={t.emptySub} />
      )}

      {leagues.map((lg: CustomLeagueItem) => (
        <Pressable
          key={lg.id}
          onPress={() => router.push({ pathname: '/(app)/custom-league-detail', params: { id: lg.id } })}
          style={({ pressed }) => [
            styles.rowCard,
            { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.avatar, { backgroundColor: c.accentSoft }]}>
              <Users2 color={c.accent} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
                  {lg.name}
                </Text>
                {lg.is_creator && <Crown color="#f59e0b" size={13} />}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Users color={c.textMuted} size={12} />
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {lg.member_count}/{lg.max_members} {t.membersLabel}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.openBadge, { backgroundColor: c.accentSoft }]}>
            <Text style={{ color: c.accent, fontWeight: '700', fontSize: 12 }}>{t.openBtn}</Text>
          </View>
        </Pressable>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
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
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm, fontSize: 14 },
  cancelBtn: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm - 2, justifyContent: 'center' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm - 2, borderRadius: radius.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  inviteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs + 2 },
  iconBtn: { padding: spacing.xs },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  openBadge: { paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs + 2, borderRadius: radius.full },
});
