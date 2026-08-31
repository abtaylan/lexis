'use client';

// app/(app)/messages/page.tsx — Madde 6, Faz 2: Mesajlaşma gelen kutusu.
// Konuşma listesi — her satır /messages/[username]'a gider. Yeni bir
// konuşma başlatmak için giriş noktası burada YOK: u/[username] profil
// sayfasındaki "Mesaj gönder" butonu (bkz. Faz 2 profil entegrasyonu).
// Polling: bu kod tabanında Supabase Realtime hiç kullanılmıyor, burada da
// belirli aralıklarla (8sn) GET /social/conversations tekrar çağrılıyor.
// Backend: /api/v1/social/conversations (bkz. messaging_service.py)

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { socialApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useLocale, type Locale } from '@/lib/i18n';
import type { ConversationItem } from '@/types';

const POLL_MS = 8000;

const L: Record<Locale, Record<string, string>> = {
  tr: {
    title: 'Mesajlar', loading: 'Yükleniyor…', error: 'Mesajlar yüklenemedi.',
    empty: 'Henüz bir konuşman yok.', emptySub: 'Bir kullanıcının profilinden "Mesaj gönder" ile başlayabilirsin.',
    you: 'Sen',
  },
  en: {
    title: 'Messages', loading: 'Loading…', error: 'Could not load messages.',
    empty: "You don't have any conversations yet.", emptySub: 'Start one from a user\'s profile with "Message".',
    you: 'You',
  },
  de: {
    title: 'Nachrichten', loading: 'Lädt…', error: 'Nachrichten konnten nicht geladen werden.',
    empty: 'Du hast noch keine Unterhaltungen.', emptySub: 'Starte eine über „Nachricht senden" im Profil eines Nutzers.',
    you: 'Du',
  },
  fr: {
    title: 'Messages', loading: 'Chargement…', error: 'Impossible de charger les messages.',
    empty: "Tu n'as pas encore de conversation.", emptySub: 'Démarres-en une depuis le profil d\'un utilisateur avec « Envoyer un message ».',
    you: 'Toi',
  },
  es: {
    title: 'Mensajes', loading: 'Cargando…', error: 'No se pudieron cargar los mensajes.',
    empty: 'Todavía no tienes conversaciones.', emptySub: 'Inicia una desde el perfil de un usuario con "Enviar mensaje".',
    you: 'Tú',
  },
  it: {
    title: 'Messaggi', loading: 'Caricamento…', error: 'Impossibile caricare i messaggi.',
    empty: 'Non hai ancora conversazioni.', emptySub: 'Iniziane una dal profilo di un utente con "Invia messaggio".',
    you: 'Tu',
  },
  ar: {
    title: 'الرسائل', loading: 'جارٍ التحميل…', error: 'تعذّر تحميل الرسائل.',
    empty: 'ليس لديك أي محادثات بعد.', emptySub: 'ابدأ محادثة من الملف الشخصي لمستخدم عبر "إرسال رسالة".',
    you: 'أنت',
  },
  ru: {
    title: 'Сообщения', loading: 'Загрузка…', error: 'Не удалось загрузить сообщения.',
    empty: 'У вас пока нет переписок.', emptySub: 'Начните переписку из профиля пользователя, нажав «Написать сообщение».',
    you: 'Вы',
  },
  ja: {
    title: 'メッセージ', loading: '読み込み中…', error: 'メッセージを読み込めませんでした。',
    empty: 'まだ会話がありません。', emptySub: 'ユーザーのプロフィールの「メッセージを送る」から始められます。',
    you: 'あなた',
  },
  pt: {
    title: 'Mensagens', loading: 'A carregar…', error: 'Não foi possível carregar as mensagens.',
    empty: 'Ainda não tens conversas.', emptySub: 'Começa uma a partir do perfil de um utilizador com "Mensagem".',
    you: 'Tu',
  },
};

function initial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

function formatWhen(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export default function MessagesInboxPage() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const t = L[locale] ?? L.en;

  const [items, setItems] = useState<ConversationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    socialApi.getConversations()
      .then((res) => {
        setItems(res);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => {
        if (showLoading) setLoading(false);
      });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    load(true);
    pollRef.current = setInterval(() => load(false), POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div className="p-6 max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/15 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
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
            {items.map((conv) => {
              const name = conv.other_user.display_name || conv.other_user.username || '?';
              const isMine = !!user && conv.last_message_sender_id === user.id;
              return (
                <Link
                  key={conv.id}
                  href={conv.other_user.username ? `/messages/${conv.other_user.username}` : '#'}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50 hover:dark:bg-slate-800 transition-colors"
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-slate-400">
                      {initial(name)}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900 dark:text-slate-100' : 'font-medium text-gray-700 dark:text-slate-300'}`}>
                      {name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">
                      {conv.last_message_preview
                        ? `${isMine ? `${t.you}: ` : ''}${conv.last_message_preview}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-slate-500 shrink-0">
                    {formatWhen(conv.last_message_at, locale)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
