// src/i18n/duelsStrings.ts — web'deki app/(app)/duels/page.tsx +
// app/(app)/duels/[id]/page.tsx içindeki yerel L sözlüklerinden taşındı
// (10 dilin hepsi, web'deki profesyonel çeviriler birebir). examStrings.ts'teki
// gibi tek dosyada birden fazla ekran (lobi + oda) için tek bir sözlük tipi.
import type { Locale } from './locales';

export type DuelsStrings = {
  // ── Lobi (duels.tsx) ──
  title: string;
  subtitle: string;
  createBtn: string;
  error: string;
  empty: string;
  emptySub: string;
  playersLabel: string;
  joinBtn: string;
  deleteRoomBtn: string;

  // ── Arkadasa davet (Faz 3f) ──
  inviteSectionTitle: string;
  inviteFriendPlaceholder: string;
  noFriendsForInvite: string;
  sendInviteBtn: string;
  pendingInvitesTitle: string;
  noPendingInvites: string;
  incomingInviteLabel: string;
  outgoingInviteLabel: string;
  acceptBtn: string;
  declineBtn: string;
  cancelInviteBtn: string;
  waitingBadge: string;

  // ── Oda — bekleme (duel-room.tsx) ──
  waitingTitle: string;
  waitingSub: string;
  startBtn: string;
  needMoreLabel: string;
  leaveBtn: string;
  hostOnlyLabel: string;

  // ── Oda — aktif tur ──
  roundLabel: string;
  answeredLabel: string;
  correctLabel: string;
  wrongLabel: string;
  correctAnswerPrefix: string;
  waitingRoundLabel: string;

  // ── Oda — bitiş ──
  finishedTitle: string;
  backToLobbyBtn: string;

  // ── Oda — ortak ──
  youLabel: string;
  scoreLabel: string;

  // ── Mod seçimi (oda oluşturma) + wordle turu (18 Eylül 2026) ──
  // Kullanıcı isteği: "adam asmacada düello olmalı" — backend zaten
  // hazırdı ama hiçbir istemciden erişilemiyordu (mode parametresi hiç
  // gönderilmiyordu). Şimdi oda oluştururken mod seçilebiliyor.
  modeQuizLabel: string;
  modeWordleLabel: string;
  livesLabel: string;
  wordleCompleteLabel: string;
  wordleFirstFinishLabel: string;
  wordleFailedLabel: string;

  // ── Lingo modu (26 Kasım 2026, kullanıcı isteği -- TRT1 "Lingo
  // Türkiye" uyarlaması, çok oyunculu düello) ──
  modeLingoLabel: string;
  lingoPotLabel: string;
  lingoGuessesLeftTpl: string;
  lingoInputPlaceholder: string;
  lingoSubmitBtn: string;
  lingoInvalidLengthTpl: string;
  lingoCompleteLabel: string;
  lingoFirstFinishLabel: string;
  lingoFailedLabel: string;
  lingoBonusLabel: string;
};

