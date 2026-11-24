// src/components/ExamTacticCard.tsx — "Sınav Taktikleri" için ortak kart
// bileşeni.
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
//   liste sadece başlığı gösterir, dokununca ayrıntı yerinde açılır.
//   (İstisna: pratik ekranındaki banner collapsible={false} geçerek açık
//   kalmaya devam eder, çünkü o an zaten o taktiğe bakılıyordur.)
// - Tek renkli (amber) gövde yerine çok renkli bölümler: taktik kuralı
//   mor (accent) zeminde, örnek cümle mavi (primary) zeminde, örneğin
//   Türkçe gerekçesi yeşil (success) zeminde gösterilir. Bu üç bölümün
//   içindeki BÜYÜK HARFLİ vurgu kelimeleri (ör. "BAŞLANGIÇ NOKTASI",
//   "YASAK") otomatik olarak amber/kalın renklendirilir -- içerik zaten
//   bu kelimeleri büyük harfle yazıyor, burada sadece görsel olarak
//   öne çıkarılıyor.
// - Örnek cümle + gerekçe, içerikteki "\"İngilizce cümle.\" Türkçe
//   gerekçe..." kalıbından ayrıştırılıp iki ayrı renkli kutuya bölünüyor
//   (parseExample). Kalıba uymayan metinler (genel stratejilerin bir
//   kısmı) tek parça gerekçe kutusunda gösterilir, kırılmaz.
//
// 24 Kasım 2026 (3. tur) kullanıcı geri bildirimi: "renklendirme güzel
// olmuş ama yukarıdaki alanda çok yazı var ve sıkışık görünüyor, burayı
// daha okunaklı, madde madde hale getirmen lazım."
// - Taktik kuralı artık TEK bir paragraf olarak değil, cümle/madde
//   bazında ayrı satırlara (önünde madde imi ile) bölünerek gösteriliyor
//   (splitIntoPoints). Bölme, tırnak içindeki noktaları (ör. "I bought a
//   car. The car is red." gibi örnek cümlelerin içindeki noktayı) madde
//   sonu SAYMAZ -- sadece tırnak DIŞINDAKİ cümle sonu noktalama
//   işaretlerinden (. ! ? ;) böler, böylece örnek cümleler yarıda
//   kesilmez.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Lightbulb, Quote } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { radius, spacing } from '@/constants/theme';
import { useLocale } from '@/i18n';

type Props = {
  title: string;
  subtitle?: string | null;
  tactic: string;
  examples: string[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  footer?: React.ReactNode;
};

// Türkçe büyük harfli vurgu kelimelerini (ör. "BAŞLANGIÇ NOKTASI", "YDS'NİN")
// bulup ayrı render edebilmek için metni parçalara ayırır.
const CAPS_RUN = /[A-ZÇĞİÖŞÜ]{2,}(?:[\s'’\-][A-ZÇĞİÖŞÜ]{2,})*/g;

function HighlightedText({ text, style, highlightColor }: { text: string; style?: any; highlightColor: string }) {
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
          <Text key={i} style={{ color: highlightColor, fontWeight: '700' }}>
            {p.text}
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

export function ExamTacticCard({
  title,
  subtitle,
  tactic,
  examples,
  collapsible = true,
  defaultExpanded,
  footer,
}: Props) {
  const { et } = useLocale();
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(defaultExpanded ?? !collapsible);

  function handleHeaderPress() {
    if (collapsible) setExpanded((v) => !v);
  }

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: c.accent }]}>
      <Pressable
        onPress={handleHeaderPress}
        disabled={!collapsible}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <View style={[styles.iconBadge, { backgroundColor: c.accentSoft }]}>
          <Lightbulb color={c.accent} size={15} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: c.accent }]}>{et.examTacticsBadgeLabel}</Text>
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
          <View style={[styles.ruleBox, { backgroundColor: c.accentSoft }]}>
            {splitIntoPoints(tactic).map((point, i) => (
              <View key={i} style={[styles.ruleItem, i > 0 && { marginTop: spacing.sm }]}>
                <View style={[styles.ruleBullet, { backgroundColor: c.accent }]} />
                <HighlightedText
                  text={point}
                  style={[styles.ruleText, { color: c.text }]}
                  highlightColor={c.warning}
                />
              </View>
            ))}
          </View>

          {examples.length > 0 && (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={[styles.eyebrow, { color: c.textMuted }]}>{et.examTacticsExamplesLabel}</Text>
              {examples.map((ex, i) => {
                const { sentence, reasoning } = parseExample(ex);
                return (
                  <View key={i} style={styles.exampleCard}>
                    <View style={styles.exampleNumberRow}>
                      <View style={[styles.exampleNumber, { backgroundColor: c.accent }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{i + 1}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      {sentence && (
                        <View style={[styles.sentenceBox, { backgroundColor: c.primarySoft }]}>
                          <Quote color={c.primary} size={12} style={{ marginTop: 2 }} />
                          <Text style={[styles.sentenceText, { color: c.text }]}>{sentence}</Text>
                        </View>
                      )}
                      <View style={[styles.reasoningBox, { backgroundColor: c.successSoft }]}>
                        <HighlightedText
                          text={reasoning}
                          style={[styles.reasoningText, { color: c.textSecondary }]}
                          highlightColor={c.warning}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
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
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  ruleBox: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  ruleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  exampleCard: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exampleNumberRow: {
    paddingTop: 2,
  },
  exampleNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
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
    lineHeight: 19,
    fontStyle: 'italic',
  },
  reasoningBox: {
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  reasoningText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
