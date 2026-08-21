'use client';

// app/(app)/messages/[username]/page.tsx — Madde 6, Faz 2: Mesaj konusu.
// Belirli bir kullanıcıyla olan konuşmayı gösterir (yoksa ilk mesajı
// gönderince otomatik oluşur, bkz. messaging_service.get_thread/send_message).
// Polling: 4sn'de bir GET /social/conversations/{username} tekrar çağrılıyor
// (Supabase Realtime bu kod tabanında hiç kullanılmıyor).
// Backend: /api/v1/social/conversations/{username} (bkz. messaging_service.py)

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { socialApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useLocale, type Locale } from '@/lib/i18n';
import type { ConversationThread } from '@/types';

const POLL_MS = 4000;

function errorStatus(err: unknown): number | undefined {
  if (err instanceof AxiosError) {
    return err.response?.status;
  }
  return undefined;
}

const L: Record<Locale, Record<string, string>> = {
  tr: {
    back: 'Mesajlar', loading: 'Yükleniyor…', error: 'Konuşma yüklenemedi.', notFound: 'Bu kullanıcı bulunamadı.',
    placeholder: 'Bir mesaj yaz…', sendBtn: 'Gönder', emptyThread: 'Henüz mesaj yok — ilk mesajı sen gönder!',
    blockedError: 'Bu kullanıcıyla mesajlaşamazsın.',
  },
  en: {
    back: 'Messages', loading: 'Loading…', error: 'Could not load the conversation.', notFound: 'This user could not be found.',
    placeholder: 'Write a message…', sendBtn: 'Send', emptyThread: 'No messages yet — send the first one!',
    blockedError: 'You cannot message this user.',
  },
  de: {
    back: 'Nachrichten', loading: 'Lädt…', error: 'Unterhaltung konnte nicht geladen werden.', notFound: 'Dieser Nutzer wurde nicht gefunden.',
    placeholder: 'Nachricht schreiben…', sendBtn: 'Senden', emptyThread: 'Noch keine Nachrichten — schreib die erste!',
    blockedError: 'Du kannst diesem Nutzer keine Nachricht schicken.',
  },
  fr: {
    back: 'Messages', loading: 'Chargement…', error: "La conversation n'a pas pu être chargée.", notFound: 'Cet utilisateur est introuvable.',
    placeholder: 'Écris un message…', sendBtn: 'Envoyer', emptyThread: "Pas encore de message — envoie le premier !",
    blockedError: 'Tu ne peux pas envoyer de message à cet utilisateur.',
  },
  es: {
    back: 'Mensajes', loading: 'Cargando…', error: 'No se pudo cargar la conversación.', notFound: 'No se encontró este usuario.',
    placeholder: 'Escribe un mensaje…', sendBtn: 'Enviar', emptyThread: '¡Todavía no hay mensajes — envía el primero!',
    blockedError: 'No puedes enviar mensajes a este usuario.',
  },
  it: {
    back: 'Messaggi', loading: 'Caricamento…', error: 'Impossibile caricare la conversazione.', notFound: 'Utente non trovato.',
    placeholder: 'Scrivi un messaggio…', sendBtn: 'Invia', emptyThread: 'Ancora nessun messaggio — invia il primo!',
    blockedError: 'Non puoi inviare messaggi a questo utente.',
  },
  ar: {
    back: 'الرسائل', loading: 'جارٍ التحميل…', error: 'تعذّر تحميل المحادثة.', notFound: 'لم يتم العثور على هذا المستخدم.',
    placeholder: 'اكتب رسالة…', sendBtn: 'إرسال', emptyThread: 'لا توجد رسائل بعد — أرسل أول رسالة!',
    blockedError: 'لا يمكنك مراسلة هذا المستخدم.',
  },
  ru: {
    back: 'Сообщения', loading: 'Загрузка…', error: 'Не удалось загрузить переписку.', notFound: 'Этот пользователь не найден.',
    placeholder: 'Напишите сообщение…', sendBtn: 'Отправить', emptyThread: 'Сообщений пока нет — напишите первым!',
    blockedError: 'Вы не можете написать этому пользователю.',
  },
  ja: {
    back: 'メッセージ', loading: '読み込み中…', error: '会話を読み込めませんでした。', notFound: 'このユーザーは見つかりませんでした。',
    placeholder: 'メッセージを入力…', sendBtn: '送信', emptyThread: 'まだメッセージはありません — 最初のメッセージを送りましょう!',
    blockedError: 'このユーザーにメッセージを送ることはできません。',
  },
};

function initial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

export default function MessageThreadPage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username);
  const router = useRouter();
  const { locale } = useLocale();
  const { user } = useAuth();
  const t = L[locale] ?? L.en;

  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = (showLoading: boolean) => {
    if (showLoading) {
      setLoading(true);
      setError(false);
      setNotFound(false);
      setBlocked(false);
    }
    socialApi.getConversationThread(username)
      .then((res) => setThread(res))
      .catch((err) => {
        const status = errorStatus(err);
        if (status === 404) setNotFound(true);
        else if (status === 403) setBlocked(true);
        else setError(true);
      })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await socialApi.sendMessage(username, text);
      setDraft('');
      load(false);
    } catch {
      // sessizce yut — kullanıcı isterse tekrar deneyebilir, taslak metin korunuyor.
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-400">{t.loading}</div>;
  }

  if (notFound) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">{t.notFound}</p>
        <button onClick={() => router.push('/messages')} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" />{t.back}
        </button>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{t.blockedError}</p>
        <button onClick={() => router.push('/messages')} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700">
          <ArrowLeft className="w-4 h-4" />{t.back}
        </button>
      </div>
    );
  }

  if (error || !thread) {
    return <div className="p-6 text-sm text-red-600 bg-red-50 rounded-xl max-w-lg">{t.error}</div>;
  }

  const other = thread.other_user;
  const otherName = other.display_name || other.username || '?';

  return (
    <div className="p-6 max-w-2xl h-[calc(100vh-2rem)] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/messages" className="text-gray-400 hover:text-gray-600 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Link href={other.username ? `/u/${other.username}` : '#'} className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {initial(otherName)}
          </div>
          <span className="text-base font-semibold text-gray-900 truncate">{otherName}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        {thread.messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">{t.emptyThread}</p>
        )}
        {thread.messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm break-words ${
                  mine ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {m.body}
                <div className={`text-[10px] mt-0.5 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                  {new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 mt-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.placeholder}
          maxLength={2000}
          className="flex-1 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t.sendBtn}
        </button>
      </form>
    </div>
  );
}
