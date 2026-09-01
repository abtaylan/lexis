'use client';

// app/(app)/notifications/page.tsx — Madde 3a: Bildirimler.
// Önceden dashboard'da büyük bir kart olarak gömülüydü (bkz. eski
// dashboard/page.tsx "Bildirimler / hatırlatmalar" bloğu); kullanıcı
// isteğiyle ayrı bir sayfaya taşındı, dashboard'da sadece üstteki zil
// ikonu + okunmamış sayaç rozeti kaldı (bkz. dashboard/page.tsx üst bar).
// Mobil karşılığı: mobile/src/app/(app)/notifications.tsx — aynı desen
// (aynı backend: GET/PATCH /notifications, bkz. notifications.py).

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Flame, MessageCircle, Trophy, UserPlus } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { Notification } from '@/types';

const L: Record<Locale, Record<string, string>> = {
  tr: {
    title: 'Bildirimler', loading: 'Yükleniyor…', error: 'Bildirimler yüklenemedi.',
    empty: 'Henüz bildirim yok.', emptySub: 'Program sayfasından bir göreve hatırlatma ekleyince burada görünecek.',
    markAllRead: 'Tümünü okundu işaretle',
  },
  en: {
    title: 'Notifications', loading: 'Loading…', error: 'Could not load notifications.',
    empty: 'No notifications yet.', emptySub: 'Notifications will show up here once something happens.',
    markAllRead: 'Mark all as read',
  },
  de: {
    title: 'Benachrichtigungen', loading: 'Lädt…', error: 'Benachrichtigungen konnten nicht geladen werden.',
    empty: 'Noch keine Benachrichtigungen.', emptySub: 'Sie erscheinen hier, sobald etwas passiert.',
    markAllRead: 'Alle als gelesen markieren',
  },
  fr: {
    title: 'Notifications', loading: 'Chargement…', error: 'Impossible de charger les notifications.',
    empty: "Pas encore de notification.", emptySub: 'Elles apparaîtront ici dès qu\'il se passera quelque chose.',
    markAllRead: 'Tout marquer comme lu',
  },
  es: {
    title: 'Notificaciones', loading: 'Cargando…', error: 'No se pudieron cargar las notificaciones.',
    empty: 'Todavía no hay notificaciones.', emptySub: 'Aparecerán aquí en cuanto ocurra algo.',
    markAllRead: 'Marcar todo como leído',
  },
  it: {
    title: 'Notifiche', loading: 'Caricamento…', error: 'Impossibile caricare le notifiche.',
    empty: 'Ancora nessuna notifica.', emptySub: 'Appariranno qui non appena succede qualcosa.',
    markAllRead: 'Segna tutte come lette',
  },
  ar: {
    title: 'الإشعارات', loading: 'جارٍ التحميل…', error: 'تعذّر تحميل الإشعارات.',
    empty: 'لا توجد إشعارات بعد.', emptySub: 'ستظهر هنا بمجرد حدوث شيء ما.',
    markAllRead: 'وضع علامة مقروء على الكل',
  },
  ru: {
    title: 'Уведомления', loading: 'Загрузка…', error: 'Не удалось загрузить уведомления.',
    empty: 'Пока нет уведомлений.', emptySub: 'Они появятся здесь, как только что-то произойдёт.',
    markAllRead: 'Отметить всё как прочитанное',
  },
  ja: {
    title: 'お知らせ', loading: '読み込み中…', error: 'お知らせを読み込めませんでした。',
    empty: 'まだお知らせはありません。', emptySub: '何か起きるとここに表示されます。',
    markAllRead: 'すべて既読にする',
  },
  pt: {
    title: 'Notificações', loading: 'A carregar…', error: 'Não foi possível carregar as notificações.',
    empty: 'Ainda sem notificações.', emptySub: 'Vão aparecer aqui assim que algo acontecer.',
    markAllRead: 'Marcar tudo como lido',
  },
};

function iconFor(type: string, className: string) {
  if (type === 'new_message') return <MessageCircle className={className} />;
  if (type === 'friend_request' || type === 'follow') return <UserPlus className={className} />;
  if (type === 'badge' || type === 'leaderboard_reward') return <Trophy className={className} />;
  if (type === 'streak') return <Flame className={className} />;
  return <Bell className={className} />;
}

function formatWhen(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  try {
    if (sameDay) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function NotificationsPage() {
  const { locale } = useLocale();
  const t = L[locale] ?? L.en;

  const [items, setItems] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    notificationsApi
      .getAll(50)
      .then((res) => {
        setItems(res.items);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    load();
  }, []);

  const hasUnread = (items ?? []).some((n) => !n.is_read);

  const onMarkRead = async (n: Notification) => {
    if (n.is_read) return;
    setItems((prev) => (prev ?? []).map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    try {
      await notificationsApi.markRead(n.id);
    } catch {
      load();
    }
  };

  const onMarkAllRead = async () => {
    setItems((prev) => (prev ?? []).map((x) => ({ ...x, is_read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {
      load();
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FAEEDA] flex items-center justify-center">
            <Bell className="w-5 h-5 text-[#854F0B]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
        </div>
        {hasUnread && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-[#185FA5] transition-colors shrink-0"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t.markAllRead}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        {loading && <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">{t.loading}</p>}
        {!loading && error && <p className="text-sm text-red-400 dark:text-red-300 py-4 text-center">{t.error}</p>}
        {!loading && !error && (items?.length ?? 0) === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400 dark:text-slate-500">{t.empty}</p>
            <p className="text-xs text-gray-300 dark:text-slate-600 mt-1">{t.emptySub}</p>
          </div>
        )}
        {!loading && !error && items && items.length > 0 && (
          <div className="space-y-1">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => onMarkRead(n)}
                className={`w-full flex items-start gap-3 text-left rounded-xl px-2.5 py-2.5 transition-colors ${
                  n.is_read ? 'opacity-60' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 hover:dark:bg-slate-800'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    n.is_read ? 'bg-gray-100 dark:bg-slate-800' : 'bg-[#FAEEDA]'
                  }`}
                >
                  {iconFor(n.type, `w-4 h-4 ${n.is_read ? 'text-gray-400 dark:text-slate-500' : 'text-[#854F0B]'}`)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${n.is_read ? 'font-medium text-gray-600 dark:text-slate-400' : 'font-semibold text-gray-900 dark:text-slate-100'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{n.message}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">{formatWhen(n.created_at, locale)}</span>
                  {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
