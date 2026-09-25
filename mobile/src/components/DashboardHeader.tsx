import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Bell, MessageCircle, Flame } from 'lucide-react-native';
import { notificationsApi } from '@/api/notifications';
import { socialApi } from '@/api/social';
import { statsApi } from '@/api/stats';
import { examsApi } from '@/api/exams';
import { useAuth } from '@/store/auth';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useThemeMode } from '@/store/theme';
import { useLocale } from '@/i18n';
import { radius, spacing } from '@/constants/theme';

// 24 Eylül 2026 -- CEFR rozeti (bkz. web/src/components/layout/CefrBadge.tsx
// -- AYNI gerekçe: Adaptif Öğrenme Motoru current_level'i sürekli
// güncelliyor ama hiçbir ekranda gösterilmiyordu). Web'deki gibi kısa
// tr/en isim seti -- bu dosyadaki diğer bazı etiketler (ör. "SERİ") zaten
// tam i18n kapsamında değil, aynı hafif desen izleniyor.
const CEFR_LEVEL_NAMES: Record<'tr' | 'en', Record<string, string>> = {
  tr: { a1: 'Başlangıç', a2: 'Temel', b1: 'Orta', b2: 'Orta-Üstü', c1: 'İleri', c2: 'Uzman' },
  en: { a1: 'Beginner', a2: 'Elementary', b1: 'Intermediate', b2: 'Upper-Int.', c1: 'Advanced', c2: 'Proficient' },
};

// 25 Eylül 2026 -- Bento Modern (açık) / Gamified (koyu) canvas yeniden
// tasarımı canlıya alındı (onaylanan Cowork Design canvas'ı,
// https://claude.ai/artifact/9WdZvZiwYtdsXLzb9kd2hj). Önceki sürüm her iki
// temada da tek bir mor→lacivert gradyanlı "hero" kutusuydu -- yeni
// tasarım temaya göre KÖKTEN farklı bir yapı kullanıyor:
//   - Açık tema: düz/beyaz üst satır (karşılama + 3 ikon rozeti) ve
//     altında ayrı, gradyanlı bir "seri" kartı (streak + seviye + XP bar).
//   - Koyu tema: düz/koyu üst satır (aynı 3 ikon, cam görünümlü) ve
//     altında dairesel bir XP halkası + seri/CEFR seviye çipleri.
// İkisi de burada zaten çekilen GERÇEK veriyi kullanıyor (stats, xp,
// notifData, unreadMessages, placementStatus) -- yeni bir API çağrısı
// eklenmedi, sadece görsel katman değişti. 3 ikonlu üst satır (mesaj/
// bildirim/profil) zaten mevcuttu, sadece "cam" kare-rozet stiline
// (12px radius) çevrildi -- Main.dc.html/ConceptB_GamifiedDark.dc.html'deki
// onaylanmış ikon grubuyla birebir.
interface DashboardHeaderProps {
  greeting: string;
  subtitle: string;
}

