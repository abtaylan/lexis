'use client';

// app/(app)/exam-grammar/page.tsx — Sınav Hazırlık: Gramer Rehberi "harita"
// sayfası, web. V2 — kullanıcı talebi: eski düz liste kullanıcı dostu değildi,
// "hangi konuya ne zaman çalışacağımı karıştırmadan" gezinebileceği tematik,
// ilerlemeli bir harita istendi (bkz. LEXIS_DEVIR_2026-09-09.md). Her
// kategori (bölüm) dolambaçlı bir yol üzerinde bir "durak" (nod) olarak
// gösterilir; bir durağa dokununca altındaki konular açılır, bir konuya
// dokununca mevcut /exam-grammar/[slug] detay sayfasına gidilir (o sayfa
// değişmedi). İlerleme (hangi konulara bakıldığı) lib/grammarProgress.ts
// üzerinden sadece tarayıcıda (localStorage) tutulur — backend'de kullanıcı
// bazlı bir grammar-progress tablosu yok, bu bilinçli olarak eklenmedi.
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  RefreshCw,
  GitBranch,
  ShieldCheck,
  Link2,
  FileText,
  MessageCircle,
  Puzzle,
  AlignLeft,
  Rocket,
  Type,
  Users,
  Sparkles,
  MapPin,
  HelpCircle,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { grammarApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import { useVisitedTopics } from '@/lib/grammarProgress';
import type { GrammarCategory, GrammarTopicSummary } from '@/types';

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    back: 'Geri',
    title: 'Gramer Rehberi',
    subtitle: 'YDS/YÖKDİL sınavlarında en sık çıkan konular — kural, örnek ve Türkçe konuşanlara özgü hatalar.',
    mapHint: 'Bir durağa dokun, altındaki konuları gör. Bir konuyu incelediğinde harita üzerinde işaretlenir.',
    overallProgressTpl: '{done} / {total} konu incelendi',
    emptyState: 'Bu kategoride henüz konu yok.',
    loading: 'Yükleniyor…',
    doneLabel: 'Tamamlandı',
    inProgressTpl: '{done}/{total} konu',
    notStartedLabel: 'Henüz başlanmadı',
  },
  en: {
    back: 'Back',
    title: 'Grammar Guide',
    subtitle: 'The most common topics in YDS/YÖKDİL exams — rules, examples, and mistakes specific to Turkish speakers.',
    mapHint: 'Tap a stop to see its topics. A topic gets marked on the map once you open it.',
    overallProgressTpl: '{done} / {total} topics reviewed',
    emptyState: 'No topics in this category yet.',
    loading: 'Loading…',
    doneLabel: 'Completed',
    inProgressTpl: '{done}/{total} topics',
    notStartedLabel: 'Not started yet',
  },
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tenses: Clock,
  passive: RefreshCw,
  conditionals: GitBranch,
  modals: ShieldCheck,
  clauses: Link2,
  'articles-nouns': FileText,
  'reported-speech': MessageCircle,
  'phrasal-vocab': Puzzle,
  'sentence-structure': AlignLeft,
  future: Rocket,
  'ing-to-infinitive': Type,
  'pronouns-determiners': Users,
  'adjectives-adverbs': Sparkles,
  prepositions: MapPin,
  'questions-auxiliaries': HelpCircle,
};

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  a2: { bg: '#EAF3DE', color: '#3B6D11' },
  b1: { bg: '#E6F1FB', color: '#378ADD' },
  b2: { bg: '#EEEDFE', color: '#534AB7' },
  c1: { bg: '#FAEEDA', color: '#854F0B' },
};

