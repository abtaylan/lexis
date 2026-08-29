import React from 'react';
import { Tabs } from 'expo-router';
import { CalendarDays, User } from 'lucide-react-native';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { WordsTabIcon, GameTabIcon, DashboardTabIcon } from '@/components/icons/TabIcons';

// Alt sekme çubuğu — telefon ekranlarında 5 sekmenin metin etiketiyle sığmaması
// (tablet için tasarlanmış "Dashboard" gibi uzun etiketler dar ekranlarda
// kırpılıyor/taşıyordu) üzerine sadece ikon gösterilecek şekilde değiştirildi.
// Emoji yerine web'deki Sidebar.tsx ile birebir aynı lucide ikon seti
// kullanılıyor (lucide-react-native) — iki platform arasında görsel tutarlılık.
export default function AppTabsLayout() {
  const { t, mt } = useLocale();
  const c = useThemeColors();

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
    </Tabs>
  );
}
