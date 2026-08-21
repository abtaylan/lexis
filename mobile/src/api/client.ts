// src/api/client.ts — web'deki lib/api.ts'in axios kurulumunun mobil karşılığı.
//
// Farklar:
//  - Token localStorage yerine SecureStore'da (bkz. utils/storage.ts).
//  - 401'de web'deki gibi window.location.href yok — bunun yerine bir
//    "unauthorized" event yayınlanır, AuthProvider bunu dinleyip logout()
//    çağırır ve navigasyon /login'e yönlendirir (bkz. store/auth.tsx).
import axios from 'axios';
import Constants from 'expo-constants';
import { secureStorage } from '@/utils/storage';

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
  headers: { 'Content-Type': 'application/json' },
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

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Web'deki mantıkla aynı: sadece daha önce bir token ile yapılmış istekte
    // 401 alınırsa "oturum süresi doldu" say. Login/Register'da 401 = yanlış
    // şifre demektir, bu durumda çıkış yapılmamalı.
    const hadAuthHeader = !!error.config?.headers?.Authorization;
    if (error.response?.status === 401 && hadAuthHeader) {
      await secureStorage.removeItem(TOKEN_KEY);
      await secureStorage.removeItem(REFRESH_TOKEN_KEY);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);
