interface RibbonMotifProps {
  className?: string;
  opacity?: number;
}

/**
 * Lexis logosundaki mavi->mor gradyan şeridin büyütülmüş hâli — marka
 * imzası olarak koyu (lacivert) bölümlerin arka planında kullanılır
 * (bkz. Hero.tsx, Cta.tsx). Dekoratif olduğu için aria-hidden; çok yavaş
 * bir sürüklenme animasyonu (.ribbon-drift, globals.css) taşır ve
 * prefers-reduced-motion'da otomatik durur.
 */
export function RibbonMotif({ className = '', opacity = 0.9 }: RibbonMotifProps) {
  return (
    <svg
      aria-hidden
      className={`ribbon-drift pointer-events-none ${className}`}
      viewBox="0 0 480 700"
      style={{ opacity }}
    >
      <defs>
        <linearGradient id="ribbon-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4C6FFF" />
          <stop offset="1" stopColor="#7B5CFA" />
        </linearGradient>
        <linearGradient id="ribbon-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7B5CFA" />
          <stop offset="1" stopColor="#4C6FFF" />
        </linearGradient>
      </defs>
      <polygon points="260,0 340,0 180,700 100,700" fill="url(#ribbon-a)" opacity="0.9" />
      <polygon points="380,0 430,0 300,700 250,700" fill="url(#ribbon-b)" opacity="0.35" />
    </svg>
  );
}
