'use client';

// app/(app)/roleplay/page.tsx — "Roleplay/diyalog botu" (ilk sürüm: 24 Eylül
// 2026; 25 Kasım 2026'da dallanan diyalog ağacına GEÇİŞ — kullanıcı isteği:
// serbest metin yazmak yerine her adımda sunulan 3 hazır cevaptan birini
// işaretleyerek konuşma pratiği). Dört aşama: kategori seçimi -> senaryo
// seçimi -> sabit/dallanan sohbet -> bitiş. Sesli/mikrofon girişi YOK.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import {
  ArrowLeft, Loader2, Sparkles, Flag, Check, Minus, X, MessagesSquare,
  Plane, Utensils, ShoppingBag, Home, Briefcase, GraduationCap, Users, Heart,
  Stethoscope, Landmark, Headphones, Ticket, FileText, Car,
} from 'lucide-react';
import { roleplayApi, type RoleplayCategory, type RoleplayOption } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

// roleplay_data.py::CATEGORIES içindeki icon alanıyla birebir eşleşir.
const ICONS: Record<string, typeof Plane> = {
  plane: Plane,
  utensils: Utensils,
  'shopping-bag': ShoppingBag,
  home: Home,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  users: Users,
  heart: Heart,
  stethoscope: Stethoscope,
  landmark: Landmark,
  headphones: Headphones,
  ticket: Ticket,
  'file-text': FileText,
  car: Car,
};

function errorDetail(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    return (err.response?.data as { detail?: string } | undefined)?.detail;
  }
  return undefined;
}

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    title: 'Diyalog Pratiği',
    subtitle: 'Bir kategori seç, sonra bir senaryo seç.',
    error: 'Bir şeyler ters gitti.',
    back: 'Geri',
    finishBtn: 'Bitir',
    newSessionBtn: 'Başka Senaryo',
    xpEarnedTpl: '+{xp} XP kazandın!',
    xpNoneMsg: 'Oturum bitti.',
  },
  en: {
    title: 'Roleplay Practice',
    subtitle: 'Pick a category, then a scenario.',
    error: 'Something went wrong.',
    back: 'Back',
    finishBtn: 'Finish',
    newSessionBtn: 'Another Scenario',
    xpEarnedTpl: '+{xp} XP earned!',
    xpNoneMsg: 'Session ended.',
  },
};

type Stage = 'loading' | 'categories' | 'pick' | 'chat' | 'finished';
type ChatLine = { who: 'bot' | 'user'; text: string; quality?: 'good' | 'ok' | 'poor' };

export default function RoleplayPage() {
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const [stage, setStage] = useState<Stage>('loading');
  const [categories, setCategories] = useState<RoleplayCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RoleplayCategory | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [options, setOptions] = useState<RoleplayOption[]>([]);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    roleplayApi
      .listCategories()
      .then((res) => {
        setCategories(res);
        setStage('categories');
      })
      .catch(() => setError(t.error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  const handlePickCategory = (cat: RoleplayCategory) => {
    setSelectedCategory(cat);
    setStage('pick');
  };

  const handleStart = async (slug: string) => {
    setStarting(slug);
    setError('');
    try {
      const session = await roleplayApi.startSession(slug);
      setSessionId(session.id);
      setLines([{ who: 'bot', text: session.bot_line }]);
      setOptions(session.options);
      setStage('chat');
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setStarting(null);
    }
  };

  const handleChoose = async (option: RoleplayOption) => {
    if (!sessionId || choosing) return;
    setChoosing(option.id);
    setError('');
    setOptions([]);
    setLines((prev) => [...prev, { who: 'user', text: option.text }]);
    try {
      const res = await roleplayApi.chooseOption(sessionId, option.id);
      setLines((prev) => [...prev, { who: 'bot', text: res.reaction, quality: res.quality }]);
      if (res.status === 'completed') {
        setXpAwarded(res.xp_awarded);
        setTimeout(() => setStage('finished'), 700);
      } else if (res.next_bot_line) {
        setLines((prev) => [...prev, { who: 'bot', text: res.next_bot_line as string }]);
        setOptions(res.options || []);
      }
    } catch (err) {
      setError(errorDetail(err) || t.error);
    } finally {
      setChoosing(null);
    }
  };

  const handleFinishEarly = async () => {
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
    setLines([]);
    setOptions([]);
    setXpAwarded(null);
    setSelectedCategory(null);
    setStage('categories');
  };

  const qualityIcon = (q?: 'good' | 'ok' | 'poor') => {
    if (q === 'good') return <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />;
    if (q === 'poor') return <X className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    if (q === 'ok') return <Minus className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    return null;
  };

  return (
    <div
      className={`mx-auto px-4 py-6 flex flex-col gap-4 h-[calc(100vh-2rem)] ${
        stage === 'categories' ? 'max-w-5xl' : 'max-w-md'
      }`}
    >
      <div className="flex items-center gap-3">
        {stage === 'pick' ? (
          <button
            onClick={() => setStage('categories')}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
        ) : (
          <Link
            href="/dashboard"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </Link>
        )}
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex-1">
          {stage === 'pick' && selectedCategory
            ? locale === 'tr'
              ? selectedCategory.title_tr
              : selectedCategory.title_en
            : t.title}
        </h1>
        {stage === 'chat' && (
          <button
            onClick={handleFinishEarly}
            disabled={finishing}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-slate-400 hover:text-red-500 disabled:opacity-60"
          >
            {finishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
            {t.finishBtn}
          </button>
        )}
      </div>

      {stage === 'loading' && (
        <div className="flex items-center justify-center py-16 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      {!!error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {stage === 'categories' && (
        <>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t.subtitle}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto">
            {categories.map((cat) => {
              const Icon = ICONS[cat.icon] || MessagesSquare;
              return (
                <button
                  key={cat.slug}
                  onClick={() => handlePickCategory(cat)}
                  className="flex flex-col items-start gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 text-left hover:border-[#378ADD] transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#E6F1FB] dark:bg-blue-500/10 text-[#378ADD] dark:text-blue-400">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 leading-tight">
                    {locale === 'tr' ? cat.title_tr : cat.title_en}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-slate-500">{cat.scenarios.length}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {stage === 'pick' && selectedCategory && (
        <div className="flex flex-col gap-2 overflow-y-auto">
          {selectedCategory.scenarios.map((s) => (
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
      )}

      {stage === 'chat' && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2 py-2">
            {lines.map((line, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 ${
                  line.who === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                }`}
              >
                {qualityIcon(line.quality)}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    line.who === 'user'
                      ? 'bg-[#378ADD] text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200'
                  }`}
                >
                  {line.text}
                </div>
              </div>
            ))}
            {!!choosing && (
              <div className="self-start bg-gray-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {options.length > 0 && (
            <div className="flex flex-col gap-2">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleChoose(opt)}
                  disabled={!!choosing}
                  className="text-left text-sm font-medium bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 hover:border-[#378ADD] disabled:opacity-60"
                >
                  {opt.text}
                </button>
              ))}
            </div>
          )}
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
