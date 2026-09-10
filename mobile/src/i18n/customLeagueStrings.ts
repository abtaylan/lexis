// src/i18n/customLeagueStrings.ts — web'deki app/(app)/league/custom/page.tsx
// + app/(app)/league/custom/[id]/page.tsx içindeki yerel L sözlüklerinin
// mobil karşılığı (10 dilin hepsi, web'deki çeviriler birebir). V2 Faz 3
// devamı (10 Eylül 2026 kullanıcı isteği — "kendi arkadaşlarımdan oluşan
// özel lig kurup kendi aramızda yarışabilmeliyim").
import type { Locale } from './locales';

export type CustomLeagueStrings = {
  // ── Liste (custom-leagues.tsx) ──
  title: string;
  subtitle: string;
  createBtn: string;
  error: string;
  empty: string;
  emptySub: string;
  membersLabel: string;
  openBtn: string;
  creatorBadge: string;
  namePlaceholder: string;
  maxMembersLabel: string;
  createSubmitBtn: string;
  createCancelBtn: string;
  pendingInvitesTitle: string;
  incomingInviteLabel: string;
  outgoingInviteLabel: string;
  acceptBtn: string;
  declineBtn: string;
  cancelInviteBtn: string;
  waitingBadge: string;
  nameRequired: string;

  // ── Detay (custom-league-detail.tsx) ──
  back: string;
  notFound: string;
  rankLabel: string;
  userLabel: string;
  xpLabel: string;
  youLabel: string;
  inviteSectionTitle: string;
  searchPlaceholder: string;
  searching: string;
  noResults: string;
  inviteBtn: string;
  inviteSent: string;
  deleteLeagueBtn: string;
  leaveLeagueBtn: string;
  membersFull: string;
  transferSectionTitle: string;
  transferBtn: string;
  transferSuccess: string;
};

