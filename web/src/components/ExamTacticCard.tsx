'use client';

// src/components/ExamTacticCard.tsx — "Sınav Taktikleri" için ortak kart
// bileşeni. mobile/src/components/ExamTacticCard.tsx ile aynı desen, web'in
// Tailwind + inline-hex renk kuralına uyarlanmış hali.
//
// 24 Kasım 2026 (4. tur) kullanıcı geri bildirimi: kullanıcı önce bir HTML
// mockup paylaştı, sonra o mockup'ın GERÇEKTEN render edilmiş ekran
// görüntülerini gönderip "bak direk böyle olacak gösterim, kendi kendine
// tasarım üretme" dedi -- yani bir önceki ara adımda uygulanan heuristik
// (mevcut serbest metni ayrıştırıp ok-kutusu/boşluk/numaralı madde haline
// getirme -- AŞAĞIDA fallback olarak KORUNDU) YETERSİZ bulundu, mockup'taki
// TAM yapı isteniyor. Bu yüzden:
// - `exam_tactics.breakdown` (jsonb, bkz. types/index.ts::TacticBreakdown)
//   adında YENİ, yapılandırılmış bir alan eklendi. Doluysa bu dosyadaki
//   mockup'a birebir uyan zengin görünüm (ItemCard/BreakdownExampleCard)
//   kullanılıyor: genel kural girişi + numaralı madde kartları (3'lü
//   mini-kural ızgarası / body blokları / "kelime çifti" karşılaştırma
//   kartları / kırmızı "EN SIK TUZAK" uyarı banner'ı) + her örnekte cümle
//   içindeki TEK bir "cevap kelimesi"nin koyu-lacivert/gök mavisi rozet
//   olarak vurgulanması (gizle/göster anahtarıyla).
// - `breakdown` null ise (henüz backfill edilmemiş taktikler için) AŞAĞIDA
//   KORUNAN eski heuristik görünüme (splitByNumberedMarkers/RuleText/
//   ReasoningText/boşluk algılama) düşülüyor.
// - Zengin metin, mobildekiyle AYNI 9 etiketlik markup diliyle yazılıyor
//   (bkz. MarkupText): [[q]]/[[pair]]/[[dark]]/[[ok]]/[[bad]]/[[amber]]/
//   [[b]]/[[right]]/[[wrong]].
// - "Cevapları Gizle/Göster": sayfa (exam-topic-practice) kendi global
//   anahtarını `answersVisible` prop'uyla iletiyorsa kart kendi iç
//   anahtarını GİZLER (çakışmasın diye); iletilmiyorsa (ör. exam-tactics
//   liste sayfası) kart kendi local state'ini + kendi küçük düğmesini
//   kullanır.
import { Fragment, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronRight, Eye, EyeOff, Lightbulb, Quote } from 'lucide-react';
import type { TacticBreakdown, TacticExampleItem, TacticItem } from '@/types';

type Props = {
  title: string;
  subtitle?: string | null;
  tactic: string;
  examples: string[];
  breakdown?: TacticBreakdown | null;
  badgeLabel: string;
  examplesLabel: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  footer?: ReactNode;
  importantWarningLabel?: string;
  criticalSummaryLabel?: string;
  toggleAnswersLabel?: string;
  // 24 Kasım 2026 (4. tur) -- verilmezse her zaman cevap görünür (geriye
  // dönük uyumluluk, ör. exam-tactics sayfası bu prop'u hiç geçmiyor).
  answersVisible?: boolean;
  onToggleAnswersVisible?: () => void;
};

const CAPS_RUN = /[A-ZÇĞİÖŞÜ]{2,}(?:[\s'’\-][A-ZÇĞİÖŞÜ]{2,})*/g;
const ARROW_RUN = /[a-zçğıöşü\-]+(?:\s*\/\s*[a-zçğıöşü\-]+)?\s*→\s*[a-zçğıöşü\-]+(?:\s*\/\s*[a-zçğıöşü\-]+)?/gi;
const QUOTE_RUN = /"[^"]+"/g;
const BLANK_RUN = /_{2,}/g;
const DOGRU_CEVAP_RE = /[Dd]oğru cevap[\s\S]{0,40}?"([^"]+)"/;

