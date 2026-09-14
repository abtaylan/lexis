'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Bir dizi bloğu (data-index taşıyan div'ler) izler, görünüm alanının
 * ortasındaki bandı (varsayılan orta %10'luk şerit) geçen bloğun index'ini
 * "active" olarak döndürür. Features (StickyFeature) ve Showcase'in
 * "sabitlenen panel + kaydırınca değişen içerik" (scrollytelling) düzeninde
 * ortak mantığı tekrar yazmamak için burada toplandı.
 */
export function useScrollActive(rootMargin = '-45% 0px -45% 0px') {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const els = refs.current.filter((el): el is HTMLDivElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { rootMargin, threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootMargin]);

  const setRef = (i: number) => (el: HTMLDivElement | null) => {
    refs.current[i] = el;
  };

  return { active, setRef };
}
