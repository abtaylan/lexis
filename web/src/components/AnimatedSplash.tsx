'use client';

// src/components/AnimatedSplash.tsx — web açılış animasyonu.
//
// Mobil uygulamadaki (src/app/_layout.tsx, src/components/AnimatedSplash.tsx)
// "Yıldız Tozu + Shimmer Sweep" konseptinin web karşılığı: yıldız tozu
// parçacıkları, logonun üzerinden geçen ışık yansıması ve 6 dilde kelime
// geçişi. (app)/layout.tsx içinde, auth durumu yüklenirken (`isLoading`)
// eski basit spinner'ın yerine gösteriliyor.
//
// Saf CSS @keyframes kullanıyor (mobildeki Reanimated karşılığı) — ekstra
// animasyon kütüphanesi gerekmiyor, GPU'da transform/opacity ile çalışıyor.

const WORDS = ['Merhaba', 'Hello', 'Hola', 'Bonjour', 'こんにちは', '안녕하세요'];

const PARTICLES: Array<{
  left: number;
  top: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}> = [
  { left: 14, top: 70, size: 3, color: '#378ADD', duration: 6, delay: 0 },
  { left: 24, top: 82, size: 2, color: '#FFFFFF', duration: 7.5, delay: 0.6 },
  { left: 76, top: 74, size: 3, color: '#8B82E8', duration: 8.2, delay: 1.1 },
  { left: 84, top: 60, size: 2, color: '#FFFFFF', duration: 6.8, delay: 0.3 },
  { left: 10, top: 55, size: 2, color: '#534AB7', duration: 9, delay: 1.8 },
  { left: 90, top: 78, size: 3, color: '#378ADD', duration: 7, delay: 2.3 },
  { left: 34, top: 88, size: 2, color: '#FFFFFF', duration: 6.4, delay: 0.9 },
  { left: 64, top: 85, size: 3, color: '#8B82E8', duration: 7.8, delay: 1.5 },
  { left: 50, top: 92, size: 2, color: '#FFFFFF', duration: 8.6, delay: 0.2 },
  { left: 20, top: 20, size: 2, color: '#378ADD', duration: 7.2, delay: 2.6 },
  { left: 80, top: 18, size: 2, color: '#534AB7', duration: 8, delay: 1.3 },
];

export function AnimatedSplash() {
  return (
    <div className="lx-splash">
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="lx-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      <div className="lx-logo-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element -- küçük sabit ikon, next/image optimizasyonuna gerek yok */}
        <img src="/logo-icon.png" alt="Lexis" className="lx-logo-img" />
        <span className="lx-shimmer" />
      </div>

      <div className="lx-word-slot">
        {WORDS.map((word, i) => (
          <span key={word} className={`lx-word lx-word-${i}`}>
            {word}
          </span>
        ))}
      </div>

      <p className="lx-caption">12 dilde kelime öğren</p>

      <style jsx>{`
        .lx-splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #071d45;
          overflow: hidden;
        }

        .lx-particle {
          position: absolute;
          border-radius: 999px;
          opacity: 0;
          animation-name: lxFloatUp;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .lx-logo-wrap {
          position: relative;
          width: 116px;
          height: 116px;
          border-radius: 26px;
          overflow: hidden;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
          animation: lxPopIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }

        .lx-logo-img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .lx-shimmer {
          position: absolute;
          top: -40px;
          left: 0;
          width: 60px;
          height: 220px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.55) 50%,
            transparent 100%
          );
          mix-blend-mode: screen;
          animation: lxShimmer 4.4s ease-in-out infinite;
        }

        .lx-word-slot {
          position: relative;
          margin-top: 34px;
          height: 34px;
          width: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lx-word {
          position: absolute;
          color: #ffffff;
          font-size: 24px;
          font-weight: 600;
          font-family: 'Outfit', -apple-system, 'Segoe UI', system-ui, sans-serif;
          opacity: 0;
          animation-duration: 9s;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .lx-word-0 {
          animation-name: lxWord0;
        }
        .lx-word-1 {
          animation-name: lxWord1;
        }
        .lx-word-2 {
          animation-name: lxWord2;
        }
        .lx-word-3 {
          animation-name: lxWord3;
        }
        .lx-word-4 {
          animation-name: lxWord4;
        }
        .lx-word-5 {
          animation-name: lxWord5;
        }

        .lx-caption {
          position: relative;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        @keyframes lxPopIn {
          0% {
            transform: scale(0.85);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes lxShimmer {
          0%,
          55% {
            transform: translateX(-140px) rotate(20deg);
          }
          75%,
          100% {
            transform: translateX(160px) rotate(20deg);
          }
        }

        @keyframes lxFloatUp {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          15% {
            opacity: 0.8;
          }
          85% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-120px);
            opacity: 0;
          }
        }

        @keyframes lxWord0 {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          2.5% {
            opacity: 1;
            transform: translateY(0);
          }
          14.17% {
            opacity: 1;
          }
          16.67% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes lxWord1 {
          0% {
            opacity: 0;
          }
          16.67% {
            opacity: 0;
            transform: translateY(6px);
          }
          19.17% {
            opacity: 1;
            transform: translateY(0);
          }
          30.83% {
            opacity: 1;
          }
          33.33% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes lxWord2 {
          0% {
            opacity: 0;
          }
          33.33% {
            opacity: 0;
            transform: translateY(6px);
          }
          35.83% {
            opacity: 1;
            transform: translateY(0);
          }
          47.5% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes lxWord3 {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 0;
            transform: translateY(6px);
          }
          52.5% {
            opacity: 1;
            transform: translateY(0);
          }
          64.17% {
            opacity: 1;
          }
          66.67% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes lxWord4 {
          0% {
            opacity: 0;
          }
          66.67% {
            opacity: 0;
            transform: translateY(6px);
          }
          69.17% {
            opacity: 1;
            transform: translateY(0);
          }
          80.83% {
            opacity: 1;
          }
          83.33% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes lxWord5 {
          0% {
            opacity: 0;
          }
          83.33% {
            opacity: 0;
            transform: translateY(6px);
          }
          85.83% {
            opacity: 1;
            transform: translateY(0);
          }
          97.5% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