function pointWarningTag(text: string): string | null {
  if (text.includes('EN SIK TUZAK')) return '🔥 EN SIK TUZAK';
  if (text.includes('TUZAK')) return '⚠️ TUZAK';
  if (text.includes('DİKKAT')) return '⚠️ DİKKAT';
  return null;
}

function splitByNumberedMarkers(text: string): string[] | null {
  if (!/\(1\)/.test(text)) return null;
  const marker = /\((\d+)\)/g;
  const positions: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(text)) !== null) positions.push(m.index);
  if (positions.length < 2) return null;

  const intro = text.slice(0, positions[0]).replace(/[;,]\s*$/, '').trim();
  const parts: string[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : text.length;
    const part = text
      .slice(start, end)
      .replace(/^[;,]\s*/, '')
      .replace(/[;,]\s*$/, '')
      .trim();
    if (part) parts.push(part);
  }
  return intro ? [intro, ...parts] : parts;
}

function splitIntoPoints(text: string): string[] {
  const numbered = splitByNumberedMarkers(text);
  if (numbered && numbered.length > 1) return numbered;

  const points: string[] = [];
  let current = '';
  let quoteCount = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    current += ch;
    if (ch === '"') quoteCount++;
    const insideQuote = quoteCount % 2 === 1;
    if (!insideQuote && (ch === '.' || ch === '!' || ch === '?' || ch === ';')) {
      const next = text[i + 1];
      if (next === undefined || next === ' ') {
        const trimmed = current.trim();
        if (trimmed.length > 0) points.push(trimmed);
        current = '';
      }
    }
  }
  const rest = current.trim();
  if (rest.length > 0) points.push(rest);
  return points.length > 0 ? points : [text];
}

function parseExample(ex: string): { sentence: string | null; reasoning: string } {
  const m = ex.match(/^"(.*?)"\s*([\s\S]*)$/);
  if (m && m[1].trim().length > 0) return { sentence: m[1], reasoning: m[2] };
  return { sentence: null, reasoning: ex };
}

function parseExampleBlanks(
  sentence: string,
  reasoning: string
): { segments: { text: string; isBlank: boolean }[]; answers: string[] } | null {
  const blankMatches = [...sentence.matchAll(BLANK_RUN)];
  if (blankMatches.length === 0) return null;
  const answerMatch = reasoning.match(DOGRU_CEVAP_RE);
  if (!answerMatch) return null;
  const answers = answerMatch[1]
    .split(/\s*\/\s*/)
    .map((a) => a.trim())
    .filter(Boolean);
  if (answers.length === 0) return null;

  const segments: { text: string; isBlank: boolean }[] = [];
  let lastIndex = 0;
  blankMatches.forEach((m, i) => {
    const idx = m.index ?? 0;
    if (idx > lastIndex) segments.push({ text: sentence.slice(lastIndex, idx), isBlank: false });
    segments.push({ text: answers[i] ?? answers[answers.length - 1], isBlank: true });
    lastIndex = idx + m[0].length;
  });
  if (lastIndex < sentence.length) segments.push({ text: sentence.slice(lastIndex), isBlank: false });
  return { segments, answers };
}

// mockup'taki .highlight-dark rozeti -- light modda koyu lacivert zemin +
// beyaz yazı, dark modda tersine döner. (Fallback görünümde kullanılır.)
function DarkPill({ text }: { text: string }) {
  return (
    <span className="inline-block bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-extrabold px-1.5 rounded">
      {text}
    </span>
  );
}

// mockup'taki .highlight-answer rozeti -- koyu lacivert zemin + gök mavisi
// yazı (doğru cevap vurgusu, hem cümledeki boşlukta hem gerekçede aynı).
function AnswerPill({ text }: { text: string }) {
  return (
    <span className="inline-block font-extrabold px-1.5 rounded" style={{ backgroundColor: '#0F172A', color: '#38BDF8' }}>
      {text}
    </span>
  );
}

