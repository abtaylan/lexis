'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from '@/store/auth';

export type Locale = 'tr' | 'en' | 'ar' | 'ru' | 'de' | 'fr' | 'es' | 'it';

const RTL_LOCALES: Locale[] = ['ar'];

type TranslationKey =
  | 'dashboard' | 'words' | 'flashcards' | 'quiz' | 'schedule' | 'stats' | 'profile'
  | 'premiumGet' | 'premiumActive' | 'adminPanel' | 'logout' | 'loading' | 'loadingError'
  | 'greeting' | 'dailySummarySubtitle' | 'streakActive' | 'streakEncourage' | 'totalWords'
  | 'thisWeekLabel' | 'addedToday' | 'goalLabel' | 'dueReview' | 'wordsInQueue' | 'dailyGoal'
  | 'wordsUnit' | 'remainingLabel' | 'weeklyProgress' | 'todayAbbr' | 'thisWeekColon' | 'lastWeekColon'
  | 'flashcardPractice' | 'cardsWaitingLabel' | 'startQuiz' | 'testKnowledge' | 'addWord' | 'expandList'
  | 'levelDistribution' | 'newLabel' | 'learningLabel' | 'learnedLabel' | 'recentWordsTitle' | 'noWordsYet'
  | 'newBadge' | 'dueTimeLabel' | 'startBtn' | 'dayLabels' | 'statusLearned' | 'statusLearning' | 'statusArchived'
  | 'lookupNoMeaning' | 'lookupNotFound' | 'lookupApplied' | 'meaningRequired' | 'saveFailed' | 'meaningRequiredLabel'
  | 'meaningNativeTpl' | 'meaningTargetTpl' | 'exampleLabel' | 'wordTypeLabel' | 'wordRequiredLabel' | 'searchBtn'
  | 'searchTooltip' | 'lookupHelper' | 'meaningsFoundTpl' | 'listLabel' | 'listActive' | 'listPassive' | 'cancelBtn'
  | 'savingBtn' | 'saveBtn' | 'totalWordsCountTpl' | 'addWordBtn' | 'learnedWordsLabel' | 'archivedWordsLabel'
  | 'searchPlaceholder' | 'allStatuses' | 'allLists' | 'statusArchivedOption' | 'noWordsFound' | 'noWordsFoundSub'
  | 'colWord' | 'colMeaning' | 'colType' | 'colStatus' | 'colRepeat' | 'colNext' | 'deleteWordConfirm' | 'paginationTpl'
  | 'prevPage' | 'nextPage' | 'addWordModalTitle' | 'editWordModalTitle' | 'sessionComplete' | 'reviewedCountTpl'
  | 'correctLabel' | 'wrongLabel' | 'successRate' | 'restartBtn' | 'wordsLoadError' | 'greatJob' | 'noWordsDue'
  | 'tapToFlip' | 'exampleHeader' | 'dontKnowBtn' | 'knewItBtn' | 'correctCountTpl' | 'wrongCountTpl'
  | 'tierExcellent' | 'tierGood' | 'tierKeepGoing' | 'questionsCompletedTpl' | 'retryQuizBtn' | 'quizMinWordsError'
  | 'quizQuestionPrompt' | 'questionCounterTpl';

type Dictionary = Record<TranslationKey, string>;

