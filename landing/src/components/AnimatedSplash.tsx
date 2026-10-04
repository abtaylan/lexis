'use client';

// src/components/AnimatedSplash.tsx — lexiswords.com açılış animasyonu.
//
// "Kurt Otomotiv tarzı: Montaj + Metin Kademesi" konsepti (bkz. kullanıcının
// onayladığı Artifact tasarımı) — sabit 1280x720 bir "sahne" üzerine
// tasarlanıp tüm ekranı kaplayacak şekilde ölçeklenir (letterbox/cover
// tekniği), böylece tasarımdaki tüm piksel ölçüleri birebir korunur.
//
// Statik pazarlama sitesi olduğu için auth/veri yüklemesine değil sabit bir
// zamanlayıcıya bağlı: sayfa ilk yüklendiğinde (kök layout'ta) kısa süre tam
// ekran gösterilip altındaki gerçek içeriğin üzerine yumuşak bir fade-out ile
// kayboluyor. İçerik DOM'da zaten mevcut (SSR) — sadece görsel olarak bir an
// örtülüyor, bu yüzden SEO/crawler tarafını etkilemiyor. Next.js App
// Router'da istemci-taraflı sayfa geçişlerinde kök layout yeniden
// mount edilmediğinden splash yalnızca ilk sayfa yüklemesinde / hard
// refresh'te bir kez oynuyor.
//
// prefers-reduced-motion açık olan kullanıcılarda (erişilebilirlik) splash
// hiç gösterilmeden atlanıyor.

import { useEffect, useState } from 'react';

const STAGE_W = 1280;
const STAGE_H = 720;

// Montaj + metin animasyonunun toplam süresi (ms) — Artifact tasarımındaki
// 9s'lik sürekli-döngü gösterim süresini, tek seferlik bir açılış için
// sıkıştırılmış hâli. Yüzdelik keyframe zamanlamaları birebir aynı kaldığı
// için oran korunuyor, sadece gerçek süre kısalıyor.
const ANIM_MS = 3200;
const FADE_MS = 450;

// 12 dilde "Merhaba" — arka planda yavaşça düşen kelime yağmuru.
// (Artifact'ta onaylanan dağılım/renk/süre değerleriyle birebir aynı.)
const RAIN_WORDS: Array<{
  left: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  opacity: number;
  word: string;
}> = [
  { left: 43.5, size: 22, color: '#FFFFFF', duration: 8.71, delay: 0.41, opacity: 0.27, word: 'Merhaba' },
  { left: 76.6, size: 20, color: '#8B82E8', duration: 6.56, delay: -5.66, opacity: 0.25, word: 'Hello' },
  { left: 77.1, size: 14, color: '#FFFFFF', duration: 11.79, delay: -1.81, opacity: 0.38, word: 'Hallo' },
  { left: 15.8, size: 14, color: '#378ADD', duration: 6.36, delay: -6.91, opacity: 0.29, word: 'Bonjour' },
  { left: 3.8, size: 20, color: '#534AB7', duration: 8.64, delay: 0.27, opacity: 0.36, word: 'Hola' },
  { left: 61.2, size: 20, color: '#378ADD', duration: 9.97, delay: -3.97, opacity: 0.29, word: 'Ciao' },
  { left: 94.8, size: 14, color: '#534AB7', duration: 7.89, delay: -6.47, opacity: 0.29, word: 'Привет' },
  { left: 7.6, size: 14, color: '#FFFFFF', duration: 6.65, delay: -5.8, opacity: 0.25, word: 'مرحبا' },
  { left: 2.6, size: 14, color: '#8B82E8', duration: 7.26, delay: 1.01, opacity: 0.36, word: 'こんにちは' },
  { left: 93.2, size: 20, color: '#FFFFFF', duration: 6.44, delay: -2.08, opacity: 0.42, word: 'Olá' },
  { left: 26.4, size: 14, color: '#534AB7', duration: 8.0, delay: 1.6, opacity: 0.42, word: '你好' },
  { left: 12.1, size: 16, color: '#378ADD', duration: 6.07, delay: -3.89, opacity: 0.36, word: '안녕하세요' },
  { left: 65.1, size: 16, color: '#FFFFFF', duration: 9.05, delay: 1.84, opacity: 0.42, word: 'Merhaba' },
  { left: 40.4, size: 20, color: '#378ADD', duration: 8.37, delay: 1.89, opacity: 0.23, word: 'Hello' },
  { left: 82.2, size: 22, color: '#534AB7', duration: 11.99, delay: -8.78, opacity: 0.27, word: 'Hallo' },
  { left: 94.6, size: 22, color: '#378ADD', duration: 6.25, delay: -7.39, opacity: 0.34, word: 'Bonjour' },
  { left: 1.9, size: 22, color: '#534AB7', duration: 10.98, delay: -4.75, opacity: 0.25, word: 'Hola' },
  { left: 20.6, size: 16, color: '#378ADD', duration: 9.61, delay: -4.91, opacity: 0.34, word: 'Ciao' },
  { left: 91.2, size: 20, color: '#8B82E8', duration: 11.2, delay: -6.99, opacity: 0.27, word: 'Привет' },
  { left: 86.4, size: 22, color: '#8B82E8', duration: 10.35, delay: -7.26, opacity: 0.4, word: 'مرحبا' },
  { left: 53.1, size: 20, color: '#FFFFFF', duration: 9.62, delay: -4.36, opacity: 0.27, word: 'こんにちは' },
  { left: 4.6, size: 18, color: '#8B82E8', duration: 10.44, delay: -4.69, opacity: 0.31, word: 'Olá' },
  { left: 86.1, size: 20, color: '#534AB7', duration: 9.12, delay: 1.22, opacity: 0.42, word: '你好' },
  { left: 12.9, size: 20, color: '#378ADD', duration: 7.68, delay: 1.09, opacity: 0.25, word: '안녕하세요' },
];

