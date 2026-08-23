// src/i18n/profileStrings.ts — web'deki app/(app)/u/[username]/page.tsx
// içindeki yerel L sözlüğünden taşındı (9 dilin hepsi, web'deki çeviriler
// birebir). Meydan okuma (challenge) anahtarları bilinçli olarak dışarıda
// bırakıldı — bkz. friendsStrings.ts üstündeki not, aynı gerekçe geçerli.
// `loading` merkezi sözlükten (`t('loading')`) kullanılıyor. `days` web ile
// aynı şekilde virgülle ayrılmış 7 günlük tek bir string (`.split(',')` ile
// kullanılıyor) — web'deki riski en aza indiren şekliyle birebir taşındı.
import type { Locale } from './locales';

export type ProfileStrings = {
  back: string;
  notFound: string;
  error: string;
  memberSince: string;
  friendsCountLabel: string;
  followersCountLabel: string;
  followingCountLabel: string;
  sendRequestBtn: string;
  requestSentBtn: string;
  acceptBtn: string;
  declineBtn: string;
  removeFriendBtn: string;
  removeConfirm: string;
  friendsLabel: string;
  followBtn: string;
  unfollowBtn: string;
  selfHint: string;
  statsTitle: string;
  totalWordsLabel: string;
  learnedLabel: string;
  learningLabel: string;
  streakLabel: string;
  streakUnit: string;
  scheduleTitle: string;
  scheduleEmpty: string;
  actionError: string;
  levelPrefix: string;
  minLabel: string;
  days: string;
  messageBtn: string;
  blockBtn: string;
  blockConfirm: string;
  blockError: string;
};

