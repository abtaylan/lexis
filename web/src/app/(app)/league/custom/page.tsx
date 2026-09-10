'use client';

// app/(app)/league/custom/page.tsx — V2 Faz 3 devamı (10 Eylül 2026
// kullanıcı isteği — "Ek olarak kendi arkadaşlarımdan oluşan özel lig
// kurup kendi aramızda yarışabilmeliyim. Lig sayfasına girince Düello'da
// olduğu gibi yeni oda aç mantığında bir buton olacak..."): kademe
// (tier) lig sisteminden BAĞIMSIZ, kullanıcının kendi kurduğu küçük
// "arkadaş ligleri" listesi. UI deseni app/(app)/duels/page.tsx'in
// BİREBİR aynısı (oda listesi + davet + bekleyen davetler), tek fark:
// oda "adı" var (isimsiz düello odalarından farklı olarak) ve davet
// SADECE arkadaşlarla sınırlı değil — /league/custom/[id] içindeki
// arama kutusu ile sistemdeki HERHANGİ bir kullanıcı davet edilebilir
// (bkz. backend/app/api/routes/custom_leagues.py::invite_to_custom_league,
// duels.py'nin aksine arkadaşlık kontrolü YOK — kasıtlı).
// Backend: /api/v1/custom-leagues/* (bkz. backend/app/api/routes/custom_leagues.py)

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Users2, Plus, Users, Loader2, RefreshCw, Check, X, Clock, Trash2, Crown } from 'lucide-react';
import { customLeaguesApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { CustomLeagueItem, CustomLeagueInviteItem } from '@/types';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const L: Record<Locale, Record<string, string>> = {
  tr: {
    title: 'Özel Ligler', subtitle: 'Arkadaşlarından ve istediğin kullanıcılardan kendi ligini kur.',
    createBtn: 'Yeni Özel Lig Kur', loading: 'Yükleniyor…', error: 'Bir şeyler ters gitti.',
    empty: 'Henüz bir özel ligin yok.', emptySub: 'İlk özel ligini sen kur!',
    membersLabel: 'üye', openBtn: 'Aç', refreshBtn: 'Yenile', creatorBadge: 'Kurucu',
    namePlaceholder: 'Lig adı (örn. Kelime Kulübü)', maxMembersLabel: 'Maks. üye',
    createSubmitBtn: 'Kur', createCancelBtn: 'Vazgeç',
    pendingInvitesTitle: 'Bekleyen Davetler', noPendingInvites: 'Bekleyen davet yok.',
    incomingInviteLabel: 'seni davet etti', outgoingInviteLabel: 'davet edildi',
    acceptBtn: 'Kabul Et', declineBtn: 'Reddet', cancelInviteBtn: 'İptal Et', waitingBadge: 'Bekliyor',
    nameRequired: 'Lig adı gerekli.',
  },
  en: {
    title: 'Custom Leagues', subtitle: 'Build your own league with friends and anyone else you invite.',
    createBtn: 'Create Custom League', loading: 'Loading…', error: 'Something went wrong.',
    empty: "You don't have a custom league yet.", emptySub: 'Create your first one!',
    membersLabel: 'members', openBtn: 'Open', refreshBtn: 'Refresh', creatorBadge: 'Owner',
    namePlaceholder: 'League name (e.g. Word Club)', maxMembersLabel: 'Max members',
    createSubmitBtn: 'Create', createCancelBtn: 'Cancel',
    pendingInvitesTitle: 'Pending Invites', noPendingInvites: 'No pending invites.',
    incomingInviteLabel: 'invited you', outgoingInviteLabel: 'invited',
    acceptBtn: 'Accept', declineBtn: 'Decline', cancelInviteBtn: 'Cancel', waitingBadge: 'Waiting',
    nameRequired: 'League name is required.',
  },
  de: {
    title: 'Eigene Ligen', subtitle: 'Gründe deine eigene Liga mit Freunden und anderen Nutzern.',
    createBtn: 'Eigene Liga erstellen', loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.',
    empty: 'Du hast noch keine eigene Liga.', emptySub: 'Erstelle deine erste!',
    membersLabel: 'Mitglieder', openBtn: 'Öffnen', refreshBtn: 'Aktualisieren', creatorBadge: 'Besitzer',
    namePlaceholder: 'Liganame (z. B. Wortclub)', maxMembersLabel: 'Max. Mitglieder',
    createSubmitBtn: 'Erstellen', createCancelBtn: 'Abbrechen',
    pendingInvitesTitle: 'Ausstehende Einladungen', noPendingInvites: 'Keine ausstehenden Einladungen.',
    incomingInviteLabel: 'hat dich eingeladen', outgoingInviteLabel: 'eingeladen',
    acceptBtn: 'Annehmen', declineBtn: 'Ablehnen', cancelInviteBtn: 'Abbrechen', waitingBadge: 'Wartet',
    nameRequired: 'Liganame ist erforderlich.',
  },
  fr: {
    title: 'Ligues personnalisées', subtitle: 'Crée ta propre ligue avec des amis et d’autres utilisateurs.',
    createBtn: 'Créer une ligue', loading: 'Chargement…', error: "Une erreur s'est produite.",
    empty: "Tu n'as pas encore de ligue personnalisée.", emptySub: 'Crée la première !',
    membersLabel: 'membres', openBtn: 'Ouvrir', refreshBtn: 'Actualiser', creatorBadge: 'Propriétaire',
    namePlaceholder: 'Nom de la ligue (ex. Club des mots)', maxMembersLabel: 'Membres max',
    createSubmitBtn: 'Créer', createCancelBtn: 'Annuler',
    pendingInvitesTitle: 'Invitations en attente', noPendingInvites: 'Aucune invitation en attente.',
    incomingInviteLabel: "t'a invité", outgoingInviteLabel: 'invité',
    acceptBtn: 'Accepter', declineBtn: 'Refuser', cancelInviteBtn: 'Annuler', waitingBadge: 'En attente',
    nameRequired: 'Le nom de la ligue est requis.',
  },
  es: {
    title: 'Ligas personalizadas', subtitle: 'Crea tu propia liga con amigos y otros usuarios.',
    createBtn: 'Crear liga personalizada', loading: 'Cargando…', error: 'Algo salió mal.',
    empty: 'Aún no tienes una liga personalizada.', emptySub: '¡Crea la primera!',
    membersLabel: 'miembros', openBtn: 'Abrir', refreshBtn: 'Actualizar', creatorBadge: 'Propietario',
    namePlaceholder: 'Nombre de la liga (ej. Club de palabras)', maxMembersLabel: 'Máx. miembros',
    createSubmitBtn: 'Crear', createCancelBtn: 'Cancelar',
    pendingInvitesTitle: 'Invitaciones pendientes', noPendingInvites: 'No hay invitaciones pendientes.',
    incomingInviteLabel: 'te invitó', outgoingInviteLabel: 'invitado',
    acceptBtn: 'Aceptar', declineBtn: 'Rechazar', cancelInviteBtn: 'Cancelar', waitingBadge: 'Esperando',
    nameRequired: 'El nombre de la liga es obligatorio.',
  },
  it: {
    title: 'Leghe personalizzate', subtitle: 'Crea la tua lega con amici e altri utenti.',
    createBtn: 'Crea lega personalizzata', loading: 'Caricamento…', error: 'Qualcosa è andato storto.',
    empty: 'Non hai ancora una lega personalizzata.', emptySub: 'Crea la prima!',
    membersLabel: 'membri', openBtn: 'Apri', refreshBtn: 'Aggiorna', creatorBadge: 'Proprietario',
    namePlaceholder: 'Nome della lega (es. Club delle parole)', maxMembersLabel: 'Membri max',
    createSubmitBtn: 'Crea', createCancelBtn: 'Annulla',
    pendingInvitesTitle: 'Inviti in sospeso', noPendingInvites: 'Nessun invito in sospeso.',
    incomingInviteLabel: 'ti ha invitato', outgoingInviteLabel: 'invitato',
    acceptBtn: 'Accetta', declineBtn: 'Rifiuta', cancelInviteBtn: 'Annulla', waitingBadge: 'In attesa',
    nameRequired: 'Il nome della lega è obbligatorio.',
  },
  ar: {
    title: 'دوريات خاصة', subtitle: 'أنشئ دوريتك الخاصة مع أصدقائك وأي مستخدم آخر.',
    createBtn: 'إنشاء دوري خاص', loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.',
    empty: 'ليس لديك دوري خاص بعد.', emptySub: 'أنشئ أول دوري لك!',
    membersLabel: 'أعضاء', openBtn: 'فتح', refreshBtn: 'تحديث', creatorBadge: 'المالك',
    namePlaceholder: 'اسم الدوري (مثال: نادي الكلمات)', maxMembersLabel: 'الحد الأقصى للأعضاء',
    createSubmitBtn: 'إنشاء', createCancelBtn: 'إلغاء',
    pendingInvitesTitle: 'الدعوات المعلقة', noPendingInvites: 'لا توجد دعوات معلقة.',
    incomingInviteLabel: 'دعاك', outgoingInviteLabel: 'مدعو',
    acceptBtn: 'قبول', declineBtn: 'رفض', cancelInviteBtn: 'إلغاء', waitingBadge: 'قيد الانتظار',
    nameRequired: 'اسم الدوري مطلوب.',
  },
  ru: {
    title: 'Свои лиги', subtitle: 'Создай собственную лигу с друзьями и другими пользователями.',
    createBtn: 'Создать свою лигу', loading: 'Загрузка…', error: 'Что-то пошло не так.',
    empty: 'У тебя пока нет своей лиги.', emptySub: 'Создай первую!',
    membersLabel: 'участников', openBtn: 'Открыть', refreshBtn: 'Обновить', creatorBadge: 'Владелец',
    namePlaceholder: 'Название лиги (напр. Клуб слов)', maxMembersLabel: 'Макс. участников',
    createSubmitBtn: 'Создать', createCancelBtn: 'Отмена',
    pendingInvitesTitle: 'Ожидающие приглашения', noPendingInvites: 'Нет ожидающих приглашений.',
    incomingInviteLabel: 'пригласил(а) тебя', outgoingInviteLabel: 'приглашён',
    acceptBtn: 'Принять', declineBtn: 'Отклонить', cancelInviteBtn: 'Отменить', waitingBadge: 'Ожидание',
    nameRequired: 'Название лиги обязательно.',
  },
  ja: {
    title: 'カスタムリーグ', subtitle: '友達や他のユーザーと自分だけのリーグを作ろう。',
    createBtn: 'カスタムリーグを作成', loading: '読み込み中…', error: '問題が発生しました。',
    empty: 'まだカスタムリーグがありません。', emptySub: '最初のリーグを作成しましょう!',
    membersLabel: '人', openBtn: '開く', refreshBtn: '更新', creatorBadge: 'オーナー',
    namePlaceholder: 'リーグ名 (例: 単語クラブ)', maxMembersLabel: '最大人数',
    createSubmitBtn: '作成', createCancelBtn: 'キャンセル',
    pendingInvitesTitle: '保留中の招待', noPendingInvites: '保留中の招待はありません。',
    incomingInviteLabel: 'があなたを招待しました', outgoingInviteLabel: '招待済み',
    acceptBtn: '承認', declineBtn: '拒否', cancelInviteBtn: 'キャンセル', waitingBadge: '待機中',
    nameRequired: 'リーグ名は必須です。',
  },
  pt: {
    title: 'Ligas personalizadas', subtitle: 'Crie sua própria liga com amigos e outros usuários.',
    createBtn: 'Criar liga personalizada', loading: 'Carregando…', error: 'Algo deu errado.',
    empty: 'Você ainda não tem uma liga personalizada.', emptySub: 'Crie a primeira!',
    membersLabel: 'membros', openBtn: 'Abrir', refreshBtn: 'Atualizar', creatorBadge: 'Proprietário',
    namePlaceholder: 'Nome da liga (ex. Clube das Palavras)', maxMembersLabel: 'Máx. membros',
    createSubmitBtn: 'Criar', createCancelBtn: 'Cancelar',
    pendingInvitesTitle: 'Convites pendentes', noPendingInvites: 'Nenhum convite pendente.',
    incomingInviteLabel: 'convidou você', outgoingInviteLabel: 'convidado',
    acceptBtn: 'Aceitar', declineBtn: 'Recusar', cancelInviteBtn: 'Cancelar', waitingBadge: 'Aguardando',
    nameRequired: 'O nome da liga é obrigatório.',
  },
};

export default function CustomLeaguesPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = L[locale];

  const [leagues, setLeagues] = useState<CustomLeagueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaxMembers, setNewMaxMembers] = useState(20);
  const [creating, setCreating] = useState(false);

  const [invites, setInvites] = useState<CustomLeagueInviteItem[]>([]);
  const [actingInviteId, setActingInviteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customLeaguesApi.listMine();
      setLeagues(res.items);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  const loadInvites = useCallback(async () => {
    try {
      const res = await customLeaguesApi.listInvites();
      setInvites(res.items);
    } catch {
      // sessiz geç — davet listesi opsiyonel, ana listeyi engellemesin
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı
    load();
    loadInvites();
  }, [load, loadInvites]);

  const refresh = () => {
    load();
    loadInvites();
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError(t.nameRequired);
      return;
    }
    setCreating(true);
    try {
      const league = await customLeaguesApi.create(newName.trim(), newMaxMembers);
      setShowCreateForm(false);
      setNewName('');
      setNewMaxMembers(20);
      router.push(`/league/custom/${league.id}`);
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptInvite = async (invite: CustomLeagueInviteItem) => {
    setActingInviteId(invite.id);
    try {
      const league = await customLeaguesApi.acceptInvite(invite.id);
      router.push(`/league/custom/${league.id}`);
    } catch (err) {
      setError(errorDetail(err) || t.error);
      setActingInviteId(null);
    }
  };

  const handleDeclineInvite = async (invite: CustomLeagueInviteItem) => {
    setActingInviteId(invite.id);
    try {
      await customLeaguesApi.declineInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setActingInviteId(null);
    }
  };

  const handleCancelInvite = async (invite: CustomLeagueInviteItem) => {
    setActingInviteId(invite.id);
    try {
      await customLeaguesApi.cancelInvite(invite.id);
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
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
            <Users2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
            <p className="text-sm text-gray-400 dark:text-slate-500">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label={t.refreshBtn}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t.createBtn}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t.namePlaceholder}
            maxLength={60}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100"
          />
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
              {t.maxMembersLabel}
              <input
                type="number"
                min={2}
                max={50}
                value={newMaxMembers}
                onChange={(e) => setNewMaxMembers(Number(e.target.value) || 20)}
                className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100"
              />
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800 text-xs font-medium"
              >
                {t.createCancelBtn}
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {t.createSubmitBtn}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <span className="font-semibold">{inv.league_name}</span>
                  {' — '}
                  {inv.is_received ? (
                    <>
                      <span className="font-medium">{inv.inviter_display_name || inv.inviter_username || '—'}</span>{' '}
                      {t.incomingInviteLabel}
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{inv.invitee_display_name || inv.invitee_username || '—'}</span>{' '}
                      {t.outgoingInviteLabel}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {inv.is_received ? (
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
                ) : (
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
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        {loading && <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">{t.loading}</p>}
        {!loading && error && <p className="text-sm text-red-400 dark:text-red-300 py-8 text-center">{error}</p>}
        {!loading && !error && leagues.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm text-gray-400 dark:text-slate-500">{t.empty}</p>
            <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">{t.emptySub}</p>
          </div>
        )}
        {!loading && !error && leagues.length > 0 && (
          <div className="space-y-1">
            {leagues.map((lg) => (
              <button
                type="button"
                key={lg.id}
                onClick={() => router.push(`/league/custom/${lg.id}`)}
                className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Users2 className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                      {lg.name}
                      {lg.is_creator && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label={t.creatorBadge} />}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {lg.member_count}/{lg.max_members} {t.membersLabel}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 text-xs font-medium shrink-0">
                  {t.openBtn}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
