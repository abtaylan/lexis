import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Button } from '@/components/ui/Button';
import { useNotificationsSetup } from '@/hooks/useNotificationsSetup';

// Faz 1 — "soft-ask" ekranı: native izin popup'ından ÖNCE gösterilir, kullanıcı
// bildirimin değerini anlar. bkz. mobil kapsam dokümanı Bölüm 4.3.
export default function NotificationPermissionScreen() {
  const { mt } = useLocale();
  const c = useThemeColors();
  const { requestPermissionAndRegister } = useNotificationsSetup();
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    try {
      await requestPermissionAndRegister();
    } finally {
      setLoading(false);
      router.back();
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.wrap}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={[styles.title, { color: c.text }]}>{mt('notifPermTitle')}</Text>
        <Text style={[styles.desc, { color: c.textSecondary }]}>{mt('notifPermDesc')}</Text>

        <View style={{ width: '100%', marginTop: spacing.xl }}>
          <Button title={mt('notifPermAllowBtn')} onPress={handleAllow} loading={loading} />
          <View style={{ height: spacing.sm }} />
          <Button title={mt('notifPermLaterBtn')} variant="ghost" onPress={() => router.back()} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl },
  emoji: { fontSize: 56, marginBottom: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
});
