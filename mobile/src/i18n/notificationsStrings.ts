// src/i18n/notificationsStrings.ts — Bildirimler ekranı sözlüğü.
// FRIENDS_STRINGS / MESSAGES_STRINGS ile aynı standalone desen: ekran
// bunu doğrudan import edip `NOTIFICATIONS_STRINGS[locale] ?? .tr` ile
// kullanır (bkz. dashboard.tsx / messages.tsx).
import type { Locale } from './locales';

export interface NotificationsStrings {
  title: string;
  markAllRead: string;
  empty: string;
  emptySub: string;
  error: string;
}

export const NOTIFICATIONS_STRINGS: Record<Locale, NotificationsStrings> = {
  tr: {
    title: 'Bildirimler',
    markAllRead: 'Tümünü okundu işaretle',
    empty: 'Henüz bildirimin yok',
    emptySub: 'Yeni mesaj, arkadaşlık isteği ve ödüller burada görünecek.',
    error: 'Bildirimler yüklenemedi.',
  },
  en: {
    title: 'Notifications',
    markAllRead: 'Mark all as read',
    empty: 'No notifications yet',
    emptySub: 'New messages, friend requests, and rewards will show up here.',
    error: 'Could not load notifications.',
  },
  de: {
    title: 'Benachrichtigungen',
    markAllRead: 'Alle als gelesen markieren',
    empty: 'Noch keine Benachrichtigungen',
    emptySub: 'Neue Nachrichten, Freundschaftsanfragen und Belohnungen erscheinen hier.',
    error: 'Benachrichtigungen konnten nicht geladen werden.',
  },
  fr: {
    title: 'Notifications',
    markAllRead: 'Tout marquer comme lu',
    empty: 'Aucune notification pour le moment',
    emptySub: 'Les nouveaux messages, demandes d’ami et récompenses apparaîtront ici.',
    error: 'Impossible de charger les notifications.',
  },
  es: {
    title: 'Notificaciones',
    markAllRead: 'Marcar todo como leído',
    empty: 'Aún no tienes notificaciones',
    emptySub: 'Los nuevos mensajes, solicitudes de amistad y recompensas aparecerán aquí.',
    error: 'No se pudieron cargar las notificaciones.',
  },
  it: {
    title: 'Notifiche',
    markAllRead: 'Segna tutte come lette',
    empty: 'Nessuna notifica per ora',
    emptySub: 'Nuovi messaggi, richieste di amicizia e premi appariranno qui.',
    error: 'Impossibile caricare le notifiche.',
  },
  ar: {
    title: 'الإشعارات',
    markAllRead: 'وضع علامة مقروء على الكل',
    empty: 'لا توجد إشعارات بعد',
    emptySub: 'ستظهر هنا الرسائل الجديدة وطلبات الصداقة والمكافآت.',
    error: 'تعذّر تحميل الإشعارات.',
  },
  ru: {
    title: 'Уведомления',
    markAllRead: 'Отметить всё как прочитанное',
    empty: 'Пока нет уведомлений',
    emptySub: 'Здесь будут появляться новые сообщения, заявки в друзья и награды.',
    error: 'Не удалось загрузить уведомления.',
  },
  ja: {
    title: '通知',
    markAllRead: 'すべて既読にする',
    empty: 'まだ通知はありません',
    emptySub: '新着メッセージ、フレンド申請、報酬がここに表示されます。',
    error: '通知を読み込めませんでした。',
  },
  pt: {
    title: 'Notificações',
    markAllRead: 'Marcar tudo como lido',
    empty: 'Ainda não tens notificações',
    emptySub: 'As novas mensagens, pedidos de amizade e recompensas vão aparecer aqui.',
    error: 'Não foi possível carregar as notificações.',
  },
};
