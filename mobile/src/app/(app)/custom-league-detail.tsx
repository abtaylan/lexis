import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users2, RefreshCw, UserPlus, Trash2, LogOut, Search, Crown } from 'lucide-react-native';
import { customLeaguesApi } from '@/api/customLeagues';
import { socialApi } from '@/api/social';
import type { UserCard } from '@/api/types';
import { CUSTOM_LEAGUE_STRINGS } from '@/i18n/customLeagueStrings';
import { useLocale } from '@/i18n';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { LeagueTable } from '@/components/LeagueTable';

// ── Özel lig detayı — web'deki app/(app)/league/custom/[id]/page.tsx'in
// mobil karşılığı. Bu ekrana SADECE üyeler girebilir (bkz. backend
// custom_league_members_select_own_leagues RLS ilkesi). "kendi
// arkadaşlarımı ve sistemde bulunan diğer user'ları ekleyebilmeliyim" —
// arkadaş-only bir çip listesi yerine (duels.tsx deseni) burada
// socialApi.searchUsers ile SİSTEMDEKİ HERHANGİ bir kullanıcıyı arayıp
// davet edebileceğin bir arama kutusu var; backend zaten arkadaşlık
// kontrolü yapmıyor (bkz. custom_leagues.py::invite_to_custom_league).
// Rota deseni league-detail.tsx ile AYNI: düz dosya + useLocalSearchParams
// (bu projede [id].tsx dinamik segmenti kullanılmıyor).

function errorDetail(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : '';
}

