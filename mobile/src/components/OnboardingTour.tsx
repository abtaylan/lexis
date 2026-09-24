// src/components/OnboardingTour.tsx — Madde 3 (Görsel/GUI), "onboarding
// turu" (24 Eylül 2026), Madde 3'ün son alt kalemi. web/src/components/
// layout/OnboardingTour.tsx ile AYNI mantık ve AYNI 5 adım (kelime, oyunlar,
// flashcards, ilerleme), RN Modal ile yeniden yazıldı. Görülüp görülmediği
// mobile/src/utils/storage.ts::bulkStorage (AsyncStorage) ile, web'deki
// RECHECK_DISMISSED_KEY deseniyle AYNI şekilde saklanıyor — backend
// değişikliği gerekmedi.
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X, BookOpen, Gamepad2, Layers, TrendingUp, CircleHelp } from 'lucide-react-native';
import { Mascot } from './Mascot';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { bulkStorage } from '@/utils/storage';

const SEEN_KEY = 'lexis_onboarding_tour_seen';

type StepIcon = 'mascot' | typeof BookOpen;

interface Step {
  icon: StepIcon;
  title: Record<'tr' | 'en', string>;
  desc: Record<'tr' | 'en', string>;
}

const STEPS: Step[] = [
  {
    icon: 'mascot',
    title: { tr: "Lexis'e Hoş Geldin!", en: 'Welcome to Lexis!' },
    desc: {
      tr: 'Kişisel dil öğrenme yolculuğun burada başlıyor. Sana uygulamayı hızlıca tanıtalım.',
      en: 'Your personal language-learning journey starts here. Let us give you a quick tour.',
    },
  },
  {
    icon: BookOpen,
    title: { tr: 'Kelime Listeni Oluştur', en: 'Build Your Word List' },
    desc: {
      tr: 'Öğrenmek istediğin kelimeleri ekle — Lexis onları CEFR seviyene göre organize etsin.',
      en: 'Add the words you want to learn — Lexis organizes them by your CEFR level.',
    },
  },
  {
    icon: Gamepad2,
    title: { tr: 'Oyunlarla Pratik Yap', en: 'Practice with Games' },
    desc: {
      tr: 'Wordle, rol yapma diyalogları, cümle kurma ve günlük Kelime Avı ile eğlenerek öğren.',
      en: 'Learn while having fun with Wordle, roleplay dialogues, sentence building, and daily Word Hunt.',
    },
  },
  {
    icon: Layers,
    title: { tr: "Flashcard'larla Tekrar Et", en: 'Review with Flashcards' },
    desc: {
      tr: 'Kartları çevir, telaffuzu dinle — akıllı tekrar algoritması seni doğru zamanda hatırlatır.',
      en: 'Flip the cards, listen to pronunciation — smart spaced repetition reminds you at the right time.',
    },
  },
  {
    icon: TrendingUp,
    title: { tr: 'İlerlemeni Takip Et', en: 'Track Your Progress' },
    desc: {
      tr: 'Seviye rozetin, XP’in ve çalışma takvimin ile gelişimini her an görebilirsin.',
      en: 'See your level badge, XP, and activity calendar to watch yourself improve.',
    },
  },
];

const UI: Record<'tr' | 'en', { next: string; back: string; start: string; help: string }> = {
  tr: { next: 'İleri', back: 'Geri', start: 'Başlayalım!', help: 'Tanıtım turu' },
  en: { next: 'Next', back: 'Back', start: "Let's start!", help: 'Guided tour' },
};

// 24 Eylül 2026 -- showTrigger: kullanıcı geri bildirimi ("dashboard zaten
// ana ekran, oraya '?' ikonu yakışmadı") üzerine dashboard.tsx artık bu
// bileşeni showTrigger={false} ile kullanıyor -- ilk ziyarette otomatik
// açılma davranışı AYNEN korunuyor, sadece elle-yeniden-açma ikonu
// (helpBtn) render edilmiyor. Varsayılan true, diğer kullanım yerleri
// (varsa ileride) etkilenmez.
export function OnboardingTour({ showTrigger = true }: { showTrigger?: boolean }) {
  const c = useThemeColors();
  const { locale } = useLocale();
  const lang = locale === 'tr' ? 'tr' : 'en';
  const ui = UI[lang];
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    bulkStorage.getItem(SEEN_KEY).then((seen) => {
      if (!seen) setVisible(true);
    });
  }, []);

  function close() {
    bulkStorage.setItem(SEEN_KEY, '1');
    setVisible(false);
    setStep(0);
  }

  const current = STEPS[step];
  const Icon = current.icon !== 'mascot' ? current.icon : null;

  return (
    <>
      {showTrigger && (
        <Pressable
          onPress={() => {
            setStep(0);
            setVisible(true);
          }}
          style={({ pressed }) => [
            styles.helpBtn,
            { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 },
          ]}
          accessibilityLabel={ui.help}
        >
          <CircleHelp color={c.textMuted} size={16} />
        </Pressable>
      )}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <Pressable onPress={close} style={styles.closeBtn} hitSlop={8}>
              <X color={c.textMuted} size={16} />
            </Pressable>

            <View style={styles.center}>
              {current.icon === 'mascot' ? (
                <Mascot mood="celebrate" size={72} />
              ) : (
                <View style={[styles.iconWrap, { backgroundColor: c.primarySoft }]}>
                  {Icon && <Icon color={c.primary} size={26} />}
                </View>
              )}

              <Text style={[styles.title, { color: c.text }]}>{current.title[lang]}</Text>
              <Text style={[styles.desc, { color: c.textMuted }]}>{current.desc[lang]}</Text>

              <View style={styles.dots}>
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { width: i === step ? 18 : 6, backgroundColor: i === step ? c.primary : c.border },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.btnRow}>
                {step > 0 && (
                  <Pressable
                    onPress={() => setStep((s) => s - 1)}
                    style={({ pressed }) => [
                      styles.btnOutline,
                      { borderColor: c.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={{ color: c.text, fontSize: 14, fontWeight: '600' }}>{ui.back}</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => (step === STEPS.length - 1 ? close() : setStep((s) => s + 1))}
                  style={({ pressed }) => [styles.btnFilled, { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                    {step === STEPS.length - 1 ? ui.start : ui.next}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  helpBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg + 4,
    padding: spacing.lg,
  },
  closeBtn: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 1 },
  center: { alignItems: 'center', gap: spacing.sm + 2, marginTop: spacing.xs },
  iconWrap: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { height: 6, borderRadius: 3 },
  btnRow: { flexDirection: 'row', gap: spacing.sm, width: '100%', marginTop: spacing.xs },
  btnOutline: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.sm + 2, alignItems: 'center' },
  btnFilled: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.sm + 2, alignItems: 'center' },
});