type Phase = 'visible' | 'fading' | 'done';

export function AnimatedSplash() {
  const [phase, setPhase] = useState<Phase>('visible');
  const [scale, setScale] = useState(1.4);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setPhase('done');
      return;
    }

    const computeScale = () => {
      // "cover" mantığı: 1280x720'lik sahneyi ekranı tamamen kaplayacak
      // şekilde büyüt (kenarlarda hafif kırpılma olabilir, tasarım zaten
      // kenarlara dekoratif şerit/boşluk konacak şekilde kurgulandı).
      const s = Math.max(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
      setScale(s);
    };
    computeScale();
    window.addEventListener('resize', computeScale);

    const fadeTimer = setTimeout(() => setPhase('fading'), ANIM_MS);
    const doneTimer = setTimeout(() => setPhase('done'), ANIM_MS + FADE_MS);
    return () => {
      window.removeEventListener('resize', computeScale);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === 'done') return null;

  return (
    <div
      className={`lx-splash${phase === 'fading' ? ' lx-splash-fading' : ''}`}
      aria-hidden="true"
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap"
      />
      <div className="lx-stage" style={{ transform: `scale(${scale})` }}>
        {RAIN_WORDS.map((w, i) => (
          <span
            key={i}
            className="lx-rain"
            style={{
              left: `${w.left}%`,
              fontSize: w.size,
              color: w.color,
              '--lx-op': w.opacity,
              animationDuration: `${w.duration}s`,
              animationDelay: `${w.delay}s`,
            } as React.CSSProperties}
          >
            {w.word}
          </span>
        ))}

        <span className="lx-stripe lx-stripe-a" />
        <span className="lx-stripe lx-stripe-b" />
        <span className="lx-stripe lx-stripe-c" />

        <div className="lx-left">
          <div className="lx-logo-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- küçük sabit ikon, next/image optimizasyonuna gerek yok */}
            <img src="/logo-icon.png" alt="Lexis" className="lx-logo-img" />
            <span className="lx-logo-text">Lexis</span>
          </div>
          <div className="lx-text-block">
            <div className="lx-t lx-t1">12 dilde</div>
            <div className="lx-t lx-t2 lx-t-accent">kelime öğren</div>
            <div className="lx-sub lx-t3">Aralıklı tekrar algoritmasıyla</div>
            <div className="lx-sub lx-t4">kalıcı şekilde aklında kalsın.</div>
          </div>
          <div className="lx-progress-wrap">
            <div className="lx-progress-label">Hazırlanıyor</div>
            <div className="lx-progress-track">
              <div className="lx-progress-fill" />
            </div>
          </div>
        </div>

        <div className="lx-right">
          <div className="lx-letter-group">
            <span className="lx-burst" />
            <div className="lx-letters">
              <span className="lx-letter lx-letter-L">L</span>
              <span className="lx-letter lx-letter-E">E</span>
              <span className="lx-letter lx-letter-X">X</span>
              <span className="lx-letter lx-letter-I">I</span>
              <span className="lx-letter lx-letter-S">S</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .lx-splash {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #071d45;
          overflow: hidden;
          opacity: 1;
          transition: opacity ${FADE_MS}ms ease;
        }

        .lx-splash-fading {
          opacity: 0;
          pointer-events: none;
        }

        .lx-stage {
          position: relative;
          width: ${STAGE_W}px;
          height: ${STAGE_H}px;
          flex-shrink: 0;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          padding-left: 110px;
          font-family: 'Outfit', -apple-system, 'Segoe UI', system-ui, sans-serif;
          color: #fff;
        }

        /* --- arka plan: 12 dilde düşen "Merhaba" kelimeleri --- */
        .lx-rain {
          position: absolute;
          top: 0;
          font-weight: 600;
          opacity: 0;
          animation-name: lxRain;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          --lx-op: 0.2;
        }
        @keyframes lxRain {
          0% {
            transform: translateY(-60px);
            opacity: 0;
          }
          10% {
            opacity: var(--lx-op);
          }
          85% {
            opacity: var(--lx-op);
          }
          100% {
            transform: translateY(780px);
            opacity: 0;
          }
        }

        /* --- arkadan kayan çapraz şeritler --- */
        .lx-stripe {
          position: absolute;
          top: -200px;
          left: 560px;
          width: 70px;
          height: 1200px;
          transform: translateX(560px) rotate(24deg);
          animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1);
          animation-duration: ${ANIM_MS}ms;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
        }
        .lx-stripe-a {
          background: #378add;
          opacity: 0.45;
          animation-name: lxStripeA;
        }
        .lx-stripe-b {
          background: #534ab7;
          opacity: 0.7;
          animation-name: lxStripeB;
        }
        .lx-stripe-c {
          background: #8b82e8;
          opacity: 0.28;
          animation-name: lxStripeC;
        }
        @keyframes lxStripeA {
          0% { transform: translateX(560px) rotate(24deg); }
          22% { transform: translateX(0) rotate(24deg); }
          100% { transform: translateX(0) rotate(24deg); }
        }
        @keyframes lxStripeB {
          0%, 6% { transform: translateX(560px) rotate(24deg); }
          28% { transform: translateX(0) rotate(24deg); }
          100% { transform: translateX(0) rotate(24deg); }
        }
        @keyframes lxStripeC {
          0%, 12% { transform: translateX(560px) rotate(24deg); }
          34% { transform: translateX(0) rotate(24deg); }
          100% { transform: translateX(0) rotate(24deg); }
        }

        /* --- sol sütun: logo kartı + metin kademesi + ilerleme çubuğu --- */
        .lx-left {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 30px;
          width: 600px;
          z-index: 2;
        }

        .lx-logo-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #fff;
          border-radius: 18px;
          padding: 20px 32px;
          width: fit-content;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
          opacity: 0;
          transform: translateX(-120px);
          animation: lxLogoCard ${ANIM_MS}ms cubic-bezier(0.2, 0.7, 0.2, 1) 1 forwards;
        }
        @keyframes lxLogoCard {
          0%, 48% { opacity: 0; transform: translateX(-120px); }
          60%, 91% { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(0); }
        }

        .lx-logo-img {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: block;
        }

        .lx-logo-text {
          font-size: 28px;
          font-weight: 800;
          color: #071d45;
        }

        .lx-text-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .lx-t {
          font-size: 52px;
          font-weight: 800;
          opacity: 0;
          transform: translateY(34px);
          animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1);
          animation-duration: ${ANIM_MS}ms;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
        }
        .lx-t-accent {
          color: #8fb8ea;
        }
        .lx-sub {
          font-size: 26px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.75);
          opacity: 0;
          transform: translateY(34px);
          animation-timing-function: cubic-bezier(0.2, 0.7, 0.2, 1);
          animation-duration: ${ANIM_MS}ms;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
        }
        .lx-t1 { animation-name: lxT1; }
        .lx-t2 { animation-name: lxT2; }
        .lx-t3 { animation-name: lxT3; }
        .lx-t4 { animation-name: lxT4; }
        @keyframes lxT1 {
          0%, 56% { opacity: 0; transform: translateY(34px); }
          64%, 91% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(0); }
        }
        @keyframes lxT2 {
          0%, 64% { opacity: 0; transform: translateY(34px); }
          72%, 91% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(0); }
        }
        @keyframes lxT3 {
          0%, 71% { opacity: 0; transform: translateY(34px); }
          79%, 91% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(0); }
        }
        @keyframes lxT4 {
          0%, 77% { opacity: 0; transform: translateY(34px); }
          85%, 91% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(0); }
        }

        .lx-progress-wrap {
          margin-top: 6px;
        }
        .lx-progress-label {
          font-size: 14px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
          animation: lxBreathe 1.6s ease infinite;
        }
        @keyframes lxBreathe {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .lx-progress-track {
          width: 260px;
          height: 3px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.15);
          overflow: hidden;
        }
        .lx-progress-fill {
          height: 100%;
          width: 0;
          background: linear-gradient(90deg, #378add, #8b82e8);
          animation: lxFill ${ANIM_MS}ms ease 1 forwards;
        }
        @keyframes lxFill {
          0%, 85% { width: 0; }
          94%, 100% { width: 100%; }
        }

        /* --- sağ taraf: LEXIS harflerinin montajı + flört dönüşü --- */
        .lx-right {
          position: absolute;
          right: 60px;
          top: 50%;
          transform: translateY(-50%);
          width: 560px;
          height: 560px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .lx-letter-group {
          position: relative;
          animation: lxGroupSpin ${ANIM_MS}ms cubic-bezier(0.45, 0, 0.3, 1) 1 forwards;
        }
        @keyframes lxGroupSpin {
          0%, 56% { transform: rotate(0deg); }
          78%, 100% { transform: rotate(360deg); }
        }

        .lx-burst {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 360px;
          height: 220px;
          margin-left: -180px;
          margin-top: -110px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(55, 138, 221, 0.45) 0%,
            rgba(139, 130, 232, 0.2) 50%,
            rgba(7, 29, 69, 0) 75%
          );
          animation: lxBurst ${ANIM_MS}ms ease-out 1 forwards;
        }
        @keyframes lxBurst {
          0%, 25% { transform: scale(0.2); opacity: 0; }
          28% { transform: scale(1); opacity: 0.85; }
          42%, 100% { transform: scale(1.9); opacity: 0; }
        }

        .lx-letters {
          position: relative;
          display: flex;
        }
        .lx-letter {
          display: inline-block;
          font-size: 104px;
          font-weight: 800;
          color: #fff;
          opacity: 0;
          animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
          animation-duration: ${ANIM_MS}ms;
          animation-iteration-count: 1;
          animation-fill-mode: forwards;
        }
        .lx-letter-X {
          background: linear-gradient(135deg, #378add, #8b82e8);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .lx-letter-L { animation-name: lxLetterL; }
        .lx-letter-E { animation-name: lxLetterE; }
        .lx-letter-X { animation-name: lxLetterX; }
        .lx-letter-I { animation-name: lxLetterI; }
        .lx-letter-S { animation-name: lxLetterS; }
        @keyframes lxLetterL {
          0%, 2% { transform: translate(298px, 172px) rotate(-140deg) scale(0.4); opacity: 0; }
          9% { transform: translate(0, 0) rotate(8deg) scale(1.15); opacity: 1; }
          13%, 91% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          96%, 100% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes lxLetterE {
          0%, 5% { transform: translate(-353px, -289px) rotate(-39deg) scale(0.4); opacity: 0; }
          12% { transform: translate(0, 0) rotate(-8deg) scale(1.15); opacity: 1; }
          16%, 91% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          96%, 100% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes lxLetterX {
          0%, 8% { transform: translate(-371px, 177px) rotate(-46deg) scale(0.4); opacity: 0; }
          15% { transform: translate(0, 0) rotate(9deg) scale(1.15); opacity: 1; }
          19%, 91% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          96%, 100% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes lxLetterI {
          0%, 11% { transform: translate(275px, -217px) rotate(-108deg) scale(0.4); opacity: 0; }
          18% { transform: translate(0, 0) rotate(-9deg) scale(1.15); opacity: 1; }
          22%, 91% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          96%, 100% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes lxLetterS {
          0%, 14% { transform: translate(272px, -171px) rotate(-72deg) scale(0.4); opacity: 0; }
          21% { transform: translate(0, 0) rotate(8deg) scale(1.15); opacity: 1; }
          25%, 91% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          96%, 100% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lx-stage * {
            animation-play-state: paused !important;
          }
        }
      `}</style>
    </div>
  );
}
