// src/api/client.ts — web'deki lib/api.ts'in axios kurulumunun mobil karşılığı.
//
// Farklar:
//  - Token localStorage yerine SecureStore'da (bkz. utils/storage.ts).
//  - 401'de web'deki gibi window.location.href yok — bunun yerine bir
//    "unauthorized" event yayınlanır, AuthProvider bunu dinleyip logout()
//    çağırır ve navigasyon /login'e yönlendirir (bkz. store/auth.tsx).
//  - 401 ALINDIĞINDA ÖNCE refresh_token İLE SESSİZCE YENİLEME DENENİR (bkz.
//    tryRefreshToken) — Instagram tarzı "bir kere giriş yap, oturumu
//    kapatmadıkça bir daha sorma" davranışı için (3 Ekim 2026 kullanıcı
//    isteği). Access token Supabase'de varsayılan olarak 1 saatte
//    dolduğundan, bu olmadan kullanıcı uygulamayı 1 saatten uzun süre kapalı
//    tuttuğunda her seferinde e-posta/şifre girmek zorunda kalıyordu —
//    refresh_token zaten saklanıyordu ama hiçbir yerde kullanılmıyordu.
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { secureStorage } from '@/utils/storage';

// admin panelde "kayit platformu" + kullanici bazli giris istatistikleri
// icin (bkz. backend/app/services/login_events_service.py, migration
// 075_signup_platform_and_login_events). Expo web export'u da 'web' olarak
// isaretlenir (Platform.OS === 'web'), gercek native build'lerde ios/android.
const CLIENT_PLATFORM = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

export const TOKEN_KEY = 'lexis_access_token';
export const REFRESH_TOKEN_KEY = 'lexis_refresh_token';

// EXPO_PUBLIC_ önekli env değişkenleri Expo tarafından otomatik olarak
// process.env'e gömülür (build-time). .env dosyası için bkz. mobile/.env.example.
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  'http://localhost:8000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json', 'X-Client-Platform': CLIENT_PLATFORM },
  timeout: 20000,
});

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  unauthorizedHandler = fn;
}

api.interceptors.request.use(async (config) => {
  const token = await secureStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Aynı anda birden fazla istek 401 alırsa (ör. ekran açılışında paralel
// birkaç çağrı), /auth/refresh'i sadece BİR KERE tetikleyip diğerlerini o tek
// yenilemenin sonucunu beklemeye alır. Bu önemli: Supabase'de refresh token
// rotation açık, yani aynı refresh_token'ı paralel iki kere kullanmaya
// çalışmak ikincisinin başarısız olmasına (ve gereksiz bir logout'a) yol açar.
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const storedRefreshToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) return null;

      // Kasıtlı olarak `api` instance'ı değil, çıplak axios kullanılıyor —
      // `api`'nin request interceptor'ı süresi dolmuş eski access_token'ı
      // Authorization header'ına eklerdi, oysa bu istekte kimlik doğrulama
      // tamamen refresh_token gövdesi üzerinden yapılmalı.
      const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
        refresh_token: storedRefreshToken,
      });
      const { access_token, refresh_token: newRefreshToken } = res.data as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!access_token) return null;

      await secureStorage.setItem(TOKEN_KEY, access_token);
      if (newRefreshToken) {
        await secureStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }
      return access_token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    // Web'deki mantıkla aynı: sadece daha önce bir token ile yapılmış istekte
    // 401 alınırsa "oturum süresi doldu" say. Login/Register'da 401 = yanlış
    // şifre demektir, bu durumda refresh denenmemeli/çıkış yapılmamalı.
    const hadAuthHeader = !!originalRequest?.headers?.Authorization;

    if (error.response?.status === 401 && hadAuthHeader && !originalRequest?._retry) {
      // `_retry`, yenilenmiş token ile tekrarlanan isteğin de 401 dönmesi
      // durumunda sonsuz döngüye girilmesini engelliyor.
      originalRequest!._retry = true;
      const newToken = await tryRefreshToken();
      if (newToken) {
        originalRequest!.headers = originalRequest!.headers ?? {};
        (originalRequest!.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
        return api(originalRequest!);
      }

      // refresh_token da geçersiz/süresi dolmuş (ör. uygulama haftalarca
      // açılmadıysa) — artık gerçekten oturumu kapatmak gerekiyor.
      await secureStorage.removeItem(TOKEN_KEY);
      await secureStorage.removeItem(REFRESH_TOKEN_KEY);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);