function PlaceholderPill() {
  return (
    <span className="inline-block bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono px-2 py-0.5 rounded">
      ＿＿＿＿＿＿＿
    </span>
  );
}

function ArrowPill({ text }: { text: string }) {
  return (
    <span className="inline-block font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
      {text}
    </span>
  );
}

// Madde/giriş metnini (CAPS vurgu + "X → Y" dönüşüm kalıpları) render eder.
function RuleText({ text }: { text: string }) {
  const COMBINED = new RegExp(`(${CAPS_RUN.source})|(${ARROW_RUN.source})`, 'g');
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = COMBINED.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    if (match[1] !== undefined) nodes.push(<DarkPill key={key++} text={match[1]} />);
    else nodes.push(<ArrowPill key={key++} text={match[2]} />);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  return <>{nodes}</>;
}

// Gerekçe metnini (CAPS vurgu + tırnaklı İngilizce kelimeler) render eder.
function ReasoningText({ text, answerWordsLower }: { text: string; answerWordsLower: string[] }) {
  const COMBINED = new RegExp(`(${CAPS_RUN.source})|(${QUOTE_RUN.source})`, 'g');
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = COMBINED.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    if (match[1] !== undefined) {
      nodes.push(<DarkPill key={key++} text={match[1]} />);
    } else {
      const quoted = match[2];
      const inner = quoted.slice(1, -1).trim().toLocaleLowerCase('tr-TR');
      nodes.push(
        answerWordsLower.includes(inner) ? <AnswerPill key={key++} text={quoted} /> : <DarkPill key={key++} text={quoted} />
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  return <>{nodes}</>;
}

const EXAMPLE_THEMES = [
  { soft: '#FFF8E8', accent: '#D97706' },
  { soft: '#E6F1FB', accent: '#378ADD' },
  { soft: '#EEEDFE', accent: '#534AB7' },
  { soft: '#EAF3DE', accent: '#3B6D11' },
];

// ─── Markup ayrıştırıcı (sadece breakdown içeriğinde kullanılır) ────────
type MarkTag = 'q' | 'pair' | 'dark' | 'ok' | 'bad' | 'amber' | 'b' | 'right' | 'wrong';
const MARK_RE = /\[\[(q|pair|dark|ok|bad|amber|b|right|wrong)\]\]([\s\S]*?)\[\[\/\1\]\]/g;

function parseMarkup(text: string): { text: string; tag: MarkTag | null }[] {
  const parts: { text: string; tag: MarkTag | null }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  MARK_RE.lastIndex = 0;
  while ((match = MARK_RE.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push({ text: text.slice(lastIndex, match.index), tag: null });
    parts.push({ text: match[2], tag: match[1] as MarkTag });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), tag: null });
  return parts;
}

function MarkupText({ text }: { text: string }) {
  const parts = parseMarkup(text);
  return (
    <>
      {parts.map((p, i) => {
        switch (p.tag) {
          case 'q':
            return (
              <span key={i} className="inline-block bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 font-semibold font-mono text-[0.92em] px-1.5 rounded">
                {p.text}
              </span>
            );
          case 'pair': {
            const [from, to] = p.text.split('->');
            return (
              <span key={i} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-800 font-mono font-bold text-[0.92em] px-2 py-0.5 rounded-md">
                <span className="text-gray-900 dark:text-slate-100">{from}</span>
                <span style={{ color: '#D97706' }}>→</span>
                <span style={{ color: '#3B6D11' }}>{to}</span>
              </span>
            );
          }
          case 'dark':
            return <DarkPill key={i} text={p.text} />;
          case 'ok':
            return (
              <span key={i} className="inline-block font-extrabold px-1.5 rounded" style={{ backgroundColor: '#EAF3DE', color: '#3B6D11' }}>
                {p.text}
              </span>
            );
          case 'bad':
            return (
              <span key={i} className="inline-block font-semibold px-1.5 rounded bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400">
                {p.text}
              </span>
            );
          case 'amber':
            return (
              <span key={i} className="font-extrabold" style={{ color: '#D97706' }}>
                {p.text}
              </span>
            );
          case 'b':
            return (
              <span key={i} className="font-extrabold">
                {p.text}
              </span>
            );
          case 'right':
            return <AnswerPill key={i} text={p.text} />;
          case 'wrong':
            return (
              <span key={i} className="inline-block bg-slate-900 dark:bg-slate-950 font-extrabold px-1.5 rounded text-rose-400">
                {p.text}
              </span>
            );
          default:
            return <Fragment key={i}>{p.text}</Fragment>;
        }
      })}
    </>
  );
}

function ItemCard({ item, index }: { item: TacticItem; index: number }) {
  const warning = !!item.is_warning;
  return (
    <div
      className={`rounded-xl border p-3 ${
        warning ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40' : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold text-white"
          style={{ backgroundColor: warning ? '#dc2626' : '#D97706' }}
        >
          {index + 1}
        </span>
        {warning && item.warning_label && (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-white px-2 py-0.5 rounded bg-red-600 uppercase tracking-wide">
            {item.warning_label}
          </span>
        )}
        <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-sm">{item.heading}</h3>
        {item.badge && (
          <span className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded">
            {item.badge}
          </span>
        )}
      </div>

      {item.sub_rules && item.sub_rules.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5">
          {item.sub_rules.map((sr, i) => (
            <div key={i} className="bg-gray-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700 text-xs">
              <div className="text-gray-600 dark:text-slate-400 mb-1.5 leading-snug">
                <MarkupText text={sr.condition} />
              </div>
              <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 font-mono font-bold px-2 py-1 rounded border border-gray-100 dark:border-slate-700">
                <span className="text-gray-900 dark:text-slate-100">{sr.from}</span>
                <span style={{ color: '#D97706' }}>→</span>
                <span style={{ color: '#3B6D11' }}>{sr.to}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {item.body && item.body.length > 0 && (
        <div className="flex flex-col gap-2 mt-2.5">
          {item.body.map((block, i) =>
            block.type === 'example_check' ? (
              <div key={i} className="bg-gray-50 dark:bg-slate-800/60 rounded-lg p-2 text-xs text-gray-600 dark:text-slate-400 flex flex-wrap items-center gap-1">
                <span className="font-bold" style={{ color: '#3B6D11' }}>
                  ✓ Örnek:
                </span>
                <span className="text-gray-800 dark:text-slate-200">"{block.correct}"</span>
                <span className="text-gray-300 dark:text-slate-600">|</span>
                <span className="font-bold text-red-600 dark:text-red-400">✗ Hata:</span>
                <span>({block.wrong_note})</span>
              </div>
            ) : (
              <div key={i} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-2.5 text-sm leading-relaxed text-gray-800 dark:text-slate-200">
                <MarkupText text={block.text} />
              </div>
            )
          )}
        </div>
      )}

      {item.meaning_pairs && item.meaning_pairs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2.5">
          {item.meaning_pairs.map((pair, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700">
              {pair.map((entry, j) => (
                <div
                  key={j}
                  className={`flex items-center justify-between text-sm ${j > 0 ? 'mt-1.5 pt-1.5 border-t border-gray-100 dark:border-slate-800' : ''}`}
                >
                  <span className={`font-extrabold font-mono ${entry.variant === 'wrong' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-slate-100'}`}>
                    {entry.word}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-bold ${
                      entry.variant === 'wrong' ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    {entry.meaning}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {warning && item.warning_text && (
        <div className="mt-2.5 rounded-lg p-2.5 text-xs flex items-start gap-2 border" style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
          <p style={{ color: '#92400E' }}>
            <span className="font-extrabold">Önemli Uyarı: </span>
            <MarkupText text={item.warning_text} />
          </p>
        </div>
      )}
    </div>
  );
}

function BreakdownExampleCard({ example, index, answersVisible }: { example: TacticExampleItem; index: number; answersVisible: boolean }) {
  const theme = EXAMPLE_THEMES[index % EXAMPLE_THEMES.length];
  const idx = example.sentence.indexOf(example.answer_word);
  const before = idx >= 0 ? example.sentence.slice(0, idx) : example.sentence;
  const after = idx >= 0 ? example.sentence.slice(idx + example.answer_word.length) : '';

  return (
    <div className="flex items-start gap-2.5 rounded-xl border p-3" style={{ backgroundColor: theme.soft, borderColor: theme.accent + '40' }}>
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 text-[10px] font-extrabold text-white"
        style={{ backgroundColor: theme.accent }}
      >
        {index + 1}
      </span>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex items-start gap-1.5 rounded-lg p-2 text-sm font-semibold text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-900">
          <Quote className="w-3 h-3 shrink-0 mt-1" style={{ color: theme.accent }} />
          <span>
            {before}
            {idx >= 0 && (answersVisible ? <AnswerPill text={example.answer_word} /> : <PlaceholderPill />)}
            {after}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-gray-700 dark:text-slate-300">
          <MarkupText text={example.reasoning} />
        </p>
      </div>
    </div>
  );
}

export function ExamTacticCard({
  title,
  subtitle,
  tactic,
  examples,
  breakdown,
  badgeLabel,
  examplesLabel,
  collapsible = true,
  defaultExpanded,
  footer,
  importantWarningLabel = 'Önemli Uyarı',
  criticalSummaryLabel = 'Kritik Gramer Özeti',
  toggleAnswersLabel = 'Cevapları Gizle/Göster',
  answersVisible: answersVisibleProp,
  onToggleAnswersVisible,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? !collapsible);
  const [localAnswersVisible, setLocalAnswersVisible] = useState(true);
  const isControlledExternally = answersVisibleProp !== undefined;
  const answersVisible = answersVisibleProp ?? localAnswersVisible;
  const toggleAnswers = onToggleAnswersVisible ?? (() => setLocalAnswersVisible((v) => !v));

  const points = splitIntoPoints(tactic);
  const introPoint = points.length > 1 ? points[0] : null;
  const itemPoints = points.length > 1 ? points.slice(1) : points;

  return (
    <div
      className="rounded-2xl border bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 p-4"
      style={{ borderLeftWidth: 4, borderLeftColor: '#D97706' }}
    >
      <button
        type="button"
        onClick={() => collapsible && setExpanded((v) => !v)}
        className={`w-full flex items-center gap-2.5 text-left ${collapsible ? '' : 'cursor-default'}`}
      >
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
          <Lightbulb className="w-3.5 h-3.5" style={{ color: '#D97706' }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-block text-[10px] font-extrabold uppercase tracking-wide text-white px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#D97706' }}
            >
              {badgeLabel}
            </span>
            {breakdown && (
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                {criticalSummaryLabel}
              </span>
            )}
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
          {breakdown ? (
            <>
              <div className="rounded-xl p-3 mt-3 text-sm leading-relaxed text-gray-800 dark:text-slate-200" style={{ backgroundColor: '#FFF8E8' }}>
                <MarkupText text={breakdown.intro} />
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {breakdown.items.map((item, i) => (
                  <ItemCard key={i} item={item} index={i} />
                ))}
              </div>

              {breakdown.examples.length > 0 && (
                <div className="mt-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-gray-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#378ADD' }} />
                      {examplesLabel}
                    </span>
                    {!isControlledExternally && (
                      <button
                        type="button"
                        onClick={toggleAnswers}
                        className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        {answersVisible ? <Eye className="w-3.5 h-3.5" style={{ color: '#D97706' }} /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                        {toggleAnswersLabel}
                      </button>
                    )}
                  </div>
                  {breakdown.examples.map((ex, i) => (
                    <BreakdownExampleCard key={i} example={ex} index={i} answersVisible={answersVisible} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {introPoint && (
                <div className="rounded-xl p-3 mt-3 text-sm leading-relaxed text-gray-800 dark:text-slate-200" style={{ backgroundColor: '#FFF8E8' }}>
                  <RuleText text={introPoint} />
                </div>
              )}

              <div className={`flex flex-col gap-2 ${introPoint ? 'mt-2' : 'mt-3'}`}>
                {itemPoints.map((point, i) => {
                  const tag = pointWarningTag(point);
                  let mainText = point;
                  let bannerText: string | null = null;
                  if (tag) {
                    const dashIdx = point.lastIndexOf('—');
                    if (dashIdx > 15 && point.length - dashIdx > 15) {
                      mainText = point.slice(0, dashIdx).trim();
                      bannerText = point.slice(dashIdx + 1).trim();
                    }
                  }
                  return (
                    <div
                      key={i}
                      className={`rounded-xl p-3 ${tag ? 'border-2' : 'border bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'}`}
                      style={tag ? { backgroundColor: '#FEF3C7', borderColor: '#D97706' } : undefined}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className="shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-extrabold text-white mt-0.5"
                          style={{ backgroundColor: '#D97706' }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 flex flex-col gap-1.5">
                          {tag && (
                            <span className="inline-block self-start text-[10px] font-extrabold uppercase tracking-wide text-white px-2 py-0.5 rounded bg-red-600">
                              {tag}
                            </span>
                          )}
                          <p className="text-sm leading-relaxed text-gray-800 dark:text-slate-200">
                            <RuleText text={mainText} />
                          </p>
                          {bannerText && (
                            <div
                              className="flex items-start gap-2 rounded-lg p-2.5 text-xs font-medium border"
                              style={{ backgroundColor: '#FEF3C7', borderColor: 'rgba(217,119,6,0.3)', color: '#78350F' }}
                            >
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                              <span>
                                <strong>{importantWarningLabel}:</strong> <RuleText text={bannerText} />
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {examples.length > 0 && (
                <div className="mt-4 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-gray-700 dark:text-slate-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#378ADD' }} />
                      {examplesLabel}
                    </span>
                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                      {examples.length}
                    </span>
                  </div>
                  {examples.map((ex, i) => {
                    const { sentence, reasoning } = parseExample(ex);
                    const theme = EXAMPLE_THEMES[i % EXAMPLE_THEMES.length];
                    const blanks = sentence ? parseExampleBlanks(sentence, reasoning) : null;
                    const answerWordsLower = (blanks?.answers ?? []).map((a) => a.toLocaleLowerCase('tr-TR'));
                    return (
                      <div key={i} className="flex items-start gap-2.5 rounded-xl border p-3" style={{ backgroundColor: theme.soft, borderColor: theme.accent + '40' }}>
                        <span
                          className="shrink-0 w-[20px] h-[20px] rounded-full flex items-center justify-center mt-0.5 text-[10px] font-extrabold text-white"
                          style={{ backgroundColor: theme.accent }}
                        >
                          {i + 1}
                        </span>
                        <div className="flex-1 flex flex-col gap-1.5">
                          {sentence && (
                            <div className="flex items-start gap-1.5 rounded-lg p-2 text-xs italic font-semibold text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                              <Quote className="w-3 h-3 shrink-0 mt-0.5" style={{ color: theme.accent }} />
                              <span>
                                {blanks
                                  ? blanks.segments.map((seg, si) =>
                                      seg.isBlank ? (
                                        answersVisible ? <AnswerPill key={si} text={seg.text} /> : <PlaceholderPill key={si} />
                                      ) : (
                                        <span key={si}>{seg.text}</span>
                                      )
                                    )
                                  : sentence}
                              </span>
                            </div>
                          )}
                          <p className="text-xs leading-relaxed text-gray-700 dark:text-slate-300">
                            <ReasoningText text={reasoning} answerWordsLower={answerWordsLower} />
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {footer && <div className="mt-3">{footer}</div>}
        </>
      )}
    </div>
  );
}
