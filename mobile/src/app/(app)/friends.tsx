import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Search, UserPlus, UserMinus, UserCheck, X, Check } from 'lucide-react-native';
import { socialApi } from '@/api/social';
import type { FriendshipItem, UserCard } from '@/api/types';
import { FRIENDS_STRINGS } from '@/i18n/friendsStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

// ── Arkadaşlar ekranı — web'deki app/(app)/friends/page.tsx'in mobil
// karşılığı. Web'de dört sekme var (Arkadaşlarım/İstekler/Meydan Okumalar/
// Kullanıcı Ara); burada bilinçli olarak üçü taşındı — Meydan Okumalar
// sekmesi, web dosyasının ~%40'ını oluşturan ayrı bir oyun-entegrasyonu alt
// özelliği (oyun sonucu gönderme, /game?challengeId=... akışı vb.) ve temel
// "arkadaş bul/yönet" akışına değer katmıyor, bu yüzden sonraki bir faza
// bırakıldı (bkz. backlog). API katmanında (social.ts) ve tiplerde
// forward-compat olarak zaten mevcut. ──

type Tab = 'friends' | 'requests' | 'search';

function initialOf(card: UserCard): string {
  return (card.display_name || card.username || '?').charAt(0).toUpperCase();
}

export default function FriendsScreen() {
  const { locale, t } = useLocale();
  const c = useThemeColors();
  const qc = useQueryClient();
  const fs = FRIENDS_STRINGS[locale] ?? FRIENDS_STRINGS.tr;
  const [tab, setTab] = useState<Tab>('friends');

  const friendsQuery = useQuery({ queryKey: ['social-friends'], queryFn: socialApi.getFriends });
  const pendingQuery = useQuery({ queryKey: ['social-pending'], queryFn: socialApi.getPendingRequests });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError('');
    try {
      const items = await socialApi.searchUsers(q);
      setSearchResults(items);
    } catch {
      setSearchError(fs.error);
    } finally {
      setSearching(false);
    }
  };

  const patchSearchResult = (userId: string, patch: Partial<UserCard>) => {
    setSearchResults((prev) => (prev ? prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)) : prev));
  };

  const acceptMutation = useMutation({
    mutationFn: (id: string) => socialApi.acceptFriendRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['social-pending'] });
      qc.invalidateQueries({ queryKey: ['social-friends'] });
    },
    onError: () => Alert.alert(fs.actionError),
  });
  const declineMutation = useMutation({
    mutationFn: (id: string) => socialApi.declineFriendRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-pending'] }),
    onError: () => Alert.alert(fs.actionError),
  });
  const removeMutation = useMutation({
    mutationFn: (userId: string) => socialApi.removeFriend(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-friends'] }),
    onError: () => Alert.alert(fs.actionError),
  });
  const sendRequestMutation = useMutation({
    mutationFn: (username: string) => socialApi.sendFriendRequest(username),
    onError: () => Alert.alert(fs.sendError),
  });
  const followMutation = useMutation({
    mutationFn: ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) =>
      isFollowing ? socialApi.unfollow(userId) : socialApi.follow(userId),
    onError: () => Alert.alert(fs.actionError),
  });

  const confirmRemove = (userId: string) => {
    Alert.alert(fs.removeConfirm, '', [
      { text: t('cancelBtn'), style: 'cancel' },
      { text: fs.removeBtn, style: 'destructive', onPress: () => removeMutation.mutate(userId) },
    ]);
  };

  const goToProfile = (username?: string) => {
    if (!username) return;
    router.push({ pathname: '/(app)/user-profile', params: { username } });
  };

  const pendingIncomingCount = pendingQuery.data?.incoming.length ?? 0;

  return (
    <ScreenContainer>
      <Text style={{ color: c.text, fontSize: 20, fontWeight: '700', marginBottom: spacing.md }}>{fs.title}</Text>

      <View style={styles.tabsRow}>
        <TabBtn label={fs.tabFriends} active={tab === 'friends'} onPress={() => setTab('friends')} />
        <TabBtn label={fs.tabRequests} active={tab === 'requests'} onPress={() => setTab('requests')} badge={pendingIncomingCount} />
        <TabBtn label={fs.tabSearch} active={tab === 'search'} onPress={() => setTab('search')} />
      </View>

      {tab === 'friends' && (
        <View>
          {friendsQuery.isLoading && <Loading />}
          {friendsQuery.isError && <ErrorBox text={fs.error} />}
          {!friendsQuery.isLoading && !friendsQuery.isError && (friendsQuery.data?.length ?? 0) === 0 && (
            <EmptyState title={fs.friendsEmpty} subtitle={fs.friendsEmptySub} />
          )}
          {(friendsQuery.data ?? []).map((item: FriendshipItem) => (
            <Card key={item.id} style={styles.rowCard}>
              <UserRow card={item.user} fs={fs} onPress={() => goToProfile(item.user.username)} />
              <Pressable
                onPress={() => confirmRemove(item.user.id)}
                disabled={removeMutation.isPending}
                style={[styles.pillBtnOutline, { borderColor: c.danger, opacity: removeMutation.isPending ? 0.5 : 1 }]}
              >
                <UserMinus color={c.danger} size={13} />
                <Text style={{ color: c.danger, fontWeight: '700', fontSize: 11 }}>{fs.removeBtn}</Text>
              </Pressable>
            </Card>
          ))}
        </View>
      )}

      {tab === 'requests' && (
        <View>
          {pendingQuery.isLoading && <Loading />}
          {pendingQuery.isError && <ErrorBox text={fs.error} />}
          {!pendingQuery.isLoading && !pendingQuery.isError && (
            <>
              <SectionLabel text={fs.incomingTitle} />
              {(pendingQuery.data?.incoming.length ?? 0) === 0 ? (
                <MutedNote text={fs.incomingEmpty} />
              ) : (
                pendingQuery.data!.incoming.map((item) => (
                  <Card key={item.id} style={styles.rowCard}>
                    <UserRow card={item.user} fs={fs} onPress={() => goToProfile(item.user.username)} />
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      <Pressable
                        onPress={() => declineMutation.mutate(item.id)}
                        disabled={declineMutation.isPending || acceptMutation.isPending}
                        style={[styles.iconBtnSm, { backgroundColor: c.dangerSoft }]}
                      >
                        <X color={c.danger} size={15} />
                      </Pressable>
                      <Pressable
                        onPress={() => acceptMutation.mutate(item.id)}
                        disabled={declineMutation.isPending || acceptMutation.isPending}
                        style={[styles.iconBtnSm, { backgroundColor: c.successSoft }]}
                      >
                        <Check color={c.success} size={15} />
                      </Pressable>
                    </View>
                  </Card>
                ))
              )}

              <View style={{ height: spacing.lg }} />

              <SectionLabel text={fs.outgoingTitle} />
              {(pendingQuery.data?.outgoing.length ?? 0) === 0 ? (
                <MutedNote text={fs.outgoingEmpty} />
              ) : (
                pendingQuery.data!.outgoing.map((item) => (
                  <Card key={item.id} style={styles.rowCard}>
                    <UserRow card={item.user} fs={fs} onPress={() => goToProfile(item.user.username)} />
                    <View style={[styles.pillBtnStatic, { backgroundColor: c.background }]}>
                      <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700' }}>{fs.pendingLabel}</Text>
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
        </View>
      )}

      {tab === 'search' && (
        <View>
          <View style={[styles.searchRow, { borderColor: c.border, backgroundColor: c.surface }]}>
            <Search color={c.textMuted} size={16} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={fs.searchPlaceholder}
              placeholderTextColor={c.textMuted}
              style={{ flex: 1, color: c.text, fontSize: 14, paddingVertical: spacing.sm }}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
          </View>
          <Pressable
            onPress={runSearch}
            disabled={searching || !searchQuery.trim()}
            style={[styles.searchBtn, { backgroundColor: c.primary, opacity: searching || !searchQuery.trim() ? 0.6 : 1 }]}
          >
            {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{fs.searchBtn}</Text>}
          </Pressable>

          {searchError ? <ErrorBox text={searchError} /> : null}

          {searchResults === null && !searchError ? (
            <MutedNote text={fs.searchHint} />
          ) : searchResults !== null && searchResults.length === 0 ? (
            <MutedNote text={fs.searchEmpty} />
          ) : (
            (searchResults ?? []).map((card) => (
              <Card key={card.id} style={styles.searchRowCard}>
                <UserRow card={card} fs={fs} onPress={() => goToProfile(card.username)} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Pressable
                    onPress={() => {
                      const wasFollowing = !!card.is_following;
                      patchSearchResult(card.id, { is_following: !wasFollowing });
                      followMutation.mutate(
                        { userId: card.id, isFollowing: wasFollowing },
                        { onError: () => patchSearchResult(card.id, { is_following: wasFollowing }) }
                      );
                    }}
                    style={[styles.pillBtnOutline, { borderColor: c.border }]}
                  >
                    <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 11 }}>
                      {card.is_following ? fs.unfollowBtn : fs.followBtn}
                    </Text>
                  </Pressable>

                  {card.relationship_status === 'none' && (
                    <Pressable
                      onPress={() => {
                        if (!card.username) return;
                        sendRequestMutation.mutate(card.username, {
                          onSuccess: () => patchSearchResult(card.id, { relationship_status: 'pending_sent' }),
                        });
                      }}
                      disabled={sendRequestMutation.isPending}
                      style={[styles.pillBtn, { backgroundColor: c.primary }]}
                    >
                      <UserPlus color="#fff" size={13} />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>{fs.sendRequestBtn}</Text>
                    </Pressable>
                  )}
                  {card.relationship_status === 'pending_sent' && (
                    <View style={[styles.pillBtnStatic, { backgroundColor: c.background }]}>
                      <Text style={{ color: c.textMuted, fontSize: 11, fontWeight: '700' }}>{fs.requestSentBtn}</Text>
                    </View>
                  )}
                  {card.relationship_status === 'pending_received' && (
                    <View style={[styles.pillBtnStatic, { backgroundColor: c.warningSoft }]}>
                      <Text style={{ color: c.warning, fontSize: 11, fontWeight: '700' }}>{fs.respondInRequestsHint}</Text>
                    </View>
                  )}
                  {card.relationship_status === 'friends' && (
                    <View style={[styles.pillBtnStatic, { backgroundColor: c.successSoft }]}>
                      <UserCheck color={c.success} size={12} />
                      <Text style={{ color: c.success, fontSize: 11, fontWeight: '700' }}>{fs.alreadyFriendsLabel}</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))
          )}
        </View>
      )}
    </ScreenContainer>
  );
}

function TabBtn({ label, active, onPress, badge }: { label: string; active: boolean; onPress: () => void; badge?: number }) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}>
      <Text style={{ color: active ? c.primary : c.textMuted, fontWeight: '700', fontSize: 12 }} numberOfLines={1}>
        {label}
      </Text>
      {!!badge && (
        <View style={[styles.badge, { backgroundColor: c.danger }]}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function UserRow({ card, fs, onPress }: { card: UserCard; fs: typeof FRIENDS_STRINGS['tr']; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable onPress={onPress} style={styles.userRow}>
      <View style={[styles.avatar, { backgroundColor: c.primarySoft }]}>
        <Text style={{ color: c.primary, fontWeight: '700', fontSize: 15 }}>{initialOf(card)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }} numberOfLines={1}>
          {card.display_name || card.username || '—'}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 12 }} numberOfLines={1}>
          {card.username ? `@${card.username} · ` : ''}{fs.levelPrefix} {card.level}
        </Text>
      </View>
    </Pressable>
  );
}

function SectionLabel({ text }: { text: string }) {
  const c = useThemeColors();
  return <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 13, marginBottom: spacing.sm }}>{text}</Text>;
}

function MutedNote({ text }: { text: string }) {
  const c = useThemeColors();
  return <Text style={{ color: c.textMuted, fontSize: 12, paddingVertical: spacing.sm }}>{text}</Text>;
}

function Loading() {
  const c = useThemeColors();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

function ErrorBox({ text }: { text: string }) {
  const c = useThemeColors();
  return (
    <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft, marginBottom: spacing.md }}>
      <Text style={{ color: c.danger, fontSize: 13 }}>{text}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', marginBottom: spacing.md, gap: spacing.md },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: spacing.sm, paddingHorizontal: 2 },
  badge: { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm, paddingVertical: spacing.md },
  searchRowCard: { flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.sm, paddingVertical: spacing.md },
  pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radius.full },
  pillBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5 },
  pillBtnStatic: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 7, borderRadius: radius.full },
  iconBtnSm: { width: 30, height: 30, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  searchBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingVertical: spacing.sm, marginBottom: spacing.lg },
});
