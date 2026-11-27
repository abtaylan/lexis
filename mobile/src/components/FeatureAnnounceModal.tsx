// FeatureAnnounceModal.tsx — uygulama-içi "3 Yeni Özellik" poster alert'i
// (27 Kasım 2026 kullanıcı talebi: Görsel Tara / Çengel Bulmaca / Lingo
// duyurusu — sosyal medya posterinin mobil karşılığı). web/src/components/
// layout/FeatureAnnounceModal.tsx ile AYNI mantık ve AYNI içerik kaynağı
// (i18n/featureAnnounceStrings.ts), RN Modal ile yazıldı — OnboardingTour.tsx
// ile BİREBİR AYNI "görüldü" deseni (bulkStorage/AsyncStorage, versiyonlu
// anahtar). Kullanıcının ANA DİLİNDE (useLocale() → locale, profiles.
// native_lang'den gelir) gösterilir — 10 dilin tamamı desteklenir. Sosyal
// medya paylaşımı AYRI ve sadece TR statik posterle yapılır.
//
// Onboarding turu bitmeden (ONBOARDING_SEEN_KEY henüz yoksa) bu kart hiç
// açılmaz — iki modal'ın üst üste binmesini önler, bir sonraki girişte
// normal şekilde gösterilir.
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { X, Grid3x3, ScanText } from 'lucide-react-native';
import { router } from 'expo-router';
import { useLocale } from '@/i18n';
import { FEATURE_ANNOUNCE_STRINGS } from '@/i18n/featureAnnounceStrings';
import { radius, spacing } from '@/constants/theme';
import { bulkStorage } from '@/utils/storage';

const SEEN_KEY = 'lexis_feature_announce_lingo_update_v1_seen';
const ONBOARDING_SEEN_KEY = 'lexis_onboarding_tour_seen';

const NAVY_DARK = '#081A3D';
const NAVY = '#0B1E46';
const PRIMARY = '#378ADD';
const ACCENT = '#534AB7';
const LINGO_FG = '#FF6FA5';

function LingoTilesIcon({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={1.5} y={9} width={4.5} height={6} rx={1.2} fill={color} />
      <Rect x={7} y={9} width={4.5} height={6} rx={1.2} fill="none" stroke={color} strokeWidth={2} />
      <Rect x={12.5} y={9} width={4.5} height={6} rx={1.2} fill={color} />
      <Rect x={18} y={9} width={4.5} height={6} rx={1.2} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function FeatureAnnounceModal() {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const s = FEATURE_ANNOUNCE_STRINGS[locale] ?? FEATURE_ANNOUNCE_STRINGS.tr;

  useEffect(() => {
    (async () => {
      const onboardingSeen = await bulkStorage.getItem(ONBOARDING_SEEN_KEY);
      if (!onboardingSeen) return; // onboarding turu bitmeden gösterme
      const seen = await bulkStorage.getItem(SEEN_KEY);
      if (!seen) setOpen(true);
    })();
  }, []);

  const dismiss = () => {
    setOpen(false);
    bulkStorage.setItem(SEEN_KEY, '1');
  };

  const rows = [
    { icon: <ScanText color={PRIMARY} size={22} />, bg: `${PRIMARY}26`, title: s.scanTitle, desc: s.scanDesc },
    { icon: <LingoTilesIcon color={LINGO_FG} />, bg: 'rgba(255,111,165,0.14)', title: s.lingoTitle, desc: s.lingoDesc },
    { icon: <Grid3x3 color={ACCENT} size={22} />, bg: `${ACCENT}26`, title: s.crosswordTitle, desc: s.crosswordDesc },
  ];

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Pressable style={styles.closeBtn} onPress={dismiss} hitSlop={10}>
            <X color="#fff" size={16} />
          </Pressable>

          <View style={styles.kickerPill}>
            <Text style={styles.kickerText}>{s.kicker}</Text>
          </View>
          <Text style={styles.headline}>{s.headline}</Text>
          <Text style={styles.subtitle}>{s.subtitle}</Text>

          <View style={{ gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.lg }}>
            {rows.map((r) => (
              <View key={r.title} style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: r.bg }]}>{r.icon}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.title}</Text>
                  <Text style={styles.rowDesc}>{r.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.ctaBtn}
            onPress={() => {
              dismiss();
              router.push('/(app)/game');
            }}
          >
            <Text style={styles.ctaText}>{s.cta}</Text>
          </Pressable>
          <Pressable onPress={dismiss} hitSlop={8}>
            <Text style={styles.dismissText}>{s.dismiss}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: NAVY,
    borderRadius: radius.xl + 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kickerPill: {
    alignSelf: 'flex-start',
    backgroundColor: `${PRIMARY}1f`,
    borderWidth: 1,
    borderColor: `${PRIMARY}59`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  kickerText: { color: PRIMARY, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  headline: { color: '#fff', fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: spacing.xs },
  subtitle: { color: '#AAB6CF', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  rowDesc: { color: '#8C9BBE', fontSize: 12, marginTop: 2, lineHeight: 16 },
  ctaBtn: {
    backgroundColor: PRIMARY,
    borderRadius: radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dismissText: { color: '#8C9BBE', fontSize: 12, textAlign: 'center' },
});
