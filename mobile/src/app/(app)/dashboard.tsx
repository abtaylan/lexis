import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Plus, Clock, Play, Zap, Layers, BarChart3, Users, GraduationCap, ChevronRight, CalendarDays, TrendingDown } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { FRIENDS_STRINGS } from '@/i18n/friendsStrings';
import { statsApi } from '@/api/stats';
import { scheduleApi } from '@/api/schedule';
import { examsApi } from '@/api/exams';
import { wordsApi } from '@/api/words';
import { gamesApi } from '@/api/games';
import type { WeakTopicItem, WeakWordTypeItem, WeakDifficultyItem } from '@/api/types';
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


function humanizeTopicTag(tag: string): string {
  const cleaned = tag.replace(/^vocab-/, '').replace(/-/g, ' ');
  return cleaned.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// V2 madde #6 (Faz 2) -- kelime/oyun tarafi zayif alan ozetleri. Web'deki
// WEAK_WORD_TYPES_STRINGS/WEAK_DIFFICULTY_STRINGS ile birebir ayni tr/en
// metinler (bkz. web/src/app/(app)/dashboard/page.tsx).
const WEAK_WORD_TYPES_STRINGS: Record<'tr' | 'en', { title: string; subtitle: string; cta: string }> = {
  tr: {
    title: 'Zayıf Kelime Türlerin',
    subtitle: 'Tekrarlarında en çok zorlandığın kelime türleri',
    cta: 'Kelimelerime Git',
  },
  en: {
    title: 'Your Weak Word Types',
    subtitle: 'Word types you struggle with most in reviews',
    cta: 'Go to My Words',
  },
};

const WEAK_DIFFICULTY_STRINGS: Record<'tr' | 'en', { title: string; subtitle: string; cta: string; levelLabels: Record<string, string> }> = {
  tr: {
    title: 'Zayıf Zorluk Seviyen',
    subtitle: 'Oyunlarda en çok yanlış yaptığın zorluk seviyeleri',
    cta: 'Oyun Oyna',
    levelLabels: { beginner: 'Başlangıç', intermediate: 'Orta', advanced: 'İleri' },
  },
  en: {
    title: 'Your Weak Difficulty Level',
    subtitle: 'Difficulty levels you miss most in games',
    cta: 'Play a Game',
    levelLabels: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
  },
};

export default function DashboardScreen() {
  const { t, locale, et } = useLocale();
  const c = useThemeColors();
  const { user } = useAuth();
  const fs = FRIENDS_STRINGS[locale] ?? FRIENDS_STRINGS.tr;

  const { data: stats, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stats-summary'],
    queryFn: statsApi.getSummary,
  });

  // Madde #3c: haftalık zayıf konu özeti. list_exam_types ile aynı desen —
  // uygun olmayan kullanıcıda backend boş liste döner, widget o durumda hiç
  // görünmez (bkz. exams.py::weak_topics).
  const { data: weakTopics } = useQuery({
    queryKey: ['exam-weak-topics'],
    queryFn: () => examsApi.weakTopics(7, 3),
  });

  // V2 madde #6 (Faz 2) -- kelime/oyun tarafi zayif alan widget'lari.
  const { data: weakWordTypes } = useQuery({
    queryKey: ['words-weak-word-types'],
    queryFn: () => wordsApi.weakWordTypes(30, 3),
  });
  const { data: weakDifficulty } = useQuery({
    queryKey: ['games-weak-difficulty'],
    queryFn: () => gamesApi.weakDifficulty(30, 3),
  });

  // Kullanıcı isteği (9 Eylül 2026): "ana ekrana bu sınav programı için bir
  // bölüm eklenecek mi" — Çalışma Programı zaten kendi alt-sekmesinde
  // (CalendarDays ikonu) her zaman erişilebilir durumda, ama dashboard'da
  // "bugün ne çalışmalıyım" sorusuna tek bakışta cevap veren bir özet yoktu.
  // day_of_week backend şemasında 0=Pazar..6=Cumartesi — JS Date.getDay() ile
  // birebir aynı, dönüşüm gerekmiyor (bkz. schedule.tsx DISPLAY_ORDER yorumu).
  const { data: scheduleItems } = useQuery({
    queryKey: ['schedule'],
    queryFn: scheduleApi.getAll,
  });
  const todayItems = (scheduleItems ?? [])
    .filter((it) => it.day_of_week === new Date().getDay())
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

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

        <Pressable
          onPress={() => router.push('/(app)/schedule')}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Card style={{ paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: 0 }}>
            <View style={styles.todayHeaderRow}>
              <View style={styles.todayHeaderLeft}>
                <CalendarDays color={c.primary} size={17} />
                <Text style={[styles.todayTitle, { color: c.text }]}>{t('todayScheduleTitle')}</Text>
              </View>
              <View style={styles.todayHeaderLeft}>
                <Text style={[styles.todayViewAll, { color: c.primary }]}>{t('todayScheduleViewAll')}</Text>
                <ChevronRight color={c.primary} size={13} />
              </View>
            </View>
            {todayItems.length === 0 ? (
              <Text style={[styles.todayEmpty, { color: c.textMuted }]}>{t('todayScheduleEmpty')}</Text>
            ) : (
              <View style={{ gap: 6, marginTop: spacing.sm }}>
                {todayItems.map((it) => (
                  <View key={it.id} style={styles.todayItemRow}>
                    <Text style={[styles.todayItemTime, { color: c.primary }]}>{it.time_slot}</Text>
                    <Text style={[styles.todayItemActivity, { color: c.text }]} numberOfLines={1}>
                      {it.activity}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </Pressable>

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

        {/* Madde #3c: zayıf konu özeti — sadece en az bir zayıf konu varsa
            gösterilir (backend boş liste dönerse widget hiç render edilmez). */}
        {!!weakTopics?.items?.length && (
          <Card style={{ marginTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <TrendingDown color={c.danger} size={18} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>{et.weakTopicsTitle}</Text>
            </View>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{et.weakTopicsSubtitle}</Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {weakTopics.items.map((item: WeakTopicItem) => (
                <View key={item.topic_tag} style={[styles.weakTopicRow, { borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }} numberOfLines={1}>
                      {item.related_grammar_topic?.title_tr ?? humanizeTopicTag(item.topic_tag)}
                    </Text>
                    <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
                      {et.weakTopicsAccuracyTpl.replace('{percent}', String(Math.round(item.accuracy_ratio * 100)))}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    {item.related_grammar_topic && (
                      <Pressable
                        onPress={() =>
                          router.push({ pathname: '/(app)/exam-grammar-detail', params: { slug: item.related_grammar_topic!.slug } })
                        }
                        style={[styles.weakTopicBtn, { borderColor: c.primary }]}
                      >
                        <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>{et.weakTopicsReviewBtn}</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => router.push({ pathname: '/(app)/exam-topic-practice', params: { topic_tag: item.topic_tag } })}
                      style={[styles.weakTopicBtn, { borderColor: c.warning }]}
                    >
                      <Text style={{ color: c.warning, fontSize: 12, fontWeight: '700' }}>{et.weakTopicsPracticeBtn}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* V2 madde #6 (Faz 2): zayıf kelime türü özeti */}
        {!!weakWordTypes?.items?.length && (
          <Card style={{ marginTop: spacing.sm }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>
              {(WEAK_WORD_TYPES_STRINGS[locale as 'tr' | 'en'] ?? WEAK_WORD_TYPES_STRINGS.tr).title}
            </Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              {(WEAK_WORD_TYPES_STRINGS[locale as 'tr' | 'en'] ?? WEAK_WORD_TYPES_STRINGS.tr).subtitle}
            </Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {weakWordTypes.items.map((item: WeakWordTypeItem) => (
                <View key={item.word_type} style={[styles.weakTopicRow, { borderColor: c.border }]}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, textTransform: 'capitalize' }} numberOfLines={1}>
                    {item.word_type}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/(app)/words')}
                    style={[styles.weakTopicBtn, { borderColor: c.primary }]}
                  >
                    <Text style={{ color: c.primary, fontSize: 12, fontWeight: '700' }}>
                      {(WEAK_WORD_TYPES_STRINGS[locale as 'tr' | 'en'] ?? WEAK_WORD_TYPES_STRINGS.tr).cta}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* V2 madde #6 (Faz 2): zayıf zorluk seviyesi özeti */}
        {!!weakDifficulty?.items?.length && (
          <Card style={{ marginTop: spacing.sm }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: c.text }}>
              {(WEAK_DIFFICULTY_STRINGS[locale as 'tr' | 'en'] ?? WEAK_DIFFICULTY_STRINGS.tr).title}
            </Text>
            <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
              {(WEAK_DIFFICULTY_STRINGS[locale as 'tr' | 'en'] ?? WEAK_DIFFICULTY_STRINGS.tr).subtitle}
            </Text>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {weakDifficulty.items.map((item: WeakDifficultyItem) => (
                <View key={item.difficulty_level} style={[styles.weakTopicRow, { borderColor: c.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }} numberOfLines={1}>
                      {(WEAK_DIFFICULTY_STRINGS[locale as 'tr' | 'en'] ?? WEAK_DIFFICULTY_STRINGS.tr).levelLabels[item.difficulty_level] ?? item.difficulty_level}
                    </Text>
                    <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>
                      {et.weakTopicsAccuracyTpl.replace('{percent}', String(Math.round(item.accuracy_ratio * 100)))}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/(app)/game')}
                    style={[styles.weakTopicBtn, { borderColor: c.warning }]}
                  >
                    <Text style={{ color: c.warning, fontSize: 12, fontWeight: '700' }}>
                      {(WEAK_DIFFICULTY_STRINGS[locale as 'tr' | 'en'] ?? WEAK_DIFFICULTY_STRINGS.tr).cta}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
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
  weakTopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  weakTopicBtn: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
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
  todayHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayTitle: { fontSize: 14, fontWeight: '700' },
  todayViewAll: { fontSize: 11.5, fontWeight: '600' },
  todayEmpty: { fontSize: 12.5, marginTop: spacing.sm },
  todayItemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  todayItemTime: { fontSize: 12, fontWeight: '700', width: 42 },
  todayItemActivity: { fontSize: 12.5, fontWeight: '500', flex: 1 },
});
