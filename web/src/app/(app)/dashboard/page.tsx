'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Clock, Target, Layers, Brain, CheckCircle2, Bell, BellRing, MessageCircle, Sun, Moon,
  GraduationCap, ChevronRight,
} from 'lucide-react';
import { statsApi, wordsApi, languagesApi, userLanguagesApi, notificationsApi, socialApi, examsApi, studyProgramApi, levelGoalApi } from '@/lib/api';
import type { LevelGoal } from '@/lib/api';
import { StudyProgramCard } from '@/components/study/StudyProgramCard';
import { LevelGoalCard } from '@/components/study/LevelGoalCard';
import { useLocale, type Locale } from '@/lib/i18n';
import { useThemeMode } from '@/store/theme';
import { XPBar } from '@/components/layout/XPBar';
import { CefrBadge } from '@/components/layout/CefrBadge';
import { DailyWordCard } from '@/components/layout/DailyWordCard';
import { WordOfTheDayCard } from '@/components/layout/WordOfTheDayCard';
import { MascotGreeting } from '@/components/layout/MascotGreeting';
import { OnboardingTour } from '@/components/layout/OnboardingTour';
import type { Stats, Word, DailyProgress, Language, UserLanguage, ConversationItem, StudyProgram } from '@/types';

// Kullanici geri bildirimi (10 Eylul 2026 -- "bir dashboard'a bu saate
// gunaydin yaziyor, mobildeki gibi hallet"): mobile/src/app/(app)/
// dashboard.tsx'teki greetingKeyForHour() ile BIREBIR ayni saat
// araliklari -- iki platform arasinda tutarli bir selamlama olsun diye.
function greetingKeyForHour(hour: number): 'greeting' | 'greetingAfternoon' | 'greetingEvening' | 'greetingNight' {
  if (hour >= 5 && hour < 12) return 'greeting';
  if (hour >= 12 && hour < 18) return 'greetingAfternoon';
  if (hour >= 18 && hour < 22) return 'greetingEvening';
  return 'greetingNight';
}

// V2 Yol Haritası §1.1 (9 Eylül 2026) — Sınav Hazırlık Alanı dashboard
// banner'ı. mobile/src/i18n/examStrings.ts'teki pageTitle/pageSubtitle/
// bannerCta ile birebir aynı tr/en metinler (bu alan sadece native_lang=tr +
// learning_lang=en kullanıcılarına açık, bkz. backend _exam_area_enabled) —
// diğer diller tr'ye düşer (Sidebar.tsx'teki EXAM_PREP_LABEL ile tutarlı).
const EXAM_BANNER: Partial<Record<Locale, { title: string; subtitle: string; cta: string }>> = {
  tr: {
    title: 'Sınav Hazırlık Alanı',
    subtitle: 'YDS, YÖKDİL, IELTS ve TOEFL için örnek sorularla pratik yap, doğru cevap analizini oku, kelimeleri hazinene ekle.',
    cta: 'Sorulara Başla',
  },
  en: {
    title: 'Exam Prep Area',
    subtitle: 'Practice with sample questions for YDS, YÖKDİL, IELTS and TOEFL, read the answer analysis, and add words to your vocabulary.',
    cta: 'Start Practicing',
  },
};

// Kullanıcı isteği (19 Eylül 2026): "sisteme girerken Alert olarak ekrana
// kutucuk çıkacak. Orada sınava yönlendirecez" -- önceki davranış (18 Eylül)
// needs_placement=true olduğunda hiç uyarı göstermeden sessizce
// router.replace ile sınava atıyordu; artık önce bu modal gösterilip CTA'ya
// basılınca yönlendiriliyor. Tek butonlu, kapatılamaz (dışarı tıklama/X yok)
// -- sınav zorunlu akışın bir parçası olmaya devam ediyor, sadece artık
// kullanıcıya önce haber veriliyor. EXAM_BANNER ile aynı desen: sadece tr/en
// dolu, diğer diller tr'ye düşer.
const PLACEMENT_ALERT_STRINGS: Partial<Record<Locale, { title: string; message: string; cta: string }>> = {
  tr: {
    title: 'Seviye Tespit Sınavı',
    message: 'Sana en uygun kelimeleri gösterebilmemiz için önce kısa bir seviye tespit sınavı çözmen gerekiyor.',
    cta: 'Sınava Başla',
  },
  en: {
    title: 'Placement Exam',
    message: 'To show you the right words for your level, you need to complete a short placement exam first.',
    cta: 'Start Exam',
  },
};

