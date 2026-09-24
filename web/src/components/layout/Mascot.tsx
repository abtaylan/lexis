// components/layout/Mascot.tsx — Madde 3 (Görsel/GUI), "maskot/avatar
// sistemi" (24 Eylül 2026). Orijinal, markasız bir karakter: yuvarlak,
// mezuniyet kepli, gözlüklü mavi bir "kitap kurdu" maskotu — Lexis'in dil
// öğrenme temasına (kep = öğrenme, gözlük = okuma) gönderme yapıyor.
// Bilinen hiçbir maskot/karakterin (Duolingo baykuşu vb.) taklidi DEĞİL;
// tamamen kendi tasarımı, basit geometrik şekillerden (daire + path)
// oluşuyor, harici bir görsel oluşturma aracı gerekmedi.
//
// mood: 'idle' | 'happy' | 'sad' | 'celebrate' — göz/ağız/kol şekli
// moda göre değişiyor. Kullanım yerleri: dashboard karşılama kartı,
// flashcards oturum sonu ekranı.
import type { SVGProps } from 'react';

export type MascotMood = 'idle' | 'happy' | 'sad' | 'celebrate';

interface MascotProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  mood?: MascotMood;
  size?: number;
}

export function Mascot({ mood = 'idle', size = 64, ...rest }: MascotProps) {
  const bodyColor = '#378ADD';
  const bellyColor = '#EAF4FD';
  const capColor = '#1E293B';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...rest}>
      {/* Kollar — sadece kutlama modunda yukarı kalkık */}
      {mood === 'celebrate' ? (
        <>
          <path d="M28 62 Q14 48 10 34" stroke={bodyColor} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M72 62 Q86 48 90 34" stroke={bodyColor} strokeWidth="7" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <path d="M26 68 Q16 70 14 80" stroke={bodyColor} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M74 68 Q84 70 86 80" stroke={bodyColor} strokeWidth="7" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Gövde */}
      <circle cx="50" cy="56" r="34" fill={bodyColor} />
      {/* Karın */}
      <ellipse cx="50" cy="64" rx="20" ry="16" fill={bellyColor} />

      {/* Mezuniyet kepi */}
      <rect x="30" y="20" width="40" height="7" rx="2" fill={capColor} />
      <path d="M50 12 L76 23 L50 30 L24 23 Z" fill={capColor} />
      <circle cx="76" cy="23" r="2.2" fill={capColor} />
      <line x1="76" y1="23" x2="76" y2="34" stroke={capColor} strokeWidth="1.6" />

      {/* Gözlük */}
      <circle cx="40" cy="50" r="9" fill="white" stroke={capColor} strokeWidth="2.4" />
      <circle cx="60" cy="50" r="9" fill="white" stroke={capColor} strokeWidth="2.4" />
      <line x1="49" y1="50" x2="51" y2="50" stroke={capColor} strokeWidth="2.4" />

      {/* Gözler — moda göre */}
      {mood === 'sad' ? (
        <>
          <path d="M36 51 q4 -4 8 0" stroke={capColor} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M56 51 q4 -4 8 0" stroke={capColor} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          {/* damla */}
          <path d="M32 58 q-2 5 0 7 q2 -2 0 -7" fill="#7CC1F2" />
        </>
      ) : mood === 'happy' || mood === 'celebrate' ? (
        <>
          <path d="M36 50 q4 -5 8 0" stroke={capColor} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M56 50 q4 -5 8 0" stroke={capColor} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="40" cy="50" r="2.6" fill={capColor} />
          <circle cx="60" cy="50" r="2.6" fill={capColor} />
        </>
      )}

      {/* Ağız — moda göre */}
      {mood === 'sad' ? (
        <path d="M42 68 Q50 62 58 68" stroke={capColor} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      ) : mood === 'happy' || mood === 'celebrate' ? (
        <path d="M40 66 Q50 76 60 66" stroke={capColor} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M43 67 Q50 70 57 67" stroke={capColor} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      )}

      {/* Kutlama parıltıları */}
      {mood === 'celebrate' && (
        <>
          <path d="M14 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#FDB022" />
          <path d="M88 44 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" fill="#FDB022" />
        </>
      )}
    </svg>
  );
}