export default function ExamGrammarPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // useSyncExternalStore tabanlı — SSR'da boş küme, mount sonrası gerçek
  // localStorage değeriyle güvenli şekilde senkronize olur (bkz. lib/grammarProgress.ts).
  const visited = useVisitedTopics();

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['grammar-categories'],
    queryFn: grammarApi.listCategories,
  });
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['grammar-topics'],
    queryFn: grammarApi.listTopics,
  });

  const loading = categoriesLoading || topicsLoading;

  const topicsByCategory: Record<string, GrammarTopicSummary[]> = useMemo(() => {
    const map: Record<string, GrammarTopicSummary[]> = {};
    (topics ?? []).forEach((topic) => {
      if (!map[topic.category_id]) map[topic.category_id] = [];
      map[topic.category_id].push(topic);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [topics]);

  const orderedCategories: GrammarCategory[] = useMemo(
    () => [...(categories ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const totalTopics = topics?.length ?? 0;
  const totalVisited = useMemo(
    () => (topics ?? []).filter((topic) => visited.has(topic.slug)).length,
    [topics, visited]
  );
  const overallPct = totalTopics > 0 ? Math.round((totalVisited / totalTopics) * 100) : 0;

  function toggleCategory(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openTopic(slug: string) {
    router.push(`/exam-grammar/${slug}`);
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => router.push('/exam-prep')}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>

      <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">{t.subtitle}</p>

      {!loading && totalTopics > 0 && (
        <div className="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-slate-400">
              {t.overallProgressTpl.replace('{done}', String(totalVisited)).replace('{total}', String(totalTopics))}
            </span>
            <span className="text-xs font-bold" style={{ color: '#378ADD' }}>
              %{overallPct}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%`, backgroundColor: '#378ADD' }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-2.5 leading-relaxed">{t.mapHint}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="relative mt-8">
          {/* Merkezdeki kesikli "yol" çizgisi — duraklar sırayla üzerine dizilir. */}
          <div
            aria-hidden
            className="absolute left-1/2 top-8 bottom-8 w-0.5 -translate-x-1/2 border-l-2 border-dashed border-gray-200 dark:border-slate-700"
          />
          <div className="relative flex flex-col gap-5">
            {orderedCategories.map((category, index) => {
              const categoryTopics = topicsByCategory[category.id] ?? [];
              const Icon = CATEGORY_ICONS[category.slug] ?? BookOpen;
              const doneCount = categoryTopics.filter((topic) => visited.has(topic.slug)).length;
              const isComplete = categoryTopics.length > 0 && doneCount === categoryTopics.length;
              const isStarted = doneCount > 0;
              const isOpen = expanded.has(category.id);
              const alignEnd = index % 2 === 1;

              let circleClass = 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700';
              let iconClass = 'text-gray-400 dark:text-slate-500';
              if (isComplete) {
                circleClass = 'border-transparent';
                iconClass = 'text-white';
              } else if (isStarted) {
                circleClass = 'dark:bg-slate-800 border-[#378ADD]';
                iconClass = 'text-[#378ADD]';
              }

              return (
                <div key={category.id} className="flex flex-col gap-3">
                  <div className={`flex ${alignEnd ? 'justify-end pr-2 sm:pr-6' : 'justify-start pl-2 sm:pl-6'}`}>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="flex flex-col items-center gap-1.5 w-24 group"
                    >
                      <span
                        className={`relative w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-sm transition-all group-hover:scale-105 group-active:scale-95 ${circleClass}`}
                        style={isComplete ? { backgroundColor: '#378ADD' } : { backgroundColor: isStarted ? '#E6F1FB' : undefined }}
                      >
                        <Icon className={`w-6 h-6 ${iconClass}`} />
                        {isComplete && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow">
                            <CheckCircle2 className="w-4 h-4" style={{ color: '#3B6D11' }} />
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-300 text-center leading-tight line-clamp-2">
                        {category.name_tr}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500">
                        {isComplete
                          ? t.doneLabel
                          : isStarted
                          ? t.inProgressTpl.replace('{done}', String(doneCount)).replace('{total}', String(categoryTopics.length))
                          : `${categoryTopics.length > 0 ? categoryTopics.length : ''}`}
                      </span>
                    </button>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-3">
                          {categoryTopics.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-slate-500 p-2">{t.emptyState}</p>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {categoryTopics.map((topic) => {
                                const topicDone = visited.has(topic.slug);
                                const levelStyle = LEVEL_STYLE[topic.level] ?? LEVEL_STYLE.b1;
                                return (
                                  <button
                                    key={topic.id}
                                    onClick={() => openTopic(topic.slug)}
                                    className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
                                  >
                                    <div className="min-w-0 flex items-center gap-2.5">
                                      {topicDone ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#3B6D11' }} />
                                      ) : (
                                        <span className="w-4 h-4 shrink-0 rounded-full border-2 border-gray-200 dark:border-slate-600" />
                                      )}
                                      <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
                                        {topic.title_tr}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span
                                        className="px-2 py-0.5 rounded-full text-[10px] font-bold hidden sm:inline-block"
                                        style={{ backgroundColor: levelStyle.bg, color: levelStyle.color }}
                                      >
                                        {topic.level.toUpperCase()}
                                      </span>
                                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
