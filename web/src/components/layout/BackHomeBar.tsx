'use client';

// Kullanici istegi (22 Eylul 2026): "hem mobil hem web, her bolumun ve alt
// sayfanin mutlaka bir 'geri don' ve bir 'ana menuye don' butonu olmali."
// Web tarafinda Sidebar zaten kalici bir ana menu sagliyor, ama mobil
// genislikte (md altinda) varsayilan olarak gizli/off-canvas (bkz.
// Sidebar.tsx) -- bu yuzden sayfa icerigine de kucuk, tutarli bir geri/ana
// menu satiri eklendi. (app)/layout.tsx icinde TEK noktadan render edilir,
// boylece 30+ sayfanin her birine ayri ayri eklemek gerekmez.
//
// GUNCELLEME (24 Eylul 2026, kullanici geri bildirimi + ekran goruntusu):
// "butonlar sayfanin USTUNDE degil ALTINDA ve ORTADA olsun, Dashboard'da
// hic olmasin, Gorev Haritasi'nda da olmasin (o kendi tam ekran duzenini
// zaten kendi hallediyor)." Bu bilesen artik (app)/layout.tsx'te children'dan
// SONRA, sayfa altinda, iki butonu ORTALAYARAK render ediliyor; hangi
// rotalarda hic gosterilmeyecegi de layout.tsx'te (usePathname ile) kontrol
// ediliyor -- bu dosyanin kendisi kosulsuz her zaman ayni gorunumde render
// eder, "nerede gorunsun" karari tamamen cagiran tarafta.
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
    <div className="flex items-center justify-center gap-3 px-6 py-5 mt-6 border-t border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft size={16} />
        {backLabel}
      </button>
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <Home size={16} />
        {homeLabel}
      </Link>
    </div>
  );
}
