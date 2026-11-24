// src/components/ExamTacticCard.tsx — "Sınav Taktikleri" için ortak kart
// bileşeni.
//
// 23 Kasım 2026 (2. tur) kullanıcı geri bildirimi: "bu bölüm sadece genel
// başlıklardan oluşmalı, uzun uzun yazılar burada olmamalı, başlığa
// tıklayınca ayrıntılı açıklamaları görmeliyim ... açıklamalar daha çok
// renkli halde gösterilmeli ... örneklerde neden o yapı/kelimeler
// kullanıldı güzelce açıklanmalı". -> kart daraltılabilir yapıldı, çok
// renkli bölümler eklendi (bkz. git geçmişi).
//
// 24 Kasım 2026 (3. tur) kullanıcı geri bildirimi: "renklendirme güzel
// olmuş ama yukarıdaki alanda çok yazı var ve sıkışık görünüyor, burayı
// daha okunaklı, madde madde hale getirmen lazım." -> taktik kuralı
// madde madde bölündü (splitIntoPoints).
//
// 24 Kasım 2026 (4. tur) kullanıcı geri bildirimi: kullanıcı önce bir HTML
// mockup paylaştı, sonra o mockup'ın RENDER EDİLMİŞ ekran görüntülerini
// gönderip "bak direk böyle olacak gösterim, kendi kendine tasarım
// üretme" dedi -- yani bir önceki ara adımda uygulanan heuristik (mevcut
// serbest metni madde/ok-kutusu/boşluk olarak ayrıştırma) YETERSİZ
// bulundu, mockup'taki TAM yapı isteniyor. Bu yüzden:
// - `exam_tactics.breakdown` (jsonb, bkz. api/types.ts::TacticBreakdown)
//   adında YENİ, yapılandırılmış bir alan eklendi. Doluysa (94 taktikten
//   şimdilik 1'i backfill edildi) bu dosyadaki mockup'a birebir uyan zengin
//   görünüm (ItemCard/BreakdownExampleCard, bkz. aşağısı) kullanılıyor:
//   genel kural girişi + numaralı madde kartları (bazılarının 3'lü
//   mini-kural ızgarası, bazılarının "kelime çifti" karşılaştırma
//   kartları, bazılarının kırmızı "EN SIK TUZAK" uyarı banner'ı) + her
//   örnekte cümle içindeki TEK bir "cevap kelimesi"nin koyu rozet olarak
//   vurgulanması (gizle/göster anahtarıyla).
// - `breakdown` null ise (henüz backfill edilmemiş taktikler için) AŞAĞIDA
//   KORUNAN eski davranışa (düz `tactic`/`examples_tr` metninden
//   splitIntoPoints ile madde madde bölünmüş, "DİKKAT"/"TUZAK" geçen
//   maddelerin otomatik kırmızı temaya dönüştüğü basit görünüm) düşülüyor
//   -- hiçbir taktik boş/bozuk görünmesin diye.
// - Zengin metin, 9 etiketlik küçük bir markup diliyle yazılıyor (bkz.
//   MarkupText): [[q]]..[[/q]] (ince kalıp rozeti), [[pair]]a->b[[/pair]]
//   (ok kutusu "a → b"), [[dark]]..[[/dark]] (koyu güçlü-vurgu rozeti),
//   [[ok]]..[[/ok]] (yeşil doğru rozeti), [[bad]]..[[/bad]] (kırmızı
//   yanlış rozeti), [[amber]]..[[/amber]] (düz amber renkli kalın metin),
//   [[b]]..[[/b]] (düz kalın metin), [[right]]..[[/right]] / [[wrong]]..
//   [[/wrong]] (SADECE örnek gerekçelerinde: doğru/yanlış kelimenin koyu
//   rozet + mavi/pembe metin hali).
// - "Cevapları Gizle/Göster": pratik ekranı (exam-topic-practice.tsx) artık
//   SAYFA seviyesinde tek bir global anahtar sağlıyor ve `answersVisible`
//   prop'uyla karta iletiyor -- bu durumda kart kendi iç anahtarını
//   GİZLER (çakışmasın diye). `answersVisible` dışarıdan verilmezse (ör.
//   exam-tactics.tsx liste ekranı, StudyProgramCard -- orada sayfa
//   seviyesinde bir anahtar yok) kart kendi local state'ini kullanır ve
//   örnekler bölümünün yanında kendi küçük gizle/göster düğmesini
//   gösterir.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, ChevronRight, Eye, EyeOff, Lightbulb, Quote } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';
import type { TacticBreakdown, TacticExampleItem, TacticItem } from '@/api/types';