export function DashboardHeader({ greeting, subtitle }: DashboardHeaderProps) {
  const c = useThemeColors();
  const { scheme } = useThemeMode();
  const isDark = scheme === 'dark';
  const { user } = useAuth();
  const { xpLabels, locale } = useLocale();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(50),
    refetchInterval: 30000,
  });
  const { data: unreadMessages } = useQuery({
    queryKey: ['social-unread-count'],
    queryFn: socialApi.getUnreadMessageCount,
    refetchInterval: 30000,
  });
  const { data: stats, refetch: refetchStats } = useQuery({ queryKey: ['stats-summary'], queryFn: statsApi.getSummary });
  const { data: xp, refetch: refetchXp } = useQuery({ queryKey: ['xp'], queryFn: statsApi.getXp });
  // 24 Eylül 2026 -- CEFR rozeti verisi. Ayrı ve bağımsız bir sorgu (kendi
  // queryKey'i, hiçbir mevcut sorguyu/refetch zincirini etkilemiyor) --
  // veri gelmezse/hata verirse rozet aşağıda sessizce render edilmiyor
  // (XPBar.tsx'teki web tarafındaki AYNI soft-disable deseni).
  const { data: placementStatus } = useQuery({ queryKey: ['placement-status'], queryFn: examsApi.placementStatus });

  // KULLANICI GERİ BİLDİRİMİ (6 Eylül 2026): "Xp puanlarım artmasına rağmen
  // ana ekranda seviye ve Xp göstergesi değişmiyor". Sebep: bu sorgu
  // (['xp']) hiçbir yerde tazelenmiyordu — sadece ilk mount'ta çekiliyordu.
  // DashboardScreen'deki useFocusEffect yalnızca kendi elindeki
  // ['stats-summary'] sorgusunu tazeliyor, bu bileşenin ayrı ['xp']
  // sorgusuna dokunmuyordu. Diğer sekmelerdeki aynı desende olduğu gibi
  // (bkz. dashboard.tsx, flashcards.tsx) bu sekme odağı her kazandığında
  // (oyun/flashcard/quiz'den dönüşte dahil) XP'yi ve özet istatistikleri
  // burada da yeniden çekiyoruz.
  useFocusEffect(
    useCallback(() => {
      refetchXp();
      refetchStats();
    }, [refetchXp, refetchStats])
  );

  const unreadNotifications = notifData?.unread_count ?? 0;
  const initial = (user?.display_name || user?.username || '?').trim().charAt(0).toUpperCase();

  const xpSpan = xp ? Math.max(1, xp.next_level_xp_target - xp.current_level_xp_floor) : 1;
  const xpPct = xp ? Math.min(100, Math.max(0, Math.round((xp.xp_into_level / xpSpan) * 100))) : 0;

  const cefrLevel = placementStatus?.current_level?.toLowerCase() ?? null;
  const cefrNames = CEFR_LEVEL_NAMES[locale === 'tr' ? 'tr' : 'en'];
  const cefrName = cefrLevel ? cefrNames[cefrLevel] : null;

  const iconTileBg = isDark ? 'rgba(255,255,255,0.06)' : c.surface;
  const iconTileBorder = isDark ? 'rgba(255,255,255,0.14)' : c.border;
  const iconStroke = isDark ? '#E7E8FF' : c.textSecondary;
  const dotColor = isDark ? '#FB7185' : c.danger;

  return (
    <View style={[styles.wrap, { backgroundColor: isDark ? c.background : c.surface, borderBottomColor: c.border }]}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: c.text }]} numberOfLines={1}>
            {greeting}
          </Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
          {/* 24 Eylül 2026 -- CEFR rozeti: cefrLevel yoksa (henüz seviye
              tespit sınavı çözülmemiş/hata) hiç render edilmez. */}
          {cefrLevel && (
            <View style={[styles.cefrPill, { backgroundColor: c.primarySoft }]}>
              <Text style={[styles.cefrPillText, { color: c.primary }]}>
                {cefrLevel.toUpperCase()}{cefrName ? ` · ${cefrName}` : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <HeaderIconButton
            icon={<Bell color={iconStroke} size={16} />}
            count={unreadNotifications}
            bg={iconTileBg}
            border={iconTileBorder}
            dotColor={dotColor}
            onPress={() => router.push('/(app)/notifications')}
          />
          <HeaderIconButton
            icon={<MessageCircle color={iconStroke} size={16} />}
            count={unreadMessages ?? 0}
            bg={iconTileBg}
            border={iconTileBorder}
            dotColor={dotColor}
            onPress={() => router.push('/(app)/messages')}
          />
          <Pressable
            onPress={() => router.push('/(app)/profile')}
            style={[styles.iconBtn, { backgroundColor: iconTileBg, borderColor: iconTileBorder, borderWidth: 1 }]}
            hitSlop={8}
          >
            <Text style={[styles.avatarText, { color: isDark ? '#fff' : c.primary }]}>{initial}</Text>
          </Pressable>
        </View>
      </View>

      {isDark ? (
        <DarkHero
          streak={stats?.current_streak ?? 0}
          level={xp?.level}
          xpIntoLevel={xp?.xp_into_level}
          xpPct={xpPct}
          xpLabel={xpLabels.level}
          cefrLevel={cefrLevel}
          cefrName={cefrName}
        />
      ) : (
        <LightHero
          c={c}
          streak={stats?.current_streak ?? 0}
          level={xp?.level}
          xpIntoLevel={xp?.xp_into_level}
          xpPct={xpPct}
          xpLabel={xpLabels.level}
          cefrLevel={cefrLevel}
          cefrName={cefrName}
        />
      )}
    </View>
  );
}

// Açık tema hero'su -- onaylanan Main.dc.html'deki "12 günlük seri" gradyan
// kartıyla birebir: navy→mor 135° gradyan, sol üstte alev+seri, sağ üstte
// seviye/CEFR rozeti, altında XP ilerleme çubuğu. Gerçek veri: stats'tan
// seri, xp'den seviye+bu seviyedeki XP.
function LightHero({
  c,
  streak,
  level,
  xpIntoLevel,
  xpPct,
  xpLabel,
  cefrLevel,
  cefrName,
}: {
  c: ReturnType<typeof useThemeColors>;
  streak: number;
  level?: number;
  xpIntoLevel?: number;
  xpPct: number;
  xpLabel: string;
  cefrLevel: string | null;
  cefrName: string | null;
}) {
  return (
    <LinearGradient colors={['#0B1B40', c.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.lightHero}>
      <View style={styles.lightHeroTop}>
        <View style={styles.lightHeroStreak}>
          <Flame color="#FDBA74" size={18} />
          <Text style={styles.lightHeroStreakText}>{streak} günlük seri</Text>
        </View>
        {(level || cefrLevel) && (
          <View style={styles.lightHeroPill}>
            <Text style={styles.lightHeroPillText}>
              {level ? `${xpLabel} ${level}` : ''}{level && cefrName ? ' · ' : ''}{cefrName ?? ''}
            </Text>
          </View>
        )}
      </View>
      {xpIntoLevel != null && (
        <View style={{ marginTop: spacing.md }}>
          <View style={styles.lightHeroTrackRow}>
            <Text style={styles.lightHeroTrackLabel}>Bu seviyedeki XP</Text>
            <Text style={styles.lightHeroTrackValue}>{xpIntoLevel} XP</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${xpPct}%` }]} />
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

// Koyu tema hero'su -- onaylanan ConceptB_GamifiedDark.dc.html'deki dairesel
// XP halkasıyla birebir (react-native-svg zaten bağımlılıkta kuruluydu).
// Halka içinde seviye + bu seviyedeki XP; altında seri ve CEFR seviye
// çipleri -- ikisi de bu bileşenin zaten çektiği gerçek veri.
function DarkHero({
  streak,
  level,
  xpIntoLevel,
  xpPct,
  xpLabel,
  cefrLevel,
  cefrName,
}: {
  streak: number;
  level?: number;
  xpIntoLevel?: number;
  xpPct: number;
  xpLabel: string;
  cefrLevel: string | null;
  cefrName: string | null;
}) {
  const size = 148;
  const strokeWidth = 12;
  const radiusPx = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const dashOffset = circumference * (1 - xpPct / 100);

  return (
    <View style={styles.darkHero}>
      <View style={styles.ringWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusPx}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusPx}
            stroke="#A78BFA"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text style={styles.ringLevel}>{level ? `${xpLabel} ${level}` : '—'}</Text>
          {xpIntoLevel != null && <Text style={styles.ringXp}>{xpIntoLevel} XP</Text>}
        </View>
      </View>

      <View style={styles.darkChipsRow}>
        <View style={styles.darkChip}>
          <Flame color="#FB923C" size={15} />
          <Text style={styles.darkChipText}>{streak} gün seri</Text>
        </View>
        {cefrLevel && (
          <View style={styles.darkChip}>
            <Text style={styles.darkChipText}>{cefrLevel.toUpperCase()}{cefrName ? ` · ${cefrName}` : ''}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function HeaderIconButton({
  icon,
  count,
  bg,
  border,
  dotColor,
  onPress,
}: {
  icon: React.ReactNode;
  count?: number;
  bg: string;
  border: string;
  dotColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.iconBtn, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]} hitSlop={8}>
      {icon}
      {!!count && count > 0 && (
        <View style={[styles.badge, { backgroundColor: dotColor }]}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 19, fontWeight: '700' },
  subtitle: { fontSize: 12.5, marginTop: 2 },
  cefrPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  cefrPillText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', fontSize: 15 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  // Açık tema hero
  lightHero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  lightHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lightHeroStreak: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lightHeroStreakText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lightHeroPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  lightHeroPillText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  lightHeroTrackRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  lightHeroTrackLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  lightHeroTrackValue: { color: '#fff', fontSize: 12, fontWeight: '700' },
  track: { height: 8, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full, backgroundColor: '#fff' },
  // Koyu tema hero
  darkHero: { alignItems: 'center', paddingTop: spacing.sm },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringLevel: { color: '#fff', fontSize: 18, fontWeight: '700' },
  ringXp: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  darkChipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  darkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  darkChipText: { color: '#E7E8FF', fontSize: 12.5, fontWeight: '600' },
});
