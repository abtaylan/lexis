'use client';

// app/(app)/quests/page.tsx — Görev Haritası v3 (10 Eylül 2026, "SVG/CSS
// tabanlı macera-patikası" görsel yenilemesi — bkz. skills game-ui-svg /
// game-asset-pipeline ve bu sohbetteki karar: MCP üzerinden hazır bir
// "oyun grafiği üretimi" skill'i yok, bu yüzden kod-tabanlı vektör/animasyon
// yaklaşımı seçildi, kullanıcı onayı: "A maddesini yap").
// v2'deki dikey düz liste yerine, her BÖLÜM (part) kendi SVG'sinde
// yılankavi (zigzag) bir patika üzerinde dizilir; dünya (world) başına
// döngüsel bir renk teması (WORLD_THEMES) uygulanır, patikanın tamamlanan
// kısmı renkli+çizilerek-belirir (stroke-dashoffset), kalan kısmı gri
// noktalı çizgi ile gösterilir. "Şu an buradasın" düğümü nabız (pulse)
// animasyonu alır, rozet ödülü olan düğümler köşede küçük bir rozet
// rozeti (ribbon) gösterir (bkz. backend reward_badge_code).
// İçerik/yönlendirme mantığı (resolveHref, content_type sözleşmesi)
// DEĞİŞMEDİ — sadece görsel katman yenilendi.
// Backend: /api/v1/quests (bkz. backend/app/api/routes/quests.py)
//
// DİL NOTU: quest_nodes/quest_worlds/quest_parts içeriği backend'de SADECE
// tr/en olarak tutuluyor — bu sayfanın kendi 10 dilli arayüz metinleri (L
// tablosu) bundan bağımsız. Görev İÇERİĞİ için locale tr ise *_tr, DEĞİLSE
// *_en kullanılır (BİLİNÇLİ sınır, diğer 8 dil için içerik İngilizce'ye
// düşer — bkz. eski quests/page.tsx'teki aynı yorum).

