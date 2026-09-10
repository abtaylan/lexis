'use client';

// app/(app)/duels/page.tsx — V2 §6.3 Faz 3a/3e: Düello lobisi.
// Bekleyen (status="waiting") odaları listeler, yeni oda açma + katılma
// imkanı verir. Oda içi akış (bkz. round-servis uçları) [id]/page.tsx'te.
// Backend: /api/v1/duels/* (bkz. backend/app/api/routes/duels.py)
//
// Faz 3f (10 Eylül 2026 kullanıcı isteği — "düello isteği yollama
// ekranını göremedim" → "Evet, arkadaşa davet gönderme ekle"): bu
// sayfaya "Arkadaşını Davet Et" (arkadaş seç + davet gönder) ve
// "Bekleyen Davetler" (gelen: kabul/reddet, giden: iptal) bölümleri
// eklendi — davet edilen ÖZEL bir odaya (is_private=true) yönlendiriliyor,
// normal lobi listesinde görünmüyor (bkz. duels.py list_duels).

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Swords, Plus, Users, Loader2, RefreshCw, UserPlus, Check, X, Clock } from 'lucide-react';
import { duelsApi, socialApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { DuelResponse, DuelInviteItem, FriendshipItem } from '@/types';

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
    inviteSectionTitle: 'Arkadaşını Davet Et', inviteFriendPlaceholder: 'Bir arkadaş seç',
    noFriendsForInvite: 'Davet edebileceğin arkadaşın yok.', sendInviteBtn: 'Davet Gönder',
    pendingInvitesTitle: 'Bekleyen Davetler', noPendingInvites: 'Bekleyen davet yok.',
    incomingInviteLabel: 'seni davet etti', outgoingInviteLabel: 'davet edildi',
    acceptBtn: 'Kabul Et', declineBtn: 'Reddet', cancelInviteBtn: 'İptal Et', waitingBadge: 'Bekliyor',
  },
  en: {
    title: 'Duel', subtitle: 'A live vocabulary competition with multiple players at once.',
    createBtn: 'Create Room', loading: 'Loading…', error: 'Something went wrong.',
    empty: 'No waiting rooms right now.', emptySub: 'Be the first to open one!',
    playersLabel: 'players', joinBtn: 'Join', refreshBtn: 'Refresh',
    inviteSectionTitle: 'Invite a Friend', inviteFriendPlaceholder: 'Choose a friend',
    noFriendsForInvite: "You don't have any friends to invite.", sendInviteBtn: 'Send Invite',
    pendingInvitesTitle: 'Pending Invites', noPendingInvites: 'No pending invites.',
    incomingInviteLabel: 'invited you', outgoingInviteLabel: 'invited',
    acceptBtn: 'Accept', declineBtn: 'Decline', cancelInviteBtn: 'Cancel', waitingBadge: 'Waiting',
  },
  de: {
    title: 'Duell', subtitle: 'Ein Live-Vokabelwettbewerb mit mehreren Spielern gleichzeitig.',
    createBtn: 'Raum erstellen', loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.',
    empty: 'Gerade keine wartenden Räume.', emptySub: 'Eröffne den ersten Raum!',
    playersLabel: 'Spieler', joinBtn: 'Beitreten', refreshBtn: 'Aktualisieren',
    inviteSectionTitle: 'Freund einladen', inviteFriendPlaceholder: 'Freund auswählen',
    noFriendsForInvite: 'Du hast keine Freunde zum Einladen.', sendInviteBtn: 'Einladung senden',
    pendingInvitesTitle: 'Ausstehende Einladungen', noPendingInvites: 'Keine ausstehenden Einladungen.',
    incomingInviteLabel: 'hat dich eingeladen', outgoingInviteLabel: 'eingeladen',
    acceptBtn: 'Annehmen', declineBtn: 'Ablehnen', cancelInviteBtn: 'Abbrechen', waitingBadge: 'Wartet',
  },
  fr: {
    title: 'Duel', subtitle: 'Une compétition de vocabulaire en direct avec plusieurs joueurs à la fois.',
    createBtn: 'Créer une salle', loading: 'Chargement…', error: "Une erreur s'est produite.",
    empty: "Aucune salle en attente pour l'instant.", emptySub: 'Sois le premier à en ouvrir une !',
    playersLabel: 'joueurs', joinBtn: 'Rejoindre', refreshBtn: 'Actualiser',
    inviteSectionTitle: 'Inviter un ami', inviteFriendPlaceholder: 'Choisir un ami',
    noFriendsForInvite: "Tu n'as aucun ami à inviter.", sendInviteBtn: 'Envoyer l’invitation',
    pendingInvitesTitle: 'Invitations en attente', noPendingInvites: 'Aucune invitation en attente.',
    incomingInviteLabel: "t'a invité", outgoingInviteLabel: 'invité',
    acceptBtn: 'Accepter', declineBtn: 'Refuser', cancelInviteBtn: 'Annuler', waitingBadge: 'En attente',
  },
  es: {
    title: 'Duelo', subtitle: 'Una competencia de vocabulario en vivo con varios jugadores a la vez.',
    createBtn: 'Crear sala', loading: 'Cargando…', error: 'Algo salió mal.',
    empty: 'No hay salas en espera ahora mismo.', emptySub: '¡Sé el primero en abrir una!',
    playersLabel: 'jugadores', joinBtn: 'Unirse', refreshBtn: 'Actualizar',
    inviteSectionTitle: 'Invitar a un amigo', inviteFriendPlaceholder: 'Elige un amigo',
    noFriendsForInvite: 'No tienes amigos para invitar.', sendInviteBtn: 'Enviar invitación',
    pendingInvitesTitle: 'Invitaciones pendientes', noPendingInvites: 'No hay invitaciones pendientes.',
    incomingInviteLabel: 'te invitó', outgoingInviteLabel: 'invitado',
    acceptBtn: 'Aceptar', declineBtn: 'Rechazar', cancelInviteBtn: 'Cancelar', waitingBadge: 'Esperando',
  },
  it: {
    title: 'Duello', subtitle: 'Una gara di vocabolario dal vivo con più giocatori contemporaneamente.',
    createBtn: 'Crea stanza', loading: 'Caricamento…', error: 'Qualcosa è andato storto.',
    empty: 'Nessuna stanza in attesa al momento.', emptySub: 'Sii il primo ad aprirne una!',
    playersLabel: 'giocatori', joinBtn: 'Partecipa', refreshBtn: 'Aggiorna',
    inviteSectionTitle: 'Invita un amico', inviteFriendPlaceholder: 'Scegli un amico',
    noFriendsForInvite: 'Non hai amici da invitare.', sendInviteBtn: 'Invia invito',
    pendingInvitesTitle: 'Inviti in sospeso', noPendingInvites: 'Nessun invito in sospeso.',
    incomingInviteLabel: 'ti ha invitato', outgoingInviteLabel: 'invitato',
    acceptBtn: 'Accetta', declineBtn: 'Rifiuta', cancelInviteBtn: 'Annulla', waitingBadge: 'In attesa',
  },
  ar: {
    title: 'مبارزة', subtitle: 'مسابقة مفردات مباشرة مع عدة لاعبين في آن واحد.',
    createBtn: 'إنشاء غرفة', loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.',
    empty: 'لا توجد غرف بانتظار حالياً.', emptySub: 'كن أول من يفتح غرفة!',
    playersLabel: 'لاعبين', joinBtn: 'انضمام', refreshBtn: 'تحديث',
    inviteSectionTitle: 'دعوة صديق', inviteFriendPlaceholder: 'اختر صديقاً',
    noFriendsForInvite: 'ليس لديك أصدقاء لدعوتهم.', sendInviteBtn: 'إرسال الدعوة',
    pendingInvitesTitle: 'الدعوات المعلقة', noPendingInvites: 'لا توجد دعوات معلقة.',
    incomingInviteLabel: 'دعاك', outgoingInviteLabel: 'مدعو',
    acceptBtn: 'قبول', declineBtn: 'رفض', cancelInviteBtn: 'إلغاء', waitingBadge: 'قيد الانتظار',
  },
  ru: {
    title: 'Дуэль', subtitle: 'Живое соревнование по словарному запасу с несколькими игроками одновременно.',
    createBtn: 'Создать комнату', loading: 'Загрузка…', error: 'Что-то пошло не так.',
    empty: 'Сейчас нет ожидающих комнат.', emptySub: 'Открой первую комнату!',
    playersLabel: 'игроков', joinBtn: 'Присоединиться', refreshBtn: 'Обновить',
    inviteSectionTitle: 'Пригласить друга', inviteFriendPlaceholder: 'Выбери друга',
    noFriendsForInvite: 'У тебя нет друзей для приглашения.', sendInviteBtn: 'Отправить приглашение',
    pendingInvitesTitle: 'Ожидающие приглашения', noPendingInvites: 'Нет ожидающих приглашений.',
    incomingInviteLabel: 'пригласил(а) тебя', outgoingInviteLabel: 'приглашён',
    acceptBtn: 'Принять', declineBtn: 'Отклонить', cancelInviteBtn: 'Отменить', waitingBadge: 'Ожидание',
  },
  ja: {
    title: 'デュエル', subtitle: '複数のプレイヤーと同時に対戦するライブ単語バトル。',
    createBtn: 'ルームを作成', loading: '読み込み中…', error: '問題が発生しました。',
    empty: '現在待機中のルームはありません。', emptySub: '最初のルームを開いてみましょう!',
    playersLabel: '人', joinBtn: '参加', refreshBtn: '更新',
    inviteSectionTitle: '友達を招待', inviteFriendPlaceholder: '友達を選択',
    noFriendsForInvite: '招待できる友達がいません。', sendInviteBtn: '招待を送る',
    pendingInvitesTitle: '保留中の招待', noPendingInvites: '保留中の招待はありません。',
    incomingInviteLabel: 'があなたを招待しました', outgoingInviteLabel: '招待済み',
    acceptBtn: '承認', declineBtn: '拒否', cancelInviteBtn: 'キャンセル', waitingBadge: '待機中',
  },
  pt: {
    title: 'Duelo', subtitle: 'Uma competição de vocabulário ao vivo com vários jogadores ao mesmo tempo.',
    createBtn: 'Criar Sala', loading: 'Carregando…', error: 'Algo deu errado.',
    empty: 'Nenhuma sala aguardando no momento.', emptySub: 'Seja o primeiro a abrir uma!',
    playersLabel: 'jogadores', joinBtn: 'Entrar', refreshBtn: 'Atualizar',
    inviteSectionTitle: 'Convidar amigo', inviteFriendPlaceholder: 'Escolha um amigo',
    noFriendsForInvite: 'Você não tem amigos para convidar.', sendInviteBtn: 'Enviar convite',
    pendingInvitesTitle: 'Convites pendentes', noPendingInvites: 'Nenhum convite pendente.',
    incomingInviteLabel: 'convidou você', outgoingInviteLabel: 'convidado',
    acceptBtn: 'Aceitar', declineBtn: 'Recusar', cancelInviteBtn: 'Cancelar', waitingBadge: 'Aguardando',
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

  const [friends, setFriends] = useState<FriendshipItem[]>([]);
  const [selectedFriendUsername, setSelectedFriendUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<DuelInviteItem[]>([]);
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);

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

  const loadFriends = useCallback(async () => {
    try {
      const items = await socialApi.getFriends();
      setFriends(items.filter((f) => f.status === 'accepted'));
    } catch {
      // sessiz geç — davet bölümü opsiyonel, lobi listesini engellemesin
    }
  }, []);

  const loadInvites = useCallback(async () => {
    try {
      const res = await duelsApi.listInvites();
      setInvites(res.items);
    } catch {
      // sessiz geç — aynı sebep
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    load();
    loadFriends();
    loadInvites();
  }, [load, loadFriends, loadInvites]);

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

  const handleSendInvite = async () => {
    if (!selectedFriendUsername) return;
    setInviting(true);
    try {
      await duelsApi.invite(selectedFriendUsername);
      setSelectedFriendUsername('');
      await loadInvites();
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvite = async (invite: DuelInviteItem) => {
    setActingInviteId(invite.id);
    try {
      await duelsApi.acceptInvite(invite.id);
      router.push(`/duels/${invite.duel_id}`);
    } catch (err) {
      setError(errorDetail(err) || t.error);
      setActingInviteId(null);
    }
  };

  const handleDeclineInvite = async (invite: DuelInviteItem) => {
    setActingInviteId(invite.id);
    try {
      await duelsApi.declineInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setActingInviteId(null);
    }
  };

  const handleCancelInvite = async (invite: DuelInviteItem) => {
    setActingInviteId(invite.id);
    try {
      await duelsApi.cancelInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setActingInviteId(null);
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

      {/* Arkadaşını Davet Et (Faz 3f) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t.inviteSectionTitle}</h2>
        </div>
        {friends.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500">{t.noFriendsForInvite}</p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedFriendUsername}
              onChange={(e) => setSelectedFriendUsername(e.target.value)}
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100"
            >
              <option value="">{t.inviteFriendPlaceholder}</option>
              {friends.map((f) => (
                <option key={f.id} value={f.user.username ?? ''}>
                  {f.user.display_name || f.user.username}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedFriendUsername || inviting}
              onClick={handleSendInvite}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 text-sm font-medium disabled:opacity-50 shrink-0"
            >
              {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              {t.sendInviteBtn}
            </button>
          </div>
        )}
      </div>

      {/* Bekleyen Davetler (Faz 3f) */}
      {invites.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 space-y-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            {t.pendingInvitesTitle}
          </h2>
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 dark:text-slate-100 truncate">
                  <span className="font-medium">{inv.other_user?.display_name || inv.other_user?.username || '—'}</span>{' '}
                  {inv.is_inviter ? t.outgoingInviteLabel : t.incomingInviteLabel}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {inv.is_inviter ? (
                  <>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{t.waitingBadge}</span>
                    <button
                      type="button"
                      disabled={actingInviteId === inv.id}
                      onClick={() => handleCancelInvite(inv)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
                      aria-label={t.cancelInviteBtn}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={actingInviteId === inv.id}
                      onClick={() => handleAcceptInvite(inv)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-500/10 dark:hover:bg-green-500/20 dark:text-green-400 text-xs font-medium disabled:opacity-50"
                    >
                      {actingInviteId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      {t.acceptBtn}
                    </button>
                    <button
                      type="button"
                      disabled={actingInviteId === inv.id}
                      onClick={() => handleDeclineInvite(inv)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 disabled:opacity-50"
                      aria-label={t.declineBtn}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
