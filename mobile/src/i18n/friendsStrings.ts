// src/i18n/friendsStrings.ts — web'deki app/(app)/friends/page.tsx içindeki
// yerel L sözlüğünden taşındı (9 dilin hepsi, web'deki profesyonel çeviriler
// birebir). Meydan okuma (challenge) anahtarları bilinçli olarak dışarıda
// bırakıldı — Challenges sekmesi, web friends sayfasının ~%40'ını oluşturan
// ayrı bir oyun-entegrasyonu alt özelliği, sonraki bir faza bırakıldı (bkz.
// backlog). `loading` merkezi sözlükten (`t('loading')`) kullanılıyor.
import type { Locale } from './locales';

export type FriendsStrings = {
  title: string;
  tabFriends: string;
  tabRequests: string;
  tabSearch: string;
  error: string;
  friendsEmpty: string;
  friendsEmptySub: string;
  incomingTitle: string;
  incomingEmpty: string;
  outgoingTitle: string;
  outgoingEmpty: string;
  pendingLabel: string;
  acceptBtn: string;
  declineBtn: string;
  removeBtn: string;
  removeConfirm: string;
  searchPlaceholder: string;
  searchBtn: string;
  searchEmpty: string;
  searchHint: string;
  sendRequestBtn: string;
  requestSentBtn: string;
  alreadyFriendsLabel: string;
  respondInRequestsHint: string;
  followBtn: string;
  unfollowBtn: string;
  levelPrefix: string;
  sendError: string;
  actionError: string;
};

export const FRIENDS_STRINGS: Record<Locale, FriendsStrings> = {
  tr: {
    title: 'Arkadaşlar', tabFriends: 'Arkadaşlarım', tabRequests: 'İstekler', tabSearch: 'Kullanıcı Ara',
    error: 'Bir şeyler ters gitti.',
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
  },
  en: {
    title: 'Friends', tabFriends: 'My Friends', tabRequests: 'Requests', tabSearch: 'Find Users',
    error: 'Something went wrong.',
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
  },
  de: {
    title: 'Freunde', tabFriends: 'Meine Freunde', tabRequests: 'Anfragen', tabSearch: 'Nutzer suchen',
    error: 'Etwas ist schiefgelaufen.',
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
  },
  fr: {
    title: 'Amis', tabFriends: 'Mes amis', tabRequests: 'Demandes', tabSearch: 'Rechercher des utilisateurs',
    error: "Une erreur s'est produite.",
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
  },
  es: {
    title: 'Amigos', tabFriends: 'Mis amigos', tabRequests: 'Solicitudes', tabSearch: 'Buscar usuarios',
    error: 'Algo salió mal.',
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
  },
  it: {
    title: 'Amici', tabFriends: 'I miei amici', tabRequests: 'Richieste', tabSearch: 'Cerca utenti',
    error: 'Qualcosa è andato storto.',
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
  },
  ar: {
    title: 'الأصدقاء', tabFriends: 'أصدقائي', tabRequests: 'الطلبات', tabSearch: 'البحث عن مستخدمين',
    error: 'حدث خطأ ما.',
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
  },
  ru: {
    title: 'Друзья', tabFriends: 'Мои друзья', tabRequests: 'Заявки', tabSearch: 'Поиск пользователей',
    error: 'Что-то пошло не так.',
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
  },
  ja: {
    title: '友達', tabFriends: 'マイフレンド', tabRequests: 'リクエスト', tabSearch: 'ユーザー検索',
    error: '問題が発生しました。',
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
  },
};
