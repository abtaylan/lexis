// src/components/Mascot.tsx — Madde 3 (Görsel/GUI), "maskot/avatar
// sistemi" (24 Eylül 2026). web/src/components/layout/Mascot.tsx ile
// AYNI orijinal karakter tasarımı (mezuniyet kepli, gözlüklü mavi bir
// "kitap kurdu"), react-native-svg ile yeniden yazıldı. react-native-svg
// zaten mobile/package.json'da kurulu bir bağımlılık (lucide-react-native
// ikonları üzerinden geliyor) — yeni bir native modül eklenmiyor.
import React from 'react';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'celebrate';

interface MascotProps {
  mood?: MascotMood;
  size?: number;
}

export function Mascot({ mood = 'idle', size = 64 }: MascotProps) {
  const bodyColor = '#378ADD';
  const bellyColor = '#EAF4FD';
  const capColor = '#1E293B';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {mood === 'celebrate' ? (
        <>
          <Path d="M28 62 Q14 48 10 34" stroke={bodyColor} strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d="M72 62 Q86 48 90 34" stroke={bodyColor} strokeWidth={7} strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <Path d="M26 68 Q16 70 14 80" stroke={bodyColor} strokeWidth={7} strokeLinecap="round" fill="none" />
          <Path d="M74 68 Q84 70 86 80" stroke={bodyColor} strokeWidth={7} strokeLinecap="round" fill="none" />
        </>
      )}

      <Circle cx={50} cy={56} r={34} fill={bodyColor} />
      <Ellipse cx={50} cy={64} rx={20} ry={16} fill={bellyColor} />

      <Rect x={30} y={20} width={40} height={7} rx={2} fill={capColor} />
      <Path d="M50 12 L76 23 L50 30 L24 23 Z" fill={capColor} />
      <Circle cx={76} cy={23} r={2.2} fill={capColor} />
      <Line x1={76} y1={23} x2={76} y2={34} stroke={capColor} strokeWidth={1.6} />

      <Circle cx={40} cy={50} r={9} fill="white" stroke={capColor} strokeWidth={2.4} />
      <Circle cx={60} cy={50} r={9} fill="white" stroke={capColor} strokeWidth={2.4} />
      <Line x1={49} y1={50} x2={51} y2={50} stroke={capColor} strokeWidth={2.4} />

      {mood === 'sad' ? (
        <>
          <Path d="M36 51 q4 -4 8 0" stroke={capColor} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          <Path d="M56 51 q4 -4 8 0" stroke={capColor} strokeWidth={2.2} strokeLinecap="round" fill="none" />
          <Path d="M32 58 q-2 5 0 7 q2 -2 0 -7" fill="#7CC1F2" />
        </>
      ) : mood === 'happy' || mood === 'celebrate' ? (
        <>
          <Path d="M36 50 q4 -5 8 0" stroke={capColor} strokeWidth={2.4} strokeLinecap="round" fill="none" />
          <Path d="M56 50 q4 -5 8 0" stroke={capColor} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <Circle cx={40} cy={50} r={2.6} fill={capColor} />
          <Circle cx={60} cy={50} r={2.6} fill={capColor} />
        </>
      )}

      {mood === 'sad' ? (
        <Path d="M42 68 Q50 62 58 68" stroke={capColor} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      ) : mood === 'happy' || mood === 'celebrate' ? (
        <Path d="M40 66 Q50 76 60 66" stroke={capColor} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      ) : (
        <Path d="M43 67 Q50 70 57 67" stroke={capColor} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      )}

      {mood === 'celebrate' && (
        <>
          <Path d="M14 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#FDB022" />
          <Path d="M88 44 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" fill="#FDB022" />
        </>
      )}
    </Svg>
  );
}
