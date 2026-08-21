// src/utils/storage.ts
//
// İki depolama katmanı:
//  - secureStorage: expo-secure-store (iOS Keychain / Android Keystore) —
//    access/refresh token gibi hassas, küçük (SecureStore ~2KB sınırı) veriler için.
//  - bulkStorage: AsyncStorage — kullanıcı profili, dil tercihi gibi hassas
//    olmayan/daha büyük veriler için (web'deki localStorage karşılığı).
//
// SecureStore bazı JWT'ler için 2KB sınırını aşabilir — bu durumda yazma
// sessizce AsyncStorage'a düşer (best-effort), tamamen çökmesin diye.

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_FALLBACK_PREFIX = 'lexis_secure_fallback_';

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const val = await SecureStore.getItemAsync(key);
      if (val != null) return val;
    } catch {
      // yut, fallback'e bak
    }
    try {
      return await AsyncStorage.getItem(SECURE_FALLBACK_PREFIX + key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
      return;
    } catch {
      // SecureStore boyut sınırını aşmış olabilir — AsyncStorage'a düş
    }
    try {
      await AsyncStorage.setItem(SECURE_FALLBACK_PREFIX + key, value);
    } catch {
      // sessizce yut — çağıran taraf zaten try/catch içinde kullanmalı
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* yut */
    }
    try {
      await AsyncStorage.removeItem(SECURE_FALLBACK_PREFIX + key);
    } catch {
      /* yut */
    }
  },
};

export const bulkStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      /* yut */
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* yut */
    }
  },
};
