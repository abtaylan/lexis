import React from 'react';
import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useLocale } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';

function TabIcon({ emoji, color }: { emoji: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function AppTabsLayout() {
  const { t, mt } = useLocale();
  const c = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: t('dashboard'), tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} /> }}
      />
      <Tabs.Screen
        name="words"
        options={{ title: t('words'), tabBarIcon: ({ color }) => <TabIcon emoji="📚" color={color} /> }}
      />
      <Tabs.Screen
        name="game"
        options={{ title: mt('gameTabLabel'), tabBarIcon: ({ color }) => <TabIcon emoji="🎮" color={color} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: t('schedule'), tabBarIcon: ({ color }) => <TabIcon emoji="🗓️" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('profile'), tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }}
      />
      <Tabs.Screen name="notification-permission" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
