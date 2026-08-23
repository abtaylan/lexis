// src/i18n/messagesStrings.ts — web'deki app/(app)/messages/page.tsx (gelen
// kutusu) ve app/(app)/messages/[username]/page.tsx (konuşma) sayfalarındaki
// yerel L sözlüklerinden taşındı (9 dilin hepsi, web'deki çeviriler birebir).
// İki sayfanın da bir "error" anahtarı vardı — çakışmayı önlemek için
// `inboxError`/`threadError` olarak ayrıldı. `loading` merkezi sözlükten
// (`t('loading')`) kullanılıyor.
import type { Locale } from './locales';

export type MessagesStrings = {
  // Gelen kutusu (inbox)
  inboxTitle: string;
  inboxError: string;
  empty: string;
  emptySub: string;
  you: string;
  // Konuşma (thread)
  threadBack: string;
  threadError: string;
  notFound: string;
  placeholder: string;
  sendBtn: string;
  emptyThread: string;
  blockedError: string;
};

export const MESSAGES_STRINGS: Record<Locale, MessagesStrings> = {
  tr: {
    inboxTitle: 'Mesajlar', inboxError: 'Mesajlar yüklenemedi.',
    empty: 'Henüz bir konuşman yok.', emptySub: 'Bir kullanıcının profilinden "Mesaj gönder" ile başlayabilirsin.',
    you: 'Sen',
    threadBack: 'Mesajlar', threadError: 'Konuşma yüklenemedi.', notFound: 'Bu kullanıcı bulunamadı.',
    placeholder: 'Bir mesaj yaz…', sendBtn: 'Gönder', emptyThread: 'Henüz mesaj yok — ilk mesajı sen gönder!',
    blockedError: 'Bu kullanıcıyla mesajlaşamazsın.',
  },
  en: {
    inboxTitle: 'Messages', inboxError: 'Could not load messages.',
    empty: "You don't have any conversations yet.", emptySub: 'Start one from a user\'s profile with "Message".',
    you: 'You',
    threadBack: 'Messages', threadError: 'Could not load the conversation.', notFound: 'This user could not be found.',
    placeholder: 'Write a message…', sendBtn: 'Send', emptyThread: 'No messages yet — send the first one!',
    blockedError: 'You cannot message this user.',
  },
  de: {
    inboxTitle: 'Nachrichten', inboxError: 'Nachrichten konnten nicht geladen werden.',
    empty: 'Du hast noch keine Unterhaltungen.', emptySub: 'Starte eine über „Nachricht senden" im Profil eines Nutzers.',
    you: 'Du',
    threadBack: 'Nachrichten', threadError: 'Unterhaltung konnte nicht geladen werden.', notFound: 'Dieser Nutzer wurde nicht gefunden.',
    placeholder: 'Nachricht schreiben…', sendBtn: 'Senden', emptyThread: 'Noch keine Nachrichten — schreib die erste!',
    blockedError: 'Du kannst diesem Nutzer keine Nachricht schicken.',
  },
  fr: {
    inboxTitle: 'Messages', inboxError: 'Impossible de charger les messages.',
    empty: "Tu n'as pas encore de conversation.", emptySub: 'Démarres-en une depuis le profil d\'un utilisateur avec « Envoyer un message ».',
    you: 'Toi',
    threadBack: 'Messages', threadError: "La conversation n'a pas pu être chargée.", notFound: 'Cet utilisateur est introuvable.',
    placeholder: 'Écris un message…', sendBtn: 'Envoyer', emptyThread: "Pas encore de message — envoie le premier !",
    blockedError: 'Tu ne peux pas envoyer de message à cet utilisateur.',
  },
  es: {
    inboxTitle: 'Mensajes', inboxError: 'No se pudieron cargar los mensajes.',
    empty: 'Todavía no tienes conversaciones.', emptySub: 'Inicia una desde el perfil de un usuario con "Enviar mensaje".',
    you: 'Tú',
    threadBack: 'Mensajes', threadError: 'No se pudo cargar la conversación.', notFound: 'No se encontró este usuario.',
    placeholder: 'Escribe un mensaje…', sendBtn: 'Enviar', emptyThread: '¡Todavía no hay mensajes — envía el primero!',
    blockedError: 'No puedes enviar mensajes a este usuario.',
  },
  it: {
    inboxTitle: 'Messaggi', inboxError: 'Impossibile caricare i messaggi.',
    empty: 'Non hai ancora conversazioni.', emptySub: 'Iniziane una dal profilo di un utente con "Invia messaggio".',
    you: 'Tu',
    threadBack: 'Messaggi', threadError: 'Impossibile caricare la conversazione.', notFound: 'Utente non trovato.',
    placeholder: 'Scrivi un messaggio…', sendBtn: 'Invia', emptyThread: 'Ancora nessun messaggio — invia il primo!',
    blockedError: 'Non puoi inviare messaggi a questo utente.',
  },
  ar: {
    inboxTitle: 'الرسائل', inboxError: 'تعذّر تحميل الرسائل.',
    empty: 'ليس لديك أي محادثات بعد.', emptySub: 'ابدأ محادثة من الملف الشخصي لمستخدم عبر "إرسال رسالة".',
    you: 'أنت',
    threadBack: 'الرسائل', threadError: 'تعذّر تحميل المحادثة.', notFound: 'لم يتم العثور على هذا المستخدم.',
    placeholder: 'اكتب رسالة…', sendBtn: 'إرسال', emptyThread: 'لا توجد رسائل بعد — أرسل أول رسالة!',
    blockedError: 'لا يمكنك مراسلة هذا المستخدم.',
  },
  ru: {
    inboxTitle: 'Сообщения', inboxError: 'Не удалось загрузить сообщения.',
    empty: 'У вас пока нет переписок.', emptySub: 'Начните переписку из профиля пользователя, нажав «Написать сообщение».',
    you: 'Вы',
    threadBack: 'Сообщения', threadError: 'Не удалось загрузить переписку.', notFound: 'Этот пользователь не найден.',
    placeholder: 'Напишите сообщение…', sendBtn: 'Отправить', emptyThread: 'Сообщений пока нет — напишите первым!',
    blockedError: 'Вы не можете написать этому пользователю.',
  },
  ja: {
    inboxTitle: 'メッセージ', inboxError: 'メッセージを読み込めませんでした。',
    empty: 'まだ会話がありません。', emptySub: 'ユーザーのプロフィールの「メッセージを送る」から始められます。',
    you: 'あなた',
    threadBack: 'メッセージ', threadError: '会話を読み込めませんでした。', notFound: 'このユーザーは見つかりませんでした。',
    placeholder: 'メッセージを入力…', sendBtn: '送信', emptyThread: 'まだメッセージはありません — 最初のメッセージを送りましょう!',
    blockedError: 'このユーザーにメッセージを送ることはできません。',
  },
};
