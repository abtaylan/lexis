'use client';

// app/(app)/league/custom/[id]/page.tsx — V2 Faz 3 devamı (10 Eylül
// 2026 kullanıcı isteği): tek bir özel ligin üye sıralaması + davet
// arayüzü. Kademe lig detayının (league/[id]/page.tsx) aksine buraya
// SADECE üyeler girebilir (bkz. backend custom_leagues_select_members
// RLS ilkesi) — 403 durumunda listeye geri yönlendirilir.
//
// "kendi arkadaşlarımı ve sistemde bulunan diğer user'ları
// ekleyebilmeliyim" — arkadaş-only bir <select> yerine (duels/page.tsx
// deseni) burada socialApi.searchUsers ile SİSTEMDEKİ HERHANGİ bir
// kullanıcıyı arayıp davet edebileceğin bir arama kutusu var; backend
// zaten arkadaşlık kontrolü yapmıyor (bkz. custom_leagues.py).

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { Users2, ArrowLeft, Loader2, RefreshCw, UserPlus, Trash2, LogOut, Search, Crown, ArrowRightLeft } from 'lucide-react';
import { customLeaguesApi, socialApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import { useAuth } from '@/store/auth';
import { LeagueTable } from '@/components/league/LeagueTable';
import type { CustomLeagueDetailResponse, UserCard } from '@/types';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const L: Record<Locale, Record<string, string>> = {
  tr: {
    back: 'Özel Ligler', loading: 'Yükleniyor…', error: 'Bir şeyler ters gitti.',
    notFound: 'Bu özel liğe erişimin yok ya da lig silinmiş.', refreshBtn: 'Yenile',
    rankLabel: 'Sıra', userLabel: 'Kullanıcı', xpLabel: 'XP', youLabel: 'Sen',
    gamesWonLabel: 'Oyun', duelsWonLabel: 'Düello', flashcardsLabel: 'Kart',
    inviteSectionTitle: 'Üye Davet Et', searchPlaceholder: 'Kullanıcı adı veya isim ara…',
    searching: 'Aranıyor…', noResults: 'Sonuç bulunamadı.', inviteBtn: 'Davet Et',
    inviteSent: 'Davet gönderildi.', deleteLeagueBtn: 'Ligi Sil', leaveLeagueBtn: 'Ligden Ayrıl',
    creatorCannotLeave: 'Kurucu ligden ayrılamaz, ligi silebilir.', membersFull: 'Lig dolu.',
    transferSectionTitle: 'Kurucuyu Devret', transferBtn: 'Devret', transferSuccess: 'Kurucu devredildi.',
  },
  en: {
    back: 'Custom Leagues', loading: 'Loading…', error: 'Something went wrong.',
    notFound: "You don't have access to this league, or it was deleted.", refreshBtn: 'Refresh',
    rankLabel: 'Rank', userLabel: 'User', xpLabel: 'XP', youLabel: 'You',
    gamesWonLabel: 'Games', duelsWonLabel: 'Duels', flashcardsLabel: 'Cards',
    inviteSectionTitle: 'Invite a Member', searchPlaceholder: 'Search by username or name…',
    searching: 'Searching…', noResults: 'No results found.', inviteBtn: 'Invite',
    inviteSent: 'Invite sent.', deleteLeagueBtn: 'Delete League', leaveLeagueBtn: 'Leave League',
    creatorCannotLeave: 'The owner cannot leave — delete the league instead.', membersFull: 'League is full.',
    transferSectionTitle: 'Transfer Ownership', transferBtn: 'Transfer', transferSuccess: 'Ownership transferred.',
  },
  de: {
    back: 'Eigene Ligen', loading: 'Wird geladen…', error: 'Etwas ist schiefgelaufen.',
    notFound: 'Du hast keinen Zugriff auf diese Liga, oder sie wurde gelöscht.', refreshBtn: 'Aktualisieren',
    rankLabel: 'Rang', userLabel: 'Nutzer', xpLabel: 'XP', youLabel: 'Du',
    gamesWonLabel: 'Spiele', duelsWonLabel: 'Duelle', flashcardsLabel: 'Karten',
    inviteSectionTitle: 'Mitglied einladen', searchPlaceholder: 'Nach Benutzername oder Name suchen…',
    searching: 'Suche läuft…', noResults: 'Keine Ergebnisse gefunden.', inviteBtn: 'Einladen',
    inviteSent: 'Einladung gesendet.', deleteLeagueBtn: 'Liga löschen', leaveLeagueBtn: 'Liga verlassen',
    creatorCannotLeave: 'Der Besitzer kann nicht austreten — lösche stattdessen die Liga.', membersFull: 'Liga ist voll.',
    transferSectionTitle: 'Besitz übertragen', transferBtn: 'Übertragen', transferSuccess: 'Besitz übertragen.',
  },
  fr: {
    back: 'Ligues personnalisées', loading: 'Chargement…', error: "Une erreur s'est produite.",
    notFound: "Tu n'as pas accès à cette ligue, ou elle a été supprimée.", refreshBtn: 'Actualiser',
    rankLabel: 'Rang', userLabel: 'Utilisateur', xpLabel: 'XP', youLabel: 'Toi',
    gamesWonLabel: 'Jeux', duelsWonLabel: 'Duels', flashcardsLabel: 'Cartes',
    inviteSectionTitle: 'Inviter un membre', searchPlaceholder: "Rechercher par nom d'utilisateur ou nom…",
    searching: 'Recherche…', noResults: 'Aucun résultat trouvé.', inviteBtn: 'Inviter',
    inviteSent: 'Invitation envoyée.', deleteLeagueBtn: 'Supprimer la ligue', leaveLeagueBtn: 'Quitter la ligue',
    creatorCannotLeave: 'Le propriétaire ne peut pas partir — supprime la ligue à la place.', membersFull: 'La ligue est complète.',
    transferSectionTitle: 'Transférer la propriété', transferBtn: 'Transférer', transferSuccess: 'Propriété transférée.',
  },
  es: {
    back: 'Ligas personalizadas', loading: 'Cargando…', error: 'Algo salió mal.',
    notFound: 'No tienes acceso a esta liga, o fue eliminada.', refreshBtn: 'Actualizar',
    rankLabel: 'Puesto', userLabel: 'Usuario', xpLabel: 'XP', youLabel: 'Tú',
    gamesWonLabel: 'Juegos', duelsWonLabel: 'Duelos', flashcardsLabel: 'Tarjetas',
    inviteSectionTitle: 'Invitar a un miembro', searchPlaceholder: 'Buscar por usuario o nombre…',
    searching: 'Buscando…', noResults: 'No se encontraron resultados.', inviteBtn: 'Invitar',
    inviteSent: 'Invitación enviada.', deleteLeagueBtn: 'Eliminar liga', leaveLeagueBtn: 'Salir de la liga',
    creatorCannotLeave: 'El propietario no puede salir — elimina la liga en su lugar.', membersFull: 'La liga está llena.',
    transferSectionTitle: 'Transferir propiedad', transferBtn: 'Transferir', transferSuccess: 'Propiedad transferida.',
  },
  it: {
    back: 'Leghe personalizzate', loading: 'Caricamento…', error: 'Qualcosa è andato storto.',
    notFound: 'Non hai accesso a questa lega, oppure è stata eliminata.', refreshBtn: 'Aggiorna',
    rankLabel: 'Pos.', userLabel: 'Utente', xpLabel: 'XP', youLabel: 'Tu',
    gamesWonLabel: 'Giochi', duelsWonLabel: 'Duelli', flashcardsLabel: 'Carte',
    inviteSectionTitle: 'Invita un membro', searchPlaceholder: 'Cerca per nome utente o nome…',
    searching: 'Ricerca…', noResults: 'Nessun risultato trovato.', inviteBtn: 'Invita',
    inviteSent: 'Invito inviato.', deleteLeagueBtn: 'Elimina lega', leaveLeagueBtn: 'Lascia la lega',
    creatorCannotLeave: 'Il proprietario non può uscire — elimina la lega invece.', membersFull: 'La lega è piena.',
    transferSectionTitle: 'Trasferisci proprietà', transferBtn: 'Trasferisci', transferSuccess: 'Proprietà trasferita.',
  },
  ar: {
    back: 'دوريات خاصة', loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.',
    notFound: 'ليس لديك وصول إلى هذا الدوري، أو تم حذفه.', refreshBtn: 'تحديث',
    rankLabel: 'المرتبة', userLabel: 'المستخدم', xpLabel: 'XP', youLabel: 'أنت',
    gamesWonLabel: 'ألعاب', duelsWonLabel: 'مبارزات', flashcardsLabel: 'بطاقات',
    inviteSectionTitle: 'دعوة عضو', searchPlaceholder: 'ابحث باسم المستخدم أو الاسم…',
    searching: 'جارٍ البحث…', noResults: 'لم يتم العثور على نتائج.', inviteBtn: 'دعوة',
    inviteSent: 'تم إرسال الدعوة.', deleteLeagueBtn: 'حذف الدوري', leaveLeagueBtn: 'مغادرة الدوري',
    creatorCannotLeave: 'لا يمكن للمالك المغادرة — احذف الدوري بدلاً من ذلك.', membersFull: 'الدوري ممتلئ.',
    transferSectionTitle: 'نقل الملكية', transferBtn: 'نقل', transferSuccess: 'تم نقل الملكية.',
  },
  ru: {
    back: 'Свои лиги', loading: 'Загрузка…', error: 'Что-то пошло не так.',
    notFound: 'У тебя нет доступа к этой лиге, или она была удалена.', refreshBtn: 'Обновить',
    rankLabel: 'Место', userLabel: 'Пользователь', xpLabel: 'XP', youLabel: 'Ты',
    gamesWonLabel: 'Игры', duelsWonLabel: 'Дуэли', flashcardsLabel: 'Карточки',
    inviteSectionTitle: 'Пригласить участника', searchPlaceholder: 'Поиск по имени пользователя или имени…',
    searching: 'Поиск…', noResults: 'Результатов не найдено.', inviteBtn: 'Пригласить',
    inviteSent: 'Приглашение отправлено.', deleteLeagueBtn: 'Удалить лигу', leaveLeagueBtn: 'Покинуть лигу',
    creatorCannotLeave: 'Владелец не может покинуть лигу — удали её вместо этого.', membersFull: 'Лига заполнена.',
    transferSectionTitle: 'Передать права владельца', transferBtn: 'Передать', transferSuccess: 'Права владельца переданы.',
  },
  ja: {
    back: 'カスタムリーグ', loading: '読み込み中…', error: '問題が発生しました。',
    notFound: 'このリーグへのアクセス権がないか、削除されています。', refreshBtn: '更新',
    rankLabel: '順位', userLabel: 'ユーザー', xpLabel: 'XP', youLabel: 'あなた',
    gamesWonLabel: 'ゲーム', duelsWonLabel: 'デュエル', flashcardsLabel: 'カード',
    inviteSectionTitle: 'メンバーを招待', searchPlaceholder: 'ユーザー名または名前で検索…',
    searching: '検索中…', noResults: '結果が見つかりません。', inviteBtn: '招待',
    inviteSent: '招待を送信しました。', deleteLeagueBtn: 'リーグを削除', leaveLeagueBtn: 'リーグを退出',
    creatorCannotLeave: 'オーナーは退出できません — 代わりにリーグを削除してください。', membersFull: 'リーグは満員です。',
    transferSectionTitle: 'オーナー権限を譲渡', transferBtn: '譲渡', transferSuccess: 'オーナー権限を譲渡しました。',
  },
  pt: {
    back: 'Ligas personalizadas', loading: 'Carregando…', error: 'Algo deu errado.',
    notFound: 'Você não tem acesso a esta liga, ou ela foi excluída.', refreshBtn: 'Atualizar',
    rankLabel: 'Pos.', userLabel: 'Usuário', xpLabel: 'XP', youLabel: 'Você',
    gamesWonLabel: 'Jogos', duelsWonLabel: 'Duelos', flashcardsLabel: 'Cartões',
    inviteSectionTitle: 'Convidar membro', searchPlaceholder: 'Buscar por usuário ou nome…',
    searching: 'Buscando…', noResults: 'Nenhum resultado encontrado.', inviteBtn: 'Convidar',
    inviteSent: 'Convite enviado.', deleteLeagueBtn: 'Excluir liga', leaveLeagueBtn: 'Sair da liga',
    creatorCannotLeave: 'O proprietário não pode sair — exclua a liga.', membersFull: 'A liga está cheia.',
    transferSectionTitle: 'Transferir propriedade', transferBtn: 'Transferir', transferSuccess: 'Propriedade transferida.',
  },
};

export default function CustomLeagueDetailPage() {
  const params = useParams<{ id: string }>();
  const leagueId = params.id;
  const router = useRouter();
  const { locale } = useLocale();
  const t = L[locale];
  const { user } = useAuth();

  const [league, setLeague] = useState<CustomLeagueDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [transferMsg, setTransferMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customLeaguesApi.getDetail(leagueId);
      setLeague(res);
    } catch (err) {
      if (err instanceof AxiosError && (err.response?.status === 403 || err.response?.status === 404)) {
        setNotFound(true);
      } else {
        setError(errorDetail(err) || t.error);
      }
    } finally {
      setLoading(false);
    }
  }, [leagueId, t.error]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni
    load();
  }, [load]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const items = await socialApi.searchUsers(query.trim());
        const memberIds = new Set((league?.members ?? []).map((m) => m.user_id));
        setSearchResults(items.filter((u) => !memberIds.has(u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- league?.members değişince yeniden aramak gereksiz, sadece query tetiklemeli
  }, [query]);

  const handleInvite = async (u: UserCard) => {
    if (!u.username) return;
    setInvitingId(u.id);
    setInviteMsg(null);
    try {
      await customLeaguesApi.invite(leagueId, u.username);
      setInviteMsg(t.inviteSent);
      setSearchResults((prev) => prev.filter((r) => r.id !== u.id));
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setInvitingId(null);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await customLeaguesApi.leave(leagueId);
      router.push('/league/custom');
    } catch (err) {
      setError(errorDetail(err) || t.error);
      setLeaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await customLeaguesApi.delete(leagueId);
      router.push('/league/custom');
    } catch (err) {
      setError(errorDetail(err) || t.error);
      setDeleting(false);
    }
  };

  const handleTransfer = async (userId: string) => {
    setTransferringId(userId);
    setTransferMsg(null);
    try {
      await customLeaguesApi.transferOwnership(leagueId, userId);
      setTransferMsg(t.transferSuccess);
      await load();
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setTransferringId(null);
    }
  };

  const isCreator = !!league && !!user && league.created_by === user.id;
  const isFull = !!league && league.members.length >= league.max_members;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
      <button
        type="button"
        onClick={() => router.push('/league/custom')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>

      {loading && <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">{t.loading}</p>}
      {!loading && notFound && <p className="text-sm text-red-400 dark:text-red-300 py-8 text-center">{t.notFound}</p>}

      {!loading && !notFound && league && (
        <>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                <Users2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  {league.name}
                  {isCreator && <Crown className="w-4 h-4 text-amber-500" />}
                </h1>
                <p className="text-sm text-gray-400 dark:text-slate-500">
                  {league.members.length}/{league.max_members}
                </p>
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
              {isCreator ? (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 text-sm font-medium disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {t.deleteLeagueBtn}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={leaving}
                  onClick={handleLeave}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 text-sm font-medium disabled:opacity-50"
                >
                  {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  {t.leaveLeagueBtn}
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-400 dark:text-red-300">{error}</p>}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t.inviteSectionTitle}</h2>
            </div>
            {isFull ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t.membersFull}</p>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-300 dark:text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setInviteMsg(null);
                    }}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-slate-100"
                  />
                </div>
                {inviteMsg && <p className="text-xs text-green-600 dark:text-green-400">{inviteMsg}</p>}
                {searching && <p className="text-xs text-gray-400 dark:text-slate-500">{t.searching}</p>}
                {!searching && query.trim() && searchResults.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-slate-500">{t.noResults}</p>
                )}
                {searchResults.length > 0 && (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                            {u.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element -- dış kaynaklı avatar URL'i, diğer sayfalarla aynı desen
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Users2 className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                            )}
                          </div>
                          <span className="text-sm text-gray-900 dark:text-slate-100 truncate">
                            {u.display_name || u.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={invitingId === u.id}
                          onClick={() => handleInvite(u)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 dark:text-purple-400 text-xs font-medium disabled:opacity-50 shrink-0"
                        >
                          {invitingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          {t.inviteBtn}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {isCreator && league.members.length > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t.transferSectionTitle}</h2>
              </div>
              {transferMsg && <p className="text-xs text-green-600 dark:text-green-400">{transferMsg}</p>}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {league.members.filter((m) => !m.is_me).map((m) => (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {m.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- dış kaynaklı avatar URL'i, diğer sayfalarla aynı desen
                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users2 className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                        )}
                      </div>
                      <span className="text-sm text-gray-900 dark:text-slate-100 truncate">
                        {m.display_name || m.username}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={transferringId === m.user_id}
                      onClick={() => handleTransfer(m.user_id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 dark:text-purple-400 text-xs font-medium disabled:opacity-50 shrink-0"
                    >
                      {transferringId === m.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                      {t.transferBtn}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
            <LeagueTable
              members={league.members}
              rankLabel={t.rankLabel}
              userLabel={t.userLabel}
              xpLabel={t.xpLabel}
              youLabel={t.youLabel}
              gamesWonLabel={t.gamesWonLabel}
              duelsWonLabel={t.duelsWonLabel}
              flashcardsLabel={t.flashcardsLabel}
              locale={locale}
            />
          </div>
        </>
      )}
    </div>
  );
}
