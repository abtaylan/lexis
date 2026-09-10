'use client';

// app/(app)/quests/page.tsx — V2 §6.3 Faz 3c/3e: Görev haritası.
// Sıralı görev listesini (kilitli/açık/tamamlanmış), her görevin canlı
// ilerlemesini (current_value/requirement_count) ve ödülünü (XP + varsa
// rozet) gösterir. İlerleme SUNUCUDA tutuluyor (bkz. backend/app/api/
// routes/quests.py modül docstring'i — Gramer Rehberi'nin localStorage
// deseninden BİLİNÇLİ bir sapma, rekabet/lig bağlamı yüzünden).
// Backend: /api/v1/quests (bkz. backend/app/api/routes/quests.py)
//
// DİL NOTU: quest_nodes içeriği (title/description) backend'de SADECE
// tr/en olarak tutuluyor (migration 042) — bu sayfanın kendi 10 dilli
// arayüz metinleri (L tablosu) bundan bağımsız. Görev İÇERİĞİ için
// locale tr ise title_tr, DEĞİLSE title_en kullanılır (BİLİNÇLİ sınır —
// diğer 8 dil için görev içeriği İngilizce'ye düşer, arayüz kendi dilinde
// kalır; içerik çevirisi ayrı bir iş, bkz. migration 042 yorumu).

import { useEffect, useState, useCallback } from 'react';
import { AxiosError } from 'axios';
import { Map, RefreshCw, Check, Lock, Star, Award } from 'lucide-react';
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

const L: Record<Locale, Record<string, string>> = {
  tr: {
    title: 'Görev Haritası', subtitle: 'Sırayla tamamla, XP ve rozet kazan.',
    loading: 'Yükleniyor…', error: 'Bir şeyler ters gitti.', refreshBtn: 'Yenile',
    empty: 'Henüz görev tanımlanmamış.',
    completedLabel: 'Tamamlandı', lockedLabel: 'Kilitli', rewardLabel: 'Ödül',
    badgeRewardLabel: 'rozet',
  },
  en: {
    title: 'Quest Map', subtitle: 'Complete them in order to earn XP and badges.',
    loading: 'Loading…', error: 'Something went wrong.', refreshBtn: 'Refresh',
    empty: 'No quests defined yet.',
    completedLabel: 'Completed', lockedLabel: 'Locked', rewardLabel: 'Reward',
    badgeRewardLabel: 'badge',
  },
  de: {
    title: 'Aufgabenkarte', subtitle: 'Schließe sie der Reihe nach ab, um XP und Abzeichen zu verdienen.',
    loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.', refreshBtn: 'Aktualisieren',
    empty: 'Noch keine Aufgaben definiert.',
    completedLabel: 'Abgeschlossen', lockedLabel: 'Gesperrt', rewardLabel: 'Belohnung',
    badgeRewardLabel: 'Abzeichen',
  },
  fr: {
    title: 'Carte des Quêtes', subtitle: 'Termine-les dans l’ordre pour gagner XP et badges.',
    loading: 'Chargement…', error: "Une erreur s'est produite.", refreshBtn: 'Actualiser',
    empty: 'Aucune quête définie pour le moment.',
    completedLabel: 'Terminée', lockedLabel: 'Verrouillée', rewardLabel: 'Récompense',
    badgeRewardLabel: 'badge',
  },
  es: {
    title: 'Mapa de Misiones', subtitle: 'Complétalas en orden para ganar XP e insignias.',
    loading: 'Cargando…', error: 'Algo salió mal.', refreshBtn: 'Actualizar',
    empty: 'Todavía no hay misiones definidas.',
    completedLabel: 'Completada', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa',
    badgeRewardLabel: 'insignia',
  },
  it: {
    title: 'Mappa delle Missioni', subtitle: 'Completale in ordine per guadagnare XP e distintivi.',
    loading: 'Caricamento…', error: 'Qualcosa è andato storto.', refreshBtn: 'Aggiorna',
    empty: 'Nessuna missione definita al momento.',
    completedLabel: 'Completata', lockedLabel: 'Bloccata', rewardLabel: 'Ricompensa',
    badgeRewardLabel: 'distintivo',
  },
  ar: {
    title: 'خريطة المهام', subtitle: 'أكملها بالترتيب لكسب نقاط الخبرة والأوسمة.',
    loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.', refreshBtn: 'تحديث',
    empty: 'لا توجد مهام محددة بعد.',
    completedLabel: 'مكتملة', lockedLabel: 'مقفلة', rewardLabel: 'المكافأة',
    badgeRewardLabel: 'وسام',
  },
  ru: {
    title: 'Карта заданий', subtitle: 'Выполняй по порядку, чтобы получить XP и значки.',
    loading: 'Загрузка…', error: 'Что-то пошло не так.', refreshBtn: 'Обновить',
    empty: 'Задания пока не определены.',
    completedLabel: 'Выполнено', lockedLabel: 'Заблокировано', rewardLabel: 'Награда',
    badgeRewardLabel: 'значок',
  },
  ja: {
    title: 'クエストマップ', subtitle: '順番にクリアしてXPとバッジを獲得しよう。',
    loading: '読み込み中…', error: '問題が発生しました。', refreshBtn: '更新',
    empty: 'まだクエストが定義されていません。',
    completedLabel: '完了', lockedLabel: 'ロック中', rewardLabel: '報酬',
    badgeRewardLabel: 'バッジ',
  },
  pt: {
    title: 'Mapa de Missões', subtitle: 'Complete-as em ordem para ganhar XP e emblemas.',
    loading: 'Carregando…', error: 'Algo deu errado.', refreshBtn: 'Atualizar',
    empty: 'Nenhuma missão definida ainda.',
    completedLabel: 'Concluída', lockedLabel: 'Bloqueada', rewardLabel: 'Recompensa',
    badgeRewardLabel: 'emblema',
  },
};

export default function QuestsPage() {
  const { locale } = useLocale();
  const t = L[locale];

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

      {!loading && !error && items.length > 0 && (
        <div className="relative space-y-3">
          {items.map((node, idx) => {
            const isLast = idx === items.length - 1;
            const pct = node.requirement_count > 0
              ? Math.min(100, Math.round((node.current_value / node.requirement_count) * 100))
              : 0;
            const title = localizedTitle(node, locale);
            const description = localizedDescription(node, locale);

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
                      <Star className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 min-h-[1.5rem] mt-1 ${
                        node.is_completed ? 'bg-green-400 dark:bg-green-600' : 'bg-gray-200 dark:bg-slate-700'
                      }`}
                    />
                  )}
                </div>

                <div
                  className={`flex-1 mb-2 rounded-2xl border p-4 ${
                    node.is_unlocked
                      ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-sm'
                      : 'bg-gray-50/60 dark:bg-slate-900/40 border-gray-100 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
                    {node.is_completed && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 shrink-0">{t.completedLabel}</span>
                    )}
                    {!node.is_unlocked && (
                      <span className="text-xs font-medium text-gray-400 dark:text-slate-500 shrink-0">{t.lockedLabel}</span>
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
