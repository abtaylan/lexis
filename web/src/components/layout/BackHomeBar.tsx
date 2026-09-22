'use client';

// Kullanici istegi (22 Eylul 2026): "hem mobil hem web, her bolumun ve alt
// sayfanin mutlaka bir 'geri don' ve bir 'ana menuye don' butonu olmali."
// Web tarafinda Sidebar zaten kalici bir ana menu sagliyor, ama mobil
// genislikte (md altinda) varsayilan olarak gizli/off-canvas (bkz.
// Sidebar.tsx) -- bu yuzden sayfa icerigine de kucuk, tutarli bir geri/ana
// menu satiri eklendi. (app)/layout.tsx icinde TEK noktadan render edilir,
// boylece 30+ sayfanin her birine ayri ayri eklemek gerekmez. Kullanici
// istegi (22 Eylul 2026, devam): "sistemdeki her sayfanin her alt bolumu"
// -- dashboard dahil, HICBIR sayfa istisna degil.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import { useLocale } from '@/lib/i18n';

export function BackHomeBar() {
  const router = useRouter();
  const { locale } = useLocale();

  const backLabel = locale === 'tr' ? 'Geri' : 'Back';
  const homeLabel = locale === 'tr' ? 'Ana Menü' : 'Home';

  return (
    <div className="flex items-center justify-between px-6 pt-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </button>
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <Home size={16} />
        {homeLabel}
      </Link>
    </div>
  );
}
