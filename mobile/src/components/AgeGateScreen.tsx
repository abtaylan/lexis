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
import { StyleSheet, Text, View } from 'react-native';
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
    <ScreenContainer scroll={false}>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  emoji: { fontSize: 56, marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
});
