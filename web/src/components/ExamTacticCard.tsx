'use client';

// src/components/ExamTacticCard.tsx — "Sınav Taktikleri" için ortak kart
// bileşeni (23 Kasım 2026 kullanıcı geri bildirimi: "sarı renkli alan
// okunaklı olmuyor ... örnekler çok olmalı, taktikler isimlendirilmeli" ve
// "başlıklara tıklayınca ayrıntıları görmeliyiz"). mobile/src/components/
// ExamTacticCard.tsx ile aynı tasarım deseni, web'in mevcut Tailwind +
// inline-hex renk kuralına (bkz. exam-tactics/page.tsx, exam-topic-practice/
// page.tsx) uyarlanmış hali.
//
// Önceki tasarımda TÜM gövde metni (başlık + taktik açıklaması + örnek)
// #854F0B (amber) rengindeydi -- uzun paragraflarda okunurluğu düşürüyordu.
// Yeni tasarım: amber/vurgu rengi SADECE ikon rozeti, "TAKTİK" etiketi ve
// sol kenar şeridinde kullanılır; gövde metni her zaman nötr gray-700/900
// (dark: slate-300/100) ile yazılır. Ayrıca worked_example_tr (tek örnek)
// yerine examples_tr (birden fazla örnek) numaralı bir liste olarak
// gösterilir.
//
// İki kullanım biçimi:
// - collapsible=false (varsayılan): kart her zaman açık -- Genel Stratejiler
//   kartlarında ve konu pratiği ekranındaki banner'da kullanılır.
// - collapsible=true: kart başlangıçta kapalı, başlığa tıklanınca açılır --
//   "Konu Bazlı Taktikler" listesinde kullanılır (önceden tıklanınca direkt
//   pratik sayfasına gidiyordu, artık önce ayrıntılar yerinde gösteriliyor).
import { useState, type ReactNode } from 'react';
import { ChevronRight, Lightbulb } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string | null;
  tactic: string;
  examples: string[];
  badgeLabel: string;
  examplesLabel: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  footer?: ReactNode;
};

export function ExamTacticCard({
  title,
  subtitle,
  tactic,
  examples,
  badgeLabel,
  examplesLabel,
  collapsible = false,
  defaultExpanded,
  footer,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? !collapsible);

  return (
    <div
      className="rounded-2xl border bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-4"
      style={{ borderLeftWidth: 4, borderLeftColor: '#854F0B' }}
    >
      <button
        type="button"
        onClick={() => collapsible && setExpanded((v) => !v)}
        className={`w-full flex items-center gap-2.5 text-left ${collapsible ? '' : 'cursor-default'}`}
      >
        <span
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#FAEEDA' }}
        >
          <Lightbulb className="w-3.5 h-3.5" style={{ color: '#854F0B' }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide" style={{ color: '#854F0B' }}>
            {badgeLabel}
          </span>
          <span className="block text-sm font-bold text-gray-900 dark:text-slate-100 mt-0.5">{title}</span>
          {subtitle && <span className="block text-xs text-gray-400 dark:text-slate-500 mt-0.5">{subtitle}</span>}
        </span>
        {collapsible && (
          <ChevronRight
            className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500 transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
        )}
      </button>

      {expanded && (
        <>
          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed mt-3">{tactic}</p>

          {examples.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                {examplesLabel}
              </span>
              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 p-2.5"
                >
                  <span
                    className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center mt-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">{ex}</span>
                </div>
              ))}
            </div>
          )}

          {footer && <div className="mt-3">{footer}</div>}
        </>
      )}
    </div>
  );
}