export const CUSTOM_LEAGUE_STRINGS: Record<Locale, CustomLeagueStrings> = {
  tr: {
    title: 'Özel Ligler', subtitle: 'Arkadaşlarından ve istediğin kullanıcılardan kendi ligini kur.',
    createBtn: 'Yeni Özel Lig Kur', error: 'Bir şeyler ters gitti.',
    empty: 'Henüz bir özel ligin yok.', emptySub: 'İlk özel ligini sen kur!',
    membersLabel: 'üye', openBtn: 'Aç', creatorBadge: 'Kurucu',
    namePlaceholder: 'Lig adı (örn. Kelime Kulübü)', maxMembersLabel: 'Maks. üye',
    createSubmitBtn: 'Kur', createCancelBtn: 'Vazgeç',
    pendingInvitesTitle: 'Bekleyen Davetler',
    incomingInviteLabel: 'seni davet etti', outgoingInviteLabel: 'davet edildi',
    acceptBtn: 'Kabul Et', declineBtn: 'Reddet', cancelInviteBtn: 'İptal Et', waitingBadge: 'Bekliyor',
    nameRequired: 'Lig adı gerekli.',
    back: 'Özel Ligler', notFound: 'Bu özel liğe erişimin yok ya da lig silinmiş.',
    rankLabel: 'Sıra', userLabel: 'Kullanıcı', xpLabel: 'XP', youLabel: 'Sen',
    inviteSectionTitle: 'Üye Davet Et', searchPlaceholder: 'Kullanıcı adı veya isim ara…',
    searching: 'Aranıyor…', noResults: 'Sonuç bulunamadı.', inviteBtn: 'Davet Et',
    inviteSent: 'Davet gönderildi.', deleteLeagueBtn: 'Ligi Sil', leaveLeagueBtn: 'Ligden Ayrıl',
    membersFull: 'Lig dolu.',
    transferSectionTitle: 'Kurucuyu Devret', transferBtn: 'Devret', transferSuccess: 'Kurucu devredildi.',
  },
  en: {
    title: 'Custom Leagues', subtitle: 'Build your own league with friends and anyone else you invite.',
    createBtn: 'Create Custom League', error: 'Something went wrong.',
    empty: "You don't have a custom league yet.", emptySub: 'Create your first one!',
    membersLabel: 'members', openBtn: 'Open', creatorBadge: 'Owner',
    namePlaceholder: 'League name (e.g. Word Club)', maxMembersLabel: 'Max members',
    createSubmitBtn: 'Create', createCancelBtn: 'Cancel',
    pendingInvitesTitle: 'Pending Invites',
    incomingInviteLabel: 'invited you', outgoingInviteLabel: 'invited',
    acceptBtn: 'Accept', declineBtn: 'Decline', cancelInviteBtn: 'Cancel', waitingBadge: 'Waiting',
    nameRequired: 'League name is required.',
    back: 'Custom Leagues', notFound: "You don't have access to this league, or it was deleted.",
    rankLabel: 'Rank', userLabel: 'User', xpLabel: 'XP', youLabel: 'You',
    inviteSectionTitle: 'Invite a Member', searchPlaceholder: 'Search by username or name…',
    searching: 'Searching…', noResults: 'No results found.', inviteBtn: 'Invite',
    inviteSent: 'Invite sent.', deleteLeagueBtn: 'Delete League', leaveLeagueBtn: 'Leave League',
    membersFull: 'League is full.',
    transferSectionTitle: 'Transfer Ownership', transferBtn: 'Transfer', transferSuccess: 'Ownership transferred.',
  },
  de: {
    title: 'Eigene Ligen', subtitle: 'Gründe deine eigene Liga mit Freunden und anderen Nutzern.',
    createBtn: 'Eigene Liga erstellen', error: 'Etwas ist schiefgelaufen.',
    empty: 'Du hast noch keine eigene Liga.', emptySub: 'Erstelle deine erste!',
    membersLabel: 'Mitglieder', openBtn: 'Öffnen', creatorBadge: 'Besitzer',
    namePlaceholder: 'Liganame (z. B. Wortclub)', maxMembersLabel: 'Max. Mitglieder',
    createSubmitBtn: 'Erstellen', createCancelBtn: 'Abbrechen',
    pendingInvitesTitle: 'Ausstehende Einladungen',
    incomingInviteLabel: 'hat dich eingeladen', outgoingInviteLabel: 'eingeladen',
    acceptBtn: 'Annehmen', declineBtn: 'Ablehnen', cancelInviteBtn: 'Abbrechen', waitingBadge: 'Wartet',
    nameRequired: 'Liganame ist erforderlich.',
    back: 'Eigene Ligen', notFound: 'Du hast keinen Zugriff auf diese Liga, oder sie wurde gelöscht.',
    rankLabel: 'Rang', userLabel: 'Nutzer', xpLabel: 'XP', youLabel: 'Du',
    inviteSectionTitle: 'Mitglied einladen', searchPlaceholder: 'Nach Benutzername oder Name suchen…',
    searching: 'Suche läuft…', noResults: 'Keine Ergebnisse gefunden.', inviteBtn: 'Einladen',
    inviteSent: 'Einladung gesendet.', deleteLeagueBtn: 'Liga löschen', leaveLeagueBtn: 'Liga verlassen',
    membersFull: 'Liga ist voll.',
    transferSectionTitle: 'Besitz übertragen', transferBtn: 'Übertragen', transferSuccess: 'Besitz übertragen.',
  },
  fr: {
    title: 'Ligues personnalisées', subtitle: 'Crée ta propre ligue avec des amis et d’autres utilisateurs.',
    createBtn: 'Créer une ligue', error: "Une erreur s'est produite.",
    empty: "Tu n'as pas encore de ligue personnalisée.", emptySub: 'Crée la première !',
    membersLabel: 'membres', openBtn: 'Ouvrir', creatorBadge: 'Propriétaire',
    namePlaceholder: 'Nom de la ligue (ex. Club des mots)', maxMembersLabel: 'Membres max',
    createSubmitBtn: 'Créer', createCancelBtn: 'Annuler',
    pendingInvitesTitle: 'Invitations en attente',
    incomingInviteLabel: "t'a invité", outgoingInviteLabel: 'invité',
    acceptBtn: 'Accepter', declineBtn: 'Refuser', cancelInviteBtn: 'Annuler', waitingBadge: 'En attente',
    nameRequired: 'Le nom de la ligue est requis.',
    back: 'Ligues personnalisées', notFound: "Tu n'as pas accès à cette ligue, ou elle a été supprimée.",
    rankLabel: 'Rang', userLabel: 'Utilisateur', xpLabel: 'XP', youLabel: 'Toi',
    inviteSectionTitle: 'Inviter un membre', searchPlaceholder: "Rechercher par nom d'utilisateur ou nom…",
    searching: 'Recherche…', noResults: 'Aucun résultat trouvé.', inviteBtn: 'Inviter',
    inviteSent: 'Invitation envoyée.', deleteLeagueBtn: 'Supprimer la ligue', leaveLeagueBtn: 'Quitter la ligue',
    membersFull: 'La ligue est complète.',
    transferSectionTitle: 'Transférer la propriété', transferBtn: 'Transférer', transferSuccess: 'Propriété transférée.',
  },
  es: {
    title: 'Ligas personalizadas', subtitle: 'Crea tu propia liga con amigos y otros usuarios.',
    createBtn: 'Crear liga personalizada', error: 'Algo salió mal.',
    empty: 'Aún no tienes una liga personalizada.', emptySub: '¡Crea la primera!',
    membersLabel: 'miembros', openBtn: 'Abrir', creatorBadge: 'Propietario',
    namePlaceholder: 'Nombre de la liga (ej. Club de palabras)', maxMembersLabel: 'Máx. miembros',
    createSubmitBtn: 'Crear', createCancelBtn: 'Cancelar',
    pendingInvitesTitle: 'Invitaciones pendientes',
    incomingInviteLabel: 'te invitó', outgoingInviteLabel: 'invitado',
    acceptBtn: 'Aceptar', declineBtn: 'Rechazar', cancelInviteBtn: 'Cancelar', waitingBadge: 'Esperando',
    nameRequired: 'El nombre de la liga es obligatorio.',
    back: 'Ligas personalizadas', notFound: 'No tienes acceso a esta liga, o fue eliminada.',
    rankLabel: 'Puesto', userLabel: 'Usuario', xpLabel: 'XP', youLabel: 'Tú',
    inviteSectionTitle: 'Invitar a un miembro', searchPlaceholder: 'Buscar por usuario o nombre…',
    searching: 'Buscando…', noResults: 'No se encontraron resultados.', inviteBtn: 'Invitar',
    inviteSent: 'Invitación enviada.', deleteLeagueBtn: 'Eliminar liga', leaveLeagueBtn: 'Salir de la liga',
    membersFull: 'La liga está llena.',
    transferSectionTitle: 'Transferir propiedad', transferBtn: 'Transferir', transferSuccess: 'Propiedad transferida.',
  },
  it: {
    title: 'Leghe personalizzate', subtitle: 'Crea la tua lega con amici e altri utenti.',
    createBtn: 'Crea lega personalizzata', error: 'Qualcosa è andato storto.',
    empty: 'Non hai ancora una lega personalizzata.', emptySub: 'Crea la prima!',
    membersLabel: 'membri', openBtn: 'Apri', creatorBadge: 'Proprietario',
    namePlaceholder: 'Nome della lega (es. Club delle parole)', maxMembersLabel: 'Membri max',
    createSubmitBtn: 'Crea', createCancelBtn: 'Annulla',
    pendingInvitesTitle: 'Inviti in sospeso',
    incomingInviteLabel: 'ti ha invitato', outgoingInviteLabel: 'invitato',
    acceptBtn: 'Accetta', declineBtn: 'Rifiuta', cancelInviteBtn: 'Annulla', waitingBadge: 'In attesa',
    nameRequired: 'Il nome della lega è obbligatorio.',
    back: 'Leghe personalizzate', notFound: 'Non hai accesso a questa lega, oppure è stata eliminata.',
    rankLabel: 'Pos.', userLabel: 'Utente', xpLabel: 'XP', youLabel: 'Tu',
    inviteSectionTitle: 'Invita un membro', searchPlaceholder: 'Cerca per nome utente o nome…',
    searching: 'Ricerca…', noResults: 'Nessun risultato trovato.', inviteBtn: 'Invita',
    inviteSent: 'Invito inviato.', deleteLeagueBtn: 'Elimina lega', leaveLeagueBtn: 'Lascia la lega',
    membersFull: 'La lega è piena.',
    transferSectionTitle: 'Trasferisci proprietà', transferBtn: 'Trasferisci', transferSuccess: 'Proprietà trasferita.',
  },
  ar: {
    title: 'دوريات خاصة', subtitle: 'أنشئ دوريتك الخاصة مع أصدقائك وأي مستخدم آخر.',
    createBtn: 'إنشاء دوري خاص', error: 'حدث خطأ ما.',
    empty: 'ليس لديك دوري خاص بعد.', emptySub: 'أنشئ أول دوري لك!',
    membersLabel: 'أعضاء', openBtn: 'فتح', creatorBadge: 'المالك',
    namePlaceholder: 'اسم الدوري (مثال: نادي الكلمات)', maxMembersLabel: 'الحد الأقصى للأعضاء',
    createSubmitBtn: 'إنشاء', createCancelBtn: 'إلغاء',
    pendingInvitesTitle: 'الدعوات المعلقة',
    incomingInviteLabel: 'دعاك', outgoingInviteLabel: 'مدعو',
    acceptBtn: 'قبول', declineBtn: 'رفض', cancelInviteBtn: 'إلغاء', waitingBadge: 'قيد الانتظار',
    nameRequired: 'اسم الدوري مطلوب.',
    back: 'دوريات خاصة', notFound: 'ليس لديك وصول إلى هذا الدوري، أو تم حذفه.',
    rankLabel: 'المرتبة', userLabel: 'المستخدم', xpLabel: 'XP', youLabel: 'أنت',
    inviteSectionTitle: 'دعوة عضو', searchPlaceholder: 'ابحث باسم المستخدم أو الاسم…',
    searching: 'جارٍ البحث…', noResults: 'لم يتم العثور على نتائج.', inviteBtn: 'دعوة',
    inviteSent: 'تم إرسال الدعوة.', deleteLeagueBtn: 'حذف الدوري', leaveLeagueBtn: 'مغادرة الدوري',
    membersFull: 'الدوري ممتلئ.',
    transferSectionTitle: 'نقل الملكية', transferBtn: 'نقل', transferSuccess: 'تم نقل الملكية.',
  },
  ru: {
    title: 'Свои лиги', subtitle: 'Создай собственную лигу с друзьями и другими пользователями.',
    createBtn: 'Создать свою лигу', error: 'Что-то пошло не так.',
    empty: 'У тебя пока нет своей лиги.', emptySub: 'Создай первую!',
    membersLabel: 'участников', openBtn: 'Открыть', creatorBadge: 'Владелец',
    namePlaceholder: 'Название лиги (напр. Клуб слов)', maxMembersLabel: 'Макс. участников',
    createSubmitBtn: 'Создать', createCancelBtn: 'Отмена',
    pendingInvitesTitle: 'Ожидающие приглашения',
    incomingInviteLabel: 'пригласил(а) тебя', outgoingInviteLabel: 'приглашён',
    acceptBtn: 'Принять', declineBtn: 'Отклонить', cancelInviteBtn: 'Отменить', waitingBadge: 'Ожидание',
    nameRequired: 'Название лиги обязательно.',
    back: 'Свои лиги', notFound: 'У тебя нет доступа к этой лиге, или она была удалена.',
    rankLabel: 'Место', userLabel: 'Пользователь', xpLabel: 'XP', youLabel: 'Ты',
    inviteSectionTitle: 'Пригласить участника', searchPlaceholder: 'Поиск по имени пользователя или имени…',
    searching: 'Поиск…', noResults: 'Результатов не найдено.', inviteBtn: 'Пригласить',
    inviteSent: 'Приглашение отправлено.', deleteLeagueBtn: 'Удалить лигу', leaveLeagueBtn: 'Покинуть лигу',
    membersFull: 'Лига заполнена.',
    transferSectionTitle: 'Передать права владельца', transferBtn: 'Передать', transferSuccess: 'Права владельца переданы.',
  },
  ja: {
    title: 'カスタムリーグ', subtitle: '友達や他のユーザーと自分だけのリーグを作ろう。',
    createBtn: 'カスタムリーグを作成', error: '問題が発生しました。',
    empty: 'まだカスタムリーグがありません。', emptySub: '最初のリーグを作成しましょう!',
    membersLabel: '人', openBtn: '開く', creatorBadge: 'オーナー',
    namePlaceholder: 'リーグ名 (例: 単語クラブ)', maxMembersLabel: '最大人数',
    createSubmitBtn: '作成', createCancelBtn: 'キャンセル',
    pendingInvitesTitle: '保留中の招待',
    incomingInviteLabel: 'があなたを招待しました', outgoingInviteLabel: '招待済み',
    acceptBtn: '承認', declineBtn: '拒否', cancelInviteBtn: 'キャンセル', waitingBadge: '待機中',
    nameRequired: 'リーグ名は必須です。',
    back: 'カスタムリーグ', notFound: 'このリーグへのアクセス権がないか、削除されています。',
    rankLabel: '順位', userLabel: 'ユーザー', xpLabel: 'XP', youLabel: 'あなた',
    inviteSectionTitle: 'メンバーを招待', searchPlaceholder: 'ユーザー名または名前で検索…',
    searching: '検索中…', noResults: '結果が見つかりません。', inviteBtn: '招待',
    inviteSent: '招待を送信しました。', deleteLeagueBtn: 'リーグを削除', leaveLeagueBtn: 'リーグを退出',
    membersFull: 'リーグは満員です。',
    transferSectionTitle: 'オーナー権限を譲渡', transferBtn: '譲渡', transferSuccess: 'オーナー権限を譲渡しました。',
  },
  pt: {
    title: 'Ligas personalizadas', subtitle: 'Crie sua própria liga com amigos e outros usuários.',
    createBtn: 'Criar liga personalizada', error: 'Algo deu errado.',
    empty: 'Você ainda não tem uma liga personalizada.', emptySub: 'Crie a primeira!',
    membersLabel: 'membros', openBtn: 'Abrir', creatorBadge: 'Proprietário',
    namePlaceholder: 'Nome da liga (ex. Clube das Palavras)', maxMembersLabel: 'Máx. membros',
    createSubmitBtn: 'Criar', createCancelBtn: 'Cancelar',
    pendingInvitesTitle: 'Convites pendentes',
    incomingInviteLabel: 'convidou você', outgoingInviteLabel: 'convidado',
    acceptBtn: 'Aceitar', declineBtn: 'Recusar', cancelInviteBtn: 'Cancelar', waitingBadge: 'Aguardando',
    nameRequired: 'O nome da liga é obrigatório.',
    back: 'Ligas personalizadas', notFound: 'Você não tem acesso a esta liga, ou ela foi excluída.',
    rankLabel: 'Pos.', userLabel: 'Usuário', xpLabel: 'XP', youLabel: 'Você',
    inviteSectionTitle: 'Convidar membro', searchPlaceholder: 'Buscar por usuário ou nome…',
    searching: 'Buscando…', noResults: 'Nenhum resultado encontrado.', inviteBtn: 'Convidar',
    inviteSent: 'Convite enviado.', deleteLeagueBtn: 'Excluir liga', leaveLeagueBtn: 'Sair da liga',
    membersFull: 'A liga está cheia.',
    transferSectionTitle: 'Transferir propriedade', transferBtn: 'Transferir', transferSuccess: 'Propriedade transferida.',
  },
};
