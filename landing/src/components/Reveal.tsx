'use client';

import { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Giriş yönü/tarzı — bkz. globals.css .reveal[data-variant]. */
  variant?: 'up' | 'left' | 'right' | 'scale' | 'blur';
}

/**
 * Görünüm alanına girdiğinde (IntersectionObserver ile) içeriği yumuşak bir
 * geçişle ortaya çıkarır. `prefers-reduced-motion` tercihine uyar (hareketi
 * tamamen kapatır, içerik anında görünür kalır).
 * Bkz. src/app/globals.css → .reveal / .reveal.is-visible
 */
export function Reveal({ children, className = '', delay = 0, variant = 'up' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-variant={variant}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