export default function CustomLeagueDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const leagueId = typeof idParam === 'string' ? idParam : '';
  const { locale } = useLocale();
  const c = useThemeColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const t = CUSTOM_LEAGUE_STRINGS[locale] ?? CUSTOM_LEAGUE_STRINGS.tr;

  const detailQuery = useQuery({
    queryKey: ['custom-league-detail', leagueId],
    queryFn: () => customLeaguesApi.getDetail(leagueId),
    enabled: !!leagueId,
  });
  const league = detailQuery.data;
  const notFound = detailQuery.isError;

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const items = await socialApi.searchUsers(query.trim());
        const memberIds = new Set((league?.members ?? []).map((m) => m.user_id));
        setSearchResults(items.filter((u) => !memberIds.has(u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sadece query degisince yeniden ara
  }, [query]);

  const inviteMutation = useMutation({
    mutationFn: (username: string) => customLeaguesApi.invite(leagueId, username),
    onSuccess: (_data, username) => {
      setInviteMsg(t.inviteSent);
      setSearchResults((prev) => prev.filter((r) => r.username !== username));
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => customLeaguesApi.leave(leagueId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-leagues-mine'] });
      router.back();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => customLeaguesApi.delete(leagueId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-leagues-mine'] });
      router.back();
    },
  });

  const isCreator = !!league && !!user && league.created_by === user.id;
  const isFull = !!league && league.members.length >= league.max_members;

  return (
    <ScreenContainer refreshing={detailQuery.isRefetching} onRefresh={detailQuery.refetch}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft color={c.textMuted} size={18} />
        </Pressable>
        <Text style={{ color: c.textMuted, fontSize: 13 }}>{t.back}</Text>
      </View>

      {detailQuery.isLoading && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <ActivityIndicator color={c.accent} />
        </View>
      )}
      {!detailQuery.isLoading && notFound && (
        <Card style={{ backgroundColor: c.dangerSoft, borderColor: c.dangerSoft }}>
          <Text style={{ color: c.danger, fontSize: 13 }}>{t.notFound}</Text>
        </Card>
      )}

      {!detailQuery.isLoading && !notFound && league && (
        <>
          <View style={styles.titleRow}>
            <View style={[styles.headerIcon, { backgroundColor: c.accentSoft }]}>
              <Users2 color={c.accent} size={20} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: c.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
                  {league.name}
                </Text>
                {isCreator && <Crown color="#f59e0b" size={16} />}
              </View>
              <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 1 }}>
                {league.members.length}/{league.max_members}
              </Text>
            </View>
            <Pressable onPress={() => detailQuery.refetch()} style={styles.iconBtn} hitSlop={8}>
              <RefreshCw color={c.textMuted} size={16} />
            </Pressable>
          </View>

          {isCreator ? (
            <Pressable
              onPress={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              style={[styles.dangerBtn, { backgroundColor: c.dangerSoft, opacity: deleteMutation.isPending ? 0.6 : 1 }]}
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator color={c.danger} size="small" />
              ) : (
                <Trash2 color={c.danger} size={14} />
              )}
              <Text style={{ color: c.danger, fontWeight: '700', fontSize: 12 }}>{t.deleteLeagueBtn}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => leaveMutation.mutate()}
              disabled={leaveMutation.isPending}
              style={[styles.dangerBtn, { backgroundColor: c.dangerSoft, opacity: leaveMutation.isPending ? 0.6 : 1 }]}
            >
              {leaveMutation.isPending ? (
                <ActivityIndicator color={c.danger} size="small" />
              ) : (
                <LogOut color={c.danger} size={14} />
              )}
              <Text style={{ color: c.danger, fontWeight: '700', fontSize: 12 }}>{t.leaveLeagueBtn}</Text>
            </Pressable>
          )}

          <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
            <View style={styles.sectionTitleRow}>
              <UserPlus color={c.accent} size={16} />
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 14 }}>{t.inviteSectionTitle}</Text>
            </View>
            {isFull ? (
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{t.membersFull}</Text>
            ) : (
              <>
                <View style={[styles.searchBox, { borderColor: c.border, backgroundColor: c.background }]}>
                  <Search color={c.textMuted} size={15} />
                  <TextInput
                    value={query}
                    onChangeText={(v) => {
                      setQuery(v);
                      setInviteMsg(null);
                    }}
                    placeholder={t.searchPlaceholder}
                    placeholderTextColor={c.textMuted}
                    style={[styles.searchInput, { color: c.text }]}
                  />
                </View>
                {!!inviteMsg && <Text style={{ color: c.success, fontSize: 11, marginTop: spacing.xs }}>{inviteMsg}</Text>}
                {searching && <Text style={{ color: c.textMuted, fontSize: 11, marginTop: spacing.xs }}>{t.searching}</Text>}
                {!searching && query.trim().length > 0 && searchResults.length === 0 && (
                  <Text style={{ color: c.textMuted, fontSize: 11, marginTop: spacing.xs }}>{t.noResults}</Text>
                )}
                {searchResults.map((u) => (
                  <View key={u.id} style={styles.resultRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, minWidth: 0 }}>
                      <View style={[styles.smallAvatar, { backgroundColor: c.background }]}>
                        <Users2 color={c.textMuted} size={12} />
                      </View>
                      <Text style={{ color: c.text, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
                        {u.display_name || u.username}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => u.username && inviteMutation.mutate(u.username)}
                      disabled={inviteMutation.isPending}
                      style={[styles.inviteResultBtn, { backgroundColor: c.accentSoft }]}
                    >
                      {inviteMutation.isPending && inviteMutation.variables === u.username ? (
                        <ActivityIndicator color={c.accent} size="small" />
                      ) : (
                        <UserPlus color={c.accent} size={13} />
                      )}
                      <Text style={{ color: c.accent, fontWeight: '700', fontSize: 11 }}>{t.inviteBtn}</Text>
                    </Pressable>
                  </View>
                ))}
              </>
            )}
          </Card>

          <LeagueTable
            members={league.members}
            rankLabel={t.rankLabel}
            userLabel={t.userLabel}
            xpLabel={t.xpLabel}
            youLabel={t.youLabel}
            locale={locale}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  headerIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  iconBtn: { padding: spacing.xs },
  dangerBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 14 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs + 2 },
  smallAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  inviteResultBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full },
});
