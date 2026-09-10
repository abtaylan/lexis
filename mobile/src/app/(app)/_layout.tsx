import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Tabs } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { CalendarDays, Trophy, User } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { WordsTabIcon, GameTabIcon, DashboardTabIcon } from '@/components/icons/TabIcons';
import { useNotificationsSetup } from '@/hooks/useNotificationsSetup';

// Alt sekme çubuğu — telefon ekranlarında 5 sekmenin metin etiketiyle sığmaması
// (tablet için tasarlanmış "Dashboard" gibi uzun etiketler dar ekranlarda
// kırpılıyor/taşıyordu) üzerine sadece ikon gösterilecek şekilde değiştirildi.
// Emoji yerine web'deki Sidebar.tsx ile birebir aynı lucide ikon seti
// kullanılıyor (lucide-react-native) — iki platform arasında görsel tutarlılık.
export default function AppTabsLayout() {
  const { t, mt, lbLabels } = useLocale();
  const c = useThemeColors();
  const { requestPermissionAndRegister } = useNotificationsSetup();

  // KULLANICI İSTEĞİ (8 Eylül 2026): "bu kullanıcıların tamamına bildirim
  // gitmeli, her seferinde ben sana ios kullanıcı geldikçe bildirmeme gerek
  // yok, bunu çözmen lazım" — dashboard.tsx'teki tek seferlik (sadece ilk
  // mount'ta çalışan) self-heal yeterli değildi: bir kullanıcı OS izni
  // ekranını görmeden/atlayarak dashboard'u ilk açtığı anda kaçırırsa, ya da
  // izni DAHA SONRA telefon ayarlarından elle açarsa, uygulama bunu bir daha
  // asla yakalamıyordu — push_tokens'a hiç düşmüyordu.
  //
  // Artık bu kontrol, oturum açıkken kalıcı olan sekme katmanında (bu layout,
  // (app) grubuna her girişte bir kez mount olur ve tab değişiminde
  // UNMOUNT OLMAZ) hem ilk açılışta hem de her uygulama ön plana her
  // geldiğinde (AppState 'active') sessizce tekrar deneniyor: OS izni zaten
  // "granted" ise kullanıcıya hiçbir prompt çıkmadan token yeniden alınıp
  // backend'e kaydediliyor. Böylece kayıp/eksik push_tokens satırı, hangi
  // kullanıcı olursa olsun, elle takip etmeye gerek kalmadan kendi kendine
  // onarılıyor.
  const registeringRef = useRef(false);
  const ensureTokenRegistered = React.useCallback(async () => {
    if (registeringRef.current) return;
    registeringRef.current = true;
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.status === 'granted') {
        await requestPermissionAndRegister();
      }
    } catch {
      /* sessiz — kritik yol değil, bir sonraki ön plana gelişte tekrar denenir */
    } finally {
      registeringRef.current = false;
    }
  }, [requestPermissionAndRegister]);

  useEffect(() => {
    ensureTokenRegistered();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        ensureTokenRegistered();
      }
    });
    return () => sub.remove();
  }, [ensureTokenRegistered]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: t('dashboard'), tabBarIcon: ({ color, size }) => <DashboardTabIcon color={color} size={size ?? 22} /> }}
      />
      <Tabs.Screen
        name="words"
        options={{ title: t('words'), tabBarIcon: ({ color, size }) => <WordsTabIcon color={color} size={size ?? 21} /> }}
      />
      <Tabs.Screen
        name="game"
        options={{ title: mt('gameTabLabel'), tabBarIcon: ({ color, size }) => <GameTabIcon color={color} size={size ?? 23} /> }}
      />
      {/* Sıralama (leaderboard) — önceden dashboard'un içinde gömülüydü, artık
          kendi sekmesi (6 ikon toplamı). 31 Ağustos 2026 kullanıcı talebi. */}
      <Tabs.Screen
        name="leaderboard"
        options={{ title: lbLabels.title, tabBarIcon: ({ color, size }) => <Trophy color={color} size={size ?? 22} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: t('schedule'), tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size ?? 24} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size ?? 24} /> }}
      />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="quiz" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="flashcards" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="stats" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notification-permission" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="friends" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="messages" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="message-thread" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="user-profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="premium" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="exam-prep" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="exam-suggest" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="exam-grammar" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="exam-grammar-detail" options={{ href: null, headerShown: false }} />
      {/* V2 §6.3 Faz 3 (10 Eylül 2026) — Düello/Lig/Görev Haritası, friends
          ile aynı desen: kendi sekmesi yok, dashboard'daki kısayoldan
          açılıyor (bkz. dashboard.tsx). */}
      <Tabs.Screen name="duels" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="duel-room" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="league" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="league-detail" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="quests" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
