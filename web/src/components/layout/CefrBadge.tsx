'use client';

// components/layout/CefrBadge.tsx — kullanıcının GÜNCEL CEFR seviyesini
// (A1-C2) dashboard'da görünür kılan küçük rozet.
//
// Neden eklendi (24 Eylül 2026): Adaptif Öğrenme Motoru (Madde 1-4) artık
// kullanıcının seviyesini sürekli güncelliyor (level_assessment_service.py
// -- oyun performansına göre current_level'i yukarı/aşağı kaydırıyor,
// periyodik yeniden-tespit önerisi sunuyor, sınav havuzunu ve kelime
// havuzunu buna göre besliyor) ama bu bilgi kullanıcıya HİÇBİR YERDE
// gösterilmiyordu -- tamamen "arka planda" çalışıyordu. Bu rozet, motorun
// ürettiği sonucu görünür kılıyor.
//
// XPBar.tsx ile AYNI self-contained "soft-disable" deseni: kendi API
// çağrısını kendi yapar, veri gelmeden/hata durumunda sessizce hiçbir şey
// göstermez -- dashboard'un ana veri akışına (sayfanın kendi useEffect'i,
// zorunlu placement/recheck yönlendirme mantığı) HİÇ dokunmaz, sadece aynı
// GET /exams/placement/status uç noktasını AYRICA çağırır (tek satırlık,
// ucuz bir sorgu -- ek bir performans riski yok).
import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { GraduationCap } from 'lucide-react';
import { examsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

const CEFR_LABELS: Partial<Record<Locale, { badgeTitle: string; levelNames: Record<string, string> }>> = {
  tr: {
    badgeTitle: 'Mevcut Seviyen',
    levelNames: {
      a1: 'Başlangıç', a2: 'Temel', b1: 'Orta', b2: 'Orta-Üstü', c1: 'İleri', c2: 'Uzman',
    },
  },
  en: {
    badgeTitle: 'Current Level',
    levelNames: {
      a1: 'Beginner', a2: 'Elementary', b1: 'Intermediate', b2: 'Upper-Intermediate', c1: 'Advanced', c2: 'Proficient',
    },
  },
};

interface CefrBadgeProps {
  className?: string;
}

export function CefrBadge({ className }: CefrBadgeProps) {
  const { locale } = useLocale();
  const [level, setLevel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    examsApi
      .placementStatus()
      .then((res) => {
        if (!cancelled && res.current_level) setLevel(res.current_level);
      })
      .catch(() => {
        /* soft-disable -- henüz seviye tespiti yapılmamış/hata durumunda rozet hiç gösterilmez */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!level) return null;

  const t = CEFR_LABELS[locale] ?? CEFR_LABELS.tr!;
  const levelUpper = level.toUpperCase();
  const levelName = t.levelNames[level.toLowerCase()] ?? levelUpper;

  return (
    <div
      className={clsx(
        'flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm px-4 py-3',
        className
      )}
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#E6F1FB] dark:bg-blue-500/10 text-[#378ADD] dark:text-blue-400 shrink-0">
        <GraduationCap className="w-4.5 h-4.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-slate-500">{t.badgeTitle}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
          {levelUpper} <span className="font-normal text-gray-500 dark:text-slate-400">· {levelName}</span>
        </p>
      </div>
    </div>
  );
}