export const PROFILE_STRINGS: Record<Locale, ProfileStrings> = {
  tr: {
    back: 'Arkadaşlar', notFound: 'Bu kullanıcı bulunamadı.', error: 'Profil yüklenemedi.',
    memberSince: 'Katılım', friendsCountLabel: 'arkadaş', followersCountLabel: 'takipçi', followingCountLabel: 'takip',
    sendRequestBtn: 'İstek gönder', requestSentBtn: 'İstek gönderildi', acceptBtn: 'Kabul et', declineBtn: 'Reddet',
    removeFriendBtn: 'Arkadaşlıktan çık', removeConfirm: 'Bu kişiyi arkadaş listenden çıkarmak istediğine emin misin?',
    friendsLabel: 'Arkadaşsınız', followBtn: 'Takip et', unfollowBtn: 'Takipten çık', selfHint: 'Bu senin profilin.',
    statsTitle: 'İstatistikler', totalWordsLabel: 'Toplam kelime', learnedLabel: 'Öğrenilen', learningLabel: 'Öğreniliyor',
    streakLabel: 'Güncel seri', streakUnit: 'gün', scheduleTitle: 'Çalışma programı', scheduleEmpty: 'Aktif bir çalışma programı yok.',
    actionError: 'İşlem başarısız oldu.', levelPrefix: 'Sv.', minLabel: 'dk',
    days: 'Paz,Pzt,Sal,Çar,Per,Cum,Cmt',
    messageBtn: 'Mesaj gönder', blockBtn: 'Engelle',
    blockConfirm: 'Bu kişiyi engellemek istediğine emin misin? Artık birbirinizin mesajlarını, profilini ve arkadaşlık/takip isteklerini göremezsiniz.',
    blockError: 'Engelleme işlemi başarısız oldu.',
  },
  en: {
    back: 'Friends', notFound: 'This user could not be found.', error: 'Could not load the profile.',
    memberSince: 'Joined', friendsCountLabel: 'friends', followersCountLabel: 'followers', followingCountLabel: 'following',
    sendRequestBtn: 'Add friend', requestSentBtn: 'Request sent', acceptBtn: 'Accept', declineBtn: 'Decline',
    removeFriendBtn: 'Remove friend', removeConfirm: 'Are you sure you want to remove this person from your friends?',
    friendsLabel: 'Friends', followBtn: 'Follow', unfollowBtn: 'Unfollow', selfHint: 'This is your profile.',
    statsTitle: 'Stats', totalWordsLabel: 'Total words', learnedLabel: 'Learned', learningLabel: 'Learning',
    streakLabel: 'Current streak', streakUnit: 'days', scheduleTitle: 'Study schedule', scheduleEmpty: 'No active study schedule.',
    actionError: 'The action failed.', levelPrefix: 'Lv.', minLabel: 'min',
    days: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    messageBtn: 'Message', blockBtn: 'Block',
    blockConfirm: "Are you sure you want to block this person? You won't be able to see each other's messages, profile, or friend/follow requests anymore.",
    blockError: 'Could not block this user.',
  },
  de: {
    back: 'Freunde', notFound: 'Dieser Nutzer wurde nicht gefunden.', error: 'Profil konnte nicht geladen werden.',
    memberSince: 'Beigetreten', friendsCountLabel: 'Freunde', followersCountLabel: 'Follower', followingCountLabel: 'Folgt',
    sendRequestBtn: 'Freund hinzufügen', requestSentBtn: 'Anfrage gesendet', acceptBtn: 'Annehmen', declineBtn: 'Ablehnen',
    removeFriendBtn: 'Freundschaft beenden', removeConfirm: 'Möchtest du diese Person wirklich aus deiner Freundesliste entfernen?',
    friendsLabel: 'Befreundet', followBtn: 'Folgen', unfollowBtn: 'Entfolgen', selfHint: 'Das ist dein Profil.',
    statsTitle: 'Statistiken', totalWordsLabel: 'Wörter gesamt', learnedLabel: 'Gelernt', learningLabel: 'Wird gelernt',
    streakLabel: 'Aktuelle Serie', streakUnit: 'Tage', scheduleTitle: 'Lernplan', scheduleEmpty: 'Kein aktiver Lernplan.',
    actionError: 'Aktion fehlgeschlagen.', levelPrefix: 'Lvl.', minLabel: 'Min.',
    days: 'So,Mo,Di,Mi,Do,Fr,Sa',
    messageBtn: 'Nachricht', blockBtn: 'Blockieren',
    blockConfirm: 'Möchtest du diese Person wirklich blockieren? Ihr könnt dann gegenseitig keine Nachrichten, Profile oder Freundschafts-/Folge-Anfragen mehr sehen.',
    blockError: 'Blockieren fehlgeschlagen.',
  },
  fr: {
    back: 'Amis', notFound: "Cet utilisateur est introuvable.", error: "Le profil n'a pas pu être chargé.",
    memberSince: 'Inscrit le', friendsCountLabel: 'amis', followersCountLabel: 'abonnés', followingCountLabel: 'abonnements',
    sendRequestBtn: 'Ajouter en ami', requestSentBtn: 'Demande envoyée', acceptBtn: 'Accepter', declineBtn: 'Refuser',
    removeFriendBtn: "Retirer de mes amis", removeConfirm: 'Veux-tu vraiment retirer cette personne de tes amis ?',
    friendsLabel: 'Amis', followBtn: 'Suivre', unfollowBtn: 'Ne plus suivre', selfHint: 'Ceci est ton profil.',
    statsTitle: 'Statistiques', totalWordsLabel: 'Mots au total', learnedLabel: 'Appris', learningLabel: 'En apprentissage',
    streakLabel: 'Série actuelle', streakUnit: 'jours', scheduleTitle: "Programme d'étude", scheduleEmpty: "Aucun programme d'étude actif.",
    actionError: "L'action a échoué.", levelPrefix: 'Niv.', minLabel: 'min',
    days: 'Dim,Lun,Mar,Mer,Jeu,Ven,Sam',
    messageBtn: 'Envoyer un message', blockBtn: 'Bloquer',
    blockConfirm: "Es-tu sûr(e) de vouloir bloquer cette personne ? Vous ne pourrez plus voir vos messages, profils ni demandes d'ami/abonnement respectifs.",
    blockError: "Le blocage a échoué.",
  },
  es: {
    back: 'Amigos', notFound: 'No se encontró este usuario.', error: 'No se pudo cargar el perfil.',
    memberSince: 'Se unió', friendsCountLabel: 'amigos', followersCountLabel: 'seguidores', followingCountLabel: 'siguiendo',
    sendRequestBtn: 'Añadir amigo', requestSentBtn: 'Solicitud enviada', acceptBtn: 'Aceptar', declineBtn: 'Rechazar',
    removeFriendBtn: 'Eliminar amistad', removeConfirm: '¿Seguro que quieres quitar a esta persona de tus amigos?',
    friendsLabel: 'Amigos', followBtn: 'Seguir', unfollowBtn: 'Dejar de seguir', selfHint: 'Este es tu perfil.',
    statsTitle: 'Estadísticas', totalWordsLabel: 'Palabras totales', learnedLabel: 'Aprendidas', learningLabel: 'Aprendiendo',
    streakLabel: 'Racha actual', streakUnit: 'días', scheduleTitle: 'Horario de estudio', scheduleEmpty: 'No hay un horario de estudio activo.',
    actionError: 'La acción falló.', levelPrefix: 'Niv.', minLabel: 'min',
    days: 'Dom,Lun,Mar,Mié,Jue,Vie,Sáb',
    messageBtn: 'Enviar mensaje', blockBtn: 'Bloquear',
    blockConfirm: '¿Seguro que quieres bloquear a esta persona? Ya no podrán ver sus mensajes, perfil ni solicitudes de amistad/seguimiento.',
    blockError: 'No se pudo bloquear a este usuario.',
  },
  it: {
    back: 'Amici', notFound: 'Utente non trovato.', error: 'Impossibile caricare il profilo.',
    memberSince: 'Iscritto il', friendsCountLabel: 'amici', followersCountLabel: 'follower', followingCountLabel: 'seguiti',
    sendRequestBtn: 'Aggiungi amico', requestSentBtn: 'Richiesta inviata', acceptBtn: 'Accetta', declineBtn: 'Rifiuta',
    removeFriendBtn: 'Rimuovi amicizia', removeConfirm: 'Sei sicuro di voler rimuovere questa persona dai tuoi amici?',
    friendsLabel: 'Amici', followBtn: 'Segui', unfollowBtn: 'Smetti di seguire', selfHint: 'Questo è il tuo profilo.',
    statsTitle: 'Statistiche', totalWordsLabel: 'Parole totali', learnedLabel: 'Imparate', learningLabel: 'In corso',
    streakLabel: 'Serie attuale', streakUnit: 'giorni', scheduleTitle: 'Programma di studio', scheduleEmpty: 'Nessun programma di studio attivo.',
    actionError: "L'azione non è riuscita.", levelPrefix: 'Liv.', minLabel: 'min',
    days: 'Dom,Lun,Mar,Mer,Gio,Ven,Sab',
    messageBtn: 'Invia messaggio', blockBtn: 'Blocca',
    blockConfirm: 'Sei sicuro di voler bloccare questa persona? Non potrete più vedere i rispettivi messaggi, profilo o richieste di amicizia/follow.',
    blockError: 'Impossibile bloccare questo utente.',
  },
  ar: {
    back: 'الأصدقاء', notFound: 'لم يتم العثور على هذا المستخدم.', error: 'تعذّر تحميل الملف الشخصي.',
    memberSince: 'تاريخ الانضمام', friendsCountLabel: 'أصدقاء', followersCountLabel: 'متابعون', followingCountLabel: 'يتابع',
    sendRequestBtn: 'إضافة صديق', requestSentBtn: 'تم إرسال الطلب', acceptBtn: 'قبول', declineBtn: 'رفض',
    removeFriendBtn: 'إلغاء الصداقة', removeConfirm: 'هل أنت متأكد أنك تريد إزالة هذا الشخص من أصدقائك؟',
    friendsLabel: 'أصدقاء', followBtn: 'متابعة', unfollowBtn: 'إلغاء المتابعة', selfHint: 'هذا هو ملفك الشخصي.',
    statsTitle: 'الإحصائيات', totalWordsLabel: 'إجمالي الكلمات', learnedLabel: 'تم تعلمها', learningLabel: 'قيد التعلم',
    streakLabel: 'السلسلة الحالية', streakUnit: 'يوم', scheduleTitle: 'برنامج الدراسة', scheduleEmpty: 'لا يوجد برنامج دراسة نشط.',
    actionError: 'فشل الإجراء.', levelPrefix: 'مستوى', minLabel: 'د',
    days: 'الأحد,الاثنين,الثلاثاء,الأربعاء,الخميس,الجمعة,السبت',
    messageBtn: 'إرسال رسالة', blockBtn: 'حظر',
    blockConfirm: 'هل أنت متأكد أنك تريد حظر هذا الشخص؟ لن تتمكنا بعد ذلك من رؤية رسائل بعضكما أو الملف الشخصي أو طلبات الصداقة/المتابعة.',
    blockError: 'تعذّر حظر هذا المستخدم.',
  },
  ru: {
    back: 'Друзья', notFound: 'Этот пользователь не найден.', error: 'Не удалось загрузить профиль.',
    memberSince: 'В Lexis с', friendsCountLabel: 'друзей', followersCountLabel: 'подписчиков', followingCountLabel: 'подписок',
    sendRequestBtn: 'Добавить в друзья', requestSentBtn: 'Заявка отправлена', acceptBtn: 'Принять', declineBtn: 'Отклонить',
    removeFriendBtn: 'Удалить из друзей', removeConfirm: 'Вы уверены, что хотите удалить этого человека из друзей?',
    friendsLabel: 'Друзья', followBtn: 'Подписаться', unfollowBtn: 'Отписаться', selfHint: 'Это твой профиль.',
    statsTitle: 'Статистика', totalWordsLabel: 'Всего слов', learnedLabel: 'Выучено', learningLabel: 'Изучается',
    streakLabel: 'Текущая серия', streakUnit: 'дн.', scheduleTitle: 'Расписание занятий', scheduleEmpty: 'Нет активного расписания занятий.',
    actionError: 'Действие не выполнено.', levelPrefix: 'Ур.', minLabel: 'мин',
    days: 'Вс,Пн,Вт,Ср,Чт,Пт,Сб',
    messageBtn: 'Написать сообщение', blockBtn: 'Заблокировать',
    blockConfirm: 'Вы уверены, что хотите заблокировать этого человека? Вы больше не сможете видеть сообщения, профиль и заявки в друзья/подписку друг друга.',
    blockError: 'Не удалось заблокировать пользователя.',
  },
  ja: {
    back: '友達', notFound: 'このユーザーは見つかりませんでした。', error: 'プロフィールを読み込めませんでした。',
    memberSince: '登録日', friendsCountLabel: '友達', followersCountLabel: 'フォロワー', followingCountLabel: 'フォロー中',
    sendRequestBtn: '友達に追加', requestSentBtn: 'リクエスト送信済み', acceptBtn: '承認', declineBtn: '拒否',
    removeFriendBtn: '友達を解除', removeConfirm: 'この人を友達リストから削除してもよろしいですか?',
    friendsLabel: '友達', followBtn: 'フォロー', unfollowBtn: 'フォロー解除', selfHint: 'あなたのプロフィールです。',
    statsTitle: '統計', totalWordsLabel: '総単語数', learnedLabel: '習得済み', learningLabel: '学習中',
    streakLabel: '現在の連続記録', streakUnit: '日', scheduleTitle: '学習スケジュール', scheduleEmpty: '有効な学習スケジュールはありません。',
    actionError: '操作に失敗しました。', levelPrefix: 'Lv.', minLabel: '分',
    days: '日,月,火,水,木,金,土',
    messageBtn: 'メッセージを送る', blockBtn: 'ブロック',
    blockConfirm: 'このユーザーをブロックしますか?ブロックすると、お互いのメッセージ、プロフィール、フレンド/フォローリクエストが見られなくなります。',
    blockError: 'このユーザーをブロックできませんでした。',
  },
};