import { useEffect, useState, useCallback, useMemo, useRef, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import {
  Map, RefreshCw, Check, Lock, Star, Award, Gamepad2, Layers, BookOpen,
  FileQuestion, Timer, Swords, Flag, ChevronRight,
} from 'lucide-react';
import { questsApi } from '@/lib/api';
import { playQuestClick, playQuestComplete, playQuestBadge, startQuestAmbient, stopQuestAmbient } from '@/lib/questSounds';
import { useLocale, type Locale } from '@/lib/i18n';
import type { QuestNodeItem } from '@/types';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

function localizedTitle(node: QuestNodeItem, locale: Locale): string {
  return locale === 'tr' ? node.title_tr : node.title_en;
}

function localizedDescription(node: QuestNodeItem, locale: Locale): string | undefined {
  return (locale === 'tr' ? node.description_tr : node.description_en) ?? undefined;
}

function localizedWorldTitle(node: QuestNodeItem, locale: Locale): string | undefined {
  return (locale === 'tr' ? node.world_title_tr : node.world_title_en) ?? node.world_title_tr ?? undefined;
}

function localizedPartTitle(node: QuestNodeItem, locale: Locale): string | undefined {
  return (locale === 'tr' ? node.part_title_tr : node.part_title_en) ?? node.part_title_tr ?? undefined;
}

// content_type -> ikon (bkz. backend quests.py modül docstring'indeki
// content_type sözleşmesi).
const CONTENT_ICONS: Record<string, typeof Star> = {
  aggregate: Star,
  game: Gamepad2,
  flashcard: Layers,
  grammar_topic: BookOpen,
  quiz: FileQuestion,
  question_practice: Timer,
  duel: Swords,
};

// content_type + content_ref -> "dokununca nereye git" (bkz. backend
// quests.py modül docstring'indeki content_type sözleşmesi; her hedef
// zaten var olan bir ekran/derin-bağlantı parametresi kullanıyor —
// game/page.tsx'teki ?mode=, exam-prep/page.tsx'teki ?examType=&
// ?sessionMode= — bkz. o sayfalardaki useEffect'ler).
function resolveHref(node: QuestNodeItem): string | null {
  const ref = node.content_ref ?? {};
  switch (node.content_type) {
    case 'game':
      return typeof ref.game_mode === 'string' ? `/game?mode=${encodeURIComponent(ref.game_mode)}` : '/game';
    case 'flashcard':
      return '/flashcards';
    case 'grammar_topic':
      return typeof ref.grammar_topic_slug === 'string' ? `/exam-grammar/${encodeURIComponent(ref.grammar_topic_slug)}` : '/exam-grammar';
    case 'quiz':
      return typeof ref.exam_type === 'string'
        ? `/exam-prep?examType=${encodeURIComponent(ref.exam_type)}&sessionMode=practice`
        : '/exam-prep';
    case 'question_practice':
      return typeof ref.exam_type === 'string'
        ? `/exam-prep?examType=${encodeURIComponent(ref.exam_type)}&sessionMode=timed_mock`
        : '/exam-prep';
    case 'duel':
      return '/duels';
    default:
      return null; // 'aggregate' -- tıklanabilir bir hedefi yok, sadece bir kilometre taşı
  }
}

const L: Record<Locale, Record<string, string>> = {
  tr: {
    title: 'Görev Haritası', subtitle: 'Dünyaları sırayla keşfet, XP ve rozet kazan.',
    loading: 'Yükleniyor…', error: 'Bir şeyler ters gitti.', refreshBtn: 'Yenile',
    empty: 'Henüz görev tanımlanmamış.',
    completedLabel: 'Tamamlandı', lockedLabel: 'Kilitli', rewardLabel: 'Ödül',
    badgeRewardLabel: 'rozet', startBtn: 'Başla', continueBtn: 'Devam Et',
  },
  en: {
    title: 'Quest Map', subtitle: 'Explore each world in order to earn XP and badges.',
    loading: 'Loading…', error: 'Something went wrong.', refreshBtn: 'Refresh',
    empty: 'No quests defined yet.',
    completedLabel: 'Completed', lockedLabel: 'Locked', rewardLabel: 'Reward',
    badgeRewardLabel: 'badge', startBtn: 'Start', continueBtn: 'Continue',
  },
  de: {
    title: 'Aufgabenkarte', subtitle: 'Entdecke jede Welt der Reihe nach, um XP und Abzeichen zu verdienen.',
    loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.', refreshBtn: 'Aktualisieren',
    empty: 'Noch keine Aufgaben definiert.',
    completedLabel: 'Abgeschlossen', lockedLabel: 'Gesperrt', rewardLabel: 'Belohnung',
    badgeRewardLabel: 'Abzeichen', startBtn: 'Starten', continueBtn: 'Weiter',
  },
  fr: {
    title: 'Carte des Quêtes', subtitle: 'Explore chaque monde dans l’ordre pour gagner XP et badges.',
    loading: 'Chargement…', error: "Une erreur s'est produite.", refreshBtn: 'Actualiser',
    empty: 'Aucune quête définie pour le moment.',
    completedLabel: 'Terminée', lockedLabel: 'Verrouillée', rewardLabel: 'Récompense',
    badgeRewardLabel: 'badge', startBtn: 'Démarrer', continueBtn: 'Continuer',
  },
  es: {
    title: 'Mapa de Misiones', subtitle: 'Explora cada mundo en orden para ganar XP e insignias.',
    loading: 'Cargando…', error: 'Algo salió mal.', refreshBtn: 'Actualizar',
    empty: 'Todavía no hay misiones definidas.',
    completedLabel: 'Completada', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa',
    badgeRewardLabel: 'insignia', startBtn: 'Empezar', continueBtn: 'Continuar',
  },
  it: {
    title: 'Mappa delle Missioni', subtitle: 'Esplora ogni mondo in ordine per guadagnare XP e distintivi.',
    loading: 'Caricamento…', error: 'Qualcosa è andato storto.', refreshBtn: 'Aggiorna',
    empty: 'Nessuna missione definita al momento.',
    completedLabel: 'Completata', lockedLabel: 'Bloccata', rewardLabel: 'Ricompensa',
    badgeRewardLabel: 'distintivo', startBtn: 'Inizia', continueBtn: 'Continua',
  },
  ar: {
    title: 'خريطة المهام', subtitle: 'استكشف كل عالم بالترتيب لكسب نقاط الخبرة والأوسمة.',
    loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.', refreshBtn: 'تحديث',
    empty: 'لا توجد مهام محددة بعد.',
    completedLabel: 'مكتملة', lockedLabel: 'مقفلة', rewardLabel: 'المكافأة',
    badgeRewardLabel: 'وسام', startBtn: 'ابدأ', continueBtn: 'متابعة',
  },
  ru: {
    title: 'Карта заданий', subtitle: 'Исследуй миры по порядку, чтобы получить XP и значки.',
    loading: 'Загрузка…', error: 'Что-то пошло не так.', refreshBtn: 'Обновить',
    empty: 'Задания пока не определены.',
    completedLabel: 'Выполнено', lockedLabel: 'Заблокировано', rewardLabel: 'Награда',
    badgeRewardLabel: 'значок', startBtn: 'Начать', continueBtn: 'Продолжить',
  },
  ja: {
    title: 'クエストマップ', subtitle: '順番に世界を探検してXPとバッジを獲得しよう。',
    loading: '読み込み中…', error: '問題が発生しました。', refreshBtn: '更新',
    empty: 'まだクエストが定義されていません。',
    completedLabel: '完了', lockedLabel: 'ロック中', rewardLabel: '報酬',
    badgeRewardLabel: 'バッジ', startBtn: '始める', continueBtn: '続ける',
  },
  pt: {
    title: 'Mapa de Missões', subtitle: 'Explore cada mundo em ordem para ganhar XP e emblemas.',
    loading: 'Carregando…', error: 'Algo deu errado.', refreshBtn: 'Atualizar',
    empty: 'Nenhuma missão definida ainda.',
    completedLabel: 'Concluída', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa',
    badgeRewardLabel: 'emblema', startBtn: 'Começar', continueBtn: 'Continuar',
  },
};

type WorldGroup = {
  key: string;
  title: string;
  parts: { key: string; title: string | undefined; nodes: QuestNodeItem[] }[];
};

// items zaten order_index'e göre sıralı geliyor (backend) -- burada sadece
// ardışık world_slug/part_index değişimlerine göre gruplanır (stable sort
// varsayımı: aynı worlde/parte ait düğümler bitişik).
function groupByWorldAndPart(items: QuestNodeItem[], locale: Locale): WorldGroup[] {
  const groups: WorldGroup[] = [];
  for (const node of items) {
    const worldKey = node.world_slug ?? '__default';
    const worldTitle = localizedWorldTitle(node, locale) ?? '';
    const partKey = `${worldKey}:${node.part_index ?? 0}`;
    const partTitle = localizedPartTitle(node, locale);

    let group = groups[groups.length - 1];
    if (!group || group.key !== worldKey) {
      group = { key: worldKey, title: worldTitle, parts: [] };
      groups.push(group);
    }
    let part = group.parts[group.parts.length - 1];
    if (!part || part.key !== partKey) {
      part = { key: partKey, title: partTitle, nodes: [] };
      group.parts.push(part);
    }
    part.nodes.push(node);
  }
  return groups;
}

// ────────────────────────────────────────────────────────────────────────
// Görsel patika (path) motoru — bkz. skill "game-ui-svg". Her BÖLÜM kendi
// dikey SVG şeridinde, düğümler bir sinüs desenine göre sola/ortaya/sağa
// kayarak yılankavi bir iz oluşturur; ardışık noktalar arasında yumuşak
// kübik Bezier eğrisi çizilir (C komutu, kontrol noktaları ortadaki Y'de).
// ────────────────────────────────────────────────────────────────────────

type WorldTheme = { accent: string; accentDark: string; soft: string; softDark: string };

const WORLD_THEMES: WorldTheme[] = [
  { accent: '#10b981', accentDark: '#34d399', soft: '#ecfdf5', softDark: 'rgba(16,185,129,0.12)' },
  { accent: '#8b5cf6', accentDark: '#a78bfa', soft: '#f5f3ff', softDark: 'rgba(139,92,246,0.12)' },
  { accent: '#f59e0b', accentDark: '#fbbf24', soft: '#fffbeb', softDark: 'rgba(245,158,11,0.12)' },
  { accent: '#f43f5e', accentDark: '#fb7185', soft: '#fff1f2', softDark: 'rgba(244,63,94,0.12)' },
  { accent: '#0ea5e9', accentDark: '#38bdf8', soft: '#f0f9ff', softDark: 'rgba(14,165,233,0.12)' },
  { accent: '#6366f1', accentDark: '#818cf8', soft: '#eef2ff', softDark: 'rgba(99,102,241,0.12)' },
  { accent: '#14b8a6', accentDark: '#2dd4bf', soft: '#f0fdfa', softDark: 'rgba(20,184,166,0.12)' },
  { accent: '#d946ef', accentDark: '#e879f9', soft: '#fdf4ff', softDark: 'rgba(217,70,239,0.12)' },
];

const ROW_H = 118;
const WRAPPER_W = 300;
const CENTER_X = WRAPPER_W / 2;
const AMPLITUDE = 92;
const NODE_SIZE = 52;

function nodeOffsetX(globalIdx: number): number {
  const phase = globalIdx % 4;
  if (phase === 1) return AMPLITUDE;
  if (phase === 3) return -AMPLITUDE;
  return 0;
}

type Point = { x: number; y: number };

function buildSmoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const midY = (p0.y + p1.y) / 2;
    d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
  }
  return d;
}

