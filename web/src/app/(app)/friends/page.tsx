'use client';

// app/(app)/friends/page.tsx — Madde 6, Faz 1: Arkadaşlık sistemi.
// 3 sekme: Arkadaşlarım / İstekler (gelen+giden) / Kullanıcı Ara.
// Takip etme burada da mümkün (arama sonuçlarında Takip et/Takipten çık),
// çünkü arkadaşlıktan bağımsız bir aksiyon — ayrı bir sayfa açmaya gerek yok.
// Backend: /api/v1/social/* (bkz. backend/app/api/routes/social.py)

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { Users, UserPlus, Check, X, Search, Loader2, Play, Ban as CancelIcon } from 'lucide-react';
import { socialApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { FriendshipItem, PendingRequests, UserCard, ChallengesList, ChallengeItem } from '@/types';

// backend HTTPException'ların { detail: string } gövdesini `any` kullanmadan
// okumak için (bkz. profile/page.tsx'teki err: any deseni — burada eslint'in
// @typescript-eslint/no-explicit-any kuralına yeni bir örnek eklememek için
// tercih edilmedi).
function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

// Merkezi i18n.tsx sözlüğüne dokunmadan yerel çeviri — Leaderboard.tsx/
// Sidebar.tsx'teki desenle aynı yaklaşım.
const L: Record<Locale, Record<string, string>> = {
  tr: {
    title: 'Arkadaşlar', tabFriends: 'Arkadaşlarım', tabRequests: 'İstekler', tabSearch: 'Kullanıcı Ara',
    loading: 'Yükleniyor…', error: 'Bir şeyler ters gitti.',
    friendsEmpty: 'Henüz arkadaşın yok.', friendsEmptySub: 'Kullanıcı Ara sekmesinden arkadaş ekleyebilirsin.',
    incomingTitle: 'Gelen istekler', incomingEmpty: 'Bekleyen gelen istek yok.',
    outgoingTitle: 'Giden istekler', outgoingEmpty: 'Bekleyen giden istek yok.',
    pendingLabel: 'Bekliyor', acceptBtn: 'Kabul et', declineBtn: 'Reddet', removeBtn: 'Çıkar',
    removeConfirm: 'Bu kişiyi arkadaş listenden çıkarmak istediğine emin misin?',
    searchPlaceholder: 'Kullanıcı adı veya isim ara…', searchBtn: 'Ara',
    searchEmpty: 'Sonuç bulunamadı.', searchHint: 'Aramaya başlamak için bir kullanıcı adı yaz.',
    sendRequestBtn: 'İstek gönder', requestSentBtn: 'İstek gönderildi', alreadyFriendsLabel: 'Arkadaşsınız',
    respondInRequestsHint: 'İstekler sekmesinden yanıtla', followBtn: 'Takip et', unfollowBtn: 'Takipten çık',
    levelPrefix: 'Sv.', sendError: 'İstek gönderilemedi.', actionError: 'İşlem başarısız oldu.',
    tabChallenges: 'Meydan Okumalar',
    incomingChallengesTitle: 'Gelen meydan okumalar', incomingChallengesEmpty: 'Bekleyen meydan okuma yok.',
    outgoingChallengesTitle: 'Gönderdiklerin', outgoingChallengesEmpty: 'Gönderdiğin bekleyen bir meydan okuma yok.',
    activeChallengesTitle: 'Devam edenler', activeChallengesEmpty: 'Devam eden bir meydan okuma yok.',
    completedChallengesTitle: 'Tamamlananlar', completedChallengesEmpty: 'Henüz tamamlanan meydan okuma yok.',
    playBtn: 'Oyna', cancelChallengeBtn: 'İptal et', waitingOpponentLabel: 'Rakip bekleniyor',
    youWonLabel: 'Kazandın 🎉', youLostLabel: 'Kaybettin', drawLabel: 'Berabere',
    modeMultipleChoice: 'Çoktan Seçmeli', modeWordle: 'Adam Asmaca', challengeError: 'Meydan okuma işlemi başarısız oldu.',
  },
  en: {
    title: 'Friends', tabFriends: 'My Friends', tabRequests: 'Requests', tabSearch: 'Find Users',
    loading: 'Loading…', error: 'Something went wrong.',
    friendsEmpty: "You don't have any friends yet.", friendsEmptySub: 'Add friends from the Find Users tab.',
    incomingTitle: 'Incoming requests', incomingEmpty: 'No incoming requests.',
    outgoingTitle: 'Sent requests', outgoingEmpty: 'No pending sent requests.',
    pendingLabel: 'Pending', acceptBtn: 'Accept', declineBtn: 'Decline', removeBtn: 'Remove',
    removeConfirm: 'Are you sure you want to remove this person from your friends?',
    searchPlaceholder: 'Search by username or name…', searchBtn: 'Search',
    searchEmpty: 'No results found.', searchHint: 'Type a username to start searching.',
    sendRequestBtn: 'Add friend', requestSentBtn: 'Request sent', alreadyFriendsLabel: 'Friends',
    respondInRequestsHint: 'Respond from the Requests tab', followBtn: 'Follow', unfollowBtn: 'Unfollow',
    levelPrefix: 'Lv.', sendError: 'Could not send the request.', actionError: 'The action failed.',
    tabChallenges: 'Challenges',
    incomingChallengesTitle: 'Incoming challenges', incomingChallengesEmpty: 'No pending challenges.',
    outgoingChallengesTitle: 'Sent challenges', outgoingChallengesEmpty: "You don't have any pending sent challenges.",
    activeChallengesTitle: 'In progress', activeChallengesEmpty: 'No challenges in progress.',
    completedChallengesTitle: 'Completed', completedChallengesEmpty: 'No completed challenges yet.',
    playBtn: 'Play', cancelChallengeBtn: 'Cancel', waitingOpponentLabel: 'Waiting for opponent',
    youWonLabel: 'You won 🎉', youLostLabel: 'You lost', drawLabel: 'Draw',
    modeMultipleChoice: 'Multiple Choice', modeWordle: 'Hangman', challengeError: 'The challenge action failed.',
  },
  de: {
    title: 'Freunde', tabFriends: 'Meine Freunde', tabRequests: 'Anfragen', tabSearch: 'Nutzer suchen',
    loading: 'Lädt…', error: 'Etwas ist schiefgelaufen.',
    friendsEmpty: 'Du hast noch keine Freunde.', friendsEmptySub: 'Füge Freunde über den Tab „Nutzer suchen" hinzu.',
    incomingTitle: 'Eingehende Anfragen', incomingEmpty: 'Keine eingehenden Anfragen.',
    outgoingTitle: 'Gesendete Anfragen', outgoingEmpty: 'Keine ausstehenden gesendeten Anfragen.',
    pendingLabel: 'Ausstehend', acceptBtn: 'Annehmen', declineBtn: 'Ablehnen', removeBtn: 'Entfernen',
    removeConfirm: 'Möchtest du diese Person wirklich aus deiner Freundesliste entfernen?',
    searchPlaceholder: 'Nach Benutzername oder Namen suchen…', searchBtn: 'Suchen',
    searchEmpty: 'Keine Ergebnisse gefunden.', searchHint: 'Gib einen Benutzernamen ein, um zu suchen.',
    sendRequestBtn: 'Freund hinzufügen', requestSentBtn: 'Anfrage gesendet', alreadyFriendsLabel: 'Befreundet',
    respondInRequestsHint: 'Im Tab „Anfragen" antworten', followBtn: 'Folgen', unfollowBtn: 'Entfolgen',
    levelPrefix: 'Lvl.', sendError: 'Die Anfrage konnte nicht gesendet werden.', actionError: 'Aktion fehlgeschlagen.',
    tabChallenges: 'Herausforderungen',
    incomingChallengesTitle: 'Eingehende Herausforderungen', incomingChallengesEmpty: 'Keine ausstehenden Herausforderungen.',
    outgoingChallengesTitle: 'Gesendete', outgoingChallengesEmpty: 'Keine ausstehenden gesendeten Herausforderungen.',
    activeChallengesTitle: 'Laufend', activeChallengesEmpty: 'Keine laufenden Herausforderungen.',
    completedChallengesTitle: 'Abgeschlossen', completedChallengesEmpty: 'Noch keine abgeschlossenen Herausforderungen.',
    playBtn: 'Spielen', cancelChallengeBtn: 'Abbrechen', waitingOpponentLabel: 'Warte auf Gegner',
    youWonLabel: 'Du hast gewonnen 🎉', youLostLabel: 'Du hast verloren', drawLabel: 'Unentschieden',
    modeMultipleChoice: 'Multiple Choice', modeWordle: 'Galgenmännchen', challengeError: 'Die Aktion ist fehlgeschlagen.',
  },
  fr: {
    title: 'Amis', tabFriends: 'Mes amis', tabRequests: 'Demandes', tabSearch: 'Rechercher des utilisateurs',
    loading: 'Chargement…', error: "Une erreur s'est produite.",
    friendsEmpty: "Tu n'as pas encore d'amis.", friendsEmptySub: "Ajoute des amis depuis l'onglet Rechercher des utilisateurs.",
    incomingTitle: 'Demandes reçues', incomingEmpty: 'Aucune demande reçue.',
    outgoingTitle: 'Demandes envoyées', outgoingEmpty: 'Aucune demande envoyée en attente.',
    pendingLabel: 'En attente', acceptBtn: 'Accepter', declineBtn: 'Refuser', removeBtn: 'Retirer',
    removeConfirm: 'Veux-tu vraiment retirer cette personne de tes amis ?',
    searchPlaceholder: "Rechercher par nom d'utilisateur ou nom…", searchBtn: 'Rechercher',
    searchEmpty: 'Aucun résultat trouvé.', searchHint: "Saisis un nom d'utilisateur pour lancer la recherche.",
    sendRequestBtn: 'Ajouter en ami', requestSentBtn: 'Demande envoyée', alreadyFriendsLabel: 'Amis',
    respondInRequestsHint: "Répondre depuis l'onglet Demandes", followBtn: 'Suivre', unfollowBtn: 'Ne plus suivre',
    levelPrefix: 'Niv.', sendError: "La demande n'a pas pu être envoyée.", actionError: "L'action a échoué.",
    tabChallenges: 'Défis',
    incomingChallengesTitle: 'Défis reçus', incomingChallengesEmpty: 'Aucun défi en attente.',
    outgoingChallengesTitle: 'Défis envoyés', outgoingChallengesEmpty: "Tu n'as aucun défi envoyé en attente.",
    activeChallengesTitle: 'En cours', activeChallengesEmpty: 'Aucun défi en cours.',
    completedChallengesTitle: 'Terminés', completedChallengesEmpty: 'Aucun défi terminé pour le moment.',
    playBtn: 'Jouer', cancelChallengeBtn: 'Annuler', waitingOpponentLabel: "En attente de l'adversaire",
    youWonLabel: 'Tu as gagné 🎉', youLostLabel: 'Tu as perdu', drawLabel: 'Match nul',
    modeMultipleChoice: 'Choix multiple', modeWordle: 'Pendu', challengeError: "L'action a échoué.",
  },
  es: {
    title: 'Amigos', tabFriends: 'Mis amigos', tabRequests: 'Solicitudes', tabSearch: 'Buscar usuarios',
    loading: 'Cargando…', error: 'Algo salió mal.',
    friendsEmpty: 'Todavía no tienes amigos.', friendsEmptySub: 'Añade amigos desde la pestaña Buscar usuarios.',
    incomingTitle: 'Solicitudes recibidas', incomingEmpty: 'No hay solicitudes recibidas.',
    outgoingTitle: 'Solicitudes enviadas', outgoingEmpty: 'No hay solicitudes enviadas pendientes.',
    pendingLabel: 'Pendiente', acceptBtn: 'Aceptar', declineBtn: 'Rechazar', removeBtn: 'Quitar',
    removeConfirm: '¿Seguro que quieres quitar a esta persona de tus amigos?',
    searchPlaceholder: 'Buscar por nombre de usuario o nombre…', searchBtn: 'Buscar',
    searchEmpty: 'No se encontraron resultados.', searchHint: 'Escribe un nombre de usuario para empezar a buscar.',
    sendRequestBtn: 'Añadir amigo', requestSentBtn: 'Solicitud enviada', alreadyFriendsLabel: 'Amigos',
    respondInRequestsHint: 'Responde desde la pestaña Solicitudes', followBtn: 'Seguir', unfollowBtn: 'Dejar de seguir',
    levelPrefix: 'Niv.', sendError: 'No se pudo enviar la solicitud.', actionError: 'La acción falló.',
    tabChallenges: 'Desafíos',
    incomingChallengesTitle: 'Desafíos recibidos', incomingChallengesEmpty: 'No hay desafíos pendientes.',
    outgoingChallengesTitle: 'Desafíos enviados', outgoingChallengesEmpty: 'No tienes desafíos enviados pendientes.',
    activeChallengesTitle: 'En curso', activeChallengesEmpty: 'No hay desafíos en curso.',
    completedChallengesTitle: 'Completados', completedChallengesEmpty: 'Todavía no hay desafíos completados.',
    playBtn: 'Jugar', cancelChallengeBtn: 'Cancelar', waitingOpponentLabel: 'Esperando al oponente',
    youWonLabel: 'Ganaste 🎉', youLostLabel: 'Perdiste', drawLabel: 'Empate',
    modeMultipleChoice: 'Opción múltiple', modeWordle: 'Ahorcado', challengeError: 'La acción falló.',
  },
  it: {
    title: 'Amici', tabFriends: 'I miei amici', tabRequests: 'Richieste', tabSearch: 'Cerca utenti',
    loading: 'Caricamento…', error: 'Qualcosa è andato storto.',
    friendsEmpty: 'Non hai ancora amici.', friendsEmptySub: 'Aggiungi amici dalla scheda Cerca utenti.',
    incomingTitle: 'Richieste ricevute', incomingEmpty: 'Nessuna richiesta ricevuta.',
    outgoingTitle: 'Richieste inviate', outgoingEmpty: 'Nessuna richiesta inviata in sospeso.',
    pendingLabel: 'In sospeso', acceptBtn: 'Accetta', declineBtn: 'Rifiuta', removeBtn: 'Rimuovi',
    removeConfirm: 'Sei sicuro di voler rimuovere questa persona dai tuoi amici?',
    searchPlaceholder: 'Cerca per nome utente o nome…', searchBtn: 'Cerca',
    searchEmpty: 'Nessun risultato trovato.', searchHint: 'Digita un nome utente per iniziare la ricerca.',
    sendRequestBtn: 'Aggiungi amico', requestSentBtn: 'Richiesta inviata', alreadyFriendsLabel: 'Amici',
    respondInRequestsHint: 'Rispondi dalla scheda Richieste', followBtn: 'Segui', unfollowBtn: 'Smetti di seguire',
    levelPrefix: 'Liv.', sendError: 'Impossibile inviare la richiesta.', actionError: "L'azione non è riuscita.",
    tabChallenges: 'Sfide',
    incomingChallengesTitle: 'Sfide ricevute', incomingChallengesEmpty: 'Nessuna sfida in sospeso.',
    outgoingChallengesTitle: 'Sfide inviate', outgoingChallengesEmpty: 'Nessuna sfida inviata in sospeso.',
    activeChallengesTitle: 'In corso', activeChallengesEmpty: 'Nessuna sfida in corso.',
    completedChallengesTitle: 'Completate', completedChallengesEmpty: 'Nessuna sfida completata finora.',
    playBtn: 'Gioca', cancelChallengeBtn: 'Annulla', waitingOpponentLabel: "In attesa dell'avversario",
    youWonLabel: 'Hai vinto 🎉', youLostLabel: 'Hai perso', drawLabel: 'Pareggio',
    modeMultipleChoice: 'Scelta multipla', modeWordle: 'Impiccato', challengeError: "L'azione non è riuscita.",
  },
  ar: {
    title: 'الأصدقاء', tabFriends: 'أصدقائي', tabRequests: 'الطلبات', tabSearch: 'البحث عن مستخدمين',
    loading: 'جارٍ التحميل…', error: 'حدث خطأ ما.',
    friendsEmpty: 'ليس لديك أصدقاء بعد.', friendsEmptySub: 'أضف أصدقاء من تبويب البحث عن مستخدمين.',
    incomingTitle: 'الطلبات الواردة', incomingEmpty: 'لا توجد طلبات واردة.',
    outgoingTitle: 'الطلبات المرسلة', outgoingEmpty: 'لا توجد طلبات مرسلة معلّقة.',
    pendingLabel: 'قيد الانتظار', acceptBtn: 'قبول', declineBtn: 'رفض', removeBtn: 'إزالة',
    removeConfirm: 'هل أنت متأكد أنك تريد إزالة هذا الشخص من أصدقائك؟',
    searchPlaceholder: 'ابحث باسم المستخدم أو الاسم…', searchBtn: 'بحث',
    searchEmpty: 'لم يتم العثور على نتائج.', searchHint: 'اكتب اسم مستخدم لبدء البحث.',
    sendRequestBtn: 'إضافة صديق', requestSentBtn: 'تم إرسال الطلب', alreadyFriendsLabel: 'أصدقاء',
    respondInRequestsHint: 'الرد من تبويب الطلبات', followBtn: 'متابعة', unfollowBtn: 'إلغاء المتابعة',
    levelPrefix: 'مستوى', sendError: 'تعذّر إرسال الطلب.', actionError: 'فشل الإجراء.',
    tabChallenges: 'المبارزات',
    incomingChallengesTitle: 'المبارزات الواردة', incomingChallengesEmpty: 'لا توجد مبارزات معلّقة.',
    outgoingChallengesTitle: 'المبارزات المرسلة', outgoingChallengesEmpty: 'لا توجد مبارزات مرسلة معلّقة.',
    activeChallengesTitle: 'قيد التقدم', activeChallengesEmpty: 'لا توجد مبارزات قيد التقدم.',
    completedChallengesTitle: 'مكتملة', completedChallengesEmpty: 'لا توجد مبارزات مكتملة بعد.',
    playBtn: 'العب', cancelChallengeBtn: 'إلغاء', waitingOpponentLabel: 'بانتظار الخصم',
    youWonLabel: 'فزت 🎉', youLostLabel: 'خسرت', drawLabel: 'تعادل',
    modeMultipleChoice: 'اختيار من متعدد', modeWordle: 'المشنقة', challengeError: 'فشل الإجراء.',
  },
  ru: {
    title: 'Друзья', tabFriends: 'Мои друзья', tabRequests: 'Заявки', tabSearch: 'Поиск пользователей',
    loading: 'Загрузка…', error: 'Что-то пошло не так.',
    friendsEmpty: 'У вас пока нет друзей.', friendsEmptySub: 'Добавляйте друзей на вкладке «Поиск пользователей».',
    incomingTitle: 'Входящие заявки', incomingEmpty: 'Нет входящих заявок.',
    outgoingTitle: 'Отправленные заявки', outgoingEmpty: 'Нет ожидающих отправленных заявок.',
    pendingLabel: 'Ожидает', acceptBtn: 'Принять', declineBtn: 'Отклонить', removeBtn: 'Удалить',
    removeConfirm: 'Вы уверены, что хотите удалить этого человека из друзей?',
    searchPlaceholder: 'Поиск по имени пользователя или имени…', searchBtn: 'Найти',
    searchEmpty: 'Результатов не найдено.', searchHint: 'Введите имя пользователя, чтобы начать поиск.',
    sendRequestBtn: 'Добавить в друзья', requestSentBtn: 'Заявка отправлена', alreadyFriendsLabel: 'Друзья',
    respondInRequestsHint: 'Ответьте на вкладке «Заявки»', followBtn: 'Подписаться', unfollowBtn: 'Отписаться',
    levelPrefix: 'Ур.', sendError: 'Не удалось отправить заявку.', actionError: 'Действие не выполнено.',
    tabChallenges: 'Состязания',
    incomingChallengesTitle: 'Входящие состязания', incomingChallengesEmpty: 'Нет ожидающих состязаний.',
    outgoingChallengesTitle: 'Отправленные', outgoingChallengesEmpty: 'Нет ожидающих отправленных состязаний.',
    activeChallengesTitle: 'В процессе', activeChallengesEmpty: 'Нет состязаний в процессе.',
    completedChallengesTitle: 'Завершённые', completedChallengesEmpty: 'Пока нет завершённых состязаний.',
    playBtn: 'Играть', cancelChallengeBtn: 'Отменить', waitingOpponentLabel: 'Ожидание соперника',
    youWonLabel: 'Вы выиграли 🎉', youLostLabel: 'Вы проиграли', drawLabel: 'Ничья',
    modeMultipleChoice: 'Множественный выбор', modeWordle: 'Виселица', challengeError: 'Действие не выполнено.',
  },
  ja: {
    title: '友達', tabFriends: 'マイフレンド', tabRequests: 'リクエスト', tabSearch: 'ユーザー検索',
    loading: '読み込み中…', error: '問題が発生しました。',
    friendsEmpty: 'まだ友達がいません。', friendsEmptySub: '「ユーザー検索」タブから友達を追加できます。',
    incomingTitle: '受信リクエスト', incomingEmpty: '受信リクエストはありません。',
    outgoingTitle: '送信リクエスト', outgoingEmpty: '保留中の送信リクエストはありません。',
    pendingLabel: '保留中', acceptBtn: '承認', declineBtn: '拒否', removeBtn: '削除',
    removeConfirm: 'この人を友達リストから削除してもよろしいですか?',
    searchPlaceholder: 'ユーザー名または名前で検索…', searchBtn: '検索',
    searchEmpty: '結果が見つかりません。', searchHint: '検索を開始するにはユーザー名を入力してください。',
    sendRequestBtn: '友達に追加', requestSentBtn: 'リクエスト送信済み', alreadyFriendsLabel: '友達',
    respondInRequestsHint: '「リクエスト」タブから返信してください', followBtn: 'フォロー', unfollowBtn: 'フォロー解除',
    levelPrefix: 'Lv.', sendError: 'リクエストを送信できませんでした。', actionError: '操作に失敗しました。',
    tabChallenges: 'チャレンジ',
    incomingChallengesTitle: '受信チャレンジ', incomingChallengesEmpty: '保留中のチャレンジはありません。',
    outgoingChallengesTitle: '送信済み', outgoingChallengesEmpty: '保留中の送信チャレンジはありません。',
    activeChallengesTitle: '進行中', activeChallengesEmpty: '進行中のチャレンジはありません。',
    completedChallengesTitle: '完了', completedChallengesEmpty: 'まだ完了したチャレンジはありません。',
    playBtn: 'プレイ', cancelChallengeBtn: 'キャンセル', waitingOpponentLabel: '相手を待っています',
    youWonLabel: '勝ちました 🎉', youLostLabel: '負けました', drawLabel: '引き分け',
    modeMultipleChoice: '四択', modeWordle: 'ハングマン', challengeError: '操作に失敗しました。',
  },
};

type Tab = 'friends' | 'requests' | 'search' | 'challenges';

function modeLabel(mode: string, t: Record<string, string>): string {
  if (mode === 'multiple_choice') return t.modeMultipleChoice;
  if (mode === 'wordle') return t.modeWordle;
  return mode;
}

function initialOf(card: UserCard): string {
  return (card.username || card.display_name || '?').charAt(0).toUpperCase();
}

function UserRow({
  card,
  labels,
  right,
}: {
  card: UserCard;
  labels: Record<string, string>;
  right?: React.ReactNode;
}) {
  const name = card.display_name || card.username || '?';
  const inner = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-slate-400 shrink-0">
        {initialOf(card)}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{name}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
          {card.username ? `@${card.username}` : ''} {card.username ? '·' : ''} {labels.levelPrefix} {card.level}
        </p>
      </div>
    </div>
  );
  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 hover:dark:bg-slate-800 transition-colors">
      {card.username ? (
        <Link href={`/u/${card.username}`} className="flex-1 min-w-0">
          {inner}
        </Link>
      ) : (
        inner
      )}
      {right}
    </div>
  );
}

