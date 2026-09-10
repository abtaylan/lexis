'use client';

// app/(app)/quests/page.tsx — Görev Haritası v2 (10 Eylül 2026, "içeriği
// tamamen değişecek" isteği, bkz. supabase/migrations/049 + 059 ve
// backend/app/api/routes/quests.py modül docstring'i). Eskiden tek bir
// dikey liste (5 görev, hepsi 'aggregate') idi; artık dünya (world) ->
// bölüm (part) -> görev (node) hiyerarşisi var ve her görevin FARKLI bir
// içerik türü (content_type) olabilir: aggregate/game/flashcard/
// grammar_topic/quiz/question_practice/duel. Bir düğüme dokununca
// content_type'a göre doğru ekrana yönlendirilir (bkz. resolveHref).
// Görsel olarak dikey "yol" deseni KORUNDU (mevcut, kanıtlanmış tasarım) —
// üzerine dünya/bölüm başlıkları ve içerik-türü ikonları eklendi.
// İlerleme SUNUCUDA tutuluyor (bkz. backend modül docstring'i — Gramer
// Rehberi'nin localStorage deseninden BİLİNÇLİ bir sapma, rekabet/lig
// bağlamı yüzünden).
// Backend: /api/v1/quests (bkz. backend/app/api/routes/quests.py)
//
// DİL NOTU: quest_nodes/quest_worlds/quest_parts içeriği backend'de SADECE
// tr/en olarak tutuluyor — bu sayfanın kendi 10 dilli arayüz metinleri (L
// tablosu) bundan bağımsız. Görev İÇERİĞİ için locale tr ise *_tr, DEĞİLSE
// *_en kullanılır (BİLİNÇLİ sınır, diğer 8 dil için içerik İngilizce'ye
// düşer — bkz. eski quests/page.tsx'teki aynı yorum).

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import {
  Map, RefreshCw, Check, Lock, Star, Award, Gamepad2, Layers, BookOpen,
  FileQuestion, Timer, Swords, Flag, ChevronRight,
} from 'lucide-react';
import { questsApi } from '@/lib/api';
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

export default function QuestsPage() {
  const { locale } = useLocale();
  const t = L[locale];
  const router = useRouter();

  const [items, setItems] = useState<QuestNodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await questsApi.list();
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

  const worlds = useMemo(() => groupByWorldAndPart(items, locale), [items, locale]);

  function handleOpen(node: QuestNodeItem) {
    if (!node.is_unlocked) return;
    const href = resolveHref(node);
    if (href) router.push(href);
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

      {!loading && !error && worlds.length > 0 && (
        <div className="space-y-8">
          {worlds.map((world) => (
            <div key={world.key} className="space-y-4">
              {world.title && (
                <div className="flex items-center gap-2.5 pt-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center shrink-0">
                    <Flag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-slate-200">{world.title}</h2>
                </div>
              )}

              {world.parts.map((part) => (
                <div key={part.key} className="space-y-3">
                  {part.title && (
                    <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide pl-1">
                      {part.title}
                    </p>
                  )}

                  <div className="relative space-y-3">
                    {part.nodes.map((node, idx) => {
                      const isLastOverall = world === worlds[worlds.length - 1]
                        && part === world.parts[world.parts.length - 1]
                        && idx === part.nodes.length - 1;
                      const pct = node.requirement_count > 0
                        ? Math.min(100, Math.round((node.current_value / node.requirement_count) * 100))
                        : 0;
                      const title = localizedTitle(node, locale);
                      const description = localizedDescription(node, locale);
                      const Icon = CONTENT_ICONS[node.content_type] ?? Star;
                      const clickable = node.is_unlocked && !node.is_completed && resolveHref(node) !== null;

                      return (
                        <div key={node.id} className="relative flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                node.is_completed
                                  ? 'bg-green-500 border-green-500'
                                  : node.is_unlocked
                                    ? 'bg-white dark:bg-slate-900 border-purple-400 dark:border-purple-500'
                                    : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                              }`}
                            >
                              {node.is_completed ? (
                                <Check className="w-5 h-5 text-white" />
                              ) : node.is_unlocked ? (
                                <Icon className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                              ) : (
                                <Lock className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                              )}
                            </div>
                            {!isLastOverall && (
                              <div
                                className={`w-0.5 flex-1 min-h-[1.5rem] mt-1 ${
                                  node.is_completed ? 'bg-green-400 dark:bg-green-600' : 'bg-gray-200 dark:bg-slate-700'
                                }`}
                              />
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpen(node)}
                            disabled={!clickable}
                            className={`flex-1 mb-2 text-left rounded-2xl border p-4 transition-colors ${
                              node.is_unlocked
                                ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-sm'
                                : 'bg-gray-50/60 dark:bg-slate-900/40 border-gray-100 dark:border-slate-800 opacity-60'
                            } ${clickable ? 'hover:border-purple-200 dark:hover:border-purple-800 cursor-pointer' : 'cursor-default'}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
                              {node.is_completed && (
                                <span className="text-xs font-medium text-green-600 dark:text-green-400 shrink-0">{t.completedLabel}</span>
                              )}
                              {!node.is_unlocked && (
                                <span className="text-xs font-medium text-gray-400 dark:text-slate-500 shrink-0">{t.lockedLabel}</span>
                              )}
                              {clickable && (
                                <span className="flex items-center gap-0.5 text-xs font-medium text-purple-600 dark:text-purple-400 shrink-0">
                                  {node.current_value > 0 ? t.continueBtn : t.startBtn}
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>

                            {description && (
                              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{description}</p>
                            )}

                            {node.is_unlocked && (
                              <>
                                <div className="mt-3 h-1.5 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${node.is_completed ? 'bg-green-500' : 'bg-purple-500'}`}
                                    style={{ width: `${node.is_completed ? 100 : pct}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                  {Math.min(node.current_value, node.requirement_count)} / {node.requirement_count}
                                </p>
                              </>
                            )}

                            {(node.reward_xp > 0 || node.reward_badge_code) && (
                              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                                <span className="text-xs text-gray-400 dark:text-slate-500">{t.rewardLabel}:</span>
                                {node.reward_xp > 0 && (
                                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">+{node.reward_xp} XP</span>
                                )}
                                {node.reward_badge_code && (
                                  <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                                    <Award className="w-3.5 h-3.5" />
                                    {t.badgeRewardLabel}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