// Bölüm başına düğüm konumlarını hesaplar; globalIdx dünya boyunca KESİNTİSİZ
// artar (bölüm sınırlarında sıfırlanmaz) ki zigzag deseni bölümler arasında
// doğal görünsün.
function computeWorldLayout(world: WorldGroup): { partPoints: Point[][]; completed: number; total: number } {
  let idx = 0;
  let completed = 0;
  const partPoints: Point[][] = [];
  for (const part of world.parts) {
    const pts = part.nodes.map((node, i) => {
      const p: Point = { x: CENTER_X + nodeOffsetX(idx), y: i * ROW_H + ROW_H / 2 };
      idx += 1;
      if (node.is_completed) completed += 1;
      return p;
    });
    partPoints.push(pts);
  }
  const total = world.parts.reduce((acc, p) => acc + p.nodes.length, 0);
  return { partPoints, completed, total };
}

// Renkli (tamamlanan) patika parçasını "çizilerek belirsin" diye
// stroke-dashoffset animasyonuyla oynatan yardımcı bileşen (bkz.
// game-ui-svg skill'i — SMIL/CSS state-transition önerisi). Gerçek yay
// uzunluğunu getTotalLength() ile ölçüp tam isabetli bir "çizim" efekti
// üretir; prefers-reduced-motion'a saygı duyar.
function AnimatedPath({ d, className, strokeWidth }: { d: string; className: string; strokeWidth: number }) {
  const ref = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !d) return;
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const len = el.getTotalLength();
    if (reduceMotion) {
      el.style.strokeDasharray = 'none';
      el.style.strokeDashoffset = '0';
      return;
    }
    el.style.transition = 'none';
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    el.getBoundingClientRect(); // reflow'u zorla
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1s ease-out';
      el.style.strokeDashoffset = '0';
    });
    return () => cancelAnimationFrame(raf);
  }, [d]);

  if (!d) return null;
  return <path ref={ref} d={d} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" className={className} />;
}

