// src/hooks/useNotificationsSetup.ts — Faz 1 push bildirim altyapısı.
//
// Bu aşamada SADECE temel altyapı kuruluyor (bkz. mobil kapsam dokümanı,
// Bölüm 4.3 "İzin stratejisi" ve Bölüm 7 "Backend'de gereken ek işler"):
//  - İzin isteme (soft-ask ekranından sonra native izin)
//  - Expo push token alma
//  - Token'ı backend'e kaydetme (POST /me/push-tokens)
// Gerçek bildirim GÖNDERİMİ (push tetikleyicileri) Faz 2/3'te, sosyal
// olaylar eklendiğinde devreye girecek.
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { pushTokensApi } from '@/api/notifications';
import { bulkStorage } from '@/utils/storage';

const ASKED_KEY = 'lexis_notif_permission_asked';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type PermissionStatus = 'unknown' | 'granted' | 'denied' | 'undetermined';

export function useNotificationsSetup() {
  const [status, setStatus] = useState<PermissionStatus>('unknown');
  const [hasAskedBefore, setHasAskedBefore] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const asked = await bulkStorage.getItem(ASKED_KEY);
      setHasAskedBefore(!!asked);
      const current = await Notifications.getPermissionsAsync();
      setStatus(current.status as PermissionStatus);
    })();
  }, []);

  const requestPermissionAndRegister = useCallback(async (): Promise<PermissionStatus> => {
    await bulkStorage.setItem(ASKED_KEY, '1');
    setHasAskedBefore(true);

    if (!Device.isDevice) {
      // Simülatör/emülatörde push token alınamaz — sessizce çık.
      return 'undetermined';
    }

    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    setStatus(newStatus as PermissionStatus);

    if (newStatus !== 'granted') return newStatus as PermissionStatus;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      await pushTokensApi.register({
        token: tokenResponse.data,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        device_name: Device.deviceName ?? undefined,
      });
    } catch (e) {
      // Token alınamadı/kaydedilemedi — sessiz geç, kritik yol değil
      // (kullanıcı bildirim izni ekranını bir daha görmeyecek ama
      // uygulama normal çalışmaya devam eder).
      console.warn('Push token registration failed', e);
    }

    return newStatus as PermissionStatus;
  }, []);

  return { status, hasAskedBefore, requestPermissionAndRegister };
}
