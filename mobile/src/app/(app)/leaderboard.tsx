import React from 'react';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { LeaderboardCard } from '@/components/LeaderboardCard';

// Ayrı "Sıralama" sekmesi — önceden ana dashboard'un içinde gömülü bir kart
// olarak duruyordu; onaylanan tasarıma göre kendi alt-sekme (tab bar)
// bölümüne taşındı, dashboard'da bıraktığı boşluk başka eklentilere ayrıldı
// (bkz. dashboard.tsx, (app)/_layout.tsx — 31 Ağustos 2026).
export default function LeaderboardScreen() {
  return (
    <ScreenContainer>
      <LeaderboardCard limit={20} />
    </ScreenContainer>
  );
}
