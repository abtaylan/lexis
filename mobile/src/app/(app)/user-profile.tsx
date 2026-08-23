import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, Trophy, Users, MessageCircle, UserPlus, Check, X, Ban, BookOpen, CalendarDays, Flame,
} from 'lucide-react-native';
import { socialApi } from '@/api/social';
import type { PublicProfile } from '@/api/types';
import { PROFILE_STRINGS } from '@/i18n/profileStrings';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';

// ── Herkese açık profil — web'deki app/(app)/u/[username]/page.tsx'in
// mobil karşılığı. "Meydan oku" butonu ve oyun-modu seçici bilinçli olarak
// dışarıda bırakıldı (bkz. friends.tsx üstündeki not — aynı gerekçe).
// Kullanıcı adı `params` ile geliyor (bkz. message-thread.tsx'teki not).
function errorDetail(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : '';
}

export default function UserProfileScreen() {
  const { username: usernameParam } = useLocalSearchParams<{ username: string }>();
  const username = typeof usernameParam === 'string' ? usernameParam : '';
  const { locale, t } = useLocale();
  const c = useThemeColors();
  const ps = PROFILE_STRINGS[locale] ?? PROFILE_STRINGS.tr;
  const days = ps.days.split(',');

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = () => {
    setLoading(true);
    setError(false);
    setNotFound(false);
    socialApi
      .getPublicProfile(username)
      .then(setProfile)
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
        else setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (username) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleToggleFollow = async () => {
    if (!profile) return;
    setBusy(true);
    setActionError('');
    try {
      if (profile.is_following) await socialApi.unfollow(profile.id);
      else await socialApi.follow(profile.id);
      setProfile({ ...profile, is_following: !profile.is_following });
    } catch {
      setActionError(ps.actionError);
    } finally {
      setBusy(false);
    }
  };

  const handleSendRequest = async () => {
    if (!profile?.username) return;
    setBusy(true);
    setActionError('');
    try {
      const res = await socialApi.sendFriendRequest(profile.username);
      setProfile({ ...profile, relationship_status: 'pending_sent', friendship_id: res.id });
    } catch (err) {
      setActionError(errorDetail(err) || ps.actionError);
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!profile?.friendship_id) return;
    setBusy(true);
    setActionError('');
    try {
      await socialApi.acceptFriendRequest(profile.friendship_id);
      load();
    } catch {
      setActionError(ps.actionError);
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!profile?.friendship_id) return;
    setBusy(true);
    setActionError('');
    try {
      await socialApi.declineFriendRequest(profile.friendship_id);
      load();
    } catch {
      setActionError(ps.actionError);
      setBusy(false);
    }
  };

  const handleRemoveFriend = () => {
    if (!profile) return;
    Alert.alert(ps.removeConfirm, '', [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: ps.removeFriendBtn,
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setActionError('');
          try {
            await socialApi.removeFriend(profile.id);
            load();
          } catch {
            setActionError(ps.actionError);
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleBlock = () => {
    if (!profile) return;
    Alert.alert(ps.blockConfirm, '', [
      { text: t('cancelBtn'), style: 'cancel' },
      {
        text: ps.blockBtn,
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          setActionError('');
          try {
            await socialApi.blockUser(profile.id);
            router.push('/(app)/friends');
          } catch (err) {
            setActionError(errorDetail(err) || ps.blockError);
            setBusy(false);
          }
        },
      },
    ]);
  };

  const goBack = () => router.push('/(app)/friends');

  if (loading) {
    return (
      <ScreenContainer>
        <View style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (notFound) {
    return (
      <ScreenContainer>
        <Card style={{ backgroundColor: c.background, borderColor: c.border }}>
          <Text style={{ color: c.textSecondary, fontSize: 13 }}>{ps.notFound}</Text>
        </Card>
        <Pressable onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}>
          <ArrowLeft color={c.primary} size={16} />
          <Text style={{ color: c.primary, fontSize: 13, fontWeight: '600' }}>{ps.back}</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  if (error || !profile) {
    return (
      <ScreenContainer>
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{ps.error}</Text>
        </Card>
      </ScreenContainer>
    );
  }

  const name = profile.display_name || profile.username || '?';
  const isSelf = profile.relationship_status === 'self';

  return (
    <ScreenContainer>
      <Pressable onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md }}>
        <ArrowLeft color={c.textMuted} size={16} />
        <Text style={{ color: c.textMuted, fontSize: 13, fontWeight: '600' }}>{ps.back}</Text>
      </Pressable>

      {actionError ? (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft, marginBottom: spacing.md }}>
          <Text style={{ color: c.danger, fontSize: 12 }}>{actionError}</Text>
        </Card>
      ) : null}

      <Card style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{name}</Text>
              <View style={[styles.levelBadge, { backgroundColor: c.warningSoft }]}>
                <Trophy color={c.warning} size={11} />
                <Text style={{ color: c.warning, fontSize: 11, fontWeight: '700' }}>{ps.levelPrefix} {profile.level}</Text>
              </View>
            </View>
            {profile.username ? <Text style={{ color: c.textMuted, fontSize: 13 }}>@{profile.username}</Text> : null}
            <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
              {ps.memberSince} {new Date(profile.created_at).toLocaleDateString(locale)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Users color={c.textMuted} size={12} />
                <Text style={{ color: c.textSecondary, fontSize: 11 }}>{profile.friend_count} {ps.friendsCountLabel}</Text>
              </View>
              <Text style={{ color: c.textSecondary, fontSize: 11 }}>{profile.follower_count} {ps.followersCountLabel}</Text>
              <Text style={{ color: c.textSecondary, fontSize: 11 }}>{profile.following_count} {ps.followingCountLabel}</Text>
            </View>
          </View>
        </View>

        {isSelf ? (
          <Text style={{ color: c.textMuted, fontSize: 12, marginTop: spacing.md }}>{ps.selfHint}</Text>
        ) : (
          <View style={[styles.actionsWrap, { borderTopColor: c.border }]}>
            {profile.username && (
              <Pressable
                onPress={() => router.push({ pathname: '/(app)/message-thread', params: { username: profile.username! } })}
                style={[styles.pillBtn, { backgroundColor: c.primary }]}
              >
                <MessageCircle color="#fff" size={14} />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{ps.messageBtn}</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleToggleFollow}
              disabled={busy}
              style={[styles.pillBtnOutline, { borderColor: c.border, opacity: busy ? 0.5 : 1 }]}
            >
              <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>
                {profile.is_following ? ps.unfollowBtn : ps.followBtn}
              </Text>
            </Pressable>

            {profile.relationship_status === 'none' && (
              <Pressable onPress={handleSendRequest} disabled={busy} style={[styles.pillBtn, { backgroundColor: c.primary, opacity: busy ? 0.5 : 1 }]}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <UserPlus color="#fff" size={14} />}
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{ps.sendRequestBtn}</Text>
              </Pressable>
            )}

            {profile.relationship_status === 'pending_sent' && (
              <View style={[styles.pillBtnStatic, { backgroundColor: c.background }]}>
                <Text style={{ color: c.textMuted, fontWeight: '700', fontSize: 12 }}>{ps.requestSentBtn}</Text>
              </View>
            )}

            {profile.relationship_status === 'pending_received' && (
              <>
                <Pressable onPress={handleAccept} disabled={busy} style={[styles.pillBtn, { backgroundColor: c.primary, opacity: busy ? 0.5 : 1 }]}>
                  <Check color="#fff" size={14} />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{ps.acceptBtn}</Text>
                </Pressable>
                <Pressable onPress={handleDecline} disabled={busy} style={[styles.pillBtnOutline, { borderColor: c.border, opacity: busy ? 0.5 : 1 }]}>
                  <X color={c.textSecondary} size={14} />
                  <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>{ps.declineBtn}</Text>
                </Pressable>
              </>
            )}

            {profile.relationship_status === 'friends' && (
              <>
                <View style={[styles.pillBtnStatic, { backgroundColor: c.successSoft }]}>
                  <Text style={{ color: c.success, fontWeight: '700', fontSize: 12 }}>{ps.friendsLabel}</Text>
                </View>
                <Pressable onPress={handleRemoveFriend} disabled={busy} style={[styles.pillBtnOutline, { borderColor: c.danger, opacity: busy ? 0.5 : 1 }]}>
                  <Text style={{ color: c.danger, fontWeight: '700', fontSize: 12 }}>{ps.removeFriendBtn}</Text>
                </Pressable>
              </>
            )}

            <Pressable onPress={handleBlock} disabled={busy} style={[styles.pillBtnOutline, { borderColor: c.border, marginLeft: 'auto', opacity: busy ? 0.5 : 1 }]}>
              <Ban color={c.textMuted} size={14} />
              <Text style={{ color: c.textMuted, fontWeight: '700', fontSize: 12 }}>{ps.blockBtn}</Text>
            </Pressable>
          </View>
        )}
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.sectionHeader}>
          <BookOpen color={c.primary} size={16} />
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{ps.statsTitle}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <StatBlock value={String(profile.stats.total_words)} label={ps.totalWordsLabel} />
          <StatBlock value={String(profile.stats.learned)} label={ps.learnedLabel} />
          <StatBlock value={String(profile.stats.learning)} label={ps.learningLabel} />
          <StatBlock
            value={String(profile.stats.current_streak)}
            label={`${ps.streakLabel} (${ps.streakUnit})`}
            icon={<Flame color={c.danger} size={13} />}
          />
        </View>
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <CalendarDays color={c.primary} size={16} />
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{ps.scheduleTitle}</Text>
        </View>
        {profile.schedule.length === 0 ? (
          <Text style={{ color: c.textMuted, fontSize: 12 }}>{ps.scheduleEmpty}</Text>
        ) : (
          profile.schedule.map((item, i) => (
            <View key={i} style={styles.scheduleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                <View style={[styles.dayBadge, { backgroundColor: c.primarySoft }]}>
                  <Text style={{ color: c.primary, fontSize: 11, fontWeight: '700' }}>{days[item.day_of_week] ?? item.day_of_week}</Text>
                </View>
                <Text style={{ color: c.textMuted, fontSize: 11 }}>{item.time_slot}</Text>
                <Text style={{ color: c.text, fontSize: 13, flex: 1 }} numberOfLines={1}>{item.activity}</Text>
              </View>
              <Text style={{ color: c.textMuted, fontSize: 11 }}>{item.duration_min} {ps.minLabel}</Text>
            </View>
          ))
        )}
      </Card>
    </ScreenContainer>
  );
}

function StatBlock({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  const c = useThemeColors();
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        {icon}
        <Text style={{ color: c.text, fontSize: 16, fontWeight: '700' }}>{value}</Text>
      </View>
      <Text style={{ color: c.textMuted, fontSize: 10, textAlign: 'center', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  actionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 },
  pillBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  pillBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1.5 },
  pillBtnStatic: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  dayBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
});
