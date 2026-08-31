'use client';

// components/layout/XPBar.tsx — Kullanıcının seviye/XP ilerlemesini gösteren
// hesap geneli (dile bağlı olmayan) gösterge. Backend: GET /stats/xp
// (bkz. backend/app/services/xp_service.py — get_xp_summary).
//
// İki mod:
//  - compact: Sidebar'da avatar bloğunun üstünde, ince bir çubuk
//  - full (varsayılan): Dashboard'da kendi kartı olarak, daha büyük gösterim

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Zap } from 'lucide-react';
import { statsApi, type XpSummary } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

// Merkezi i18n.tsx'e dokunmadan yerel çeviri — Sidebar.tsx'teki GAME_LABEL /
// LOCALE_MAP deseniyle aynı yaklaşım (bkz. profile/page.tsx LOCALE_MAP).
const XP_LABELS: Record<Locale, { level: string; toNextLevel: string }> = {
  tr: { level: 'Seviye', toNextLevel: 'sonraki seviyeye' },
  en: { level: 'Level', toNextLevel: 'to next level' },
  de: { level: 'Level', toNextLevel: 'bis zum nächsten Level' },
  fr: { level: 'Niveau', toNextLevel: "jusqu'au niveau suivant" },
  es: { level: 'Nivel', toNextLevel: 'para el siguiente nivel' },
  it: { level: 'Livello', toNextLevel: 'al prossimo livello' },
  ar: { level: 'المستوى', toNextLevel: 'للمستوى التالي' },
  ru: { level: 'Уровень', toNextLevel: 'до следующего уровня' },
  ja: { level: 'レベル', toNextLevel: '次のレベルまで' },
  pt: { level: 'Nível', toNextLevel: 'para o próximo nível' },
};

interface XPBarProps {
  /** true: Sidebar'daki ince/küçük gösterim. false: Dashboard kartı. */
  compact?: boolean;
  className?: string;
}

export function XPBar({ compact, className }: XPBarProps) {
  const { locale } = useLocale();
  const [xp, setXp] = useState<XpSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    statsApi.getXp()
      .then((res) => { if (!cancelled) setXp(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Veri gelene kadar (veya istek başarısız olursa) sessizce hiçbir şey
  // göstermiyoruz — dashboard/sidebar'ın geri kalanı zaten kendi
  // loading/error durumunu yönetiyor, XP göstergesi kritik yol değil.
  if (!xp) return null;

  const labels = XP_LABELS[locale] ?? XP_LABELS.en;
  const span = Math.max(1, xp.next_level_xp_target - xp.current_level_xp_floor);
  const pct = Math.min(100, Math.max(0, Math.round((xp.xp_into_level / span) * 100)));

  if (compact) {
    return (
      <div className={clsx('px-2 mb-3', className)}>
        <div className="flex items-center justify-between mb-1">
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-slate-300">
            <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            {labels.level} {xp.level}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-slate-500">{xp.xp_into_level}/{span}</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-sm shrink-0">
            {xp.level}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{labels.level} {xp.level}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">{xp.total_xp} XP</p>
          </div>
        </div>
        <span className="text-xs text-gray-400 dark:text-slate-500 text-right">
          {xp.xp_to_next_level} XP {labels.toNextLevel}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
