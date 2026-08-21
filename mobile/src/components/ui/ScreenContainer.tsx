import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { spacing } from '@/constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}

export function ScreenContainer({ children, scroll = true, refreshing, onRefresh, padded = true }: ScreenContainerProps) {
  const c = useThemeColors();
  const content = padded ? <View style={styles.padded}>{children}</View> : children;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: c.background }]} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { padding: spacing.lg },
});
