'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from '@/store/auth';

export type Locale = 'tr' | 'en' | 'ar' | 'ru' | 'de' | 'fr' | 'es' | 'it';

const RTL_LOCALES: Locale[] = ['ar'];

type TranslationKey =
  | 'dashboard'
  | 'words'
  | 'flashcards'
  | 'quiz'
  | 'schedule'
  | 'stats'
  | 'profile'
  | 'premiumGet'
  | 'premiumActive'
  | 'adminPanel'
  | 'logout'
  | 'loading'
  | 'loadingError'
  | 'greeting'
  | 'dailySummarySubtitle'
  | 'streakActive'
  | 'streakEncourage'
  | 'totalWords'
  | 'thisWeekLabel'
  | 'addedToday'
  | 'goalLabel'
  | 'dueReview'
  | 'wordsInQueue'
  | 'dailyGoal'
  | 'wordsUnit'
  | 'remainingLabel'
  | 'weeklyProgress'
  | 'todayAbbr'
  | 'thisWeekColon'
  | 'lastWeekColon'
  | 'flashcardPractice'
  | 'cardsWaitingLabel'
  | 'startQuiz'
  | 'testKnowledge'
  | 'addWord'
  | 'expandList'
  | 'levelDistribution'
  | 'newLabel'
  | 'learningLabel'
  | 'learnedLabel'
  | 'recentWordsTitle'
  | 'noWordsYet'
  | 'newBadge'
  | 'dueTimeLabel'
  | 'startBtn'
  | 'dayLabels';

type Dictionary = Record<TranslationKey, string>;