export default function FriendsPage() {
  const { locale } = useLocale();
  const t = L[locale] ?? L.en;
  const router = useRouter();
  const searchParams = useSearchParams();

  // ?tab=challenges ile doğrudan Meydan Okumalar sekmesi açık gelsin diye
  // (bkz. u/[username]/page.tsx'teki "Meydan oku" akışı sonrası yönlendirme).
  const initialTab = (searchParams.get('tab') as Tab | null) ?? 'friends';
  const [tab, setTab] = useState<Tab>(
    initialTab === 'requests' || initialTab === 'search' || initialTab === 'challenges' ? initialTab : 'friends'
  );

  const [friends, setFriends] = useState<FriendshipItem[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState(false);

  const [pending, setPending] = useState<PendingRequests | null>(null);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // ── Meydan okumalar (Madde 6, Faz 3) ──
  const [challenges, setChallenges] = useState<ChallengesList | null>(null);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [challengesError, setChallengesError] = useState(false);
  const [challengeActionError, setChallengeActionError] = useState('');
  const [challengeBusyId, setChallengeBusyId] = useState<string | null>(null);

  const loadFriends = () => {
    setFriendsLoading(true);
    setFriendsError(false);
    socialApi.getFriends()
      .then(setFriends)
      .catch(() => setFriendsError(true))
      .finally(() => setFriendsLoading(false));
  };

  const loadPending = () => {
    setPendingLoading(true);
    setPendingError(false);
    socialApi.getPendingRequests()
      .then(setPending)
      .catch(() => setPendingError(true))
      .finally(() => setPendingLoading(false));
  };

  const loadChallenges = () => {
    setChallengesLoading(true);
    setChallengesError(false);
    socialApi.getChallenges()
      .then(setChallenges)
      .catch(() => setChallengesError(true))
      .finally(() => setChallengesLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
  useEffect(() => { loadFriends(); loadPending(); loadChallenges(); }, []);

  const handleAcceptChallenge = async (id: string) => {
    setChallengeBusyId(id);
    setChallengeActionError('');
    try {
      await socialApi.acceptChallenge(id);
      loadChallenges();
    } catch {
      setChallengeActionError(t.challengeError);
    } finally {
      setChallengeBusyId(null);
    }
  };

  const handleDeclineChallenge = async (id: string) => {
    setChallengeBusyId(id);
    setChallengeActionError('');
    try {
      await socialApi.declineChallenge(id);
      loadChallenges();
    } catch {
      setChallengeActionError(t.challengeError);
    } finally {
      setChallengeBusyId(null);
    }
  };

  const handleCancelChallenge = async (id: string) => {
    setChallengeBusyId(id);
    setChallengeActionError('');
    try {
      await socialApi.cancelChallenge(id);
      loadChallenges();
    } catch {
      setChallengeActionError(t.challengeError);
    } finally {
      setChallengeBusyId(null);
    }
  };

  const handlePlayChallenge = (c: ChallengeItem) => {
    router.push(`/game?challengeId=${c.id}&mode=${c.mode}`);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setActionError('');
    try {
      const items = await socialApi.searchUsers(query.trim());
      setResults(items);
    } catch {
      setActionError(t.error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (card: UserCard) => {
    if (!card.username) return;
    setBusyId(card.id);
    setActionError('');
    try {
      await socialApi.sendFriendRequest(card.username);
      setResults((prev) => prev?.map((r) => (r.id === card.id ? { ...r, relationship_status: 'pending_sent' } : r)) ?? prev);
      loadPending();
    } catch (err) {
      setActionError(errorDetail(err) || t.sendError);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFollow = async (card: UserCard, list: 'search' | 'friends') => {
    setBusyId(card.id);
    setActionError('');
    try {
      if (card.is_following) {
        await socialApi.unfollow(card.id);
      } else {
        await socialApi.follow(card.id);
      }
      const updater = (r: UserCard) => (r.id === card.id ? { ...r, is_following: !card.is_following } : r);
      if (list === 'search') setResults((prev) => prev?.map(updater) ?? prev);
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusyId(null);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    setBusyId(friendshipId);
    setActionError('');
    try {
      await socialApi.acceptFriendRequest(friendshipId);
      loadPending();
      loadFriends();
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (friendshipId: string) => {
    setBusyId(friendshipId);
    setActionError('');
    try {
      await socialApi.declineFriendRequest(friendshipId);
      loadPending();
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    if (!window.confirm(t.removeConfirm)) return;
    setBusyId(userId);
    setActionError('');
    try {
      await socialApi.removeFriend(userId);
      loadFriends();
    } catch {
      setActionError(t.actionError);
    } finally {
      setBusyId(null);
    }
  };

  const incomingCount = pending?.incoming.length ?? 0;
  const incomingChallengeCount = challenges?.incoming.length ?? 0;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'friends', label: t.tabFriends },
    { key: 'requests', label: t.tabRequests, badge: incomingCount || undefined },
    { key: 'challenges', label: t.tabChallenges, badge: incomingChallengeCount || undefined },
    { key: 'search', label: t.tabSearch },
  ];

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
      </div>

      <div className="flex gap-1 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`relative text-sm font-medium px-4 py-1.5 rounded-lg transition-colors ${
              tab === tb.key ? 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 shadow-sm' : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 hover:dark:text-slate-400'
            }`}
          >
            {tb.label}
            {!!tb.badge && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                {tb.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {actionError && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{actionError}</p>}

      {tab === 'friends' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
          {friendsLoading && <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">{t.loading}</p>}
          {!friendsLoading && friendsError && <p className="text-sm text-red-400 dark:text-red-300 py-4 text-center">{t.error}</p>}
          {!friendsLoading && !friendsError && friends.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400 dark:text-slate-500">{t.friendsEmpty}</p>
              <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">{t.friendsEmptySub}</p>
            </div>
          )}
          {!friendsLoading && !friendsError && friends.length > 0 && (
            <div className="space-y-1">
              {friends.map((f) => (
                <UserRow
                  key={f.id}
                  card={f.user}
                  labels={t}
                  right={
                    <button
                      type="button"
                      disabled={busyId === f.user.id}
                      onClick={() => handleRemoveFriend(f.user.id)}
                      className="text-xs font-medium text-red-500 dark:text-red-400 hover:text-red-600 hover:dark:text-red-400 disabled:opacity-50 shrink-0"
                    >
                      {t.removeBtn}
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.incomingTitle}</h3>
            {pendingLoading && <p className="text-sm text-gray-400 dark:text-slate-500 py-2">{t.loading}</p>}
            {!pendingLoading && pendingError && <p className="text-sm text-red-400 dark:text-red-300 py-2">{t.error}</p>}
            {!pendingLoading && !pendingError && (pending?.incoming.length ?? 0) === 0 && (
              <p className="text-xs text-gray-400 dark:text-slate-500 py-2">{t.incomingEmpty}</p>
            )}
            {!pendingLoading && !pendingError && (pending?.incoming.length ?? 0) > 0 && (
              <div className="space-y-1">
                {pending!.incoming.map((f) => (
                  <UserRow
                    key={f.id}
                    card={f.user}
                    labels={t}
                    right={
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busyId === f.id}
                          onClick={() => handleAccept(f.id)}
                          className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-2.5 py-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />{t.acceptBtn}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === f.id}
                          onClick={() => handleDecline(f.id)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 hover:dark:text-slate-300 disabled:opacity-50 rounded-lg px-2.5 py-1.5"
                        >
                          <X className="w-3.5 h-3.5" />{t.declineBtn}
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.outgoingTitle}</h3>
            {!pendingLoading && !pendingError && (pending?.outgoing.length ?? 0) === 0 && (
              <p className="text-xs text-gray-400 dark:text-slate-500 py-2">{t.outgoingEmpty}</p>
            )}
            {!pendingLoading && !pendingError && (pending?.outgoing.length ?? 0) > 0 && (
              <div className="space-y-1">
                {pending!.outgoing.map((f) => (
                  <UserRow
                    key={f.id}
                    card={f.user}
                    labels={t}
                    right={
                      <span className="text-xs font-medium text-gray-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-full px-2.5 py-1 shrink-0">
                        {t.pendingLabel}
                      </span>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'challenges' && (
        <div className="space-y-4">
          {challengeActionError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">{challengeActionError}</p>
          )}

          {challengesLoading && <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">{t.loading}</p>}
          {!challengesLoading && challengesError && <p className="text-sm text-red-400 dark:text-red-300 py-4 text-center">{t.error}</p>}

          {!challengesLoading && !challengesError && challenges && (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.incomingChallengesTitle}</h3>
                {challenges.incoming.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 py-2">{t.incomingChallengesEmpty}</p>
                ) : (
                  <div className="space-y-1">
                    {challenges.incoming.map((c) => (
                      <UserRow
                        key={c.id}
                        card={c.other_user ?? { id: c.id, level: 1 }}
                        labels={t}
                        right={
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-medium text-gray-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-full px-2.5 py-1">
                              {modeLabel(c.mode, t)}
                            </span>
                            <button
                              type="button"
                              disabled={challengeBusyId === c.id}
                              onClick={() => handleAcceptChallenge(c.id)}
                              className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-2.5 py-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />{t.acceptBtn}
                            </button>
                            <button
                              type="button"
                              disabled={challengeBusyId === c.id}
                              onClick={() => handleDeclineChallenge(c.id)}
                              className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 hover:dark:text-slate-300 disabled:opacity-50 rounded-lg px-2.5 py-1.5"
                            >
                              <X className="w-3.5 h-3.5" />{t.declineBtn}
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.outgoingChallengesTitle}</h3>
                {challenges.outgoing.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 py-2">{t.outgoingChallengesEmpty}</p>
                ) : (
                  <div className="space-y-1">
                    {challenges.outgoing.map((c) => (
                      <UserRow
                        key={c.id}
                        card={c.other_user ?? { id: c.id, level: 1 }}
                        labels={t}
                        right={
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-medium text-gray-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-full px-2.5 py-1">
                              {modeLabel(c.mode, t)}
                            </span>
                            <button
                              type="button"
                              disabled={challengeBusyId === c.id}
                              onClick={() => handleCancelChallenge(c.id)}
                              className="flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-slate-500 hover:text-red-500 hover:dark:text-red-400 disabled:opacity-50 rounded-lg px-2.5 py-1.5"
                            >
                              <CancelIcon className="w-3.5 h-3.5" />{t.cancelChallengeBtn}
                            </button>
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.activeChallengesTitle}</h3>
                {challenges.active.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 py-2">{t.activeChallengesEmpty}</p>
                ) : (
                  <div className="space-y-1">
                    {challenges.active.map((c) => (
                      <UserRow
                        key={c.id}
                        card={c.other_user ?? { id: c.id, level: 1 }}
                        labels={t}
                        right={
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-medium text-gray-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-full px-2.5 py-1">
                              {modeLabel(c.mode, t)}
                            </span>
                            {c.your_session_id ? (
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-full px-2.5 py-1">
                                {t.waitingOpponentLabel}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePlayChallenge(c)}
                                className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-2.5 py-1.5"
                              >
                                <Play className="w-3.5 h-3.5" />{t.playBtn}
                              </button>
                            )}
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">{t.completedChallengesTitle}</h3>
                {challenges.completed.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-slate-500 py-2">{t.completedChallengesEmpty}</p>
                ) : (
                  <div className="space-y-1">
                    {challenges.completed.map((c) => (
                      <UserRow
                        key={c.id}
                        card={c.other_user ?? { id: c.id, level: 1 }}
                        labels={t}
                        right={
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-medium text-gray-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-full px-2.5 py-1">
                              {modeLabel(c.mode, t)}
                            </span>
                            <span
                              className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                                c.you_won === true
                                  ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10'
                                  : c.you_won === false
                                    ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
                                    : 'text-gray-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800'
                              }`}
                            >
                              {c.you_won === true ? t.youWonLabel : c.you_won === false ? t.youLostLabel : t.drawLabel}
                            </span>
                          </div>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'search' && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full border border-gray-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-2 transition-colors"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t.searchBtn}
            </button>
          </form>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
            {results === null && <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">{t.searchHint}</p>}
            {results !== null && results.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">{t.searchEmpty}</p>
            )}
            {results !== null && results.length > 0 && (
              <div className="space-y-1">
                {results.map((card) => (
                  <UserRow
                    key={card.id}
                    card={card}
                    labels={t}
                    right={
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busyId === card.id}
                          onClick={() => handleToggleFollow(card, 'search')}
                          className={`text-xs font-medium rounded-lg px-2.5 py-1.5 disabled:opacity-50 transition-colors ${
                            card.is_following
                              ? 'text-gray-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 hover:dark:bg-slate-800'
                              : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 hover:dark:bg-blue-500/15'
                          }`}
                        >
                          {card.is_following ? t.unfollowBtn : t.followBtn}
                        </button>

                        {card.relationship_status === 'friends' && (
                          <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-full px-2.5 py-1">
                            {t.alreadyFriendsLabel}
                          </span>
                        )}
                        {card.relationship_status === 'pending_sent' && (
                          <span className="text-xs font-medium text-gray-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-full px-2.5 py-1">
                            {t.requestSentBtn}
                          </span>
                        )}
                        {card.relationship_status === 'pending_received' && (
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-full px-2.5 py-1">
                            {t.respondInRequestsHint}
                          </span>
                        )}
                        {(!card.relationship_status || card.relationship_status === 'none') && (
                          <button
                            type="button"
                            disabled={busyId === card.id}
                            onClick={() => handleSendRequest(card)}
                            className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-2.5 py-1.5"
                          >
                            <UserPlus className="w-3.5 h-3.5" />{t.sendRequestBtn}
                          </button>
                        )}
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