export const DUELS_STRINGS: Record<Locale, DuelsStrings> = {
  tr: {
    title: 'Düello', subtitle: 'Aynı anda birden fazla kişiyle canlı kelime yarışması.',
    createBtn: 'Yeni Oda Aç', error: 'Bir şeyler ters gitti.',
    empty: 'Şu an bekleyen oda yok.', emptySub: 'İlk odayı sen aç!',
    playersLabel: 'oyuncu', joinBtn: 'Katıl', deleteRoomBtn: 'Odayı Sil',
    inviteSectionTitle: 'Arkadaşını Davet Et', inviteFriendPlaceholder: 'Bir arkadaş seç',
    noFriendsForInvite: 'Davet edebileceğin arkadaşın yok.', sendInviteBtn: 'Davet Gönder',
    pendingInvitesTitle: 'Bekleyen Davetler', noPendingInvites: 'Bekleyen davet yok.',
    incomingInviteLabel: 'seni davet etti', outgoingInviteLabel: 'davet edildi',
    acceptBtn: 'Kabul Et', declineBtn: 'Reddet', cancelInviteBtn: 'İptal Et', waitingBadge: 'Bekliyor',
    waitingTitle: 'Bekleme Odası', waitingSub: 'Diğer oyuncular bekleniyor…',
    startBtn: 'Başlat', needMoreLabel: 'Başlamak için en az 2 oyuncu gerekiyor.',
    leaveBtn: 'Odadan Ayrıl', hostOnlyLabel: 'Sadece oda sahibi başlatabilir.',
    roundLabel: 'Tur', answeredLabel: 'Cevap gönderildi, tur bekleniyor…',
    correctLabel: 'Doğru! 🎉', wrongLabel: 'Yanlış.', correctAnswerPrefix: 'Doğru cevap:',
    waitingRoundLabel: 'Sıradaki tur hazırlanıyor…',
    finishedTitle: 'Düello Bitti', backToLobbyBtn: 'Lobiye Dön',
    youLabel: '(sen)', scoreLabel: 'puan',
    modeQuizLabel: 'Klasik (Çoktan Seçmeli)', modeWordleLabel: 'Adam Asmaca',
    livesLabel: 'Can', wordleCompleteLabel: 'Kelimeyi tamamladın! 🎉',
    wordleFirstFinishLabel: 'İlk bitiren sensin! +bonus 🏆', wordleFailedLabel: 'Hakların bitti.',
    modeLingoLabel: 'Lingo', lingoPotLabel: 'Kasa', lingoGuessesLeftTpl: '{n} hakkın kaldı',
    lingoInputPlaceholder: 'Kelimeyi yaz', lingoSubmitBtn: 'Gönder',
    lingoInvalidLengthTpl: 'Kelime {n} harfli olmalı', lingoCompleteLabel: 'Kelimeyi tamamladın! 🎉',
    lingoFirstFinishLabel: 'İlk bitiren sensin! +bonus 🏆', lingoFailedLabel: 'Hakların bitti.', lingoBonusLabel: 'Bonus Kelime — 2 katı ödül!',
  },
  en: {
    title: 'Duel', subtitle: 'A live vocabulary competition with multiple players at once.',
    createBtn: 'Create Room', error: 'Something went wrong.',
    empty: 'No waiting rooms right now.', emptySub: 'Be the first to open one!',
    playersLabel: 'players', joinBtn: 'Join', deleteRoomBtn: 'Delete Room',
    inviteSectionTitle: 'Invite a Friend', inviteFriendPlaceholder: 'Choose a friend',
    noFriendsForInvite: "You don't have any friends to invite.", sendInviteBtn: 'Send Invite',
    pendingInvitesTitle: 'Pending Invites', noPendingInvites: 'No pending invites.',
    incomingInviteLabel: 'invited you', outgoingInviteLabel: 'invited',
    acceptBtn: 'Accept', declineBtn: 'Decline', cancelInviteBtn: 'Cancel', waitingBadge: 'Waiting',
    waitingTitle: 'Waiting Room', waitingSub: 'Waiting for other players…',
    startBtn: 'Start', needMoreLabel: 'At least 2 players are needed to start.',
    leaveBtn: 'Leave Room', hostOnlyLabel: 'Only the host can start.',
    roundLabel: 'Round', answeredLabel: 'Answer submitted, waiting for the round…',
    correctLabel: 'Correct! 🎉', wrongLabel: 'Wrong.', correctAnswerPrefix: 'Correct answer:',
    waitingRoundLabel: 'Preparing the next round…',
    finishedTitle: 'Duel Over', backToLobbyBtn: 'Back to Lobby',
    youLabel: '(you)', scoreLabel: 'pts',
    modeQuizLabel: 'Quiz (Multiple Choice)', modeWordleLabel: 'Word Guess',
    livesLabel: 'Lives', wordleCompleteLabel: 'You completed the word! 🎉',
    wordleFirstFinishLabel: 'First to finish! +bonus 🏆', wordleFailedLabel: 'Out of guesses.',
    modeLingoLabel: 'Lingo', lingoPotLabel: 'Pot', lingoGuessesLeftTpl: '{n} guesses left',
    lingoInputPlaceholder: 'Type the word', lingoSubmitBtn: 'Submit',
    lingoInvalidLengthTpl: 'The word must be {n} letters', lingoCompleteLabel: 'You completed the word! 🎉',
    lingoFirstFinishLabel: 'First to finish! +bonus 🏆', lingoFailedLabel: 'Out of guesses.', lingoBonusLabel: 'Bonus Word — double reward!',
  },
  de: {
    title: 'Duell', subtitle: 'Ein Live-Vokabelwettbewerb mit mehreren Spielern gleichzeitig.',
    createBtn: 'Raum erstellen', error: 'Etwas ist schiefgelaufen.',
    empty: 'Gerade keine wartenden Räume.', emptySub: 'Eröffne den ersten Raum!',
    playersLabel: 'Spieler', joinBtn: 'Beitreten', deleteRoomBtn: 'Raum löschen',
    inviteSectionTitle: 'Freund einladen', inviteFriendPlaceholder: 'Freund auswählen',
    noFriendsForInvite: 'Du hast keine Freunde zum Einladen.', sendInviteBtn: 'Einladung senden',
    pendingInvitesTitle: 'Ausstehende Einladungen', noPendingInvites: 'Keine ausstehenden Einladungen.',
    incomingInviteLabel: 'hat dich eingeladen', outgoingInviteLabel: 'eingeladen',
    acceptBtn: 'Annehmen', declineBtn: 'Ablehnen', cancelInviteBtn: 'Abbrechen', waitingBadge: 'Wartet',
    waitingTitle: 'Warteraum', waitingSub: 'Warten auf weitere Spieler…',
    startBtn: 'Starten', needMoreLabel: 'Es werden mindestens 2 Spieler benötigt.',
    leaveBtn: 'Raum verlassen', hostOnlyLabel: 'Nur der Gastgeber kann starten.',
    roundLabel: 'Runde', answeredLabel: 'Antwort gesendet, warte auf die Runde…',
    correctLabel: 'Richtig! 🎉', wrongLabel: 'Falsch.', correctAnswerPrefix: 'Richtige Antwort:',
    waitingRoundLabel: 'Nächste Runde wird vorbereitet…',
    finishedTitle: 'Duell beendet', backToLobbyBtn: 'Zurück zur Lobby',
    youLabel: '(du)', scoreLabel: 'Pkt.',
    modeQuizLabel: 'Quiz (Multiple-Choice)', modeWordleLabel: 'Wort erraten',
    livesLabel: 'Leben', wordleCompleteLabel: 'Du hast das Wort vervollständigt! 🎉',
    wordleFirstFinishLabel: 'Zuerst fertig! +Bonus 🏆', wordleFailedLabel: 'Keine Versuche mehr.',
    modeLingoLabel: 'Lingo', lingoPotLabel: 'Topf', lingoGuessesLeftTpl: '{n} Versuche übrig',
    lingoInputPlaceholder: 'Wort eingeben', lingoSubmitBtn: 'Absenden',
    lingoInvalidLengthTpl: 'Das Wort muss {n} Buchstaben haben', lingoCompleteLabel: 'Du hast das Wort vervollständigt! 🎉',
    lingoFirstFinishLabel: 'Zuerst fertig! +Bonus 🏆', lingoFailedLabel: 'Keine Versuche mehr.', lingoBonusLabel: 'Bonuswort — doppelte Belohnung!',
  },
  fr: {
    title: 'Duel', subtitle: 'Une compétition de vocabulaire en direct avec plusieurs joueurs à la fois.',
    createBtn: 'Créer une salle', error: "Une erreur s'est produite.",
    empty: "Aucune salle en attente pour l'instant.", emptySub: 'Sois le premier à en ouvrir une !',
    playersLabel: 'joueurs', joinBtn: 'Rejoindre', deleteRoomBtn: 'Supprimer la salle',
    inviteSectionTitle: 'Inviter un ami', inviteFriendPlaceholder: 'Choisir un ami',
    noFriendsForInvite: "Tu n'as aucun ami à inviter.", sendInviteBtn: 'Envoyer l’invitation',
    pendingInvitesTitle: 'Invitations en attente', noPendingInvites: 'Aucune invitation en attente.',
    incomingInviteLabel: "t'a invité", outgoingInviteLabel: 'invité',
    acceptBtn: 'Accepter', declineBtn: 'Refuser', cancelInviteBtn: 'Annuler', waitingBadge: 'En attente',
    waitingTitle: "Salle d'attente", waitingSub: "En attente d'autres joueurs…",
    startBtn: 'Démarrer', needMoreLabel: 'Au moins 2 joueurs sont nécessaires pour démarrer.',
    leaveBtn: 'Quitter la salle', hostOnlyLabel: "Seul l'hôte peut démarrer.",
    roundLabel: 'Manche', answeredLabel: 'Réponse envoyée, en attente de la manche…',
    correctLabel: 'Correct ! 🎉', wrongLabel: 'Incorrect.', correctAnswerPrefix: 'Bonne réponse :',
    waitingRoundLabel: 'Préparation de la prochaine manche…',
    finishedTitle: 'Duel terminé', backToLobbyBtn: 'Retour au lobby',
    youLabel: '(toi)', scoreLabel: 'pts',
    modeQuizLabel: 'Quiz (choix multiple)', modeWordleLabel: 'Deviner le mot',
    livesLabel: 'Vies', wordleCompleteLabel: 'Tu as complété le mot ! 🎉',
    wordleFirstFinishLabel: 'Premier à terminer ! +bonus 🏆', wordleFailedLabel: "Plus d'essais.",
    modeLingoLabel: 'Lingo', lingoPotLabel: 'Cagnotte', lingoGuessesLeftTpl: '{n} essais restants',
    lingoInputPlaceholder: 'Écris le mot', lingoSubmitBtn: 'Valider',
    lingoInvalidLengthTpl: 'Le mot doit comporter {n} lettres', lingoCompleteLabel: 'Tu as complété le mot ! 🎉',
    lingoFirstFinishLabel: 'Premier à terminer ! +bonus 🏆', lingoFailedLabel: "Plus d'essais.", lingoBonusLabel: 'Mot bonus — récompense doublée !',
  },
  es: {
    title: 'Duelo', subtitle: 'Una competencia de vocabulario en vivo con varios jugadores a la vez.',
    createBtn: 'Crear sala', error: 'Algo salió mal.',
    empty: 'No hay salas en espera ahora mismo.', emptySub: '¡Sé el primero en abrir una!',
    playersLabel: 'jugadores', joinBtn: 'Unirse', deleteRoomBtn: 'Eliminar sala',
    inviteSectionTitle: 'Invitar a un amigo', inviteFriendPlaceholder: 'Elige un amigo',
    noFriendsForInvite: 'No tienes amigos para invitar.', sendInviteBtn: 'Enviar invitación',
    pendingInvitesTitle: 'Invitaciones pendientes', noPendingInvites: 'No hay invitaciones pendientes.',
    incomingInviteLabel: 'te invitó', outgoingInviteLabel: 'invitado',
    acceptBtn: 'Aceptar', declineBtn: 'Rechazar', cancelInviteBtn: 'Cancelar', waitingBadge: 'Esperando',
    waitingTitle: 'Sala de espera', waitingSub: 'Esperando a otros jugadores…',
    startBtn: 'Comenzar', needMoreLabel: 'Se necesitan al menos 2 jugadores para comenzar.',
    leaveBtn: 'Salir de la sala', hostOnlyLabel: 'Solo el anfitrión puede comenzar.',
    roundLabel: 'Ronda', answeredLabel: 'Respuesta enviada, esperando la ronda…',
    correctLabel: '¡Correcto! 🎉', wrongLabel: 'Incorrecto.', correctAnswerPrefix: 'Respuesta correcta:',
    waitingRoundLabel: 'Preparando la siguiente ronda…',
    finishedTitle: 'Duelo terminado', backToLobbyBtn: 'Volver al lobby',
    youLabel: '(tú)', scoreLabel: 'pts',
    modeQuizLabel: 'Cuestionario (opción múltiple)', modeWordleLabel: 'Adivinar la palabra',
    livesLabel: 'Vidas', wordleCompleteLabel: '¡Completaste la palabra! 🎉',
    wordleFirstFinishLabel: '¡Primero en terminar! +bono 🏆', wordleFailedLabel: 'Sin intentos.',
    modeLingoLabel: 'Lingo', lingoPotLabel: 'Bote', lingoGuessesLeftTpl: '{n} intentos restantes',
    lingoInputPlaceholder: 'Escribe la palabra', lingoSubmitBtn: 'Enviar',
    lingoInvalidLengthTpl: 'La palabra debe tener {n} letras', lingoCompleteLabel: '¡Completaste la palabra! 🎉',
    lingoFirstFinishLabel: '¡Primero en terminar! +bono 🏆', lingoFailedLabel: 'Sin intentos.', lingoBonusLabel: 'Palabra bonus — ¡recompensa doble!',
  },
  it: {
    title: 'Duello', subtitle: 'Una gara di vocabolario dal vivo con più giocatori contemporaneamente.',
    createBtn: 'Crea stanza', error: 'Qualcosa è andato storto.',
    empty: 'Nessuna stanza in attesa al momento.', emptySub: 'Sii il primo ad aprirne una!',
    playersLabel: 'giocatori', joinBtn: 'Partecipa', deleteRoomBtn: 'Elimina stanza',
    inviteSectionTitle: 'Invita un amico', inviteFriendPlaceholder: 'Scegli un amico',
    noFriendsForInvite: 'Non hai amici da invitare.', sendInviteBtn: 'Invia invito',
    pendingInvitesTitle: 'Inviti in sospeso', noPendingInvites: 'Nessun invito in sospeso.',
    incomingInviteLabel: 'ti ha invitato', outgoingInviteLabel: 'invitato',
    acceptBtn: 'Accetta', declineBtn: 'Rifiuta', cancelInviteBtn: 'Annulla', waitingBadge: 'In attesa',
    waitingTitle: "Sala d'attesa", waitingSub: 'In attesa di altri giocatori…',
    startBtn: 'Inizia', needMoreLabel: 'Servono almeno 2 giocatori per iniziare.',
    leaveBtn: 'Esci dalla stanza', hostOnlyLabel: "Solo l'host può iniziare.",
    roundLabel: 'Turno', answeredLabel: 'Risposta inviata, in attesa del turno…',
    correctLabel: 'Corretto! 🎉', wrongLabel: 'Sbagliato.', correctAnswerPrefix: 'Risposta corretta:',
    waitingRoundLabel: 'Preparazione del prossimo turno…',
    finishedTitle: 'Duello finito', backToLobbyBtn: 'Torna alla lobby',
    youLabel: '(tu)', scoreLabel: 'pt',
    modeQuizLabel: 'Quiz (scelta multipla)', modeWordleLabel: 'Indovina la parola',
    livesLabel: 'Vite', wordleCompleteLabel: 'Hai completato la parola! 🎉',
    wordleFirstFinishLabel: 'Primo a finire! +bonus 🏆', wordleFailedLabel: 'Tentativi esauriti.',
    modeLingoLabel: 'Lingo', lingoPotLabel: 'Montepremi', lingoGuessesLeftTpl: '{n} tentativi rimasti',
    lingoInputPlaceholder: 'Scrivi la parola', lingoSubmitBtn: 'Invia',
    lingoInvalidLengthTpl: 'La parola deve avere {n} lettere', lingoCompleteLabel: 'Hai completato la parola! 🎉',
    lingoFirstFinishLabel: 'Primo a finire! +bonus 🏆', lingoFailedLabel: 'Tentativi esauriti.', lingoBonusLabel: 'Parola bonus — ricompensa doppia!',
  },
  ar: {
    title: 'مبارزة', subtitle: 'مسابقة مفردات مباشرة مع عدة لاعبين في آن واحد.',
    createBtn: 'إنشاء غرفة', error: 'حدث خطأ ما.',
    empty: 'لا توجد غرف بانتظار حالياً.', emptySub: 'كن أول من يفتح غرفة!',
    playersLabel: 'لاعبين', joinBtn: 'انضمام', deleteRoomBtn: 'حذف الغرفة',
    inviteSectionTitle: 'دعوة صديق', inviteFriendPlaceholder: 'اختر صديقاً',
    noFriendsForInvite: 'ليس لديك أصدقاء لدعوتهم.', sendInviteBtn: 'إرسال الدعوة',
    pendingInvitesTitle: 'الدعوات المعلقة', noPendingInvites: 'لا توجد دعوات معلقة.',
    incomingInviteLabel: 'دعاك', outgoingInviteLabel: 'مدعو',
    acceptBtn: 'قبول', declineBtn: 'رفض', cancelInviteBtn: 'إلغاء', waitingBadge: 'قيد الانتظار',
    waitingTitle: 'غرفة الانتظار', waitingSub: 'في انتظار لاعبين آخرين…',
    startBtn: 'ابدأ', needMoreLabel: 'يلزم لاعبان على الأقل للبدء.',
    leaveBtn: 'مغادرة الغرفة', hostOnlyLabel: 'فقط صاحب الغرفة يمكنه البدء.',
    roundLabel: 'جولة', answeredLabel: 'تم إرسال الإجابة، بانتظار الجولة…',
    correctLabel: 'إجابة صحيحة! 🎉', wrongLabel: 'إجابة خاطئة.', correctAnswerPrefix: 'الإجابة الصحيحة:',
    waitingRoundLabel: 'يتم تجهيز الجولة التالية…',
    finishedTitle: 'انتهت المبارزة', backToLobbyBtn: 'العودة إلى الصالة',
    youLabel: '(أنت)', scoreLabel: 'نقطة',
    modeQuizLabel: 'مسابقة (اختيار من متعدد)', modeWordleLabel: 'تخمين الكلمة',
    livesLabel: 'محاولات', wordleCompleteLabel: 'أكملت الكلمة! 🎉',
    wordleFirstFinishLabel: 'الأول في الإنهاء! +مكافأة 🏆', wordleFailedLabel: 'نفدت محاولاتك.',
    modeLingoLabel: 'لينجو', lingoPotLabel: 'الرصيد', lingoGuessesLeftTpl: 'تبقّت {n} محاولات',
    lingoInputPlaceholder: 'اكتب الكلمة', lingoSubmitBtn: 'إرسال',
    lingoInvalidLengthTpl: 'يجب أن تتكون الكلمة من {n} أحرف', lingoCompleteLabel: 'أكملت الكلمة! 🎉',
    lingoFirstFinishLabel: 'الأول في الإنهاء! +مكافأة 🏆', lingoFailedLabel: 'نفدت محاولاتك.', lingoBonusLabel: 'كلمة إضافية — مكافأة مضاعفة!',
  },
  ru: {
    title: 'Дуэль', subtitle: 'Живое соревнование по словарному запасу с несколькими игроками одновременно.',
    createBtn: 'Создать комнату', error: 'Что-то пошло не так.',
    empty: 'Сейчас нет ожидающих комнат.', emptySub: 'Открой первую комнату!',
    playersLabel: 'игроков', joinBtn: 'Присоединиться', deleteRoomBtn: 'Удалить комнату',
    inviteSectionTitle: 'Пригласить друга', inviteFriendPlaceholder: 'Выбери друга',
    noFriendsForInvite: 'У тебя нет друзей для приглашения.', sendInviteBtn: 'Отправить приглашение',
    pendingInvitesTitle: 'Ожидающие приглашения', noPendingInvites: 'Нет ожидающих приглашений.',
    incomingInviteLabel: 'пригласил(а) тебя', outgoingInviteLabel: 'приглашён',
    acceptBtn: 'Принять', declineBtn: 'Отклонить', cancelInviteBtn: 'Отменить', waitingBadge: 'Ожидание',
    waitingTitle: 'Комната ожидания', waitingSub: 'Ожидание других игроков…',
    startBtn: 'Начать', needMoreLabel: 'Для начала нужно как минимум 2 игрока.',
    leaveBtn: 'Покинуть комнату', hostOnlyLabel: 'Начать может только хозяин комнаты.',
    roundLabel: 'Раунд', answeredLabel: 'Ответ отправлен, ожидание раунда…',
    correctLabel: 'Правильно! 🎉', wrongLabel: 'Неправильно.', correctAnswerPrefix: 'Правильный ответ:',
    waitingRoundLabel: 'Подготовка следующего раунда…',
    finishedTitle: 'Дуэль окончена', backToLobbyBtn: 'Вернуться в лобби',
    youLabel: '(ты)', scoreLabel: 'очк.',
    modeQuizLabel: 'Викторина (с вариантами)', modeWordleLabel: 'Угадай слово',
    livesLabel: 'Жизни', wordleCompleteLabel: 'Вы завершили слово! 🎉',
    wordleFirstFinishLabel: 'Первый финишировавший! +бонус 🏆', wordleFailedLabel: 'Попытки закончились.',
    modeLingoLabel: 'Линго', lingoPotLabel: 'Банк', lingoGuessesLeftTpl: 'Осталось попыток: {n}',
    lingoInputPlaceholder: 'Введите слово', lingoSubmitBtn: 'Отправить',
    lingoInvalidLengthTpl: 'Слово должно состоять из {n} букв', lingoCompleteLabel: 'Вы завершили слово! 🎉',
    lingoFirstFinishLabel: 'Первый финишировавший! +бонус 🏆', lingoFailedLabel: 'Попытки закончились.', lingoBonusLabel: 'Бонусное слово — двойная награда!',
  },
  ja: {
    title: 'デュエル', subtitle: '複数のプレイヤーと同時に対戦するライブ単語バトル。',
    createBtn: 'ルームを作成', error: '問題が発生しました。',
    empty: '現在待機中のルームはありません。', emptySub: '最初のルームを開いてみましょう!',
    playersLabel: '人', joinBtn: '参加', deleteRoomBtn: 'ルームを削除',
    inviteSectionTitle: '友達を招待', inviteFriendPlaceholder: '友達を選択',
    noFriendsForInvite: '招待できる友達がいません。', sendInviteBtn: '招待を送る',
    pendingInvitesTitle: '保留中の招待', noPendingInvites: '保留中の招待はありません。',
    incomingInviteLabel: 'があなたを招待しました', outgoingInviteLabel: '招待済み',
    acceptBtn: '承認', declineBtn: '拒否', cancelInviteBtn: 'キャンセル', waitingBadge: '待機中',
    waitingTitle: '待機ルーム', waitingSub: '他のプレイヤーを待っています…',
    startBtn: '開始', needMoreLabel: '開始するには2人以上のプレイヤーが必要です。',
    leaveBtn: 'ルームを退出', hostOnlyLabel: 'ホストのみ開始できます。',
    roundLabel: 'ラウンド', answeredLabel: '回答を送信しました、ラウンドを待っています…',
    correctLabel: '正解! 🎉', wrongLabel: '不正解。', correctAnswerPrefix: '正解:',
    waitingRoundLabel: '次のラウンドを準備中…',
    finishedTitle: 'デュエル終了', backToLobbyBtn: 'ロビーに戻る',
    youLabel: '(あなた)', scoreLabel: '点',
    modeQuizLabel: 'クイズ（選択式）', modeWordleLabel: '単語当て',
    livesLabel: 'ライフ', wordleCompleteLabel: '単語を完成させました！🎉',
    wordleFirstFinishLabel: '最速クリア！+ボーナス 🏆', wordleFailedLabel: '挑戦回数が尽きました。',
    modeLingoLabel: 'リンゴゲーム', lingoPotLabel: '持ち点', lingoGuessesLeftTpl: '残り{n}回',
    lingoInputPlaceholder: '単語を入力', lingoSubmitBtn: '送信',
    lingoInvalidLengthTpl: '単語は{n}文字である必要があります', lingoCompleteLabel: '単語を完成させました！🎉',
    lingoFirstFinishLabel: '最速クリア！+ボーナス 🏆', lingoFailedLabel: '挑戦回数が尽きました。', lingoBonusLabel: 'ボーナスワード — 報酬2倍!',
  },
  pt: {
    title: 'Duelo', subtitle: 'Uma competição de vocabulário ao vivo com vários jogadores ao mesmo tempo.',
    createBtn: 'Criar Sala', error: 'Algo deu errado.',
    empty: 'Nenhuma sala aguardando no momento.', emptySub: 'Seja o primeiro a abrir uma!',
    playersLabel: 'jogadores', joinBtn: 'Entrar', deleteRoomBtn: 'Excluir sala',
    inviteSectionTitle: 'Convidar amigo', inviteFriendPlaceholder: 'Escolha um amigo',
    noFriendsForInvite: 'Você não tem amigos para convidar.', sendInviteBtn: 'Enviar convite',
    pendingInvitesTitle: 'Convites pendentes', noPendingInvites: 'Nenhum convite pendente.',
    incomingInviteLabel: 'convidou você', outgoingInviteLabel: 'convidado',
    acceptBtn: 'Aceitar', declineBtn: 'Recusar', cancelInviteBtn: 'Cancelar', waitingBadge: 'Aguardando',
    waitingTitle: 'Sala de Espera', waitingSub: 'Aguardando outros jogadores…',
    startBtn: 'Iniciar', needMoreLabel: 'São necessários pelo menos 2 jogadores para iniciar.',
    leaveBtn: 'Sair da Sala', hostOnlyLabel: 'Somente o anfitrião pode iniciar.',
    roundLabel: 'Rodada', answeredLabel: 'Resposta enviada, aguardando a rodada…',
    correctLabel: 'Correto! 🎉', wrongLabel: 'Errado.', correctAnswerPrefix: 'Resposta correta:',
    waitingRoundLabel: 'Preparando a próxima rodada…',
    finishedTitle: 'Duelo Encerrado', backToLobbyBtn: 'Voltar ao Lobby',
    youLabel: '(você)', scoreLabel: 'pts',
    modeQuizLabel: 'Quiz (Múltipla Escolha)', modeWordleLabel: 'Adivinhar Palavra',
    livesLabel: 'Vidas', wordleCompleteLabel: 'Você completou a palavra! 🎉',
    wordleFirstFinishLabel: 'Primeiro a terminar! +bônus 🏆', wordleFailedLabel: 'Sem mais tentativas.',
    modeLingoLabel: 'Lingo', lingoPotLabel: 'Prêmio', lingoGuessesLeftTpl: '{n} tentativas restantes',
    lingoInputPlaceholder: 'Digite a palavra', lingoSubmitBtn: 'Enviar',
    lingoInvalidLengthTpl: 'A palavra deve ter {n} letras', lingoCompleteLabel: 'Você completou a palavra! 🎉',
    lingoFirstFinishLabel: 'Primeiro a terminar! +bônus 🏆', lingoFailedLabel: 'Sem mais tentativas.', lingoBonusLabel: 'Palavra Bónus — recompensa em dobro!',
  },
};
