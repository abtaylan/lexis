'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { useAuth } from '@/store/auth';
import { Spinner } from '@/components/ui';

// NOT: Bu dosya önceden artık var olmayan bir i18n API'sine (useT/t) bağlıydı
// — lexis-subscription-multilang branch merge'inde i18n.ts silinip yerine
// i18n.tsx (farklı, dot-notation olmayan bir API) geldiğinde admin panel
// dosyaları güncellenmemiş kalmıştı ve derlenmiyordu (Madde 1d kapsamında
// bulunup düzeltildi). Admin panel iç kullanım için olduğundan (uygulamanın
// 8 dilli genel kullanıcı arayüzünün aksine) burada bilinçli olarak sabit
// Türkçe metin kullanılıyor — Premium/checkout sayfalarında da kabul edilmiş
// olan aynı desen (bkz. proje durum notları).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (user && !user.is_admin) { router.replace('/dashboard'); }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-800">
        <div className="flex flex-col items-center gap-3"><Spinner size="lg" /><p className="text-sm text-slate-400">Yükleniyor…</p></div>
      </div>
    );
  }

  if (!isAuthenticated || (user && !user.is_admin)) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-800">
      <AdminSidebar />
      <main className="flex-1 ml-60 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
