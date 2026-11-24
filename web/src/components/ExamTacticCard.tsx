'use client';

// src/components/ExamTacticCard.tsx — "Sınav Taktikleri" için ortak kart
// bileşeni. mobile/src/components/ExamTacticCard.tsx ile aynı desen, web'in
// Tailwind + inline-hex renk kuralına uyarlanmış hali.
//
// 23 Kasım 2026 (2. tur) kullanıcı geri bildirimi: "bu bölüm sadece genel
// başlıklardan oluşmalı, uzun uzun yazılar burada olmamalı, başlığa
// tıklayınca ayrıntılı açıklamaları görmeliyim ... açıklamalar daha çok
// renkli halde gösterilmeli, sadece sarı renk içinde metin olmamalı,
// açıklamadaki her bir ayrıntı farklı renkler üzerinde yazılmalı ...
// örneklerde neden o yapı/kelimeler kullanıldı güzelce açıklanmalı".
//
// Bu turda değişenler:
// - Kart artık HER ZAMAN daraltılabilir (collapsible varsayılan true) --
//   liste sadece başlığı gösterir, tıklayınca ayrıntı yerinde açılır.
//   (İstisna: pratik sayfasındaki banner collapsible={false} geçerek açık
//   kalmaya devam eder, çünkü o an zaten o taktiğe bakılıyordur.)
// - Tek renkli (amber) gövde yerine çok renkli bölümler: taktik kuralı
//   mor (#534AB7/#EEEDFE) zeminde, örnek cümle mavi (#378ADD/#E6F1FB)
//   zeminde, örneğin Türkçe gerekçesi yeşil (#3B6D11/#EAF3DE) zeminde
//   gösterilir. Bu üç bölümün içindeki BÜYÜK HARFLİ vurgu kelimeleri
//   otomatik olarak amber/kalın renklendirilir.
// - Örnek cümle + gerekçe, içerikteki "\"İngilizce cümle.\" Türkçe
//   gerekçe..." kalıbından ayrıştırılıp iki ayrı renkli kutuya bölünüyor.
import { Fragment, useState, type ReactNode } from 'react';
import { ChevronRight, Lightbulb, Quote } from 'lucide-react';

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

const CAPS_RUN = /[A-ZÇĞİÖŞÜ]{2,}(?:[\s'’\-][A-ZÇĞİÖŞÜ]{2,})*/g;

function Highlighted({ text, highlightColor }: { text: string; highlightColor: string }) {
  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CAPS_RUN.lastIndex = 0;
  while ((match = CAPS_RUN.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ text: text.slice(lastIndex, match.index), highlight: false });
    parts.push({ text: match[0], highlight: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), highlight: false });

  return (
    <>
      {parts.map((p, i) =>
        p.highlight ? (
          <span key={i} style={{ color: highlightColor, fontWeight: 700 }}>
            {p.text}
          </span>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        )
      )}
    </>
  );
}

function parseExample(ex: string): { sentence: string | null; reasoning: string } {
  const m = ex.match(/^"(.*?)"\s*([\s\S]*)$/);
  if (m && m[1].trim().length > 0) return { sentence: m[1], reasoning: m[2] };
  return { sentence: null, reasoning: ex };
}

export function ExamTacticCard({
  title,
  subtitle,
  tactic,
  examples,
  badgeLabel,
  examplesLabel,
  collapsible = true,
  defaultExpanded,
  footer,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? !collapsible);

  return (
    <div
      className="rounded-2xl border bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-4"
      style={{ borderLeftWidth: 4, borderLeftColor: '#534AB7' }}
    >
      <button
        type="button"
        onClick={() => collapsible && setExpanded((v) => !v)}
        className={`w-full flex items-center gap-2.5 text-left ${collapsible ? '' : 'cursor-default'}`}
      >
        <span
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#EEEDFE' }}
        >
          <Lightbulb className="w-3.5 h-3.5" style={{ color: '#534AB7' }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wide" style={{ color: '#534AB7' }}>
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
          <div
            className="rounded-xl p-3 mt-3 text-sm leading-relaxed text-gray-800"
            style={{ backgroundColor: '#EEEDFE' }}
          >
            <Highlighted text={tactic} highlightColor="#92610E" />
          </div>

          {examples.length > 0 && (
            <div className="mt-3 flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                {examplesLabel}
              </span>
              {examples.map((ex, i) => {
                const { sentence, reasoning } = parseExample(ex);
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center mt-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: '#534AB7' }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 flex flex-col gap-1.5">
                      {sentence && (
                        <div
                          className="flex items-start gap-1.5 rounded-lg p-2 text-xs italic text-gray-800"
                          style={{ backgroundColor: '#E6F1FB' }}
                        >
                          <Quote className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#378ADD' }} />
                          <span>{sentence}</span>
                        </div>
                      )}
                      <div
                        className="rounded-lg p-2 text-xs leading-relaxed text-gray-700"
                        style={{ backgroundColor: '#EAF3DE' }}
                      >
                        <Highlighted text={reasoning} highlightColor="#92610E" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {footer && <div className="mt-3">{footer}</div>}
        </>
      )}
    </div>
  );
}