// 24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 3: periyodik yeniden
// seviye tespiti onerisi. PLACEMENT_ALERT_STRINGS'in aksine bu ZORUNLU
// DEGIL -- kullanici kapatabilir (dismissible banner, not a blocking
// modal), backend needs_recheck=true dondugunde gosterilir (14 gunde bir
// veya sureklilik gosteren seviye sapma sinyaliyle, bkz. exams.py::
// get_placement_status).
const RECHECK_BANNER_STRINGS: Partial<Record<Locale, { title: string; message: string; cta: string; dismiss: string }>> = {
  tr: {
    title: 'Seviyeni Yeniden Kontrol Et',
    message: 'Son dönemki performansına göre seviyen değişmiş olabilir. Kısa bir sınavla seviyeni güncelleyebilirsin.',
    cta: 'Kısa Sınavı Başlat',
    dismiss: 'Daha sonra',
  },
  en: {
    title: 'Recheck Your Level',
    message: 'Your level may have shifted based on your recent performance. A short exam can update it.',
    cta: 'Start Short Exam',
    dismiss: 'Later',
  },
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  // Kullanıcı isteği (19 Eylül 2026): seviye tespit sınavına artık sessizce
  // değil, bu Alert modalı gösterilip CTA'ya basılınca yönlendiriliyor.
  const [showPlacementAlert, setShowPlacementAlert] = useState(false);
  // Madde 3: dismissible recheck onerisi -- zorunlu placement modalinin
  // aksine kullanici kapatabilir, kapatilirsa bugun icin bir daha gosterilmez.
  const [showRecheckBanner, setShowRecheckBanner] = useState(false);

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

  // Adaptif Öğrenme Motoru Madde 2 — haftalık çalışma programı kartı.
  const [studyProgram, setStudyProgram] = useState<StudyProgram | null>(null);
  // Kullanıcı isteği (3 Kasım 2026) — hedef seviyeye ilerleme kartı.
  const [levelGoal, setLevelGoal] = useState<LevelGoal | null>(null);
  const [settingLevelGoal, setSettingLevelGoal] = useState(false);
  const [showLevelGoalPicker, setShowLevelGoalPicker] = useState(false);

  useEffect(() => {
    studyProgramApi
      .current()
      .then(setStudyProgram)
      .catch(() => {
        /* soft-disable: hata durumunda kart gösterilmez */
      });
    levelGoalApi
      .get()
      .then(setLevelGoal)
      .catch(() => {
        /* soft-disable: hata durumunda kart gösterilmez */
      });
    // 18 Eylül 2026 — kullanıcı isteği: "sisteme girer girmez hemen seviye
    // tespit sınavına yönlendirilsin" (mevcut + yeni kullanıcılar, tüm
    // platformlar). needs_placement=true ise tür/mod seçimi atlanıp
    // doğrudan placement oturumuna yönlendirilir (bkz. exam-prep/page.tsx
    // deep-link mantığı, backend exams.py::get_placement_status).
    examsApi
      .placementStatus()
      .then((res) => {
        if (res.needs_placement) {
          setShowPlacementAlert(true);
          return;
        }
        // Madde 3: sadece placement zaten tamamlanmışsa anlamlı -- zorunlu
        // akışla çakışmasın diye needs_placement true ise hiç kontrol edilmez.
        if (res.needs_recheck) {
          try {
            const dismissedAt = localStorage.getItem('lexis_recheck_dismissed_at');
            const today = new Date().toDateString();
            if (dismissedAt !== today) {
              setShowRecheckBanner(true);
            }
          } catch {
            setShowRecheckBanner(true);
          }
        }
      })
      .catch(() => {
        /* sessizce yut -- zorunlu yönlendirme kritik değil, dashboard normal açılmaya devam eder */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kullanıcı geri bildirimi (4 Kasım 2026): "oyun puanım arttı ama Hedefine
  // Giden Yol'da ilerleme görünmedi" -- kök neden bug değildi, backend
  // hesaplaması doğruydu (canlıda doğrulandı); levelGoal SADECE sayfa ilk
  // açıldığında bir kez çekiliyordu (useEffect([]) -- yukarıdaki blok), bu
  // yüzden sekme uzun süre açık kalıp arka planda oyun oynanınca kart bayat
  // kalıyordu. Artık sekme tekrar görünür/odaklı hale geldiğinde (kullanıcı
  // başka bir sekmeden/sayfadan -- ya da mobil uygulamadan oyun oynayıp
  // geri döndüğünde) levelGoal otomatik tazeleniyor.
  useEffect(() => {
    const refreshLevelGoal = () => {
      levelGoalApi
        .get()
        .then(setLevelGoal)
        .catch(() => {
          /* soft-disable: hata durumunda mevcut kart verisi korunur */
        });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshLevelGoal();
    };
    window.addEventListener('focus', refreshLevelGoal);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refreshLevelGoal);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

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
        const [s, due, hist] = await Promise.all([
          statsApi.getSummary(),
          wordsApi.getDue(),
          statsApi.getHistory(14),
        ]);
        setStats(s);
        setDueWords(due);
        setHistory(hist);
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
      const [ul, s, due, hist] = await Promise.all([
        userLanguagesApi.getAll(),
        statsApi.getSummary(),
        wordsApi.getDue(),
        statsApi.getHistory(14),
      ]);
      setUserLangs(ul);
      setStats(s);
      setDueWords(due);
      setHistory(hist);
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
  const activeLangCode = userLangs.find((l) => l.is_active)?.learning_lang ?? '';
  // Kullanici geri bildirimi (10 Eylul 2026 -- "bir dashboard'da bu
  // saate gunaydin yaziyor, mobildeki gibi hallet"): web'de {t('greeting')}
  // her zaman sabit "Gunaydin" ceviriyordu -- mobilin dashboard.tsx'teki
  // greetingKeyForHour() ile BIREBIR ayni saat araliklari (mobile: 05-12
  // sabah, 12-18 ogleden sonra, 18-22 aksam, 22-05 gece).
  const greetingText = t(greetingKeyForHour(new Date().getHours()));

  return (
    <div className="p-6 space-y-4 max-w-5xl">

      {showPlacementAlert && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-6 h-6 text-[#534AB7]" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">
              {(PLACEMENT_ALERT_STRINGS[locale] ?? PLACEMENT_ALERT_STRINGS.tr)!.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">
              {(PLACEMENT_ALERT_STRINGS[locale] ?? PLACEMENT_ALERT_STRINGS.tr)!.message}
            </p>
            <button
              onClick={() => router.replace('/exam-prep?examType=placement&sessionMode=timed_mock')}
              className="w-full text-sm font-medium px-4 py-2.5 rounded-xl text-white transition-colors"
              style={{ background: '#534AB7' }}
            >
              {(PLACEMENT_ALERT_STRINGS[locale] ?? PLACEMENT_ALERT_STRINGS.tr)!.cta}
            </button>
          </div>
        </div>
      )}

      {/* Başlık */}
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-medium text-gray-900 dark:text-slate-100">
            {greetingText}{username ? `, ${username}` : ''}
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

          {/* Onboarding turu (24 Eylül 2026, Madde 3d) — ilk ziyarette
              otomatik açılır (localStorage bayrağı yoksa), buradaki "?"
              butonuyla istendiğinde tekrar açılabilir. Kendi state'ini ve
              modalını yönetiyor, backend/veri bağımlılığı yok. */}
          <OnboardingTour />

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

      {/* Maskot karşılama (24 Eylül 2026, Madde 3c) — günün durumuna
          (bugünkü hedef ilerlemesi + seri) göre ruh hali değişen bir
          maskot + konuşma balonu. Kendi veri çekmiyor, dashboard'ın
          zaten sahip olduğu `stats`'ı kullanıyor. */}
      <MascotGreeting
        streak={stats?.current_streak ?? 0}
        todayAdded={stats?.today_added ?? 0}
        dailyGoal={stats?.daily_goal ?? 0}
      />

      {/* CEFR rozeti (24 Eylül 2026) — Adaptif Öğrenme Motoru'nun sürekli
          güncellediği güncel A1-C2 seviyesini görünür kılar; veri yoksa
          bileşen kendi içinde sessizce hiçbir şey render etmez. */}
      <CefrBadge />

      {/* Seviye / XP — Madde: XPBar ön yüz bileşeni */}
      <XPBar />

      {/* Günlük Kelime Avı (24 Eylül 2026, Madde 2 seçimi) — CefrBadge/XPBar
          ile AYNI soft-disable deseni: bugünün kelimesi yoksa kart hiç
          render edilmez. */}
      <DailyWordCard />

      {/* Kullanıcı isteği (3 Kasım 2026): ana seviye -> hedef seviye ilerleme
          kartı. Kullanıcı isteğiyle (aynı gün) Seviye/XP ve Günlük Kelime Avı
          kartlarının HEMEN ALTINA taşındı. */}
      {levelGoal?.available && (
        <LevelGoalCard
          goal={levelGoal}
          locale={locale}
          settingTarget={settingLevelGoal}
          forceShowPicker={showLevelGoalPicker}
          onRequestChangeTarget={() => setShowLevelGoalPicker(true)}
          onSetTarget={(target) => {
            setSettingLevelGoal(true);
            levelGoalApi
              .setTarget(target)
              .then((updated) => {
                setLevelGoal(updated);
                setShowLevelGoalPicker(false);
              })
              .catch(() => {
                /* sessizce yoksay -- kart eski durumda kalır, kullanıcı tekrar deneyebilir */
              })
              .finally(() => setSettingLevelGoal(false));
          }}
        />
      )}


      {/* Günün Kelimesi (Madde 5, 24 Eylül 2026) — DailyWordCard ile
          KARIŞTIRILMASIN: o "Günlük Kelime Avı" (Wordle tarzı oyun), bu ise
          salt okunur, e-postayla gelen günlük kelime içeriğinin dashboard'a
          taşınmış hali. Aynı soft-disable deseni: içerik yoksa render edilmez. */}
      <WordOfTheDayCard />

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

      {/* Sınav Hazırlık Alanı banner'ı (V2 §1.1) */}
      <button
        onClick={() => router.push('/exam-prep')}
        className="w-full text-left flex items-center gap-4 rounded-2xl p-4 transition-all hover:shadow-md"
        style={{ background: '#FAEEDA' }}
      >
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-slate-900">
          <GraduationCap className="w-5 h-5" style={{ color: '#854F0B' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: '#3b2a12' }}>
            {(EXAM_BANNER[locale] ?? EXAM_BANNER.tr)!.title}
          </p>
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#854F0B' }}>
            {(EXAM_BANNER[locale] ?? EXAM_BANNER.tr)!.subtitle}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-bold mt-1.5" style={{ color: '#854F0B' }}>
            {(EXAM_BANNER[locale] ?? EXAM_BANNER.tr)!.cta}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>

      {/* Adaptif Öğrenme Motoru Madde 3: dismissible periyodik yeniden seviye
          tespiti önerisi -- zorunlu placement modalinin aksine kapatılabilir. */}
      {showRecheckBanner && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-[#EEEDFE] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[#534AB7]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
              {(RECHECK_BANNER_STRINGS[locale] ?? RECHECK_BANNER_STRINGS.tr)!.title}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {(RECHECK_BANNER_STRINGS[locale] ?? RECHECK_BANNER_STRINGS.tr)!.message}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => router.push('/exam-prep?examType=placement&sessionMode=timed_mock')}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
                style={{ background: '#534AB7' }}
              >
                {(RECHECK_BANNER_STRINGS[locale] ?? RECHECK_BANNER_STRINGS.tr)!.cta}
              </button>
              <button
                onClick={() => {
                  setShowRecheckBanner(false);
                  try {
                    localStorage.setItem('lexis_recheck_dismissed_at', new Date().toDateString());
                  } catch {}
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                {(RECHECK_BANNER_STRINGS[locale] ?? RECHECK_BANNER_STRINGS.tr)!.dismiss}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adaptif Öğrenme Motoru Madde 2: haftalık program kartı. Zayıf konuları
          zaten içerdiği için gösterildiğinde eski "Zayıf Konuların" kartı gizlenir. */}
      {studyProgram?.available && studyProgram.focus_topics.length > 0 && (
        <StudyProgramCard program={studyProgram} locale={locale} />
      )}

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