const dictionaries: Record<Locale, Dictionary> = {
  tr: {
    dashboard: 'Dashboard',
    words: 'Kelimeler',
    flashcards: 'Flashcards',
    quiz: 'Quiz',
    schedule: 'Program',
    stats: 'İstatistik',
    profile: 'Profil',
    premiumGet: 'Premium’a Geç',
    premiumActive: 'Premium Üyesin',
    adminPanel: 'Yönetim Paneli',
    logout: 'Çıkış Yap',
    loading: 'Yükleniyor…',
    loadingError: 'Veriler yüklenemedi.',
    greeting: 'Günaydın',
    dailySummarySubtitle: 'İşte günlük öğrenme özetin.',
    streakActive: 'günlük seri devam ediyor!',
    streakEncourage: 'Bugün de çalışarak serinizi koruyun',
    totalWords: 'Toplam kelime',
    thisWeekLabel: 'bu hafta',
    addedToday: 'Bugün eklendi',
    goalLabel: 'Hedef',
    dueReview: 'Tekrar bekleyen',
    wordsInQueue: 'kelime sırada',
    dailyGoal: 'Günlük hedef',
    wordsUnit: 'kelime',
    remainingLabel: 'kaldı',
    weeklyProgress: 'Haftalık ilerleme',
    todayAbbr: 'Bug.',
    thisWeekColon: 'Bu hafta',
    lastWeekColon: 'Geçen hafta',
    flashcardPractice: 'Flashcard çalış',
    cardsWaitingLabel: 'kart bekliyor',
    startQuiz: 'Quiz başlat',
    testKnowledge: 'Bilgini test et',
    addWord: 'Kelime ekle',
    expandList: 'Listeyi genişlet',
    levelDistribution: 'Seviye dağılımı',
    newLabel: 'Yeni',
    learningLabel: 'Öğreniliyor',
    learnedLabel: 'Öğrenildi',
    recentWordsTitle: 'Son eklenen kelimeler',
    noWordsYet: 'Henüz kelime eklenmedi.',
    newBadge: 'yeni',
    dueTimeLabel: 'kelime tekrar zamanı geldi',
    startBtn: 'Başla',
    dayLabels: 'Pt,Sa,Ça,Pe,Cu,Ct,Pa',
  },
  en: {
    dashboard: 'Dashboard',
    words: 'Words',
    flashcards: 'Flashcards',
    quiz: 'Quiz',
    schedule: 'Schedule',
    stats: 'Statistics',
    profile: 'Profile',
    premiumGet: 'Go Premium',
    premiumActive: 'Premium Member',
    adminPanel: 'Admin Panel',
    logout: 'Log Out',
    loading: 'Loading…',
    loadingError: 'Failed to load data.',
    greeting: 'Good morning',
    dailySummarySubtitle: 'Here’s your daily learning summary.',
    streakActive: 'day streak going!',
    streakEncourage: 'Keep your streak alive by studying today',
    totalWords: 'Total words',
    thisWeekLabel: 'this week',
    addedToday: 'Added today',
    goalLabel: 'Goal',
    dueReview: 'Due for review',
    wordsInQueue: 'words in queue',
    dailyGoal: 'Daily goal',
    wordsUnit: 'words',
    remainingLabel: 'left',
    weeklyProgress: 'Weekly progress',
    todayAbbr: 'Today',
    thisWeekColon: 'This week',
    lastWeekColon: 'Last week',
    flashcardPractice: 'Practice flashcards',
    cardsWaitingLabel: 'cards waiting',
    startQuiz: 'Start quiz',
    testKnowledge: 'Test your knowledge',
    addWord: 'Add word',
    expandList: 'Expand your list',
    levelDistribution: 'Level distribution',
    newLabel: 'New',
    learningLabel: 'Learning',
    learnedLabel: 'Learned',
    recentWordsTitle: 'Recently added words',
    noWordsYet: 'No words added yet.',
    newBadge: 'new',
    dueTimeLabel: 'words are due for review',
    startBtn: 'Start',
    dayLabels: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    words: 'الكلمات',
    flashcards: 'البطاقات التعليمية',
    quiz: 'اختبار',
    schedule: 'البرنامج',
    stats: 'الإحصائيات',
    profile: 'الملف الشخصي',
    premiumGet: 'الترقية إلى بريميوم',
    premiumActive: 'عضو بريميوم',
    adminPanel: 'لوحة الإدارة',
    logout: 'تسجيل الخروج',
    loading: 'جارٍ التحميل…',
    loadingError: 'تعذر تحميل البيانات.',
    greeting: 'صباح الخير',
    dailySummarySubtitle: 'إليك ملخص تعلمك اليومي.',
    streakActive: 'يوم متتالٍ مستمر!',
    streakEncourage: 'حافظ على تتابعك بالتعلم اليوم',
    totalWords: 'إجمالي الكلمات',
    thisWeekLabel: 'هذا الأسبوع',
    addedToday: 'أُضيف اليوم',
    goalLabel: 'الهدف',
    dueReview: 'بانتظار المراجعة',
    wordsInQueue: 'كلمة في الانتظار',
    dailyGoal: 'الهدف اليومي',
    wordsUnit: 'كلمة',
    remainingLabel: 'متبقٍ',
    weeklyProgress: 'التقدم الأسبوعي',
    todayAbbr: 'اليوم',
    thisWeekColon: 'هذا الأسبوع',
    lastWeekColon: 'الأسبوع الماضي',
    flashcardPractice: 'تدرب بالبطاقات',
    cardsWaitingLabel: 'بطاقة بالانتظار',
    startQuiz: 'ابدأ الاختبار',
    testKnowledge: 'اختبر معرفتك',
    addWord: 'إضافة كلمة',
    expandList: 'وسّع قائمتك',
    levelDistribution: 'توزيع المستويات',
    newLabel: 'جديد',
    learningLabel: 'قيد التعلم',
    learnedLabel: 'تم تعلمه',
    recentWordsTitle: 'الكلمات المضافة مؤخرًا',
    noWordsYet: 'لم تُضف أي كلمة بعد.',
    newBadge: 'جديد',
    dueTimeLabel: 'كلمة حان وقت مراجعتها',
    startBtn: 'ابدأ',
    dayLabels: 'الإثنين,الثلاثاء,الأربعاء,الخميس,الجمعة,السبت,الأحد',
  },
  ru: {
    dashboard: 'Панель',
    words: 'Слова',
    flashcards: 'Карточки',
    quiz: 'Тест',
    schedule: 'Расписание',
    stats: 'Статистика',
    profile: 'Профиль',
    premiumGet: 'Перейти на Premium',
    premiumActive: 'Premium активен',
    adminPanel: 'Панель администратора',
    logout: 'Выйти',
    loading: 'Загрузка…',
    loadingError: 'Не удалось загрузить данные.',
    greeting: 'Доброе утро',
    dailySummarySubtitle: 'Вот сводка твоего обучения за день.',
    streakActive: 'дней подряд!',
    streakEncourage: 'Позанимайся сегодня, чтобы не прерывать серию',
    totalWords: 'Всего слов',
    thisWeekLabel: 'на этой неделе',
    addedToday: 'Добавлено сегодня',
    goalLabel: 'Цель',
    dueReview: 'Ждут повторения',
    wordsInQueue: 'слов в очереди',
    dailyGoal: 'Дневная цель',
    wordsUnit: 'слов',
    remainingLabel: 'осталось',
    weeklyProgress: 'Прогресс за неделю',
    todayAbbr: 'Сег.',
    thisWeekColon: 'На этой неделе',
    lastWeekColon: 'На прошлой неделе',
    flashcardPractice: 'Тренировка карточек',
    cardsWaitingLabel: 'карточек ждут',
    startQuiz: 'Начать тест',
    testKnowledge: 'Проверь свои знания',
    addWord: 'Добавить слово',
    expandList: 'Расширь список',
    levelDistribution: 'Распределение по уровням',
    newLabel: 'Новые',
    learningLabel: 'Изучаются',
    learnedLabel: 'Изучено',
    recentWordsTitle: 'Недавно добавленные слова',
    noWordsYet: 'Слова ещё не добавлены.',
    newBadge: 'новое',
    dueTimeLabel: 'слов пора повторить',
    startBtn: 'Начать',
    dayLabels: 'Пн,Вт,Ср,Чт,Пт,Сб,Вс',
  },
  de: {
    dashboard: 'Dashboard',
    words: 'Wörter',
    flashcards: 'Karteikarten',
    quiz: 'Quiz',
    schedule: 'Zeitplan',
    stats: 'Statistik',
    profile: 'Profil',
    premiumGet: 'Premium werden',
    premiumActive: 'Premium-Mitglied',
    adminPanel: 'Admin-Bereich',
    logout: 'Abmelden',
    loading: 'Wird geladen…',
    loadingError: 'Daten konnten nicht geladen werden.',
    greeting: 'Guten Morgen',
    dailySummarySubtitle: 'Hier ist deine tägliche Lernübersicht.',
    streakActive: 'Tage in Folge!',
    streakEncourage: 'Lerne heute weiter, um deine Serie zu halten',
    totalWords: 'Wörter insgesamt',
    thisWeekLabel: 'diese Woche',
    addedToday: 'Heute hinzugefügt',
    goalLabel: 'Ziel',
    dueReview: 'Zur Wiederholung fällig',
    wordsInQueue: 'Wörter in der Warteschlange',
    dailyGoal: 'Tagesziel',
    wordsUnit: 'Wörter',
    remainingLabel: 'übrig',
    weeklyProgress: 'Wochenfortschritt',
    todayAbbr: 'Heute',
    thisWeekColon: 'Diese Woche',
    lastWeekColon: 'Letzte Woche',
    flashcardPractice: 'Karteikarten üben',
    cardsWaitingLabel: 'Karten warten',
    startQuiz: 'Quiz starten',
    testKnowledge: 'Teste dein Wissen',
    addWord: 'Wort hinzufügen',
    expandList: 'Liste erweitern',
    levelDistribution: 'Niveauverteilung',
    newLabel: 'Neu',
    learningLabel: 'Wird gelernt',
    learnedLabel: 'Gelernt',
    recentWordsTitle: 'Zuletzt hinzugefügte Wörter',
    noWordsYet: 'Noch keine Wörter hinzugefügt.',
    newBadge: 'neu',
    dueTimeLabel: 'Wörter sind zur Wiederholung fällig',
    startBtn: 'Start',
    dayLabels: 'Mo,Di,Mi,Do,Fr,Sa,So',
  },
  fr: {
    dashboard: 'Tableau de bord',
    words: 'Mots',
    flashcards: 'Cartes mémo',
    quiz: 'Quiz',
    schedule: 'Programme',
    stats: 'Statistiques',
    profile: 'Profil',
    premiumGet: 'Passer à Premium',
    premiumActive: 'Membre Premium',
    adminPanel: "Panneau d'administration",
    logout: 'Déconnexion',
    loading: 'Chargement…',
    loadingError: 'Impossible de charger les données.',
    greeting: 'Bonjour',
    dailySummarySubtitle: "Voici ton résumé d'apprentissage du jour.",
    streakActive: 'jours de suite !',
    streakEncourage: "Continue aujourd'hui pour garder ta série",
    totalWords: 'Total des mots',
    thisWeekLabel: 'cette semaine',
    addedToday: "Ajoutés aujourd'hui",
    goalLabel: 'Objectif',
    dueReview: 'À réviser',
    wordsInQueue: 'mots en attente',
    dailyGoal: 'Objectif quotidien',
    wordsUnit: 'mots',
    remainingLabel: 'restants',
    weeklyProgress: 'Progression hebdomadaire',
    todayAbbr: "Aujourd'hui",
    thisWeekColon: 'Cette semaine',
    lastWeekColon: 'Semaine dernière',
    flashcardPractice: 'Réviser les cartes',
    cardsWaitingLabel: 'cartes en attente',
    startQuiz: 'Démarrer le quiz',
    testKnowledge: 'Teste tes connaissances',
    addWord: 'Ajouter un mot',
    expandList: 'Agrandis ta liste',
    levelDistribution: 'Répartition des niveaux',
    newLabel: 'Nouveau',
    learningLabel: 'En apprentissage',
    learnedLabel: 'Appris',
    recentWordsTitle: 'Mots ajoutés récemment',
    noWordsYet: 'Aucun mot ajouté pour le moment.',
    newBadge: 'nouveau',
    dueTimeLabel: 'mots sont à réviser',
    startBtn: 'Commencer',
    dayLabels: 'Lun,Mar,Mer,Jeu,Ven,Sam,Dim',
  },
  es: {
    dashboard: 'Panel',
    words: 'Palabras',
    flashcards: 'Tarjetas',
    quiz: 'Cuestionario',
    schedule: 'Horario',
    stats: 'Estadísticas',
    profile: 'Perfil',
    premiumGet: 'Hazte Premium',
    premiumActive: 'Miembro Premium',
    adminPanel: 'Panel de administración',
    logout: 'Cerrar sesión',
    loading: 'Cargando…',
    loadingError: 'No se pudieron cargar los datos.',
    greeting: 'Buenos días',
    dailySummarySubtitle: 'Aquí tienes tu resumen diario de aprendizaje.',
    streakActive: '¡días seguidos!',
    streakEncourage: 'Estudia hoy para mantener tu racha',
    totalWords: 'Total de palabras',
    thisWeekLabel: 'esta semana',
    addedToday: 'Añadidas hoy',
    goalLabel: 'Meta',
    dueReview: 'Pendientes de repaso',
    wordsInQueue: 'palabras en cola',
    dailyGoal: 'Meta diaria',
    wordsUnit: 'palabras',
    remainingLabel: 'restantes',
    weeklyProgress: 'Progreso semanal',
    todayAbbr: 'Hoy',
    thisWeekColon: 'Esta semana',
    lastWeekColon: 'Semana pasada',
    flashcardPractice: 'Practicar tarjetas',
    cardsWaitingLabel: 'tarjetas esperando',
    startQuiz: 'Iniciar cuestionario',
    testKnowledge: 'Pon a prueba tu conocimiento',
    addWord: 'Añadir palabra',
    expandList: 'Amplía tu lista',
    levelDistribution: 'Distribución de niveles',
    newLabel: 'Nuevas',
    learningLabel: 'Aprendiendo',
    learnedLabel: 'Aprendidas',
    recentWordsTitle: 'Palabras añadidas recientemente',
    noWordsYet: 'Aún no se han añadido palabras.',
    newBadge: 'nuevo',
    dueTimeLabel: 'palabras están listas para repasar',
    startBtn: 'Empezar',
    dayLabels: 'Lun,Mar,Mié,Jue,Vie,Sáb,Dom',
  },
  it: {
    dashboard: 'Dashboard',
    words: 'Parole',
    flashcards: 'Flashcard',
    quiz: 'Quiz',
    schedule: 'Programma',
    stats: 'Statistiche',
    profile: 'Profilo',
    premiumGet: 'Passa a Premium',
    premiumActive: 'Membro Premium',
    adminPanel: 'Pannello admin',
    logout: 'Esci',
    loading: 'Caricamento…',
    loadingError: 'Impossibile caricare i dati.',
    greeting: 'Buongiorno',
    dailySummarySubtitle: 'Ecco il tuo riepilogo di apprendimento giornaliero.',
    streakActive: 'giorni di fila!',
    streakEncourage: 'Continua oggi per mantenere la tua serie',
    totalWords: 'Parole totali',
    thisWeekLabel: 'questa settimana',
    addedToday: 'Aggiunte oggi',
    goalLabel: 'Obiettivo',
    dueReview: 'Da ripassare',
    wordsInQueue: 'parole in coda',
    dailyGoal: 'Obiettivo giornaliero',
    wordsUnit: 'parole',
    remainingLabel: 'rimanenti',
    weeklyProgress: 'Progresso settimanale',
    todayAbbr: 'Oggi',
    thisWeekColon: 'Questa settimana',
    lastWeekColon: 'Settimana scorsa',
    flashcardPractice: 'Esercitati con le flashcard',
    cardsWaitingLabel: 'carte in attesa',
    startQuiz: 'Inizia il quiz',
    testKnowledge: 'Metti alla prova le tue conoscenze',
    addWord: 'Aggiungi parola',
    expandList: 'Espandi la tua lista',
    levelDistribution: 'Distribuzione dei livelli',
    newLabel: 'Nuove',
    learningLabel: 'In apprendimento',
    learnedLabel: 'Apprese',
    recentWordsTitle: 'Parole aggiunte di recente',
    noWordsYet: 'Nessuna parola ancora aggiunta.',
    newBadge: 'nuovo',
    dueTimeLabel: 'parole sono da ripassare',
    startBtn: 'Inizia',
    dayLabels: 'Lun,Mar,Mer,Gio,Ven,Sab,Dom',
  },
};

interface LocaleContextType {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

function resolveLocale(code?: string): Locale {
  if (code && code in dictionaries) return code as Locale;
  return 'tr';
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const locale = resolveLocale(user?.native_lang);
  const dir: 'ltr' | 'rtl' = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);

  const value = useMemo<LocaleContextType>(() => ({
    locale,
    dir,
    t: (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
  }), [locale, dir]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
