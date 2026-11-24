// src/components/ExamTacticCard.tsx — "Sınav Taktikleri" için ortak kart
// bileşeni (23 Kasım 2026 kullanıcı geri bildirimi: "sarı renkli alan
// okunaklı olmuyor ... örnekler çok olmalı, taktikler isimlendirilmeli" ve
// "başlıklara tıklayınca ayrıntıları görmeliyiz").
//
// Önceki tasarımda TÜM gövde metni (başlık + taktik açıklaması + örnek)
// c.warning (amber) rengindeydi -- uzun paragraflarda okunurluğu düşürüyordu.
// Yeni tasarım: amber/vurgu rengi SADECE ikon rozeti, "TAKTİK" etiketi ve
// sol kenar şeridinde kullanılır; gövde metni her zaman nötr c.text/
// c.textSecondary ile yazılır. Ayrıca worked_example_tr (tek örnek) yerine
// examples_tr (birden fazla örnek) numaralı bir liste olarak gösterilir.
//
// İki kullanım biçimi:
// - collapsible=false (varsayılan): kart her zaman açık -- Genel Stratejiler
//   kartlarında ve konu pratiği ekranındaki banner'da kullanılır.
// - collapsible=true: kart başlangıçta kapalı, başlığa dokununca açılır --
//   "Konu Bazlı Taktikler" listesinde kullanılır (önceden dokununca direkt
//   pratik ekranına gidiyordu, artık önce ayrıntılar yerinde gösteriliyor).
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Lightbulb } from 'lucide-react-native';
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

export function ExamTacticCard({ title, subtitle, tactic, examples, collapsible = false, defaultExpanded, footer }: Props) {
  const { et } = useLocale();
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(defaultExpanded ?? !collapsible);

  function handleHeaderPress() {
    if (collapsible) setExpanded((v) => !v);
  }

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, borderLeftColor: c.warning },
      ]}
    >
      <Pressable
        onPress={handleHeaderPress}
        disabled={!collapsible}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <View style={[styles.iconBadge, { backgroundColor: c.warningSoft }]}>
          <Lightbulb color={c.warning} size={15} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: c.warning }]}>{et.examTacticsBadgeLabel}</Text>
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
          <Text style={[styles.body, { color: c.textSecondary }]}>{tactic}</Text>

          {examples.length > 0 && (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={[styles.eyebrow, { color: c.textMuted }]}>{et.examTacticsExamplesLabel}</Text>
              {examples.map((ex, i) => (
                <View key={i} style={[styles.exampleRow, { backgroundColor: c.background }]}>
                  <View style={[styles.exampleNumber, { backgroundColor: c.warningSoft }]}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: c.warning }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, color: c.textSecondary, fontSize: 13, lineHeight: 19 }}>{ex}</Text>
                </View>
              ))}
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
  body: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  exampleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  exampleNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
});
