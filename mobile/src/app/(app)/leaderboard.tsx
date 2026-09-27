import React from 'react';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ScreenNavBar } from '@/components/ui/ScreenNavBar';
import { LeaderboardCard } from '@/components/LeaderboardCard';

// Ayrı "Sıralama" sekmesi — önceden ana dashboard'un içinde gömülü bir kart
// olarak duruyordu; onaylanan tasarıma göre kendi alt-sekme (tab bar)
// bölümüne taşındı, dashboard'da bıraktığı boşluk başka eklentilere ayrıldı
// (bkz. dashboard.tsx, (app)/_layout.tsx — 31 Ağustos 2026).
//
// 27 Eylül 2026 — "Sıralama - Çalışma Programı - Profil sayfalarını yapalım"
// isteğiyle Kelimeler sayfasındaki gradient hero panel desenine geçildi:
// scroll/padded artık false, çünkü LeaderboardCard kendi ScrollView'ını ve
// üstteki degrade paneli kenardan kenara (edge-to-edge) çiziyor — bkz.
// words.tsx'teki aynı desen.
export default function LeaderboardScreen() {
  return (
    <ScreenContainer scroll={false} padded={false}>
      <ScreenNavBar />
      <LeaderboardCard limit={20} />
    </ScreenContainer>
  );
}
