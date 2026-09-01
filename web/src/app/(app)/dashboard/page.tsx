'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Clock, Target, Layers, Brain, CheckCircle2, Bell, BellRing, MessageCircle, Sun, Moon,
} from 'lucide-react';
import { statsApi, wordsApi, languagesApi, userLanguagesApi, notificationsApi, socialApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import { useThemeMode } from '@/store/theme';
import { XPBar } from '@/components/layout/XPBar';
import { Leaderboard } from '@/components/layout/Leaderboard';
import type { Stats, Word, DailyProgress, Language, UserLanguage, ConversationItem } from '@/types';

// Çalışma dili seçicisi ile mesaj simgesi arasındaki hızlı erişim tema
// butonunun etiketi — Sidebar.tsx'teki THEME_LABEL ile aynı çeviri deseni
// (merkezi i18n.tsx sözlüğüne dokunmadan yerel çeviri).
const THEME_LABEL: Record<Locale, string> = {
  tr: 'Tema', en: 'Theme', ar: 'المظهر', ru: 'Тема', de: 'Thema',
  fr: 'Thème', es: 'Tema', it: 'Tema', ja: 'テーマ', pt: 'Tema',
};

// Madde 6, Faz 2 — Mesajlaşma: dashboard'daki gelen kutusu önizlemesi ve
// çalışma dili seçicisinin yanındaki okunmamış mesaj rozeti/simgesi.
// Merkezi i18n.tsx sözlüğüne dokunmadan yerel çeviri — Sidebar.tsx'teki
// FRIENDS_LABEL/GAME_LABEL deseniyle aynı yaklaşım.
const MSG_LABELS: Record<
  Locale,
  {
    iconLabel: string;
    title: string;
    empty: string;
    emptySub: string;
    viewAll: string;
    you: string;
  }
> = {
  tr: { iconLabel: 'Mesajlar', title: 'Mesajlar', empty: 'Henüz bir konuşman yok.', emptySub: 'Bir arkadaşının profilinden mesaj gönderebilirsin.', viewAll: 'Tümünü gör', you: 'Sen' },
  en: { iconLabel: 'Messages', title: 'Messages', empty: "You don't have any conversations yet.", emptySub: "Message a friend from their profile to start.", viewAll: 'View all', you: 'You' },
  de: { iconLabel: 'Nachrichten', title: 'Nachrichten', empty: 'Du hast noch keine Unterhaltungen.', emptySub: 'Schreibe einem Freund über sein Profil.', viewAll: 'Alle anzeigen', you: 'Du' },
  fr: { iconLabel: 'Messages', title: 'Messages', empty: "Tu n'as pas encore de conversation.", emptySub: "Envoie un message à un ami depuis son profil.", viewAll: 'Tout voir', you: 'Toi' },
  es: { iconLabel: 'Mensajes', title: 'Mensajes', empty: 'Todavía no tienes conversaciones.', emptySub: 'Escribe a un amigo desde su perfil.', viewAll: 'Ver todo', you: 'Tú' },
  it: { iconLabel: 'Messaggi', title: 'Messaggi', empty: 'Non hai ancora conversazioni.', emptySub: 'Scrivi a un amico dal suo profilo.', viewAll: 'Vedi tutto', you: 'Tu' },
  ar: { iconLabel: 'الرسائل', title: 'الرسائل', empty: 'ليس لديك أي محادثات بعد.', emptySub: 'يمكنك مراسلة صديق من ملفه الشخصي.', viewAll: 'عرض الكل', you: 'أنت' },
  ru: { iconLabel: 'Сообщения', title: 'Сообщения', empty: 'У вас пока нет переписок.', emptySub: 'Напишите другу из его профиля.', viewAll: 'Смотреть все', you: 'Вы' },
  ja: { iconLabel: 'メッセージ', title: 'メッセージ', empty: 'まだ会話がありません。', emptySub: '友達のプロフィールからメッセージを送れます。', viewAll: 'すべて見る', you: 'あなた' },
  pt: { iconLabel: 'Mensagens', title: 'Mensagens', empty: 'Ainda não tens conversas.', emptySub: 'Envia uma mensagem a um amigo a partir do perfil dele.', viewAll: 'Ver tudo', you: 'Tu' },
};

const MSG_POLL_MS = 15000;

function getWeekDays(history: DailyProgress[], dayLabels: string[]): {
  label: string;
  count: number;
  isToday: boolean;
  done: boolean;
}[] {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = history.find((h) => h.date === dateStr);
    const isToday = d.toDateString() === today.toDateString();
    const isPast = d < today && !isToday;
    return {
      label: dayLabels[i],
      count: entry?.words_added ?? 0,
      isToday,
      done: isPast && (entry?.words_added ?? 0) > 0,
    };
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const msgT = MSG_LABELS[locale] ?? MSG_LABELS.en;
  const { scheme, setMode } = useThemeMode();
  const [stats, setStats] = useState<Stats | null>(null);
  const [dueWords, setDueWords] = useState<Word[]>([]);
  const [history, setHistory] = useState<DailyProgress[]>([]);
  const [recentWords, setRecentWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');

  // ── Aktif öğrenme dili değiştirici (Kullanıcı Madde 2: çoklu dil) ──
  const [userLangs, setUserLangs] = useState<UserLanguage[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [switchingLang, setSwitchingLang] = useState(false);

  // ── Bildirimler (Madde 3a) — artık ayrı /notifications sayfasında;
  // burada sadece üst bardaki zil ikonu için okunmamış sayısı tutuluyor.
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Mesajlar (Madde 6, Faz 2) — artık ayrı /messages sayfasında; burada
  // sadece üst bardaki simge için okunmamış sayısı tutuluyor.
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const msgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lexis_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
          setUsername(u.display_name || u.username || '');
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, due, hist, words] = await Promise.all([
          statsApi.getSummary(),
          wordsApi.getDue(),
          statsApi.getHistory(14),
          wordsApi.getAll({ page: 1, per_page: 4 }),
        ]);
        setStats(s);
        setDueWords(due);
        setHistory(hist);
        setRecentWords(words.items);
      } catch {
        setError(t('loadingError'));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    userLanguagesApi.getAll().then(setUserLangs).catch(() => {});
    languagesApi.getAll().then(setLanguages).catch(() => {});
  }, []);

  // Dashboard'da artık sadece rozet sayısı gerekiyor (liste /notifications
  // sayfasında) — mesaj rozetiyle aynı aralıkla (MSG_POLL_MS) tazeleniyor.
  useEffect(() => {
    const loadUnreadNotifCount = () => {
      notificationsApi.getAll(1).then((res) => setUnreadCount(res.unread_count)).catch(() => {});
    };
    loadUnreadNotifCount();
    const interval = setInterval(loadUnreadNotifCount, MSG_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = () => {
    socialApi.getConversations()
      .then(setConversations)
      .catch(() => {});
  };
  useEffect(() => {
    loadConversations();
    msgPollRef.current = setInterval(loadConversations, MSG_POLL_MS);
    return () => {
      if (msgPollRef.current) clearInterval(msgPollRef.current);
    };
  }, []);

  const unreadMsgCount = conversations.reduce((acc, c) => acc + c.unread_count, 0);

  const handleSwitchLang = async (code: string) => {
    if (switchingLang) return;
    setSwitchingLang(true);
    try {
      await userLanguagesApi.setActive(code);
      const [ul, s, due, hist, words] = await Promise.all([
        userLanguagesApi.getAll(),
        statsApi.getSummary(),
        wordsApi.getDue(),
        statsApi.getHistory(14),
        wordsApi.getAll({ page: 1, per_page: 4 }),
      ]);
      setUserLangs(ul);
      setStats(s);
      setDueWords(due);
      setHistory(hist);
      setRecentWords(words.items);
    } catch {
      // Sessizce yut — dashboard verisi bir önceki dilde kalır, kullanıcı tekrar deneyebilir.
    } finally {
      setSwitchingLang(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400 dark:text-slate-500">
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl">{error}</div>;
  }

  const goalPercent = stats
    ? Math.min(100, Math.round((stats.today_added / (stats.daily_goal || 1)) * 100))
    : 0;

  const dayLabels = t('dayLabels').split(',');
  const weekDays = getWeekDays(history, dayLabels);

  const thisWeekTotal = weekDays.reduce((acc, d) => acc + d.count, 0);
  const lastWeekTotal = history
    .filter((h) => {
      const d = new Date(h.date);
      const today = new Date();
      const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 7 && diff < 14;
    })
    .reduce((acc, h) => acc + h.words_added, 0);

  const total = stats?.total_words || 1;
  const newCount = Math.max(0, total - (stats?.learning ?? 0) - (stats?.learned ?? 0));
  const learningPct = Math.round(((stats?.learning ?? 0) / total) * 100);
  const learnedPct = Math.round(((stats?.learned ?? 0) / total) * 100);
  const newPct = Math.round((newCount / total) * 100);

  const activeLangCode = userLangs.find((l) => l.is_active)?.learning_lang ?? '';

  return (
    <div className="p-6 space-y-4 max-w-5xl">

      {/* Başlık */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-medium text-gray-900 dark:text-slate-100">
            {t('greeting')}{username ? `, ${username}` : ''}
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500">{t('dailySummarySubtitle')}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {userLangs.length > 1 && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400 dark:text-slate-500">{t('activeLanguageSwitcherLabel')}</label>
              <select
                value={activeLangCode}
                onChange={(e) => handleSwitchLang(e.target.value)}
                disabled={switchingLang}
                className="text-sm border border-gray-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {userLangs.map((ul) => {
                  const meta = languages.find((l) => l.code === ul.learning_lang);
                  return (
                    <option key={ul.learning_lang} value={ul.learning_lang}>
                      {meta?.flag_emoji} {meta?.name_native ?? ul.learning_lang}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Çalışma dili seçicisi ile mesaj simgesi arasında hızlı erişim
              tema butonu — tek tıkla açık/koyu tema geçişi (sistem tercihini
              görmezden gelip doğrudan aktif şemanın tersine geçer). */}
          <button
            type="button"
            onClick={() => setMode(scheme === 'dark' ? 'light' : 'dark')}
            aria-label={THEME_LABEL[locale]}
            title={THEME_LABEL[locale]}
            className="relative w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-blue-600 hover:dark:text-blue-400 hover:border-blue-200 transition-colors"
          >
            {scheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* Bildirimler simgesi + rozet — önceden dashboard'da büyük bir
              kart olarak gömülüydü, kullanıcı isteğiyle üst bardaki ikon
              satırına taşındı; tıklayınca ayrı /notifications sayfasına
              gider (bkz. app/(app)/notifications/page.tsx). */}
          <Link
            href="/notifications"
            aria-label={t('notificationsTitle')}
            title={t('notificationsTitle')}
            className="relative w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-blue-600 hover:dark:text-blue-400 hover:border-blue-200 transition-colors"
          >
            {unreadCount > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Madde 6, Faz 2 — mesajlaşma rozeti + simgesi (çalışma dili
              seçicisinin hemen yanında, kullanıcı isteğiyle burada); önceden
              dashboard'da ayrıca bir gelen kutusu önizleme kartı da vardı,
              o da aynı gerekçeyle kaldırıldı, /messages sayfasına gidiliyor. */}
          <Link
            href="/messages"
            aria-label={msgT.iconLabel}
            title={msgT.iconLabel}
            className="relative w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-blue-600 hover:dark:text-blue-400 hover:border-blue-200 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {unreadMsgCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Seviye / XP — Madde: XPBar ön yüz bileşeni */}
      <XPBar />

      {/* Sıralama — kendi puanın + rakip karşılaştırması (Genel/Haftalık/Aylık).
          limit=5: ilk 5 gösterilir; kullanıcı ilk 5'te değilse (örn. 10.
          sırada) 6-9 arası atlanır, sadece kendi satırı ayrıca eklenir
          (bkz. Leaderboard.tsx — data.top zaten sadece top N döner, "me"
          top'ta değilse ayraç + tek satır olarak ekleniyor). */}
      <Leaderboard limit={5} />

      {/* Streak banner */}
      {(stats?.current_streak ?? 0) > 0 && (
        <div
          className="rounded-2xl border px-4 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(to right, #FAEEDA, #FAF0E0)', borderColor: '#FAC775' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: '#854F0B' }}>
              {stats!.current_streak} {t('streakActive')}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#BA7517' }}>
              {t('streakEncourage')}
            </p>
          </div>
          <span className="text-3xl">🔥</span>
        </div>
      )}

      {/* 3 stat kart */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: t('totalWords'),
            value: stats?.total_words ?? 0,
            sub: `+${thisWeekTotal} ${t('thisWeekLabel')}`,
            icon: <BookOpen className="w-4 h-4" />,
            iconBg: '#E6F1FB', iconColor: '#185FA5',
          },
          {
            label: t('addedToday'),
            value: stats?.today_added ?? 0,
            sub: `${t('goalLabel')}: ${stats?.daily_goal ?? 5}`,
            icon: <CheckCircle2 className="w-4 h-4" />,
            iconBg: '#EAF3DE', iconColor: '#3B6D11',
          },
          {
            label: t('dueReview'),
            value: dueWords.length,
            sub: t('wordsInQueue'),
            icon: <Clock className="w-4 h-4" />,
            iconBg: '#EEEDFE', iconColor: '#534AB7',
          },
        ].map(({ label, value, sub, icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: iconBg, color: iconColor }}
            >
              {icon}
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">{label}</p>
            <p className="text-2xl font-medium text-gray-900 dark:text-slate-100">{value}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Günlük hedef */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('dailyGoal')}</p>
            <p className="text-xs text-gray-400 dark:text-slate-500">
              {stats?.today_added ?? 0} / {stats?.daily_goal ?? 5} {t('wordsUnit')}
            </p>
          </div>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: '#E6F1FB', color: '#185FA5' }}
          >
            {Math.max(0, (stats?.daily_goal ?? 5) - (stats?.today_added ?? 0))} {t('remainingLabel')}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${goalPercent}%`, background: '#378ADD' }}
          />
        </div>
      </div>

      {/* Haftalık ilerleme */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">{t('weeklyProgress')}</p>
        <div className="flex justify-between items-end pb-3">
          {weekDays.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-xs text-gray-400 dark:text-slate-500">{d.label}</span>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={
                  d.isToday
                    ? { background: '#378ADD', color: '#fff' }
                    : d.done
                    ? { background: '#EAF3DE', color: '#3B6D11' }
                    : { background: '#F3F4F6', color: '#9CA3AF' }
                }
              >
                {d.isToday ? d.count : d.done ? '✓' : '—'}
              </div>
              <span
                className="text-xs"
                style={{
                  color: d.isToday ? '#378ADD' : '#9CA3AF',
                  fontWeight: d.isToday ? 500 : 400,
                }}
              >
                {d.isToday ? t('todayAbbr') : d.count > 0 ? d.count : '—'}
              </span>
            </div>
          ))}
        </div>
        <div className="h-px bg-gray-100 dark:bg-slate-800 mb-3" />
        <div className="flex gap-4 text-xs text-gray-400 dark:text-slate-500">
          <span>{t('thisWeekColon')}: <strong className="text-gray-700 dark:text-slate-300">{thisWeekTotal} {t('wordsUnit')}</strong></span>
          <span>{t('lastWeekColon')}: <strong className="text-gray-700 dark:text-slate-300">{lastWeekTotal} {t('wordsUnit')}</strong></span>
        </div>
      </div>

      {/* Hızlı aksiyonlar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: t('flashcardPractice'),
            sub: `${dueWords.length} ${t('cardsWaitingLabel')}`,
            icon: <Layers className="w-4 h-4" />,
            iconBg: '#E6F1FB', iconColor: '#185FA5',
            href: '/flashcards',
          },
          {
            label: t('startQuiz'),
            sub: t('testKnowledge'),
            icon: <Brain className="w-4 h-4" />,
            iconBg: '#EEEDFE', iconColor: '#534AB7',
            href: '/quiz',
          },
          {
            label: t('addWord'),
            sub: t('expandList'),
            icon: <Target className="w-4 h-4" />,
            iconBg: '#E1F5EE', iconColor: '#0F6E56',
            href: '/words',
          },
        ].map(({ label, sub, icon, iconBg, iconColor, href }) => (
          <button
            key={label}
            onClick={() => router.push(href)}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 flex items-center gap-3 text-left hover:border-gray-200 hover:dark:border-slate-700 hover:shadow-md transition-all"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: iconBg, color: iconColor }}
            >
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Alt grid: Seviye dağılımı + Son eklenenler */}
      <div className="grid grid-cols-2 gap-3">

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">{t('levelDistribution')}</p>
          {[
            { label: t('newLabel'), count: newCount, pct: newPct, color: '#B5D4F4' },
            { label: t('learningLabel'), count: stats?.learning ?? 0, pct: learningPct, color: '#9FE1CB' },
            { label: t('learnedLabel'), count: stats?.learned ?? 0, pct: learnedPct, color: '#C0DD97' },
          ].map(({ label, count, pct, color }) => (
            <div key={label} className="flex items-center gap-2 mb-2 text-xs">
              <span className="w-20 text-gray-400 dark:text-slate-500 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="w-6 text-right text-gray-500 dark:text-slate-400">{count}</span>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">{t('recentWordsTitle')}</p>
          {recentWords.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500">{t('noWordsYet')}</p>
          ) : (
            recentWords.map((w, i) => (
              <div
                key={w.id}
                className="flex items-center justify-between py-1.5 text-sm"
                style={{ borderBottom: i < recentWords.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-gray-800 dark:text-slate-200">{w.word}</span>
                  {i === 0 && (
                    <span
                      className="rounded px-1.5 py-0.5"
                      style={{ background: '#EEEDFE', color: '#534AB7', fontSize: 10 }}
                    >
                      {t('newBadge')}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500">{w.meaning_native || w.meaning}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Due banner */}
      {dueWords.length > 0 && (
        <div
          className="rounded-2xl border px-4 py-3 flex items-center justify-between"
          style={{ background: '#E6F1FB', borderColor: '#B5D4F4' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: '#185FA5' }}>
              {dueWords.length} {t('dueTimeLabel')}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#378ADD' }}>
              {t('streakEncourage')}
            </p>
          </div>
          <button
            onClick={() => router.push('/flashcards')}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ background: '#378ADD' }}
          >
            {t('startBtn')}
          </button>
        </div>
      )}
    </div>
  );
}
