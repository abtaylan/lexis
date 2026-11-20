// src/components/AgeGateScreen.tsx — nötr yaş ekranı (neutral age screen).
//
// 18 Kasım 2026 — Google Play Aile Politikası / COPPA uyumu (bkz.
// lib/adsInit.ts + lib/ageGate.ts'teki aynı tarihli notlar): uygulama ilk
// açıldığında, auth durumundan BAĞIMSIZ olarak (bkz. app/_layout.tsx) bir
// kere gösterilir. Cevap AsyncStorage'a kaydedilir, reklam SDK'si buna göre
// çocuk-yönelimli ya da normal modda başlatılır.
//
// Google'ın rehberliğine uygun olarak soru nötr tutuldu: "13 yaşından
// büyük müsünüz?" gibi doğru cevabı ima eden bir ifade yerine doğum yılı
// soruluyor.
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { setAgeGateAnswer } from '@/lib/ageGate';

interface AgeGateScreenProps {
  onAnswered: (isChild: boolean) => void;
}

const MIN_YEAR = 1920;

export function AgeGateScreen({ onAnswered }: AgeGateScreenProps) {
  const { mt } = useLocale();
  const c = useThemeColors();
  const [year, setYear] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const currentYear = new Date().getFullYear();
    const parsed = parseInt(year, 10);
    if (!parsed || parsed < MIN_YEAR || parsed > currentYear) {
      setError(true);
      return;
    }
    setError(false);
    setSubmitting(true);
    try {
      const answer = await setAgeGateAnswer(parsed);
      onAnswered(answer.isChild);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // 20 Kasım 2026 -- KOK NEDEN BULUNDU: bu ekran kodda `padded={false}`
    // OLMADAN `scroll={false}` kullanan TEK yerdi (leaderboard.tsx,
    // profile.tsx, roadmap.tsx, schedule.tsx, words.tsx hepsi ikisini
    // BİRLİKTE kullanıyor). Sonuç: ScreenContainer'ın kendi `padded` View'ı
    // (flex YOK, içeriğe göre boyutlanıyor) ile bu bileşenin kendi
    // `styles.wrap`'ındaki (flex:1, justifyContent/alignItems:'center')
    // View iç içe geçince Yoga için belirsiz/döngüsel bir boyutlandırma
    // durumu oluşuyordu -- başlık/açıklama/buton metni görünmüyor,
    // justifyContent:'center' hiç etki etmiyor, içerik üstte sıkışık
    // kalıyordu (test cihazında gözlemlenen tam olarak buydu). Fix:
    // diğer tüm ekranlarla AYNI, kanıtlanmış deseni kullan --
    // `padded={false}`, kendi flex:1/padding'ini `wrap` zaten yönetiyor.
    // 20 Kasım 2026 -- klavye sayfayı kaplama fix'i: bu ekranda
    // KeyboardAvoidingView YOKTU, scroll={false} olduğu için iOS'ta
    // numara klavyesi açıldığında içerik hiç yukarı kaymıyor, merkezde
    // duran "Devam Et" butonu klavyenin arkasında kalıp erişilemez hale
    // geliyordu (Android'de windowSoftInputMode zaten resize yaptığı için
    // sorun yoktu). Fix: içeriği KeyboardAvoidingView (behavior: 'padding'
    // sadece iOS'ta) ile sarmaladık.
    <ScreenContainer scroll={false} padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.wrap}>
          <Text style={styles.emoji}>🎂</Text>
          <Text style={[styles.title, { color: c.text }]}>{mt('ageGateTitle')}</Text>
          <Text style={[styles.desc, { color: c.textSecondary }]}>{mt('ageGateDesc')}</Text>

          <View style={{ width: '100%', marginTop: spacing.xl }}>
            <TextField
              label={mt('ageGateYearLabel')}
              placeholder={mt('ageGateYearPlaceholder')}
              keyboardType="number-pad"
              maxLength={4}
              value={year}
              onChangeText={(v) => {
                setYear(v.replace(/[^0-9]/g, ''));
                setError(false);
              }}
              error={error ? mt('ageGateInvalidYear') : undefined}
              onSubmitEditing={handleSubmit}
            />
            <Button
              title={mt('continueBtn')}
              onPress={handleSubmit}
              loading={submitting}
              disabled={year.length === 0}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emoji: { fontSize: 56, marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
});
