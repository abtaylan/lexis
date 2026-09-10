'use client';

// app/(app)/duels/page.tsx — V2 §6.3 Faz 3a/3e: Düello lobisi.
// Bekleyen (status="waiting") odaları listeler, yeni oda açma + katılma
// imkanı verir. Oda içi akış (bkz. round-servis uçları) [id]/page.tsx'te.
// Backend: /api/v1/duels/* (bkz. backend/app/api/routes/duels.py)

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Swords, Plus, Users, Loader2, RefreshCw } from 'lucide-react';
import { duelsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { DuelResponse } from '@/types';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const L: Record<Locale, Record<string, string>> = {
  tr: {
    title: 'Düello', subtitle: 'Aynı anda birden fazla kişiyle canlı kelime yarışması.',
    createBtn: 'Yeni Oda Aç', loading: 'Yükleniyor…', error: 'Bir şeyler ters gitti.',
    empty: 'Şu an bekleyen oda yok.', emptySub: 'İlk odayı sen aç!',
    playersLabel: 'oyuncu', joinBtn: 'Katıl', refreshBtn: 'Yenile',
  },
  en: {
    title: 'Duel', subtitle: 'A live vocabulary competition with multiple players at once.',
    createBtn: 'Create Room', loading: 'Loading…', error: 'Something went wrong.',
    empty: 'No waiting rooms right now.', emptySub: 'Be the first to open one!',
    playersLabel: 'players', joinBtn: 'Join', refreshBtn: 'Refresh',
  },
  de: {
    title: 'Duell', subtitle: 'Ein Live-Vokabelwettbewerb mit mehreren Spielern gleichzeitig.',
    createBtn: 'Raum erstellen', loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.',
    empty: 'Gerade keine wartenden Räume.', emptySub: 'Eröffne den ersten Raum!',
    playersLabel: 'Spieler', joinBtn: 'Beitreten', refreshBtn: 'Aktualisieren',
  },
  fr: {
    title: 'Duel', subtitle: 'Une compétition de vocabulaire en direct avec plusieurs joueurs à la fois.',
    createBtn: 'Créer une salle', loading: 'Chargement…', error: "Une erreur s'est produite.",
    empty: "Aucune salle en attente pour l'instant.", emptySub: 'Sois le premier à en ouvrir une !',
    playersLabel: 'joueurs', joinBtn: 'Rejoindre', refreshBtn: 'Actualiser',
  },
  es: {
    title: 'Duelo', subtitle: 'Una competencia de vocabulario en vivo con varios jugadores a la vez.',
    createBtn: 'Crear sala', loading: 'Cargando…', error: 'Algo salió mal.',
    empty: 'No hay salas en espera ahora mismo.', emptySub: '¡Sé el primero en abrir una!',
    playersLabel: 'jugadores', joinBtn: 'Unirse', refreshBtn: 'Actualizar',
  },
  it: {
    title: 'Duello', subtitle: 'Una gara di vocabolario dal vivo con più giocatori contemporaneamente.',
    createBtn: 'Crea stanza', loading: 'Caricamento…', error: 'Qualcosa è andato storto.',
    empty: 'Nessuna stanza in attesa al momento.', emptySub: 'Sii il primo ad aprirne una!',
    playersLabel: 'giocatori', joinBtn: 'Partecipa', refreshBtn: 'Aggiorna',
  },
  ar: {
    title: 'مبارزة', subtitle: 'مسابقة مفردات مباشرة مع عدة لاعبين في آن واحد.',
    createBtn: 'إنشاء غرفة', loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.',
    empty: 'لا توجد غرف بانتظار حالياً.', emptySub: 'كن أول من يفتح غرفة!',
    playersLabel: 'لاعبين', joinBtn: 'انضمام', refreshBtn: 'تحديث',
  },
  ru: {
    title: 'Дуэль', subtitle: 'Живое соревнование по словарному запасу с несколькими игроками одновременно.',
    createBtn: 'Создать комнату', loading: 'Загрузка…', error: 'Что-то пошло не так.',
    empty: 'Сейчас нет ожидающих комнат.', emptySub: 'Открой первую комнату!',
    playersLabel: 'игроков', joinBtn: 'Присоединиться', refreshBtn: 'Обновить',
  },
  ja: {
    title: 'デュエル', subtitle: '複数のプレイヤーと同時に対戦するライブ単語バトル。',
    createBtn: 'ルームを作成', loading: '読み込み中…', error: '問題が発生しました。',
    empty: '現在待機中のルームはありません。', emptySub: '最初のルームを開いてみましょう!',
    playersLabel: '人', joinBtn: '参加', refreshBtn: '更新',
  },
  pt: {
    title: 'Duelo', subtitle: 'Uma competição de vocabulário ao vivo com vários jogadores ao mesmo tempo.',
    createBtn: 'Criar Sala', loading: 'Carregando…', error: 'Algo deu errado.',
    empty: 'Nenhuma sala aguardando no momento.', emptySub: 'Seja o primeiro a abrir uma!',
    playersLabel: 'jogadores', joinBtn: 'Entrar', refreshBtn: 'Atualizar',
  },
};

export default function DuelsLobbyPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = L[locale];

  const [duels, setDuels] = useState<DuelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await duelsApi.list();
      setDuels(res.items);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const duel = await duelsApi.create();
      router.push(`/duels/${duel.id}`);
    } catch (err) {
      setError(errorDetail(err) || t.error);
      setCreating(false);
    }
  };

  const handleJoin = async (duelId: string) => {
    setJoiningId(duelId);
    try {
      await duelsApi.join(duelId);
      router.push(`/duels/${duelId}`);
    } catch (err) {
      setError(errorDetail(err) || t.error);
      setJoiningId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <Swords className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
            <p className="text-sm text-gray-400 dark:text-slate-500">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label={t.refreshBtn}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={creating}
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t.createBtn}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        {loading && <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">{t.loading}</p>}
        {!loading && error && <p className="text-sm text-red-400 dark:text-red-300 py-8 text-center">{error}</p>}
        {!loading && !error && duels.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400 dark:text-slate-500">{t.empty}</p>
            <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">{t.emptySub}</p>
          </div>
        )}
        {!loading && !error && duels.length > 0 && (
          <div className="space-y-1">
            {duels.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Swords className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 uppercase">{d.learning_lang}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {d.participant_count}/{d.max_players} {t.playersLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={joiningId === d.id || d.participant_count >= d.max_players}
                  onClick={() => handleJoin(d.id)}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 text-xs font-medium disabled:opacity-50 shrink-0"
                >
                  {joiningId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t.joinBtn}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