type Props = {
  title: string;
  subtitle?: string | null;
  tactic: string;
  examples: string[];
  breakdown?: TacticBreakdown | null;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  footer?: React.ReactNode;
  // 24 Kasım 2026 (4. tur) -- dışarıdan (pratik ekranından) kontrol
  // edilebilen "Cevapları Gizle/Göster" durumu. Verilmezse kart kendi
  // local state'ini kullanır ve kendi iç anahtarını gösterir.
  answersVisible?: boolean;
  onToggleAnswersVisible?: () => void;
};

// Türkçe büyük harfli vurgu kelimelerini (ör. "BAŞLANGIÇ NOKTASI", "YDS'NİN")
// bulup ayrı render edebilmek için metni parçalara ayırır.
const CAPS_RUN = /[A-ZÇĞİÖŞÜ]{2,}(?:[\s'’\-][A-ZÇĞİÖŞÜ]{2,})*/g;

// 24 Kasım 2026 (4. tur) -- bir maddenin içeriği zaten "DİKKAT"/"TUZAK" gibi
// büyük harfli bir uyarı kelimesi içeriyorsa, o madde kartını otomatik
// olarak kırmızı/tehlike temasına çevirir (mockup'taki "EN SIK TUZAK"
// banner'ının veri tabanlı karşılığı -- yeni içerik yazmaya gerek kalmadan).
// NOT: sadece `breakdown` yokken (fallback görünümde) kullanılır.
function isWarningPoint(text: string): boolean {
  return text.includes('DİKKAT') || text.includes('TUZAK') || text.includes('KARIŞTIRMAYIN');
}

function HighlightedText({
  text,
  style,
  pillBg,
  pillColor,
}: {
  text: string;
  style?: any;
  pillBg: string;
  pillColor: string;
}) {
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
    <Text style={style}>
      {parts.map((p, i) =>
        p.highlight ? (
          <Text
            key={i}
            style={{
              backgroundColor: pillBg,
              color: pillColor,
              fontWeight: '800',
              paddingHorizontal: 4,
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {' '}
            {p.text}{' '}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        )
      )}
    </Text>
  );
}

// "\"İngilizce örnek cümle.\" Türkçe gerekçe..." kalıbını ayrıştırır.
// Kalıba uymazsa sentence=null döner, tüm metin gerekçe olarak gösterilir.
function parseExample(ex: string): { sentence: string | null; reasoning: string } {
  const m = ex.match(/^"(.*?)"\s*([\s\S]*)$/);
  if (m && m[1].trim().length > 0) return { sentence: m[1], reasoning: m[2] };
  return { sentence: null, reasoning: ex };
}

// Taktik metnini okunabilir maddelere böler. Tırnak İÇİNDEKİ noktalama
// işaretleri (örnek İngilizce cümlelerin kendi noktaları/ünlemleri) madde
// sonu SAYILMAZ -- sadece tırnak DIŞINDAKİ cümle sonu işaretlerinden
// (. ! ? ;) sonra, bir boşluk veya metin sonu geliyorsa bölünür. Hiç
// bölünemiyorsa (kısa/tek cümlelik metin) tüm metin tek madde olarak
// döner.
function splitIntoPoints(text: string): string[] {
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

// ─── Markup ayrıştırıcı (sadece breakdown içeriğinde kullanılır) ────────
// [[tag]]içerik[[/tag]] kalıplarını bulup parça parça render eder.
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

function MarkupText({ text, style, c }: { text: string; style?: any; c: ReturnType<typeof useThemeColors> }) {
  const parts = parseMarkup(text);
  return (
    <Text style={style}>
      {parts.map((p, i) => {
        if (p.tag === 'q') {
          return (
            <Text key={i} style={{ backgroundColor: c.border, color: c.text, fontWeight: '700', paddingHorizontal: 4, borderRadius: 4 }}>
              {' '}
              {p.text}{' '}
            </Text>
          );
        }
        if (p.tag === 'pair') {
          const [from, to] = p.text.split('->');
          return (
            <Text key={i} style={{ backgroundColor: c.border, color: c.text, fontWeight: '700', paddingHorizontal: 4, borderRadius: 4 }}>
              {' '}
              {from} <Text style={{ color: c.amber }}>→</Text> <Text style={{ color: c.success, fontWeight: '800' }}>{to}</Text>{' '}
            </Text>
          );
        }
        if (p.tag === 'dark') {
          return (
            <Text key={i} style={{ backgroundColor: c.text, color: c.surface, fontWeight: '800', paddingHorizontal: 4, borderRadius: 4 }}>
              {' '}
              {p.text}{' '}
            </Text>
          );
        }
        if (p.tag === 'ok') {
          return (
            <Text key={i} style={{ backgroundColor: c.successSoft, color: c.success, fontWeight: '800', paddingHorizontal: 4, borderRadius: 4 }}>
              {' '}
              {p.text}{' '}
            </Text>
          );
        }
        if (p.tag === 'bad') {
          return (
            <Text key={i} style={{ backgroundColor: c.dangerSoft, color: c.danger, fontWeight: '700', paddingHorizontal: 4, borderRadius: 4 }}>
              {' '}
              {p.text}{' '}
            </Text>
          );
        }
        if (p.tag === 'amber') {
          return (
            <Text key={i} style={{ color: c.amber, fontWeight: '800' }}>
              {p.text}
            </Text>
          );
        }
        if (p.tag === 'b') {
          return (
            <Text key={i} style={{ fontWeight: '800' }}>
              {p.text}
            </Text>
          );
        }
        if (p.tag === 'right') {
          return (
            <Text key={i} style={{ backgroundColor: c.text, color: c.primary, fontWeight: '800', paddingHorizontal: 4, borderRadius: 4 }}>
              {' '}
              {p.text}{' '}
            </Text>
          );
        }
        if (p.tag === 'wrong') {
          return (
            <Text key={i} style={{ backgroundColor: c.text, color: c.danger, fontWeight: '800', paddingHorizontal: 4, borderRadius: 4 }}>
              {' '}
              {p.text}{' '}
            </Text>
          );
        }
        return <Text key={i}>{p.text}</Text>;
      })}
    </Text>
  );
}

// ─── breakdown.items içindeki bir maddeyi render eder ──────────────────
function ItemCard({ item, index, c }: { item: TacticItem; index: number; c: ReturnType<typeof useThemeColors> }) {
  const warning = !!item.is_warning;
  return (
    <View
      style={[
        styles.itemCard,
        {
          backgroundColor: warning ? c.dangerSoft : c.surface,
          borderColor: warning ? c.danger : c.border,
          borderWidth: warning ? 1.5 : 1,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
        <View style={[styles.itemNumber, { backgroundColor: warning ? c.danger : c.amber }]}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{index + 1}</Text>
        </View>
        {warning && item.warning_label && (
          <View style={[styles.warningLabelPill, { backgroundColor: c.danger }]}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{item.warning_label}</Text>
          </View>
        )}
        <Text style={[styles.itemHeading, { color: c.text }]}>{item.heading}</Text>
        {item.badge && (
          <View style={[styles.badgeGray, { backgroundColor: c.border }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: c.textMuted }}>{item.badge}</Text>
          </View>
        )}
      </View>

      {/* 3'lü mini-kural ızgarası (ör. "-y" -> "-ily") -- RN'de dar ekranda
          alt alta dizilir (web'deki grid-cols-1 sm:grid-cols-3'ün mobil
          karşılığı). */}
      {item.sub_rules && item.sub_rules.length > 0 && (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {item.sub_rules.map((sr, i) => (
            <View key={i} style={[styles.subRuleBox, { backgroundColor: c.background, borderColor: c.border }]}>
              <MarkupText text={sr.condition} style={{ fontSize: 11.5, color: c.textSecondary, marginBottom: 6 }} c={c} />
              <View style={[styles.pairBox, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={{ fontWeight: '700', color: c.text }}>{sr.from}</Text>
                <Text style={{ color: c.amber, fontWeight: '700' }}> → </Text>
                <Text style={{ fontWeight: '800', color: c.success }}>{sr.to}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* body blokları (serbest metin kutuları + ✓/✗ örnek-hata satırı) */}
      {item.body && item.body.length > 0 && (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {item.body.map((block, i) =>
            block.type === 'example_check' ? (
              <View key={i} style={[styles.exampleCheckBox, { backgroundColor: c.background }]}>
                <Text style={{ fontSize: 11.5, color: c.success, fontWeight: '700' }}>✓ Örnek: </Text>
                <Text style={{ fontSize: 11.5, color: c.text }}>"{block.correct}"</Text>
                <Text style={{ fontSize: 11.5, color: c.textMuted }}> | </Text>
                <Text style={{ fontSize: 11.5, color: c.danger, fontWeight: '700' }}>✗ Hata: </Text>
                <Text style={{ fontSize: 11.5, color: c.textMuted }}>({block.wrong_note})</Text>
              </View>
            ) : (
              <View key={i} style={[styles.textBlockBox, { backgroundColor: c.surface, borderColor: c.border }]}>
                <MarkupText text={block.text} style={{ fontSize: 13, lineHeight: 19, color: c.text }} c={c} />
              </View>
            )
          )}
        </View>
      )}

      {/* "kelime çifti" karşılaştırma kartları (ör. hard/hardly, late/lately) */}
      {item.meaning_pairs && item.meaning_pairs.length > 0 && (
        <View style={{ marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {item.meaning_pairs.map((pair, i) => (
            <View key={i} style={[styles.meaningPairCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              {pair.map((entry, j) => (
                <View
                  key={j}
                  style={[
                    styles.meaningPairRow,
                    j > 0 && { borderTopWidth: 1, borderTopColor: c.border, marginTop: 6, paddingTop: 6 },
                  ]}
                >
                  <Text style={{ fontWeight: '800', color: entry.variant === 'wrong' ? c.danger : c.text }}>{entry.word}</Text>
                  <View style={[styles.metaPill, { backgroundColor: entry.variant === 'wrong' ? c.dangerSoft : c.border }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: entry.variant === 'wrong' ? c.danger : c.textMuted }}>
                      {entry.meaning}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* Uyarı banner'ı (sadece is_warning + warning_text olan maddelerde) */}
      {warning && item.warning_text && (
        <View style={[styles.warningBanner, { backgroundColor: c.warningSoft, borderColor: c.amber }]}>
          <AlertTriangle color={c.amber} size={16} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: c.warning, fontSize: 12.5 }}>Önemli Uyarı: </Text>
            <MarkupText text={item.warning_text} style={{ fontSize: 12.5, lineHeight: 18, color: c.warning }} c={c} />
          </View>
        </View>
      )}
    </View>
  );
}

// ─── breakdown.examples içindeki bir örneği render eder ────────────────
const EXAMPLE_THEME_KEYS = ['warningSoft', 'primarySoft', 'accentSoft', 'successSoft'] as const;
const EXAMPLE_ACCENT_KEYS = ['amber', 'primary', 'accent', 'success'] as const;

function BreakdownExampleCard({
  example,
  index,
  c,
  answersVisible,
}: {
  example: TacticExampleItem;
  index: number;
  c: ReturnType<typeof useThemeColors>;
  answersVisible: boolean;
}) {
  const soft = c[EXAMPLE_THEME_KEYS[index % EXAMPLE_THEME_KEYS.length]];
  const accent = c[EXAMPLE_ACCENT_KEYS[index % EXAMPLE_ACCENT_KEYS.length]];

  // Cümleyi answer_word'e göre üç parçaya böler: öncesi / kelime / sonrası.
  const idx = example.sentence.indexOf(example.answer_word);
  const before = idx >= 0 ? example.sentence.slice(0, idx) : example.sentence;
  const after = idx >= 0 ? example.sentence.slice(idx + example.answer_word.length) : '';

  return (
    <View style={[styles.exampleCard, { backgroundColor: soft, borderColor: accent }]}>
      <View style={[styles.exampleNumber, { backgroundColor: accent, marginTop: 2 }]}>
        <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={[styles.sentenceBox, { backgroundColor: c.surface }]}>
          <Quote color={accent} size={12} style={{ marginTop: 2 }} />
          <Text style={[styles.sentenceText, { color: c.text }]}>
            {before}
            {idx >= 0 ? (
              answersVisible ? (
                <Text style={{ backgroundColor: c.text, color: c.primary, fontWeight: '800', paddingHorizontal: 5, borderRadius: 4 }}>
                  {' '}
                  {example.answer_word}{' '}
                </Text>
              ) : (
                <Text style={{ backgroundColor: c.border, color: 'transparent', fontWeight: '800', paddingHorizontal: 5, borderRadius: 4 }}>
                  {'_'.repeat(Math.max(example.answer_word.length, 4))}
                </Text>
              )
            ) : null}
            {after}
          </Text>
        </View>
        <MarkupText text={example.reasoning} style={{ fontSize: 12.5, lineHeight: 18.5, color: c.textSecondary }} c={c} />
      </View>
    </View>
  );
}

export function ExamTacticCard({
  title,
  subtitle,
  tactic,
  examples,
  breakdown,
  collapsible = true,
  defaultExpanded,
  footer,
  answersVisible: answersVisibleProp,
  onToggleAnswersVisible,
}: Props) {
  const { et } = useLocale();
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(defaultExpanded ?? !collapsible);
  const [localAnswersVisible, setLocalAnswersVisible] = useState(true);
  // Dışarıdan (pratik sayfasından) bir değer verilmişse o kullanılır ve
  // kartın kendi iç anahtarı GİZLENİR (sayfa zaten kendi anahtarını
  // gösteriyor). Verilmemişse (ör. taktikler liste sayfası,
  // StudyProgramCard) kart kendi local state'ini + kendi küçük anahtarını
  // kullanır.
  const isControlledExternally = answersVisibleProp !== undefined;
  const answersVisible = answersVisibleProp ?? localAnswersVisible;
  const toggleAnswers = onToggleAnswersVisible ?? (() => setLocalAnswersVisible((v) => !v));

  function handleHeaderPress() {
    if (collapsible) setExpanded((v) => !v);
  }

  const points = splitIntoPoints(tactic);
  const introPoint = points.length > 1 ? points[0] : null;
  const itemPoints = points.length > 1 ? points.slice(1) : points;

  // Örnekler dönüşümlü renk teması (amber/mavi/mor/yeşil) -- mockup'taki
  // her örneğin kendi rengindeki büyük kart görünümü (fallback görünümde
  // kullanılır).
  const exampleThemes = [
    { soft: c.warningSoft, accent: c.amber },
    { soft: c.primarySoft, accent: c.primary },
    { soft: c.accentSoft, accent: c.accent },
    { soft: c.successSoft, accent: c.success },
  ];

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: c.amber }]}>
      <Pressable
        onPress={handleHeaderPress}
        disabled={!collapsible}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <View style={[styles.iconBadge, { backgroundColor: c.warningSoft }]}>
          <Lightbulb color={c.amber} size={15} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <View style={[styles.badgePill, { backgroundColor: c.amber }]}>
              <Text style={styles.badgePillText}>{et.examTacticsBadgeLabel}</Text>
            </View>
            {breakdown && (
              <View style={[styles.badgePillSoft, { backgroundColor: c.warningSoft }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: c.warning }}>{et.examTacticsCriticalSummaryLabel}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          {subtitle && <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>}
        </View>
        {collapsible && (
          <ChevronRight
            color={c.textMuted}
            size={18}
            style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
          />
        )}
      </Pressable>

      {expanded && (
        <>
          {breakdown ? (
            <>
              {/* Genel kural giriş paragrafı -- markup destekli. */}
              <View style={[styles.introBox, { backgroundColor: c.warningSoft }]}>
                <MarkupText text={breakdown.intro} style={[styles.introText, { color: c.text }]} c={c} />
              </View>

              {/* Numaralı madde kartları (3'lü mini-kural ızgarası, body
                  blokları, kelime çifti kartları, uyarı banner'ı). */}
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                {breakdown.items.map((item, i) => (
                  <ItemCard key={i} item={item} index={i} c={c} />
                ))}
              </View>

              {breakdown.examples.length > 0 && (
                <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
                      <Text style={[styles.eyebrow, { color: c.text }]}>{et.examTacticsExamplesLabel}</Text>
                    </View>
                    {/* Kart kendi başına kullanılıyorsa (sayfa seviyesinde
                        bir anahtar yoksa) kendi küçük gizle/göster
                        düğmesini gösterir. Pratik sayfasında bu düğme
                        gizlenir (sayfa zaten kendi anahtarını gösteriyor). */}
                    {!isControlledExternally && (
                      <Pressable onPress={toggleAnswers} style={[styles.toggleBtn, { borderColor: c.border }]}>
                        {answersVisible ? <Eye color={c.amber} size={13} /> : <EyeOff color={c.textMuted} size={13} />}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>
                          {answersVisible ? et.answersToggleHideLabel : et.answersToggleShowLabel}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  {breakdown.examples.map((ex, i) => (
                    <BreakdownExampleCard key={i} example={ex} index={i} c={c} answersVisible={answersVisible} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              {/* Genel kural giriş paragrafı -- birden fazla madde varsa ilk
                  madde buraya, numarasız. */}
              {introPoint && (
                <View style={[styles.introBox, { backgroundColor: c.warningSoft }]}>
                  <HighlightedText text={introPoint} style={[styles.introText, { color: c.text }]} pillBg={c.text} pillColor={c.surface} />
                </View>
              )}

              {/* Numaralı madde kartları (introPoint varsa kalan maddeler, yoksa
                  tüm maddeler). */}
              <View style={{ marginTop: introPoint ? spacing.sm : spacing.md, gap: spacing.sm }}>
                {itemPoints.map((point, i) => {
                  const warning = isWarningPoint(point);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.itemCard,
                        {
                          backgroundColor: warning ? c.dangerSoft : c.surface,
                          borderColor: warning ? c.danger : c.border,
                          borderWidth: warning ? 1.5 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.itemNumber, { backgroundColor: warning ? c.danger : c.amber }]}>
                        {warning ? (
                          <AlertTriangle color="#fff" size={12} />
                        ) : (
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>{i + 1}</Text>
                        )}
                      </View>
                      <HighlightedText text={point} style={[styles.itemText, { color: c.text }]} pillBg={c.text} pillColor={c.surface} />
                    </View>
                  );
                })}
              </View>

              {examples.length > 0 && (
                <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
                      <Text style={[styles.eyebrow, { color: c.text }]}>{et.examTacticsExamplesLabel}</Text>
                    </View>
                    <View style={[styles.countPill, { backgroundColor: c.border }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted }}>{examples.length}</Text>
                    </View>
                  </View>
                  {examples.map((ex, i) => {
                    const { sentence, reasoning } = parseExample(ex);
                    const theme = exampleThemes[i % exampleThemes.length];
                    return (
                      <View key={i} style={[styles.exampleCard, { backgroundColor: theme.soft, borderColor: theme.accent }]}>
                        <View style={styles.exampleHeaderRow}>
                          <View style={[styles.exampleNumber, { backgroundColor: theme.accent }]}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{i + 1}</Text>
                          </View>
                        </View>
                        <View style={{ flex: 1, gap: 6 }}>
                          {sentence && (
                            <View style={[styles.sentenceBox, { backgroundColor: c.surface }]}>
                              <Quote color={theme.accent} size={12} style={{ marginTop: 2 }} />
                              <Text style={[styles.sentenceText, { color: c.text }]}>{sentence}</Text>
                            </View>
                          )}
                          <HighlightedText
                            text={reasoning}
                            style={[styles.reasoningText, { color: c.textSecondary }]}
                            pillBg={c.text}
                            pillColor={c.surface}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {footer && <View style={{ marginTop: spacing.md }}>{footer}</View>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.lg,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgePillSoft: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  introBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  itemNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  itemText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
  },
  itemHeading: {
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  badgeGray: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  warningLabelPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  subRuleBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  pairBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  textBlockBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  exampleCheckBox: {
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  meaningPairCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  meaningPairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  warningBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  exampleCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  exampleHeaderRow: {
    paddingTop: 2,
  },
  exampleNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentenceBox: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  sentenceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  reasoningText: {
    fontSize: 12.5,
    lineHeight: 18.5,
  },
});
