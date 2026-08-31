import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Plus, Clock, Play, Zap, Layers, BarChart3, Users } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { FRIENDS_STRINGS } from '@/i18n/friendsStrings';
import { statsApi } from '@/api/stats';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Card } from '@/components/ui/Card';
import { DashboardHeader } from '@/components/DashboardHeader';
import { AdBanner } from '@/components/ads/AdBanner';
import { bulkStorage } from '@/utils/storage';

const ASKED_KEY = 'lexis_notif_permission_asked';

type ThemeColors = ReturnType<typeof useThemeColors>;
type ColorKey = keyof ThemeColors;

interface QuickAction {
  key: string;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  label: string;
  route: Parameters<typeof router.push>[0];
  bg: ColorKey;
  fg: ColorKey;
}

export default function DashboardScreen() {
  const { t, locale } = useLocale();
  const c = useThemeColors();
  const { user } = useAuth();
  const fs = FRIENDS_STRINGS[locale] ?? FRIENDS_STRINGS.tr;

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: statsApi.getSummary,
  });

  useEffect(() => {
    (async () => {
      const asked = await bulkStorage.getItem(ASKED_KEY);
      if (!asked) {
        const timer = setTimeout(() => router.push('/(app)/notification-permission'), 1200);
        return () => clearTimeout(timer);
      }
    })();
  }, []);

  // Hızlı işlemler grid'i — onaylanan tasarım canvas'ındaki (Main.dc.html) 3
  // sütunlu, ikon-üstte/etiket-altta düzeniyle birebir aynı 6 kısayol.
  // Mesajlar ve Premium artık ayrı kart kısayolu değil — Mesajlar başlıktaki
  // (DashboardHeader) simgeden, Premium ise profil sekmesinden erişiliyor.
  const quickActions: QuickAction[] = [
    { key: 'addWord', icon: Plus, label: t('addWordBtn'), route: '/(app)/words', bg: 'primarySoft', fg: 'primary' },
    { key: 'game', icon: Play, label: t('startBtn'), route: '/(app)/game', bg: 'accentSoft', fg: 'accent' },
    { key: 'quiz', icon: Zap, label: t('quiz'), route: '/(app)/quiz', bg: 'warningSoft', fg: 'warning' },
    { key: 'flashcards', icon: Layers, label: t('flashcards'), route: '/(app)/flashcards', bg: 'successSoft', fg: 'success' },
    { key: 'stats', icon: BarChart3, label: t('stats'), route: '/(app)/stats', bg: 'primarySoft', fg: 'primary' },
    { key: 'friends', icon: Users, label: fs.title, route: '/(app)/friends', bg: 'accentSoft', fg: 'accent' },
  ];

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={refetch} padded={false}>
      <DashboardHeader
        greeting={`${t('greeting')}${user?.display_name ? `, ${user.display_name}` : ''} 👋`}
        subtitle={t('dailySummarySubtitle')}
      />

      <View style={styles.content}>
        {!isLoading && stats && (
          <View style={styles.grid}>
            <StatTile icon={BookOpen} label={t('totalWords')} value={String(stats.total_words)} bg="primarySoft" fg="primary" color={c} />
            <StatTile icon={Plus} label={t('addedToday')} value={String(stats.today_added)} bg="successSoft" fg="success" color={c} />
            <StatTile icon={Clock} label={t('dueReview')} value={String(stats.learning)} bg="accentSoft" fg="accent" color={c} />
          </View>
        )}

        <View>
          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('quickActions')}</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((a) => (
              <ActionTile
                key={a.key}
                icon={a.icon}
                label={a.label}
                onPress={() => router.push(a.route)}
                bg={c[a.bg]}
                fg={c[a.fg]}
              />
            ))}
          </View>
        </View>

        {/* Sıralama (leaderboard) artık burada değil, kendi alt-sekmesinde
            (bkz. (app)/leaderboard.tsx, (app)/_layout.tsx) — 31 Ağustos 2026
            kullanıcı talebi. Burada açılan boşluk başka eklentilere ayrılabilir. */}

        <AdBanner style={{ marginTop: spacing.sm }} />
      </View>
    </ScreenContainer>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  bg,
  fg,
  color: c,
}: {
  icon: React.ComponentType<{ color?: string; size?: number }>;
  label: string;
  value: string;
  bg: ColorKey;
  fg: ColorKey;
  color: ThemeColors;
}) {
  return (
    <Card style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: c[bg] }]}>
        <Icon color={c[fg]} size={16} />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>{value}</Text>
      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </Card>
  );
}

function ActionTile({
  icon: Icon,
  label,
  onPress,
  bg,
  fg,
}: {
  icon: React.ComponentType<{ color?: string; size?: number }>;
  label: string;
  onPress: () => void;
  bg: string;
  fg: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionTile}>
      <View style={[styles.tileIcon, { backgroundColor: bg }]}>
        <Icon color={fg} size={17} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  grid: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: spacing.xs },
  tileIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionTile: {
    width: '31%',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F1F4',
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: 4,
  },
  actionLabel: { fontSize: 11.5, fontWeight: '600', color: '#374151', textAlign: 'center' },
});
