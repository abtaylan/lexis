import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config';

// Next.js'in dosya-tabanlı robots.txt üretimi — build sırasında otomatik
// olarak /robots.txt çıktısına dönüşür (4 Eylül 2026). Tüm botlara tüm
// sayfaları taramaya izin veriyor ve sitemap.xml'in yerini gösteriyor.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