const dictionaries: Record<Locale, Dictionary> = {
  tr: {
    dashboard: 'Dashboard', words: 'Kelimeler', flashcards: 'Flashcards', quiz: 'Quiz', schedule: 'Program', stats: 'İstatistik', profile: 'Profil',
    premiumGet: 'Premium’a Geç', premiumActive: 'Premium Üyesin', adminPanel: 'Yönetim Paneli', logout: 'Çıkış Yap',
    loading: 'Yükleniyor…', loadingError: 'Veriler yüklenemedi.', greeting: 'Günaydın', dailySummarySubtitle: 'İşte günlük öğrenme özetin.',
    streakActive: 'günlük seri devam ediyor!', streakEncourage: 'Bugün de çalışarak serinizi koruyun', totalWords: 'Toplam kelime',
    thisWeekLabel: 'bu hafta', addedToday: 'Bugün eklendi', goalLabel: 'Hedef', dueReview: 'Tekrar bekleyen', wordsInQueue: 'kelime sırada',
    dailyGoal: 'Günlük hedef', wordsUnit: 'kelime', remainingLabel: 'kaldı', weeklyProgress: 'Haftalık ilerleme', todayAbbr: 'Bug.',
    thisWeekColon: 'Bu hafta', lastWeekColon: 'Geçen hafta', flashcardPractice: 'Flashcard çalış', cardsWaitingLabel: 'kart bekliyor',
    startQuiz: 'Quiz başlat', testKnowledge: 'Bilgini test et', addWord: 'Kelime ekle', expandList: 'Listeyi genişlet', levelDistribution: 'Seviye dağılımı',
    newLabel: 'Yeni', learningLabel: 'Öğreniliyor', learnedLabel: 'Öğrenildi', recentWordsTitle: 'Son eklenen kelimeler', noWordsYet: 'Henüz kelime eklenmedi.',
    newBadge: 'yeni', dueTimeLabel: 'kelime tekrar zamanı geldi', startBtn: 'Başla', dayLabels: 'Pt,Sa,Ça,Pe,Cu,Ct,Pa',
    statusLearned: 'Öğrenildi', statusLearning: 'Öğreniliyor', statusArchived: 'Arşiv', lookupNoMeaning: 'Anlam bulunamadı. Elle girebilirsin.',
    lookupNotFound: 'Sözlükte bulunamadı. Elle girebilirsin.', lookupApplied: '✓ Anlam forma eklendi, düzenleyebilirsin.', meaningRequired: 'Kelime ve anlam zorunludur.',
    saveFailed: 'Kaydedilemedi, tekrar deneyin.', meaningRequiredLabel: 'Anlam *', meaningNativeTpl: '{lang} anlamı', meaningTargetTpl: '{lang} açıklaması',
    exampleLabel: 'Örnek cümle', wordTypeLabel: 'Kelime türü', wordRequiredLabel: 'Kelime *', searchBtn: 'Ara', searchTooltip: 'Sözlükte ara',
    lookupHelper: 'Kelimeyi yazıp Enter’a bas veya Ara’ya tıkla — anlamı otomatik gelir.', meaningsFoundTpl: '"{word}" için {n} anlam — birini seç:',
    listLabel: 'Liste', listActive: 'Aktif', listPassive: 'Pasif', cancelBtn: 'İptal', savingBtn: 'Kaydediliyor…', saveBtn: 'Kaydet',
    totalWordsCountTpl: 'Toplam {n} kelime', addWordBtn: 'Kelime Ekle', learnedWordsLabel: 'Öğrenilenler', archivedWordsLabel: 'Arşivlenenler',
    searchPlaceholder: 'Kelime ara…', allStatuses: 'Tüm durumlar', allLists: 'Tüm listeler', statusArchivedOption: 'Arşivlendi',
    noWordsFound: 'Kelime bulunamadı', noWordsFoundSub: 'Filtreleri değiştir veya yeni kelime ekle.', colWord: 'Kelime', colMeaning: 'Anlam',
    colType: 'Tür', colStatus: 'Durum', colRepeat: 'Tekrar', colNext: 'Sonraki', deleteWordConfirm: 'Bu kelimeyi silmek istediğine emin misin?',
    paginationTpl: '{n} kelime · Sayfa {page} / {pages}', prevPage: '← Önceki', nextPage: 'Sonraki →', addWordModalTitle: 'Yeni Kelime Ekle', editWordModalTitle: 'Kelimeyi Düzenle',
    sessionComplete: 'Oturum Tamamlandı!', reviewedCountTpl: '{n} kelime tekrar edildi', correctLabel: 'Doğru', wrongLabel: 'Yanlış',
    successRate: 'Başarı oranı', restartBtn: 'Tekrar Başla', wordsLoadError: 'Kelimeler yüklenemedi.', greatJob: 'Harika iş!',
    noWordsDue: 'Bugün için tekrar edilecek kelimen yok.', tapToFlip: 'Çevirmek için tıkla', exampleHeader: 'Örnek',
    dontKnowBtn: 'Bilmedim', knewItBtn: 'Bildim', correctCountTpl: '{n} doğru', wrongCountTpl: '{n} yanlış',
    tierExcellent: 'Mükemmel!', tierGood: 'İyi İş!', tierKeepGoing: 'Devam Et!', questionsCompletedTpl: '{n} soruyu tamamladın',
    retryQuizBtn: 'Tekrar Çöz', quizMinWordsError: 'Quiz için en az 4 kelime gerekiyor. Önce birkaç kelime ekle.',
    quizQuestionPrompt: 'Bu kelimenin anlamı nedir?', questionCounterTpl: 'Soru {i}/{n}',
  },
  en: {
    dashboard: 'Dashboard', words: 'Words', flashcards: 'Flashcards', quiz: 'Quiz', schedule: 'Schedule', stats: 'Statistics', profile: 'Profile',
    premiumGet: 'Go Premium', premiumActive: 'Premium Member', adminPanel: 'Admin Panel', logout: 'Log Out',
    loading: 'Loading…', loadingError: 'Failed to load data.', greeting: 'Good morning', dailySummarySubtitle: 'Here’s your daily learning summary.',
    streakActive: 'day streak going!', streakEncourage: 'Keep your streak alive by studying today', totalWords: 'Total words',
    thisWeekLabel: 'this week', addedToday: 'Added today', goalLabel: 'Goal', dueReview: 'Due for review', wordsInQueue: 'words in queue',
    dailyGoal: 'Daily goal', wordsUnit: 'words', remainingLabel: 'left', weeklyProgress: 'Weekly progress', todayAbbr: 'Today',
    thisWeekColon: 'This week', lastWeekColon: 'Last week', flashcardPractice: 'Practice flashcards', cardsWaitingLabel: 'cards waiting',
    startQuiz: 'Start quiz', testKnowledge: 'Test your knowledge', addWord: 'Add word', expandList: 'Expand your list', levelDistribution: 'Level distribution',
    newLabel: 'New', learningLabel: 'Learning', learnedLabel: 'Learned', recentWordsTitle: 'Recently added words', noWordsYet: 'No words added yet.',
    newBadge: 'new', dueTimeLabel: 'words are due for review', startBtn: 'Start', dayLabels: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
    statusLearned: 'Learned', statusLearning: 'Learning', statusArchived: 'Archive', lookupNoMeaning: 'No meaning found. You can enter it manually.',
    lookupNotFound: 'Not found in dictionary. You can enter it manually.', lookupApplied: '✓ Meaning added to form, you can edit it.', meaningRequired: 'Word and meaning are required.',
    saveFailed: 'Could not save, please try again.', meaningRequiredLabel: 'Meaning *', meaningNativeTpl: '{lang} meaning', meaningTargetTpl: '{lang} description',
    exampleLabel: 'Example sentence', wordTypeLabel: 'Word type', wordRequiredLabel: 'Word *', searchBtn: 'Search', searchTooltip: 'Search dictionary',
    lookupHelper: 'Type the word and press Enter or click Search — the meaning fills in automatically.', meaningsFoundTpl: '{n} meanings found for "{word}" — pick one:',
    listLabel: 'List', listActive: 'Active', listPassive: 'Passive', cancelBtn: 'Cancel', savingBtn: 'Saving…', saveBtn: 'Save',
    totalWordsCountTpl: '{n} words total', addWordBtn: 'Add Word', learnedWordsLabel: 'Learned', archivedWordsLabel: 'Archived',
    searchPlaceholder: 'Search words…', allStatuses: 'All statuses', allLists: 'All lists', statusArchivedOption: 'Archived',
    noWordsFound: 'No words found', noWordsFoundSub: 'Change the filters or add a new word.', colWord: 'Word', colMeaning: 'Meaning',
    colType: 'Type', colStatus: 'Status', colRepeat: 'Repeat', colNext: 'Next', deleteWordConfirm: 'Are you sure you want to delete this word?',
    paginationTpl: '{n} words · Page {page} of {pages}', prevPage: '← Previous', nextPage: 'Next →', addWordModalTitle: 'Add New Word', editWordModalTitle: 'Edit Word',
    sessionComplete: 'Session Complete!', reviewedCountTpl: '{n} words reviewed', correctLabel: 'Correct', wrongLabel: 'Wrong',
    successRate: 'Success rate', restartBtn: 'Restart', wordsLoadError: 'Could not load words.', greatJob: 'Great job!',
    noWordsDue: 'You have no words due for review today.', tapToFlip: 'Tap to flip', exampleHeader: 'Example',
    dontKnowBtn: "Didn't know", knewItBtn: 'Knew it', correctCountTpl: '{n} correct', wrongCountTpl: '{n} wrong',
    tierExcellent: 'Excellent!', tierGood: 'Good Job!', tierKeepGoing: 'Keep Going!', questionsCompletedTpl: 'You completed {n} questions',
    retryQuizBtn: 'Retry Quiz', quizMinWordsError: 'You need at least 4 words for a quiz. Add a few words first.',
    quizQuestionPrompt: 'What does this word mean?', questionCounterTpl: 'Question {i}/{n}',
  },
  ar: {
    dashboard: 'لوحة التحكم', words: 'الكلمات', flashcards: 'البطاقات التعليمية', quiz: 'اختبار', schedule: 'البرنامج', stats: 'الإحصائيات', profile: 'الملف الشخصي',
    premiumGet: 'الترقية إلى بريميوم', premiumActive: 'عضو بريميوم', adminPanel: 'لوحة الإدارة', logout: 'تسجيل الخروج',
    loading: 'جارٍ التحميل…', loadingError: 'تعذر تحميل البيانات.', greeting: 'صباح الخير', dailySummarySubtitle: 'إليك ملخص تعلمك اليومي.',
    streakActive: 'يوم متتالٍ مستمر!', streakEncourage: 'حافظ على تتابعك بالتعلم اليوم', totalWords: 'إجمالي الكلمات',
    thisWeekLabel: 'هذا الأسبوع', addedToday: 'أُضيف اليوم', goalLabel: 'الهدف', dueReview: 'بانتظار المراجعة', wordsInQueue: 'كلمة في الانتظار',
    dailyGoal: 'الهدف اليومي', wordsUnit: 'كلمة', remainingLabel: 'متبقٍ', weeklyProgress: 'التقدم الأسبوعي', todayAbbr: 'اليوم',
    thisWeekColon: 'هذا الأسبوع', lastWeekColon: 'الأسبوع الماضي', flashcardPractice: 'تدرب بالبطاقات', cardsWaitingLabel: 'بطاقة بالانتظار',
    startQuiz: 'ابدأ الاختبار', testKnowledge: 'اختبر معرفتك', addWord: 'إضافة كلمة', expandList: 'وسّع قائمتك', levelDistribution: 'توزيع المستويات',
    newLabel: 'جديد', learningLabel: 'قيد التعلم', learnedLabel: 'تم تعلمه', recentWordsTitle: 'الكلمات المضافة مؤخرًا', noWordsYet: 'لم تُضف أي كلمة بعد.',
    newBadge: 'جديد', dueTimeLabel: 'كلمة حان وقت مراجعتها', startBtn: 'ابدأ', dayLabels: 'الإثنين,الثلاثاء,الأربعاء,الخميس,الجمعة,السبت,الأحد',
    statusLearned: 'تم تعلمه', statusLearning: 'قيد التعلم', statusArchived: 'أرشيف', lookupNoMeaning: 'لم يُعثر على معنى. يمكنك إدخاله يدويًا.',
    lookupNotFound: 'غير موجود في القاموس. يمكنك إدخاله يدويًا.', lookupApplied: '✓ تمت إضافة المعنى إلى النموذج، يمكنك تعديله.', meaningRequired: 'الكلمة والمعنى مطلوبان.',
    saveFailed: 'تعذر الحفظ، حاول مجددًا.', meaningRequiredLabel: 'المعنى *', meaningNativeTpl: 'معنى {lang}', meaningTargetTpl: 'شرح {lang}',
    exampleLabel: 'جملة مثال', wordTypeLabel: 'نوع الكلمة', wordRequiredLabel: 'الكلمة *', searchBtn: 'بحث', searchTooltip: 'ابحث في القاموس',
    lookupHelper: 'اكتب الكلمة واضغط Enter أو انقر بحث — سيظهر المعنى تلقائيًا.', meaningsFoundTpl: '{n} معنى لـ"{word}" — اختر واحدًا:',
    listLabel: 'القائمة', listActive: 'نشط', listPassive: 'غير نشط', cancelBtn: 'إلغاء', savingBtn: 'جارٍ الحفظ…', saveBtn: 'حفظ',
    totalWordsCountTpl: 'إجمالي {n} كلمة', addWordBtn: 'إضافة كلمة', learnedWordsLabel: 'المتعلمة', archivedWordsLabel: 'المؤرشفة',
    searchPlaceholder: 'ابحث عن كلمة…', allStatuses: 'كل الحالات', allLists: 'كل القوائم', statusArchivedOption: 'مؤرشف',
    noWordsFound: 'لم يُعثر على كلمات', noWordsFoundSub: 'غيّر الفلاتر أو أضف كلمة جديدة.', colWord: 'الكلمة', colMeaning: 'المعنى',
    colType: 'النوع', colStatus: 'الحالة', colRepeat: 'التكرار', colNext: 'التالي', deleteWordConfirm: 'هل أنت متأكد من حذف هذه الكلمة؟',
    paginationTpl: '{n} كلمة · صفحة {page} من {pages}', prevPage: '← السابق', nextPage: 'التالي →', addWordModalTitle: 'إضافة كلمة جديدة', editWordModalTitle: 'تعديل الكلمة',
    sessionComplete: 'اكتملت الجلسة!', reviewedCountTpl: 'تمت مراجعة {n} كلمة', correctLabel: 'صحيح', wrongLabel: 'خطأ',
    successRate: 'معدل النجاح', restartBtn: 'إعادة البدء', wordsLoadError: 'تعذر تحميل الكلمات.', greatJob: 'عمل رائع!',
    noWordsDue: 'لا توجد كلمات للمراجعة اليوم.', tapToFlip: 'انقر للقلب', exampleHeader: 'مثال',
    dontKnowBtn: 'لم أعرف', knewItBtn: 'عرفت', correctCountTpl: '{n} صحيح', wrongCountTpl: '{n} خطأ',
    tierExcellent: 'ممتاز!', tierGood: 'عمل جيد!', tierKeepGoing: 'واصل!', questionsCompletedTpl: 'أكملت {n} سؤالًا',
    retryQuizBtn: 'أعد الاختبار', quizMinWordsError: 'تحتاج إلى 4 كلمات على الأقل لإجراء اختبار. أضف بعض الكلمات أولًا.',
    quizQuestionPrompt: 'ما معنى هذه الكلمة؟', questionCounterTpl: 'سؤال {i}/{n}',
  },
  ru: {
    dashboard: 'Панель', words: 'Слова', flashcards: 'Карточки', quiz: 'Тест', schedule: 'Расписание', stats: 'Статистика', profile: 'Профиль',
    premiumGet: 'Перейти на Premium', premiumActive: 'Premium активен', adminPanel: 'Панель администратора', logout: 'Выйти',
    loading: 'Загрузка…', loadingError: 'Не удалось загрузить данные.', greeting: 'Доброе утро', dailySummarySubtitle: 'Вот сводка твоего обучения за день.',
    streakActive: 'дней подряд!', streakEncourage: 'Позанимайся сегодня, чтобы не прерывать серию', totalWords: 'Всего слов',
    thisWeekLabel: 'на этой неделе', addedToday: 'Добавлено сегодня', goalLabel: 'Цель', dueReview: 'Ждут повторения', wordsInQueue: 'слов в очереди',
    dailyGoal: 'Дневная цель', wordsUnit: 'слов', remainingLabel: 'осталось', weeklyProgress: 'Прогресс за неделю', todayAbbr: 'Сег.',
    thisWeekColon: 'На этой неделе', lastWeekColon: 'На прошлой неделе', flashcardPractice: 'Тренировка карточек', cardsWaitingLabel: 'карточек ждут',
    startQuiz: 'Начать тест', testKnowledge: 'Проверь свои знания', addWord: 'Добавить слово', expandList: 'Расширь список', levelDistribution: 'Распределение по уровням',
    newLabel: 'Новые', learningLabel: 'Изучаются', learnedLabel: 'Изучено', recentWordsTitle: 'Недавно добавленные слова', noWordsYet: 'Слова ещё не добавлены.',
    newBadge: 'новое', dueTimeLabel: 'слов пора повторить', startBtn: 'Начать', dayLabels: 'Пн,Вт,Ср,Чт,Пт,Сб,Вс',
    statusLearned: 'Изучено', statusLearning: 'Изучается', statusArchived: 'Архив', lookupNoMeaning: 'Значение не найдено. Можно ввести вручную.',
    lookupNotFound: 'Не найдено в словаре. Можно ввести вручную.', lookupApplied: '✓ Значение добавлено в форму, можно отредактировать.', meaningRequired: 'Слово и значение обязательны.',
    saveFailed: 'Не удалось сохранить, попробуйте снова.', meaningRequiredLabel: 'Значение *', meaningNativeTpl: 'Значение на {lang}', meaningTargetTpl: 'Описание на {lang}',
    exampleLabel: 'Пример предложения', wordTypeLabel: 'Часть речи', wordRequiredLabel: 'Слово *', searchBtn: 'Найти', searchTooltip: 'Поиск в словаре',
    lookupHelper: 'Введите слово и нажмите Enter или «Найти» — значение подставится автоматически.', meaningsFoundTpl: 'Найдено {n} значений для «{word}» — выберите:',
    listLabel: 'Список', listActive: 'Активный', listPassive: 'Пассивный', cancelBtn: 'Отмена', savingBtn: 'Сохранение…', saveBtn: 'Сохранить',
    totalWordsCountTpl: 'Всего {n} слов', addWordBtn: 'Добавить слово', learnedWordsLabel: 'Изучено', archivedWordsLabel: 'В архиве',
    searchPlaceholder: 'Поиск слов…', allStatuses: 'Все статусы', allLists: 'Все списки', statusArchivedOption: 'В архиве',
    noWordsFound: 'Слова не найдены', noWordsFoundSub: 'Измените фильтры или добавьте новое слово.', colWord: 'Слово', colMeaning: 'Значение',
    colType: 'Тип', colStatus: 'Статус', colRepeat: 'Повторы', colNext: 'Далее', deleteWordConfirm: 'Уверены, что хотите удалить это слово?',
    paginationTpl: '{n} слов · Страница {page} из {pages}', prevPage: '← Назад', nextPage: 'Вперёд →', addWordModalTitle: 'Добавить новое слово', editWordModalTitle: 'Редактировать слово',
    sessionComplete: 'Сессия завершена!', reviewedCountTpl: 'Повторено слов: {n}', correctLabel: 'Верно', wrongLabel: 'Неверно',
    successRate: 'Процент успеха', restartBtn: 'Начать заново', wordsLoadError: 'Не удалось загрузить слова.', greatJob: 'Отличная работа!',
    noWordsDue: 'На сегодня нет слов для повторения.', tapToFlip: 'Нажми, чтобы перевернуть', exampleHeader: 'Пример',
    dontKnowBtn: 'Не знал', knewItBtn: 'Знал', correctCountTpl: '{n} верно', wrongCountTpl: '{n} неверно',
    tierExcellent: 'Отлично!', tierGood: 'Хорошая работа!', tierKeepGoing: 'Продолжай!', questionsCompletedTpl: 'Вы завершили {n} вопросов',
    retryQuizBtn: 'Пройти снова', quizMinWordsError: 'Для теста нужно минимум 4 слова. Сначала добавьте несколько слов.',
    quizQuestionPrompt: 'Что означает это слово?', questionCounterTpl: 'Вопрос {i}/{n}',
  },
  de: {
    dashboard: 'Dashboard', words: 'Wörter', flashcards: 'Karteikarten', quiz: 'Quiz', schedule: 'Zeitplan', stats: 'Statistik', profile: 'Profil',
    premiumGet: 'Premium werden', premiumActive: 'Premium-Mitglied', adminPanel: 'Admin-Bereich', logout: 'Abmelden',
    loading: 'Wird geladen…', loadingError: 'Daten konnten nicht geladen werden.', greeting: 'Guten Morgen', dailySummarySubtitle: 'Hier ist deine tägliche Lernübersicht.',
    streakActive: 'Tage in Folge!', streakEncourage: 'Lerne heute weiter, um deine Serie zu halten', totalWords: 'Wörter insgesamt',
    thisWeekLabel: 'diese Woche', addedToday: 'Heute hinzugefügt', goalLabel: 'Ziel', dueReview: 'Zur Wiederholung fällig', wordsInQueue: 'Wörter in der Warteschlange',
    dailyGoal: 'Tagesziel', wordsUnit: 'Wörter', remainingLabel: 'übrig', weeklyProgress: 'Wochenfortschritt', todayAbbr: 'Heute',
    thisWeekColon: 'Diese Woche', lastWeekColon: 'Letzte Woche', flashcardPractice: 'Karteikarten üben', cardsWaitingLabel: 'Karten warten',
    startQuiz: 'Quiz starten', testKnowledge: 'Teste dein Wissen', addWord: 'Wort hinzufügen', expandList: 'Liste erweitern', levelDistribution: 'Niveauverteilung',
    newLabel: 'Neu', learningLabel: 'Wird gelernt', learnedLabel: 'Gelernt', recentWordsTitle: 'Zuletzt hinzugefügte Wörter', noWordsYet: 'Noch keine Wörter hinzugefügt.',
    newBadge: 'neu', dueTimeLabel: 'Wörter sind zur Wiederholung fällig', startBtn: 'Start', dayLabels: 'Mo,Di,Mi,Do,Fr,Sa,So',
    statusLearned: 'Gelernt', statusLearning: 'Wird gelernt', statusArchived: 'Archiv', lookupNoMeaning: 'Keine Bedeutung gefunden. Du kannst sie manuell eingeben.',
    lookupNotFound: 'Nicht im Wörterbuch gefunden. Du kannst sie manuell eingeben.', lookupApplied: '✓ Bedeutung wurde übernommen, du kannst sie bearbeiten.', meaningRequired: 'Wort und Bedeutung sind erforderlich.',
    saveFailed: 'Konnte nicht gespeichert werden, versuche es erneut.', meaningRequiredLabel: 'Bedeutung *', meaningNativeTpl: 'Bedeutung auf {lang}', meaningTargetTpl: 'Beschreibung auf {lang}',
    exampleLabel: 'Beispielsatz', wordTypeLabel: 'Wortart', wordRequiredLabel: 'Wort *', searchBtn: 'Suchen', searchTooltip: 'Im Wörterbuch suchen',
    lookupHelper: 'Wort eingeben und Enter drücken oder auf Suchen klicken — die Bedeutung wird automatisch übernommen.', meaningsFoundTpl: '{n} Bedeutungen für „{word}“ gefunden — wähle eine aus:',
    listLabel: 'Liste', listActive: 'Aktiv', listPassive: 'Passiv', cancelBtn: 'Abbrechen', savingBtn: 'Wird gespeichert…', saveBtn: 'Speichern',
    totalWordsCountTpl: '{n} Wörter insgesamt', addWordBtn: 'Wort hinzufügen', learnedWordsLabel: 'Gelernt', archivedWordsLabel: 'Archiviert',
    searchPlaceholder: 'Wörter suchen…', allStatuses: 'Alle Status', allLists: 'Alle Listen', statusArchivedOption: 'Archiviert',
    noWordsFound: 'Keine Wörter gefunden', noWordsFoundSub: 'Filter ändern oder neues Wort hinzufügen.', colWord: 'Wort', colMeaning: 'Bedeutung',
    colType: 'Typ', colStatus: 'Status', colRepeat: 'Wdh.', colNext: 'Nächste', deleteWordConfirm: 'Möchtest du dieses Wort wirklich löschen?',
    paginationTpl: '{n} Wörter · Seite {page} von {pages}', prevPage: '← Zurück', nextPage: 'Weiter →', addWordModalTitle: 'Neues Wort hinzufügen', editWordModalTitle: 'Wort bearbeiten',
    sessionComplete: 'Sitzung abgeschlossen!', reviewedCountTpl: '{n} Wörter wiederholt', correctLabel: 'Richtig', wrongLabel: 'Falsch',
    successRate: 'Erfolgsquote', restartBtn: 'Neu starten', wordsLoadError: 'Wörter konnten nicht geladen werden.', greatJob: 'Großartige Arbeit!',
    noWordsDue: 'Heute sind keine Wörter zur Wiederholung fällig.', tapToFlip: 'Zum Umdrehen tippen', exampleHeader: 'Beispiel',
    dontKnowBtn: 'Wusste ich nicht', knewItBtn: 'Wusste ich', correctCountTpl: '{n} richtig', wrongCountTpl: '{n} falsch',
    tierExcellent: 'Ausgezeichnet!', tierGood: 'Gut gemacht!', tierKeepGoing: 'Weiter so!', questionsCompletedTpl: 'Du hast {n} Fragen abgeschlossen',
    retryQuizBtn: 'Quiz wiederholen', quizMinWordsError: 'Du brauchst mindestens 4 Wörter für ein Quiz. Füge zuerst ein paar Wörter hinzu.',
    quizQuestionPrompt: 'Was bedeutet dieses Wort?', questionCounterTpl: 'Frage {i}/{n}',
  },
  fr: {
    dashboard: 'Tableau de bord', words: 'Mots', flashcards: 'Cartes mémo', quiz: 'Quiz', schedule: 'Programme', stats: 'Statistiques', profile: 'Profil',
    premiumGet: 'Passer à Premium', premiumActive: 'Membre Premium', adminPanel: "Panneau d'administration", logout: 'Déconnexion',
    loading: 'Chargement…', loadingError: 'Impossible de charger les données.', greeting: 'Bonjour', dailySummarySubtitle: "Voici ton résumé d'apprentissage du jour.",
    streakActive: 'jours de suite !', streakEncourage: "Continue aujourd'hui pour garder ta série", totalWords: 'Total des mots',
    thisWeekLabel: 'cette semaine', addedToday: "Ajoutés aujourd'hui", goalLabel: 'Objectif', dueReview: 'À réviser', wordsInQueue: 'mots en attente',
    dailyGoal: 'Objectif quotidien', wordsUnit: 'mots', remainingLabel: 'restants', weeklyProgress: 'Progression hebdomadaire', todayAbbr: "Aujourd'hui",
    thisWeekColon: 'Cette semaine', lastWeekColon: 'Semaine dernière', flashcardPractice: 'Réviser les cartes', cardsWaitingLabel: 'cartes en attente',
    startQuiz: 'Démarrer le quiz', testKnowledge: 'Teste tes connaissances', addWord: 'Ajouter un mot', expandList: 'Agrandis ta liste', levelDistribution: 'Répartition des niveaux',
    newLabel: 'Nouveau', learningLabel: 'En apprentissage', learnedLabel: 'Appris', recentWordsTitle: 'Mots ajoutés récemment', noWordsYet: 'Aucun mot ajouté pour le moment.',
    newBadge: 'nouveau', dueTimeLabel: 'mots sont à réviser', startBtn: 'Commencer', dayLabels: 'Lun,Mar,Mer,Jeu,Ven,Sam,Dim',
    statusLearned: 'Appris', statusLearning: 'En apprentissage', statusArchived: 'Archive', lookupNoMeaning: 'Aucune signification trouvée. Tu peux la saisir manuellement.',
    lookupNotFound: 'Introuvable dans le dictionnaire. Tu peux la saisir manuellement.', lookupApplied: '✓ Signification ajoutée au formulaire, tu peux la modifier.', meaningRequired: 'Le mot et la signification sont obligatoires.',
    saveFailed: "Impossible d'enregistrer, réessaie.", meaningRequiredLabel: 'Signification *', meaningNativeTpl: 'Signification en {lang}', meaningTargetTpl: 'Description en {lang}',
    exampleLabel: 'Phrase d’exemple', wordTypeLabel: 'Type de mot', wordRequiredLabel: 'Mot *', searchBtn: 'Chercher', searchTooltip: 'Chercher dans le dictionnaire',
    lookupHelper: "Tape le mot et appuie sur Entrée ou clique sur Chercher — la signification se remplit automatiquement.", meaningsFoundTpl: '{n} significations trouvées pour « {word} » — choisis-en une :',
    listLabel: 'Liste', listActive: 'Active', listPassive: 'Passive', cancelBtn: 'Annuler', savingBtn: 'Enregistrement…', saveBtn: 'Enregistrer',
    totalWordsCountTpl: '{n} mots au total', addWordBtn: 'Ajouter un mot', learnedWordsLabel: 'Appris', archivedWordsLabel: 'Archivés',
    searchPlaceholder: 'Rechercher des mots…', allStatuses: 'Tous les statuts', allLists: 'Toutes les listes', statusArchivedOption: 'Archivé',
    noWordsFound: 'Aucun mot trouvé', noWordsFoundSub: 'Modifie les filtres ou ajoute un nouveau mot.', colWord: 'Mot', colMeaning: 'Signification',
    colType: 'Type', colStatus: 'Statut', colRepeat: 'Répét.', colNext: 'Suivant', deleteWordConfirm: 'Es-tu sûr de vouloir supprimer ce mot ?',
    paginationTpl: '{n} mots · Page {page} sur {pages}', prevPage: '← Précédent', nextPage: 'Suivant →', addWordModalTitle: 'Ajouter un nouveau mot', editWordModalTitle: 'Modifier le mot',
    sessionComplete: 'Session terminée !', reviewedCountTpl: '{n} mots révisés', correctLabel: 'Correct', wrongLabel: 'Faux',
    successRate: 'Taux de réussite', restartBtn: 'Recommencer', wordsLoadError: 'Impossible de charger les mots.', greatJob: 'Excellent travail !',
    noWordsDue: "Tu n'as aucun mot à réviser aujourd'hui.", tapToFlip: 'Touche pour retourner', exampleHeader: 'Exemple',
    dontKnowBtn: 'Je ne savais pas', knewItBtn: 'Je savais', correctCountTpl: '{n} correct(s)', wrongCountTpl: '{n} faux',
    tierExcellent: 'Excellent !', tierGood: 'Bon travail !', tierKeepGoing: 'Continue !', questionsCompletedTpl: 'Tu as terminé {n} questions',
    retryQuizBtn: 'Recommencer le quiz', quizMinWordsError: "Il te faut au moins 4 mots pour un quiz. Ajoute d'abord quelques mots.",
    quizQuestionPrompt: 'Que signifie ce mot ?', questionCounterTpl: 'Question {i}/{n}',
  },
  es: {
    dashboard: 'Panel', words: 'Palabras', flashcards: 'Tarjetas', quiz: 'Cuestionario', schedule: 'Horario', stats: 'Estadísticas', profile: 'Perfil',
    premiumGet: 'Hazte Premium', premiumActive: 'Miembro Premium', adminPanel: 'Panel de administración', logout: 'Cerrar sesión',
    loading: 'Cargando…', loadingError: 'No se pudieron cargar los datos.', greeting: 'Buenos días', dailySummarySubtitle: 'Aquí tienes tu resumen diario de aprendizaje.',
    streakActive: '¡días seguidos!', streakEncourage: 'Estudia hoy para mantener tu racha', totalWords: 'Total de palabras',
    thisWeekLabel: 'esta semana', addedToday: 'Añadidas hoy', goalLabel: 'Meta', dueReview: 'Pendientes de repaso', wordsInQueue: 'palabras en cola',
    dailyGoal: 'Meta diaria', wordsUnit: 'palabras', remainingLabel: 'restantes', weeklyProgress: 'Progreso semanal', todayAbbr: 'Hoy',
    thisWeekColon: 'Esta semana', lastWeekColon: 'Semana pasada', flashcardPractice: 'Practicar tarjetas', cardsWaitingLabel: 'tarjetas esperando',
    startQuiz: 'Iniciar cuestionario', testKnowledge: 'Pon a prueba tu conocimiento', addWord: 'Añadir palabra', expandList: 'Amplía tu lista', levelDistribution: 'Distribución de niveles',
    newLabel: 'Nuevas', learningLabel: 'Aprendiendo', learnedLabel: 'Aprendidas', recentWordsTitle: 'Palabras añadidas recientemente', noWordsYet: 'Aún no se han añadido palabras.',
    newBadge: 'nuevo', dueTimeLabel: 'palabras están listas para repasar', startBtn: 'Empezar', dayLabels: 'Lun,Mar,Mié,Jue,Vie,Sáb,Dom',
    statusLearned: 'Aprendida', statusLearning: 'Aprendiendo', statusArchived: 'Archivo', lookupNoMeaning: 'No se encontró significado. Puedes introducirlo manualmente.',
    lookupNotFound: 'No se encontró en el diccionario. Puedes introducirlo manualmente.', lookupApplied: '✓ Significado añadido al formulario, puedes editarlo.', meaningRequired: 'La palabra y el significado son obligatorios.',
    saveFailed: 'No se pudo guardar, inténtalo de nuevo.', meaningRequiredLabel: 'Significado *', meaningNativeTpl: 'Significado en {lang}', meaningTargetTpl: 'Descripción en {lang}',
    exampleLabel: 'Frase de ejemplo', wordTypeLabel: 'Tipo de palabra', wordRequiredLabel: 'Palabra *', searchBtn: 'Buscar', searchTooltip: 'Buscar en el diccionario',
    lookupHelper: 'Escribe la palabra y pulsa Enter o haz clic en Buscar — el significado se rellena automáticamente.', meaningsFoundTpl: '{n} significados encontrados para "{word}" — elige uno:',
    listLabel: 'Lista', listActive: 'Activa', listPassive: 'Pasiva', cancelBtn: 'Cancelar', savingBtn: 'Guardando…', saveBtn: 'Guardar',
    totalWordsCountTpl: '{n} palabras en total', addWordBtn: 'Añadir palabra', learnedWordsLabel: 'Aprendidas', archivedWordsLabel: 'Archivadas',
    searchPlaceholder: 'Buscar palabras…', allStatuses: 'Todos los estados', allLists: 'Todas las listas', statusArchivedOption: 'Archivada',
    noWordsFound: 'No se encontraron palabras', noWordsFoundSub: 'Cambia los filtros o añade una nueva palabra.', colWord: 'Palabra', colMeaning: 'Significado',
    colType: 'Tipo', colStatus: 'Estado', colRepeat: 'Repet.', colNext: 'Siguiente', deleteWordConfirm: '¿Seguro que quieres eliminar esta palabra?',
    paginationTpl: '{n} palabras · Página {page} de {pages}', prevPage: '← Anterior', nextPage: 'Siguiente →', addWordModalTitle: 'Añadir nueva palabra', editWordModalTitle: 'Editar palabra',
    sessionComplete: '¡Sesión completada!', reviewedCountTpl: '{n} palabras repasadas', correctLabel: 'Correcto', wrongLabel: 'Incorrecto',
    successRate: 'Tasa de acierto', restartBtn: 'Reiniciar', wordsLoadError: 'No se pudieron cargar las palabras.', greatJob: '¡Buen trabajo!',
    noWordsDue: 'No tienes palabras para repasar hoy.', tapToFlip: 'Toca para voltear', exampleHeader: 'Ejemplo',
    dontKnowBtn: 'No lo sabía', knewItBtn: 'Lo sabía', correctCountTpl: '{n} correctas', wrongCountTpl: '{n} incorrectas',
    tierExcellent: '¡Excelente!', tierGood: '¡Buen trabajo!', tierKeepGoing: '¡Sigue así!', questionsCompletedTpl: 'Completaste {n} preguntas',
    retryQuizBtn: 'Repetir cuestionario', quizMinWordsError: 'Necesitas al menos 4 palabras para un cuestionario. Añade algunas palabras primero.',
    quizQuestionPrompt: '¿Qué significa esta palabra?', questionCounterTpl: 'Pregunta {i}/{n}',
  },
  it: {
    dashboard: 'Dashboard', words: 'Parole', flashcards: 'Flashcard', quiz: 'Quiz', schedule: 'Programma', stats: 'Statistiche', profile: 'Profilo',
    premiumGet: 'Passa a Premium', premiumActive: 'Membro Premium', adminPanel: 'Pannello admin', logout: 'Esci',
    loading: 'Caricamento…', loadingError: 'Impossibile caricare i dati.', greeting: 'Buongiorno', dailySummarySubtitle: 'Ecco il tuo riepilogo di apprendimento giornaliero.',
    streakActive: 'giorni di fila!', streakEncourage: 'Continua oggi per mantenere la tua serie', totalWords: 'Parole totali',
    thisWeekLabel: 'questa settimana', addedToday: 'Aggiunte oggi', goalLabel: 'Obiettivo', dueReview: 'Da ripassare', wordsInQueue: 'parole in coda',
    dailyGoal: 'Obiettivo giornaliero', wordsUnit: 'parole', remainingLabel: 'rimanenti', weeklyProgress: 'Progresso settimanale', todayAbbr: 'Oggi',
    thisWeekColon: 'Questa settimana', lastWeekColon: 'Settimana scorsa', flashcardPractice: 'Esercitati con le flashcard', cardsWaitingLabel: 'carte in attesa',
    startQuiz: 'Inizia il quiz', testKnowledge: 'Metti alla prova le tue conoscenze', addWord: 'Aggiungi parola', expandList: 'Espandi la tua lista', levelDistribution: 'Distribuzione dei livelli',
    newLabel: 'Nuove', learningLabel: 'In apprendimento', learnedLabel: 'Apprese', recentWordsTitle: 'Parole aggiunte di recente', noWordsYet: 'Nessuna parola ancora aggiunta.',
    newBadge: 'nuovo', dueTimeLabel: 'parole sono da ripassare', startBtn: 'Inizia', dayLabels: 'Lun,Mar,Mer,Gio,Ven,Sab,Dom',
    statusLearned: 'Appresa', statusLearning: 'In apprendimento', statusArchived: 'Archivio', lookupNoMeaning: 'Nessun significato trovato. Puoi inserirlo manualmente.',
    lookupNotFound: 'Non trovato nel dizionario. Puoi inserirlo manualmente.', lookupApplied: '✓ Significato aggiunto al modulo, puoi modificarlo.', meaningRequired: 'Parola e significato sono obbligatori.',
    saveFailed: 'Impossibile salvare, riprova.', meaningRequiredLabel: 'Significato *', meaningNativeTpl: 'Significato in {lang}', meaningTargetTpl: 'Descrizione in {lang}',
    exampleLabel: 'Frase di esempio', wordTypeLabel: 'Tipo di parola', wordRequiredLabel: 'Parola *', searchBtn: 'Cerca', searchTooltip: 'Cerca nel dizionario',
    lookupHelper: 'Scrivi la parola e premi Invio o clicca su Cerca — il significato si compila automaticamente.', meaningsFoundTpl: '{n} significati trovati per "{word}" — scegline uno:',
    listLabel: 'Elenco', listActive: 'Attivo', listPassive: 'Passivo', cancelBtn: 'Annulla', savingBtn: 'Salvataggio…', saveBtn: 'Salva',
    totalWordsCountTpl: '{n} parole in totale', addWordBtn: 'Aggiungi parola', learnedWordsLabel: 'Apprese', archivedWordsLabel: 'Archiviate',
    searchPlaceholder: 'Cerca parole…', allStatuses: 'Tutti gli stati', allLists: 'Tutti gli elenchi', statusArchivedOption: 'Archiviata',
    noWordsFound: 'Nessuna parola trovata', noWordsFoundSub: 'Cambia i filtri o aggiungi una nuova parola.', colWord: 'Parola', colMeaning: 'Significato',
    colType: 'Tipo', colStatus: 'Stato', colRepeat: 'Ripet.', colNext: 'Prossima', deleteWordConfirm: 'Sei sicuro di voler eliminare questa parola?',
    paginationTpl: '{n} parole · Pagina {page} di {pages}', prevPage: '← Precedente', nextPage: 'Successiva →', addWordModalTitle: 'Aggiungi nuova parola', editWordModalTitle: 'Modifica parola',
    sessionComplete: 'Sessione completata!', reviewedCountTpl: '{n} parole ripassate', correctLabel: 'Corretto', wrongLabel: 'Sbagliato',
    successRate: 'Percentuale di successo', restartBtn: 'Ricomincia', wordsLoadError: 'Impossibile caricare le parole.', greatJob: 'Ottimo lavoro!',
    noWordsDue: 'Non hai parole da ripassare oggi.', tapToFlip: 'Tocca per girare', exampleHeader: 'Esempio',
    dontKnowBtn: 'Non lo sapevo', knewItBtn: 'Lo sapevo', correctCountTpl: '{n} corrette', wrongCountTpl: '{n} sbagliate',
    tierExcellent: 'Eccellente!', tierGood: 'Ottimo lavoro!', tierKeepGoing: 'Continua così!', questionsCompletedTpl: 'Hai completato {n} domande',
    retryQuizBtn: 'Riprova il quiz', quizMinWordsError: 'Servono almeno 4 parole per un quiz. Aggiungi prima qualche parola.',
    quizQuestionPrompt: 'Cosa significa questa parola?', questionCounterTpl: 'Domanda {i}/{n}',
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
