import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

// Next.js'in dosya-tabanlı sitemap.xml üretimi — build sırasında otomatik
// olarak /sitemap.xml çıktısına dönüşür (4 Eylül 2026). Yasal sayfalar düşük
// öncelikli ama yine de indexlenmesi faydalı; ana sayfa en yüksek öncelikte.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: '/hakkimizda', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/gizlilik-politikasi', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/kvkk', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/kullanim-sartlari', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/mesafeli-satis-sozlesmesi', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/teslimat-iade-sartlari', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/hesap-silme', priority: 0.3, changeFrequency: 'yearly' },
  ];

  return routes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
