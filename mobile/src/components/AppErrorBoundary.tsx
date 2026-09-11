// src/components/AppErrorBoundary.tsx — 11 Eylül 2026, canlıdaki (build #10)
// "çıkış yap → uygulamayı yeniden aç → ekran anında kapanıyor" olayı için
// eklendi. Gerçek cihaz crash log'unda (.ips) şu görüldü: JS tarafında bir
// hata fırlatılıyor, React Native'in (New Architecture) kendi hata
// kurtarma kuyruğu ("expo.controller.errorRecoveryQueue") bunu işlemeye
// çalışırken YAKALANMAMIŞ bir NSException'a düşüp abort() ile TÜM
// UYGULAMAYI native seviyede çökertiyor. Yani suçlu native bir modül değil,
// render sırasında/render ağacında fırlatılan bir JS hatası — ama React
// Native'in varsayılan davranışı bunu yakalamak yerine sert bir çökmeye
// çeviriyor.
//
// Bu bileşen render ağacının EN DIŞINA (tema/dil/auth provider'larından
// bile önce) sarılıyor ki o provider'lardan biri hata fırlatırsa da
// yakalansın. Bir hata yakalandığında artık uygulama native seviyede
// çökmek yerine bu ekranı gösteriyor: hem kullanıcı "Tekrar Dene" ile
// kurtarmayı deneyebiliyor, hem de ekrandaki hata metni bir sonraki sefer
// tam olarak hangi JS hatasının patladığını (satır/dosya olmasa bile en
// azından hata adı+mesajı+stack) ekran görüntüsüyle bize iletebiliyor —
// şu ana kadar hiçbir crash-reporting (Sentry vb.) entegre değildi, bu da
// üretimdeki gerçek hatayı görebilmenin en hızlı yolu.
//
// "Verileri Temizle ve Yeniden Başlat" butonu bilinçli olarak eklendi:
// eğer hatanın nedeni AsyncStorage/SecureStore'da kalmış bozuk/eski bir
// değerse (ör. logout sonrası temizlenmeyen bir tercih anahtarı), sadece
// "Tekrar Dene" yeterli olmayabilir — aynı bozuk veri tekrar okunup hata
// tekrar eder. Bu buton bilinen tüm yerel anahtarları silip
// expo-updates ile uygulamayı gerçek bir soğuk başlatmaya zorluyor.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import * as SplashScreen from 'expo-splash-screen';

const KNOWN_SECURE_KEYS = ['lexis_access_token', 'lexis_refresh_token'];

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Kritik yol değil, sessizce yutulur — amaç sadece konsola/Metro'ya
    // (bağlıysa) iz düşmek, ekrandaki fallback zaten kullanıcıya gösteriyor.
    console.error('[AppErrorBoundary]', error, info.componentStack);
    // Hata, RootNavigator hiç mount olmadan (ör. ThemeProvider/LocaleProvider/
    // AuthProvider içinde) fırlamış olabilir — o durumda splash'i kimse
    // kapatmaz ve fallback ekranımız splash'in ALTINDA gizli kalır. Burada
    // da bir kez daha deneyelim (zaten idempotent, catch ile sarılı).
    SplashScreen.hideAsync().catch(() => {});
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  handleHardReset = async () => {
    try {
      await AsyncStorage.clear();
    } catch {
      /* yut */
    }
    for (const key of KNOWN_SECURE_KEYS) {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        /* yut */
      }
    }
    try {
      await Updates.reloadAsync();
      return;
    } catch {
      /* Updates.reloadAsync Expo Go'da veya bazı ortamlarda çalışmayabilir
         — o durumda en azından sınırı sıfırlayıp kullanıcının uygulamayı
         elle kapatıp açmasına izin ver. */
    }
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Bir şeyler ters gitti</Text>
          <Text style={styles.subtitle}>
            Lexis beklenmedik bir hatayla karşılaştı. Önce "Tekrar Dene"yi
            deneyebilirsin; sorun devam ederse "Verileri Temizle ve Yeniden
            Başlat" genelde çözer.
          </Text>
          <View style={styles.errorBox}>
            <Text style={styles.errorText} selectable>
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </Text>
          </View>
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Tekrar Dene</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={this.handleHardReset}>
            <Text style={styles.buttonText}>Verileri Temizle ve Yeniden Başlat</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#071D45' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#B8C4E0', textAlign: 'center', lineHeight: 20 },
  errorBox: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 12, maxHeight: 260 },
  errorText: { color: '#FCA5A5', fontSize: 11, fontFamily: 'monospace' },
  button: { backgroundColor: '#378ADD', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonSecondary: { backgroundColor: 'rgba(255,255,255,0.12)' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
