import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Plus, Clock, Play, Zap, Layers, BarChart3, Users, GraduationCap, ChevronRight } from 'lucide-react-native';
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

// Saatin dilimine göre karşılama metni anahtarını seçer (cihaz saatine göre):
// 05:00–11:59 Günaydın, 12:00–17:59 İyi günler, 18:00–21:59 İyi akşamlar,
// 22:00–04:59 İyi geceler.
function greetingKeyForHour(hour: number): 'greeting' | 'greetingAfternoon' | 'greetingEvening' | 'greetingNight' {
  if (hour >= 5 && hour < 12) return 'greeting';
  if (hour >= 12 && hour < 18) return 'greetingAfternoon';
  if (hour >= 18 && hour < 22) return 'greetingEvening';
  return 'greetingNight';
}

interface QuickAction {
  key: string;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  label: string;
  route: Parameters<typeof router.push>[0];
  bg: ColorKey;
  fg: ColorKey;
}

export default function DashboardScreen() {
  const { t, locale, et } = useLocale();
  const c = useThemeColors();
  const { user } = useAuth();
  const fs = FRIENDS_STRINGS[locale] ?? FRIENDS_STRINGS.tr;

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: statsApi.getSummary,
  });

  // Kullanıcı geri bildirimi: kelime ekleyip/tekrar edip Dashboard'a geri
  // dönünce "Tekrar Bekleyen"/"Bugün Eklenen" sayıları güncellenmiyordu —
  // sadece uygulamadan tamamen çıkıp tekrar girince düzeliyordu. Sebep: bu
  // sekme, sekmeler arası geçişte unmount OLMUYOR, bu yüzden useQuery yalnızca
  // İLK açılışta veri çekiyor; Kelime Ekle/Flashcards gibi başka ekranlardan
  // dönüşte bu ekran odağı tekrar kazandığında hiçbir şey bu veriyi tazelemiyordu.
  // useFocusEffect ile sekme her odaklandığında (geri dönüldüğünde) istatistikleri
  // yeniden çekiyoruz — artık uygulamayı kapatıp açmaya gerek kalmıyor.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    // NOT (8 Eylül 2026): Eksik/kayıp push token'ı sessizce onarma işi artık
    // üst katmandaki (app)/_layout.tsx'e taşındı — orası sadece ilk açılışta
    // değil, uygulama HER ön plana gelişinde (AppState 'active') tekrar
    // deniyor, burasından çok daha güvenilir. Bu ekran sadece "hiç izin
    // sorulmadıysa soft-ask ekranını göster" görevini koruyor.
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

  const greetingText = t(greetingKeyForHour(new Date().getHours()));

  return (
    <ScreenContainer refreshing={isRefetching} onRefresh={refetch} padded={false}>
      <DashboardHeader
        greeting={`${greetingText}${user?.display_name ? `, ${user.display_name}` : ''} 👋`}
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

        {/* V2 Yol Haritası §1.1 (9 Eylül 2026) — Sınav Hazırlık Alanı artık ayrı,
            öne çıkan bir banner olarak gösteriliyor (kullanıcı isteği: küçük
            kısayol karosu yeterince görünür değildi, "Hızlı işlemler"
            bölümünün üstünde kendi alanı olsun istendi). Ekranın kendisi
            (exam-prep.tsx) native_lang=tr + learning_lang=en dışındaki
            kullanıcılara nazik bir "kullanılamıyor" mesajı gösteriyor, bu
            yüzden burada profile göre koşullu gizleme yapılmadı (basit/
            tutarlı: giriş noktası her zaman görünür). */}
        <Pressable
          onPress={() => router.push('/(app)/exam-prep')}
          style={({ pressed }) => [styles.examBanner, { backgroundColor: c.warningSoft, opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={[styles.examBannerIcon, { backgroundColor: c.surface }]}>
            <GraduationCap color={c.warning} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.examBannerTitle, { color: c.text }]}>{et.pageTitle}</Text>
            <Text style={[styles.examBannerSubtitle, { color: c.textMuted }]} numberOfLines={2}>
              {et.pageSubtitle}
            </Text>
            <View style={styles.examBannerCtaRow}>
              <Text style={[styles.examBannerCta, { color: c.warning }]}>{et.bannerCta}</Text>
              <ChevronRight color={c.warning} size={14} />
            </View>
          </View>
        </Pressable>

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
  examBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  examBannerIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  examBannerTitle: { fontSize: 14.5, fontWeight: '700' },
  examBannerSubtitle: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  examBannerCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.xs },
  examBannerCta: { fontSize: 12.5, fontWeight: '700' },
});
