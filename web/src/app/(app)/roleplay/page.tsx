'use client';

// app/(app)/roleplay/page.tsx — "Roleplay/diyalog botu" (24 Eylül 2026,
// Madde 2 — ikinci seçim) sohbet ekranı. İki aşama: senaryo seçimi ->
// canlı sohbet. Sesli/mikrofon girişi YOK, tamamen metin tabanlı.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { ArrowLeft, Loader2, MessagesSquare, Send, Sparkles, Flag } from 'lucide-react';
import { roleplayApi, type RoleplayMessage, type RoleplayScenario } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    title: 'Diyalog Pratiği',
    subtitle: 'Bir senaryo seç, hedef dilinde canlı bir sohbete başla.',
    loading: 'Yükleniyor…',
    error: 'Bir şeyler ters gitti.',
    placeholder: 'Mesajını yaz…',
    finishBtn: 'Bitir',
    newSessionBtn: 'Yeni Senaryo',
    xpEarnedTpl: '+{xp} XP kazandın!',
    xpNoneMsg: 'Oturum bitti. Daha uzun bir sohbet XP kazandırır.',
    turnCounterTpl: '{turn}/{max} tur',
  },
  en: {
    title: 'Roleplay Practice',
    subtitle: 'Pick a scenario and start a live chat in your target language.',
    loading: 'Loading…',
    error: 'Something went wrong.',
    placeholder: 'Type your message…',
    finishBtn: 'Finish',
    newSessionBtn: 'New Scenario',
    xpEarnedTpl: '+{xp} XP earned!',
    xpNoneMsg: 'Session ended. A longer chat earns XP.',
    turnCounterTpl: '{turn}/{max} turns',
  },
};

type Stage = 'loading' | 'pick' | 'chat' | 'finished';

export default function RoleplayPage() {
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const [stage, setStage] = useState<Stage>('loading');
  const [scenarios, setScenarios] = useState<RoleplayScenario[]>([]);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [maxTurns, setMaxTurns] = useState(20);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    roleplayApi
      .listScenarios()
      .then((res) => {
        setScenarios(res);
        setStage('pick');
      })
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleStart = async (slug: string) => {
    setStarting(slug);
    setError('');
    try {
      const session = await roleplayApi.startSession(slug);
      setSessionId(session.id);
      setMessages(session.messages);
      setTurnCount(session.turn_count);
      setStage('chat');
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setStarting(null);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !sessionId || sending) return;
    setSending(true);
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    try {
      const res = await roleplayApi.sendMessage(sessionId, text);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      setTurnCount(res.turn_count);
      setMaxTurns(res.max_turns);
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setSending(false);
    }
  };

  const handleFinish = async () => {
    if (!sessionId || finishing) return;
    setFinishing(true);
    setError('');
    try {
      const res = await roleplayApi.finishSession(sessionId);
      setXpAwarded(res.xp_awarded);
      setStage('finished');
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setFinishing(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setTurnCount(0);
    setXpAwarded(null);
    setStage('pick');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex flex-col gap-4 h-[calc(100vh-2rem)]">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{t.title}</h1>
      </div>

      {stage === 'loading' && (
        <div className="flex items-center justify-center py-16 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {!!error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {stage === 'pick' && (
        <>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t.subtitle}</p>
          <div className="flex flex-col gap-2">
            {scenarios.map((s) => (
              <button
                key={s.slug}
                onClick={() => handleStart(s.slug)}
                disabled={!!starting}
                className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm px-4 py-3 text-left hover:border-[#378ADD] transition-colors disabled:opacity-60"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#E6F1FB] dark:bg-blue-500/10 text-[#378ADD] dark:text-blue-400 shrink-0">
                  <MessagesSquare className="w-4.5 h-4.5" />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 flex-1">
                  {locale === 'tr' ? s.title_tr : s.title_en}
                </span>
                {starting === s.slug && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </button>
            ))}
          </div>
        </>
      )}

      {stage === 'chat' && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-slate-500">
              {t.turnCounterTpl.replace('{turn}', String(turnCount)).replace('{max}', String(maxTurns))}
            </span>
            <button
              onClick={handleFinish}
              disabled={finishing}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-red-500 disabled:opacity-60"
            >
              {finishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
              {t.finishBtn}
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2 py-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'self-end bg-[#378ADD] text-white'
                    : 'self-start bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200'
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="self-start bg-gray-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t.placeholder}
              disabled={sending}
              className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="w-10 h-10 rounded-xl bg-[#378ADD] text-white flex items-center justify-center disabled:opacity-40 shrink-0"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>
        </>
      )}

      {stage === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF3DE] flex items-center justify-center text-[#3B6D11]">
            <Sparkles className="w-7 h-7" />
          </div>
          <p className="text-base font-semibold text-gray-900 dark:text-slate-100">
            {xpAwarded ? t.xpEarnedTpl.replace('{xp}', String(xpAwarded)) : t.xpNoneMsg}
          </p>
          <button
            onClick={handleNewSession}
            className="rounded-xl bg-[#378ADD] text-white text-sm font-semibold px-5 py-2.5"
          >
            {t.newSessionBtn}
          </button>
        </div>
      )}
    </div>
  );
}
