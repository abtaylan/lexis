// src/components/icons/TabIcons.tsx
//
// "Kelimeler" ve "Oyun" alt sekme ikonları — tasarım canvas'ında sunulan
// alternatiflerden kullanıcının seçtiği F (kelime listesi) ve A (detaylı
// gamepad) seçenekleri, react-native-svg ile birebir aynı path'lerle.
// Yeni bir native bağımlılık gerektirmez (react-native-svg zaten mevcut).
import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

interface TabIconProps {
  color: ColorValue;
  size?: number;
}

/** Kelimeler sekmesi — Seçenek F: kelime listesi / döküman ikonu. */
export function WordsTabIcon({ color, size = 21 }: TabIconProps) {
  const stroke = color as string;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <Path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <Line x1="8" y1="13" x2="16" y2="13" />
      <Line x1="8" y1="17" x2="13" y2="17" />
    </Svg>
  );
}

/** Oyun sekmesi — Seçenek A: detaylı gamepad ikonu. */
export function GameTabIcon({ color, size = 23 }: TabIconProps) {
  const stroke = color as string;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Line x1="6" y1="11" x2="10" y2="11" />
      <Line x1="8" y1="9" x2="8" y2="13" />
      <Circle cx="15" cy="12" r={0.9} fill={stroke} stroke="none" />
      <Circle cx="18" cy="10" r={0.9} fill={stroke} stroke="none" />
      <Path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z" />
    </Svg>
  );
}

/** Dashboard sekmesi — Main.dc.html'deki onaylı tab bar tasarımıyla birebir
 * aynı ev/home ikonu (önceki lucide LayoutDashboard grid ikonunun yerine). */
export function DashboardTabIcon({ color, size = 22 }: TabIconProps) {
  const stroke = color as string;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 11l9-8 9 8" />
      <Path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </Svg>
  );
}