export default function QuestsPage() {
  const { locale } = useLocale();
  const t = L[locale];
  const router = useRouter();

  const [items, setItems] = useState<QuestNodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Onceki yuklemeye gore YENI tamamlanan gorevleri tespit edip ses calmak
  // icin (bkz. skill game-asset-pipeline) -- ilk yuklemede (prev === null)
  // ses calinmiyor, sadece sonraki fetch'lerde (yenile / sayfaya donus).
  const prevItemsRef = useRef<QuestNodeItem[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await questsApi.list();
      const prev = prevItemsRef.current;
      if (prev) {
        const prevCompletedIds = new Set(prev.filter((n) => n.is_completed).map((n) => n.id));
        const newlyCompleted = res.items.filter((n) => n.is_completed && !prevCompletedIds.has(n.id));
        if (newlyCompleted.length > 0) {
          if (newlyCompleted.some((n) => n.reward_badge_code)) playQuestBadge();
          else playQuestComplete();
        }
      }
      prevItemsRef.current = res.items;
      setItems(res.items);
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    load();
  }, [load]);

  // Görev Haritası ekranında kısık sesle çalan arka plan ambiyansı --
  // ekrana girince başlar (autoplay engeline takılırsa ilk tıklamada
  // devreye girer, bkz. questSounds.ts), ekrandan çıkınca durur.
  useEffect(() => {
    startQuestAmbient();
    return () => stopQuestAmbient();
  }, []);

  const worlds = useMemo(() => groupByWorldAndPart(items, locale), [items, locale]);

  const worldsWithLayout = useMemo(
    () => worlds.map((world, i) => ({
      world,
      layout: computeWorldLayout(world),
      theme: WORLD_THEMES[i % WORLD_THEMES.length],
    })),
    [worlds],
  );

  // Akışta ilk "açık ama tamamlanmamış" düğüm -- "şu an buradasın" nabız
  // vurgusu bunun üzerine uygulanır.
  const currentNodeId = useMemo(() => {
    for (const world of worlds) {
      for (const part of world.parts) {
        for (const node of part.nodes) {
          if (node.is_unlocked && !node.is_completed) return node.id;
        }
      }
    }
    return null;
  }, [worlds]);

  function handleOpen(node: QuestNodeItem) {
    if (!node.is_unlocked) return;
    const href = resolveHref(node);
    if (href) {
      playQuestClick();
      router.push(href);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
            <Map className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
            <p className="text-sm text-gray-400 dark:text-slate-500">{t.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          aria-label={t.refreshBtn}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">{t.loading}</p>}
      {!loading && error && <p className="text-sm text-red-400 dark:text-red-300 py-8 text-center">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">{t.empty}</p>
      )}

      {!loading && !error && worldsWithLayout.length > 0 && (
        <div className="space-y-6">
          {worldsWithLayout.map(({ world, layout, theme }) => {
            const cssVars = {
              '--world-accent': theme.accent,
              '--world-accent-dark': theme.accentDark,
              '--world-soft': theme.soft,
              '--world-soft-dark': theme.softDark,
            } as CSSProperties;

            return (
              <div
                key={world.key}
                className="qm-soft-bg rounded-3xl p-4 md:p-6 relative overflow-hidden"
                style={cssVars}
              >
                <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                  <pattern id={`qm-dots-${world.key}`} width="18" height="18" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.3" className="qm-accent-text" fill="currentColor" opacity="0.3" />
                  </pattern>
                  <rect width="100%" height="100%" fill={`url(#qm-dots-${world.key})`} />
                </svg>

                <div className="relative flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.accent }}>
                      <Flag className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-sm font-bold text-gray-800 dark:text-slate-200">{world.title}</h2>
                  </div>
                  {layout.total > 0 && (
                    <span className="text-[11px] font-bold qm-accent-text shrink-0">{layout.completed}/{layout.total}</span>
                  )}
                </div>

                {world.parts.map((part, partIdx) => {
                  const pts = layout.partPoints[partIdx];
                  const lastCompletedIdx = part.nodes.reduce((acc, n, i) => (n.is_completed ? i : acc), -1);
                  const greyD = buildSmoothPath(pts);
                  const coloredD = lastCompletedIdx >= 0 ? buildSmoothPath(pts.slice(0, lastCompletedIdx + 1)) : '';
                  const partHeight = part.nodes.length * ROW_H;

                  return (
                    <div key={part.key} className="relative mt-2">
                      {part.title && (
                        <div className="flex items-center justify-center relative z-10 py-2">
                          <span
                            className="qm-soft-bg qm-accent-text text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full border"
                            style={{ borderColor: theme.accent }}
                          >
                            {part.title}
                          </span>
                        </div>
                      )}

                      <div className="relative mx-auto" style={{ width: WRAPPER_W, height: partHeight }}>
                        <svg
                          width={WRAPPER_W}
                          height={partHeight}
                          viewBox={`0 0 ${WRAPPER_W} ${partHeight}`}
                          className="absolute inset-0"
                          aria-hidden="true"
                        >
                          {greyD && (
                            <path d={greyD} fill="none" strokeWidth={5} strokeLinecap="round" strokeDasharray="1 13" className="qm-path-bg" />
                          )}
                          {coloredD && <AnimatedPath d={coloredD} strokeWidth={5} className="qm-path-fill" />}
                        </svg>

                        {part.nodes.map((node, i) => {
                          const { x, y } = pts[i];
                          const title = localizedTitle(node, locale);
                          const description = localizedDescription(node, locale);
                          const Icon = CONTENT_ICONS[node.content_type] ?? Star;
                          const clickable = node.is_unlocked && !node.is_completed && resolveHref(node) !== null;
                          const isCurrent = node.id === currentNodeId;

                          return (
                            <div key={node.id} className="absolute" style={{ left: x, top: y }}>
                              <button
                                type="button"
                                onClick={() => handleOpen(node)}
                                disabled={!clickable}
                                aria-label={title}
                                title={description || title}
                                className={`absolute rounded-full flex items-center justify-center border-[3px] transition-transform qm-node-enter ${
                                  clickable ? 'hover:scale-110 active:scale-95 cursor-pointer' : 'cursor-default'
                                } ${isCurrent ? 'qm-pulse' : ''} ${
                                  !node.is_unlocked ? 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700' : ''
                                }`}
                                style={{
                                  width: NODE_SIZE,
                                  height: NODE_SIZE,
                                  left: 0,
                                  top: 0,
                                  transform: 'translate(-50%, -50%)',
                                  animationDelay: `${Math.min(i * 35, 900)}ms`,
                                  backgroundColor: node.is_completed ? theme.accent : node.is_unlocked ? 'var(--bg-card)' : undefined,
                                  borderColor: node.is_unlocked ? theme.accent : undefined,
                                }}
                              >
                                {node.is_completed ? (
                                  <Check className="w-6 h-6 text-white qm-check-enter" />
                                ) : node.is_unlocked ? (
                                  <Icon className="w-5 h-5 qm-accent-text" />
                                ) : (
                                  <Lock className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                                )}
                                {node.reward_badge_code && (
                                  <span
                                    className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900"
                                    style={{ backgroundColor: '#f59e0b' }}
                                    title={t.badgeRewardLabel}
                                  >
                                    <Award className="w-2.5 h-2.5 text-white" />
                                  </span>
                                )}
                              </button>

                              <div
                                className="absolute text-center"
                                style={{ left: 0, top: NODE_SIZE / 2 + 8, width: 136, transform: 'translateX(-50%)' }}
                              >
                                <p className={`text-[11px] font-semibold leading-tight line-clamp-1 ${
                                  node.is_unlocked ? 'text-gray-800 dark:text-slate-200' : 'text-gray-400 dark:text-slate-600'
                                }`}
                                >
                                  {title}
                                </p>
                                {node.is_unlocked && description && (
                                  <p className="text-[10px] text-gray-400 dark:text-slate-500 leading-tight line-clamp-1 mt-0.5">
                                    {description}
                                  </p>
                                )}
                                <p className="text-[10px] font-medium leading-tight mt-0.5 flex items-center justify-center gap-1 flex-wrap">
                                  {node.is_completed && <span className="text-green-600 dark:text-green-400">{t.completedLabel}</span>}
                                  {!node.is_unlocked && <span className="text-gray-400 dark:text-slate-500">{t.lockedLabel}</span>}
                                  {clickable && (
                                    <span className="qm-accent-text flex items-center gap-0.5">
                                      {node.current_value > 0 ? t.continueBtn : t.startBtn}
                                      <ChevronRight className="w-3 h-3" />
                                      {node.requirement_count > 1 && (
                                        <span className="text-gray-400 dark:text-slate-500 font-normal">
                                          ({Math.min(node.current_value, node.requirement_count)}/{node.requirement_count})
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </p>
                                {(node.reward_xp > 0 || node.reward_badge_code) && (
                                  <p className="text-[9.5px] text-gray-400 dark:text-slate-500 mt-0.5">
                                    {node.reward_xp > 0 && (
                                      <span className="text-amber-600 dark:text-amber-400 font-medium">+{node.reward_xp} XP</span>
                                    )}
                                    {node.reward_xp > 0 && node.reward_badge_code && ' · '}
                                    {node.reward_badge_code && (
                                      <span className="text-blue-600 dark:text-blue-400 font-medium">{t.badgeRewardLabel}</span>
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
