'use client';

import { useRef } from 'react';

interface MagneticButtonProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  strength?: number;
}

/**
 * İmleç yaklaştıkça hafifçe ona doğru kayan buton — sadece gerçek fare
 * (hover: hover + pointer: fine) olan ve prefers-reduced-motion istemeyen
 * ziyaretçilerde çalışır; dokunmatik cihazlarda ve azaltılmış hareket
 * tercihinde sessizce normal bir buton olarak kalır.
 */
export function MagneticButton({ href, className = '', children, strength = 0.3 }: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  };

  const handleMouseLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0px, 0px)';
  };

  return (
    <a
      ref={ref}
      href={href}
      className={`magnetic inline-flex ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </a>
  );
}
