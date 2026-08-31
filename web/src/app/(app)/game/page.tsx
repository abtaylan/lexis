'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
  RotateCcw,
  Gamepad2,
  Sparkles,
  ArrowLeft,
  Heart,
  ListChecks,
  Keyboard,
  ArrowLeftRight,
  Type as TypeIcon,
  Ear,
  Zap,
  Shuffle,
  Volume2,
} from 'lucide-react';
import {
  gamesApi,
  socialApi,
  type PoolSource,
  type GameMode,
  type Direction,
  type NextWordResult,
  type GameFinishResult,
  type GuessLetterResult,
} from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

type Strings = {
  pageTitle: string;
  pageSubtitle: string;
  chooseModeTitle: string;
  modeMultipleLabel: string;
  modeMultipleDesc: string;
  modeWordleLabel: string;
  modeWordleDesc: string;
  modeTypingLabel: string;
  modeTypingDesc: string;
  typingPromptLabel: string;
  typingInputPlaceholder: string;
  typingCheckBtn: string;
  modeListeningLabel: string;
  modeListeningDesc: string;
  listeningPromptLabel: string;
  listeningPlayBtn: string;
  modeSprintLabel: string;
  modeSprintDesc: string;
  sprintTimeLeftTpl: string;
  sprintTimeUpTitle: string;
  modeMatchingLabel: string;
  modeMatchingDesc: string;
  matchingPromptLabel: string;
  chooseDirectionTitle: string;
  dirWordToMeaningLabel: string;
  dirWordToMeaningDesc: string;
  dirMeaningToWordLabel: string;
  dirMeaningToWordDesc: string;
  dirDefinitionToWordLabel: string;
  dirDefinitionToWordDesc: string;
  choosePoolTitle: string;
  poolOwnLabel: string;
  poolOwnDesc: string;
  poolGeneralLabel: string;
  poolGeneralDesc: string;
  backBtn: string;
  startBtn: string;
  loadingLabel: string;
  genericError: string;
  ownEmptyError: string;
  generalEmptyError: string;
  questionPrompt: string;
  questionPromptReverse: string;
  questionPromptDefinition: string;
  questionCounterTpl: string;
  scoreLabel: string;
  xpLabel: string;
  levelUpTpl: string;
  finishBtn: string;
  correctLabel: string;
  wrongLabel: string;
  doneTitle: string;
  doneScoreTpl: string;
  doneXpTpl: string;
  playAgainBtn: string;
  backToDashboardBtn: string;
  hangmanHintLabel: string;
  livesLabel: string;
  guessedLabel: string;
  wordleWonTitle: string;
  wordleLostTitle: string;
  correctWordTpl: string;
  // Madde 6, Faz 3 — Meydan okuma (challenge) entegrasyonu
  challengeModeHint: string;
  challengeSubmittedMsg: string;
  challengeSubmitError: string;
  backToChallengesBtn: string;
};

const STRINGS: Record<Locale, Strings> = {
  tr: {
    pageTitle: 'Kelime Oyunu',
    pageSubtitle: 'Bir oyun modu seç, kelime öğrenirken XP kazan.',
    chooseModeTitle: 'Nasıl oynamak istersin?',
    modeMultipleLabel: 'Çoktan Seçmeli',
    modeMultipleDesc: 'Doğru anlamı 4 seçenek arasından bul',
    modeWordleLabel: 'Adam Asmaca',
    modeWordleDesc: 'Anlamına bakarak kelimeyi harf harf bul',
    modeTypingLabel: 'Yazma',
    modeTypingDesc: 'Anlama bakarak kelimeyi yaz',
    typingPromptLabel: 'Bu anlama gelen kelimeyi yaz',
    typingInputPlaceholder: 'Kelimeyi yaz…',
    typingCheckBtn: 'Kontrol Et',
    modeListeningLabel: 'Dinleme',
    modeListeningDesc: 'Kelimeyi dinle, duyduğunu yaz',
    listeningPromptLabel: 'Duyduğun kelimeyi yaz',
    listeningPlayBtn: 'Dinle',
    modeSprintLabel: 'Sprint',
    modeSprintDesc: 'Süre bitmeden olabildiğince çok kelime yaz',
    sprintTimeLeftTpl: 'Kalan süre: {s}sn',
    sprintTimeUpTitle: 'Süre doldu!',
    modeMatchingLabel: 'Eşleştirme',
    modeMatchingDesc: 'Kelimeleri anlamlarıyla eşleştir',
    matchingPromptLabel: 'Kelimeleri doğru anlamlarıyla eşleştir',
    chooseDirectionTitle: 'Hangi yönde çalışmak istersin?',
    dirWordToMeaningLabel: 'Kelime → Anlam',
    dirWordToMeaningDesc: 'Kelimeyi gör, doğru anlamı seç',
    dirMeaningToWordLabel: 'Anlam → Kelime',
    dirMeaningToWordDesc: 'Anlamı gör, doğru kelimeyi seç (daha zor, daha çok XP)',
    dirDefinitionToWordLabel: 'Tanım → Kelime',
    dirDefinitionToWordDesc: 'İngilizce tanımı gör, doğru kelimeyi seç (en zor, en çok XP)',
    choosePoolTitle: 'Hangi kelime havuzuyla oynamak istersin?',
    poolOwnLabel: 'Kendi Kelimelerim',
    poolOwnDesc: 'Öğrendiğin kelimelerle pratik yap',
    poolGeneralLabel: 'Genel Havuz',
    poolGeneralDesc: 'Geniş kelime havuzundan rastgele sorular',
    backBtn: 'Geri',
    startBtn: 'Oyunu Başlat',
    loadingLabel: 'Yükleniyor…',
    genericError: 'Bir şeyler ters gitti, tekrar dene.',
    ownEmptyError: 'Henüz kelime eklemedin. Önce birkaç kelime ekle.',
    generalEmptyError: 'Bu dil çifti için genel havuzda kelime yok.',
    questionPrompt: 'Bu kelimenin anlamı nedir?',
    questionPromptReverse: 'Bu anlama gelen kelime hangisi?',
    questionPromptDefinition: 'Bu tanıma uyan kelime hangisi?',
    questionCounterTpl: '{n}. soru',
    scoreLabel: 'Skor',
    xpLabel: 'XP',
    levelUpTpl: '🎉 Seviye {n}!',
    finishBtn: 'Bitir',
    correctLabel: 'Doğru!',
    wrongLabel: 'Yanlış',
    doneTitle: 'Oturum Tamamlandı!',
    doneScoreTpl: '{correct}/{total} doğru',
    doneXpTpl: '+{xp} XP kazandın',
    playAgainBtn: 'Tekrar Oyna',
    backToDashboardBtn: 'Panele Dön',
    hangmanHintLabel: 'İpucu (anlamı)',
    livesLabel: 'Hak',
    guessedLabel: 'Denenen harfler',
    wordleWonTitle: 'Kelimeyi buldun! 🎉',
    wordleLostTitle: 'Hakların bitti',
    correctWordTpl: 'Doğru kelime: {word}',
    challengeModeHint: 'Bu oyunu bir meydan okuma için oynuyorsun.',
    challengeSubmittedMsg: 'Skorun meydan okumaya gönderildi!',
    challengeSubmitError: 'Skor gönderilemedi, Arkadaşlar sayfasından tekrar deneyebilirsin.',
    backToChallengesBtn: 'Meydan Okumalara Dön',
  },
  en: {
    pageTitle: 'Word Game',
    pageSubtitle: 'Pick a game mode and earn XP while learning words.',
    chooseModeTitle: 'How do you want to play?',
    modeMultipleLabel: 'Multiple Choice',
    modeMultipleDesc: 'Pick the right meaning from 4 options',
    modeWordleLabel: 'Hangman',
    modeWordleDesc: 'Guess the word letter by letter from its meaning',
    modeTypingLabel: 'Typing',
    modeTypingDesc: 'Type the word from its meaning',
    typingPromptLabel: 'Type the word that matches this meaning',
    typingInputPlaceholder: 'Type the word…',
    typingCheckBtn: 'Check',
    modeListeningLabel: 'Listening',
    modeListeningDesc: 'Listen to the word and type what you hear',
    listeningPromptLabel: 'Type the word you hear',
    listeningPlayBtn: 'Play',
    modeSprintLabel: 'Sprint',
    modeSprintDesc: 'Type as many words as you can before time runs out',
    sprintTimeLeftTpl: 'Time left: {s}s',
    sprintTimeUpTitle: "Time's up!",
    modeMatchingLabel: 'Matching',
    modeMatchingDesc: 'Match each word with its meaning',
    matchingPromptLabel: 'Match the words with their meanings',
    chooseDirectionTitle: 'Which direction do you want to practice?',
    dirWordToMeaningLabel: 'Word → Meaning',
    dirWordToMeaningDesc: 'See the word, pick the right meaning',
    dirMeaningToWordLabel: 'Meaning → Word',
    dirMeaningToWordDesc: 'See the meaning, pick the right word (harder, more XP)',
    dirDefinitionToWordLabel: 'Definition → Word',
    dirDefinitionToWordDesc: 'See the English definition, pick the right word (hardest, most XP)',
    choosePoolTitle: 'Which word pool do you want to play with?',
    poolOwnLabel: 'My Words',
    poolOwnDesc: 'Practice with the words you are learning',
    poolGeneralLabel: 'General Pool',
    poolGeneralDesc: 'Random questions from a large word pool',
    backBtn: 'Back',
    startBtn: 'Start Game',
    loadingLabel: 'Loading…',
    genericError: 'Something went wrong, please try again.',
    ownEmptyError: "You haven't added any words yet. Add a few words first.",
    generalEmptyError: 'No words available in the general pool for this language pair.',
    questionPrompt: 'What does this word mean?',
    questionPromptReverse: 'Which word matches this meaning?',
    questionPromptDefinition: 'Which word matches this definition?',
    questionCounterTpl: 'Question {n}',
    scoreLabel: 'Score',
    xpLabel: 'XP',
    levelUpTpl: '🎉 Level {n}!',
    finishBtn: 'Finish',
    correctLabel: 'Correct!',
    wrongLabel: 'Wrong',
    doneTitle: 'Session Complete!',
    doneScoreTpl: '{correct}/{total} correct',
    doneXpTpl: 'You earned +{xp} XP',
    playAgainBtn: 'Play Again',
    backToDashboardBtn: 'Back to Dashboard',
    hangmanHintLabel: 'Hint (meaning)',
    livesLabel: 'Lives',
    guessedLabel: 'Guessed letters',
    wordleWonTitle: 'You got it! 🎉',
    wordleLostTitle: 'Out of lives',
    correctWordTpl: 'Correct word: {word}',
    challengeModeHint: "You're playing this game for a challenge.",
    challengeSubmittedMsg: 'Your score was submitted to the challenge!',
    challengeSubmitError: 'Could not submit your score — you can retry from the Friends page.',
    backToChallengesBtn: 'Back to Challenges',
  },
  ar: {
    pageTitle: 'لعبة الكلمات',
    pageSubtitle: 'اختر نمط لعب واكسب نقاط الخبرة أثناء تعلم الكلمات.',
    chooseModeTitle: 'كيف تريد أن تلعب؟',
    modeMultipleLabel: 'اختيار من متعدد',
    modeMultipleDesc: 'اختر المعنى الصحيح من بين 4 خيارات',
    modeWordleLabel: 'المشنقة',
    modeWordleDesc: 'خمّن الكلمة حرفًا بحرف من خلال معناها',
    modeTypingLabel: 'الكتابة',
    modeTypingDesc: 'اكتب الكلمة بالاعتماد على معناها',
    typingPromptLabel: 'اكتب الكلمة التي تطابق هذا المعنى',
    typingInputPlaceholder: 'اكتب الكلمة…',
    typingCheckBtn: 'تحقق',
    modeListeningLabel: 'الاستماع',
    modeListeningDesc: 'استمع إلى الكلمة واكتب ما سمعته',
    listeningPromptLabel: 'اكتب الكلمة التي سمعتها',
    listeningPlayBtn: 'تشغيل',
    modeSprintLabel: 'سباق سريع',
    modeSprintDesc: 'اكتب أكبر عدد ممكن من الكلمات قبل انتهاء الوقت',
    sprintTimeLeftTpl: 'الوقت المتبقي: {s} ثانية',
    sprintTimeUpTitle: 'انتهى الوقت!',
    modeMatchingLabel: 'المطابقة',
    modeMatchingDesc: 'طابق كل كلمة مع معناها',
    matchingPromptLabel: 'طابق الكلمات مع معانيها',
    chooseDirectionTitle: 'بأي اتجاه تريد التدرب؟',
    dirWordToMeaningLabel: 'كلمة ← معنى',
    dirWordToMeaningDesc: 'شاهد الكلمة، اختر المعنى الصحيح',
    dirMeaningToWordLabel: 'معنى ← كلمة',
    dirMeaningToWordDesc: 'شاهد المعنى، اختر الكلمة الصحيحة (أصعب، خبرة أكثر)',
    dirDefinitionToWordLabel: 'تعريف ← كلمة',
    dirDefinitionToWordDesc: 'شاهد التعريف الإنجليزي، اختر الكلمة الصحيحة (الأصعب، أكثر خبرة)',
    choosePoolTitle: 'مع أي مجموعة كلمات تريد اللعب؟',
    poolOwnLabel: 'كلماتي',
    poolOwnDesc: 'تدرب بالكلمات التي تتعلمها',
    poolGeneralLabel: 'المجموعة العامة',
    poolGeneralDesc: 'أسئلة عشوائية من مجموعة كبيرة من الكلمات',
    backBtn: 'رجوع',
    startBtn: 'ابدأ اللعبة',
    loadingLabel: 'جارٍ التحميل…',
    genericError: 'حدث خطأ ما، حاول مرة أخرى.',
    ownEmptyError: 'لم تُضف أي كلمة بعد. أضف بعض الكلمات أولًا.',
    generalEmptyError: 'لا توجد كلمات في المجموعة العامة لهذا الزوج اللغوي.',
    questionPrompt: 'ما معنى هذه الكلمة؟',
    questionPromptReverse: 'ما الكلمة التي تطابق هذا المعنى؟',
    questionPromptDefinition: 'ما الكلمة التي تطابق هذا التعريف؟',
    questionCounterTpl: 'السؤال {n}',
    scoreLabel: 'النقاط',
    xpLabel: 'نقاط الخبرة',
    levelUpTpl: '🎉 المستوى {n}!',
    finishBtn: 'إنهاء',
    correctLabel: 'صحيح!',
    wrongLabel: 'خطأ',
    doneTitle: 'اكتملت الجلسة!',
    doneScoreTpl: '{correct}/{total} صحيح',
    doneXpTpl: 'ربحت +{xp} نقطة خبرة',
    playAgainBtn: 'العب مجددًا',
    backToDashboardBtn: 'العودة للوحة التحكم',
    hangmanHintLabel: 'تلميح (المعنى)',
    livesLabel: 'المحاولات',
    guessedLabel: 'الحروف المجرَّبة',
    wordleWonTitle: 'لقد عرفتها! 🎉',
    wordleLostTitle: 'انتهت محاولاتك',
    correctWordTpl: 'الكلمة الصحيحة: {word}',
    challengeModeHint: 'أنت تلعب هذه اللعبة من أجل مبارزة.',
    challengeSubmittedMsg: 'تم إرسال نتيجتك إلى المبارزة!',
    challengeSubmitError: 'تعذّر إرسال النتيجة — يمكنك المحاولة مرة أخرى من صفحة الأصدقاء.',
    backToChallengesBtn: 'العودة إلى المبارزات',
  },
  ru: {
    pageTitle: 'Словесная игра',
    pageSubtitle: 'Выбери режим игры и получай опыт, изучая слова.',
    chooseModeTitle: 'Как хочешь играть?',
    modeMultipleLabel: 'Множественный выбор',
    modeMultipleDesc: 'Выбери правильное значение из 4 вариантов',
    modeWordleLabel: 'Виселица',
    modeWordleDesc: 'Угадай слово по буквам, глядя на его значение',
    modeTypingLabel: 'Печать',
    modeTypingDesc: 'Напиши слово по его значению',
    typingPromptLabel: 'Напиши слово, соответствующее этому значению',
    typingInputPlaceholder: 'Введите слово…',
    typingCheckBtn: 'Проверить',
    modeListeningLabel: 'Аудирование',
    modeListeningDesc: 'Прослушай слово и напиши то, что услышал',
    listeningPromptLabel: 'Напиши услышанное слово',
    listeningPlayBtn: 'Слушать',
    modeSprintLabel: 'Спринт',
    modeSprintDesc: 'Напиши как можно больше слов, пока не закончилось время',
    sprintTimeLeftTpl: 'Осталось времени: {s} с',
    sprintTimeUpTitle: 'Время вышло!',
    modeMatchingLabel: 'Сопоставление',
    modeMatchingDesc: 'Сопоставь слова с их значениями',
    matchingPromptLabel: 'Сопоставь слова с их значениями',
    chooseDirectionTitle: 'В каком направлении хочешь тренироваться?',
    dirWordToMeaningLabel: 'Слово → Значение',
    dirWordToMeaningDesc: 'Смотри слово, выбирай правильное значение',
    dirMeaningToWordLabel: 'Значение → Слово',
    dirMeaningToWordDesc: 'Смотри значение, выбирай правильное слово (сложнее, больше опыта)',
    dirDefinitionToWordLabel: 'Определение → Слово',
    dirDefinitionToWordDesc: 'Смотри английское определение, выбирай правильное слово (сложнее всего, больше всего опыта)',
    choosePoolTitle: 'С каким пулом слов хочешь играть?',
    poolOwnLabel: 'Мои слова',
    poolOwnDesc: 'Тренируйся на словах, которые изучаешь',
    poolGeneralLabel: 'Общий пул',
    poolGeneralDesc: 'Случайные вопросы из большого пула слов',
    backBtn: 'Назад',
    startBtn: 'Начать игру',
    loadingLabel: 'Загрузка…',
    genericError: 'Что-то пошло не так, попробуйте снова.',
    ownEmptyError: 'Вы ещё не добавили слов. Сначала добавьте несколько слов.',
    generalEmptyError: 'В общем пуле нет слов для этой языковой пары.',
    questionPrompt: 'Что означает это слово?',
    questionPromptReverse: 'Какое слово соответствует этому значению?',
    questionPromptDefinition: 'Какое слово соответствует этому определению?',
    questionCounterTpl: 'Вопрос {n}',
    scoreLabel: 'Счёт',
    xpLabel: 'Опыт',
    levelUpTpl: '🎉 Уровень {n}!',
    finishBtn: 'Завершить',
    correctLabel: 'Верно!',
    wrongLabel: 'Неверно',
    doneTitle: 'Сессия завершена!',
    doneScoreTpl: '{correct}/{total} верно',
    doneXpTpl: 'Вы заработали +{xp} опыта',
    playAgainBtn: 'Играть снова',
    backToDashboardBtn: 'На панель',
    hangmanHintLabel: 'Подсказка (значение)',
    livesLabel: 'Жизни',
    guessedLabel: 'Использованные буквы',
    wordleWonTitle: 'Вы угадали! 🎉',
    wordleLostTitle: 'Жизни закончились',
    correctWordTpl: 'Правильное слово: {word}',
    challengeModeHint: 'Вы играете в эту игру ради состязания.',
    challengeSubmittedMsg: 'Ваш результат отправлен в состязание!',
    challengeSubmitError: 'Не удалось отправить результат — попробуйте снова со страницы «Друзья».',
    backToChallengesBtn: 'Назад к состязаниям',
  },
  de: {
    pageTitle: 'Wortspiel',
    pageSubtitle: 'Wähle einen Spielmodus und sammle XP beim Lernen.',
    chooseModeTitle: 'Wie möchtest du spielen?',
    modeMultipleLabel: 'Multiple Choice',
    modeMultipleDesc: 'Wähle die richtige Bedeutung aus 4 Optionen',
    modeWordleLabel: 'Galgenmännchen',
    modeWordleDesc: 'Errate das Wort anhand der Bedeutung, Buchstabe für Buchstabe',
    modeTypingLabel: 'Tippen',
    modeTypingDesc: 'Schreibe das Wort anhand seiner Bedeutung',
    typingPromptLabel: 'Schreibe das Wort, das zu dieser Bedeutung passt',
    typingInputPlaceholder: 'Wort eingeben…',
    typingCheckBtn: 'Prüfen',
    modeListeningLabel: 'Hören',
    modeListeningDesc: 'Höre das Wort und schreibe, was du hörst',
    listeningPromptLabel: 'Schreibe das gehörte Wort',
    listeningPlayBtn: 'Abspielen',
    modeSprintLabel: 'Sprint',
    modeSprintDesc: 'Schreibe so viele Wörter wie möglich, bevor die Zeit abläuft',
    sprintTimeLeftTpl: 'Verbleibende Zeit: {s}s',
    sprintTimeUpTitle: 'Zeit ist um!',
    modeMatchingLabel: 'Zuordnen',
    modeMatchingDesc: 'Ordne die Wörter ihrer Bedeutung zu',
    matchingPromptLabel: 'Ordne die Wörter ihrer Bedeutung zu',
    chooseDirectionTitle: 'In welche Richtung möchtest du üben?',
    dirWordToMeaningLabel: 'Wort → Bedeutung',
    dirWordToMeaningDesc: 'Sieh das Wort, wähle die richtige Bedeutung',
    dirMeaningToWordLabel: 'Bedeutung → Wort',
    dirMeaningToWordDesc: 'Sieh die Bedeutung, wähle das richtige Wort (schwerer, mehr XP)',
    dirDefinitionToWordLabel: 'Definition → Wort',
    dirDefinitionToWordDesc: 'Sieh die englische Definition, wähle das richtige Wort (am schwersten, meiste XP)',
    choosePoolTitle: 'Mit welchem Wortpool möchtest du spielen?',
    poolOwnLabel: 'Meine Wörter',
    poolOwnDesc: 'Übe mit den Wörtern, die du lernst',
    poolGeneralLabel: 'Allgemeiner Pool',
    poolGeneralDesc: 'Zufällige Fragen aus einem großen Wortpool',
    backBtn: 'Zurück',
    startBtn: 'Spiel starten',
    loadingLabel: 'Wird geladen…',
    genericError: 'Etwas ist schiefgelaufen, versuche es erneut.',
    ownEmptyError: 'Du hast noch keine Wörter hinzugefügt. Füge zuerst ein paar Wörter hinzu.',
    generalEmptyError: 'Für dieses Sprachpaar sind keine Wörter im allgemeinen Pool verfügbar.',
    questionPrompt: 'Was bedeutet dieses Wort?',
    questionPromptReverse: 'Welches Wort passt zu dieser Bedeutung?',
    questionPromptDefinition: 'Welches Wort passt zu dieser Definition?',
    questionCounterTpl: 'Frage {n}',
    scoreLabel: 'Punkte',
    xpLabel: 'XP',
    levelUpTpl: '🎉 Level {n}!',
    finishBtn: 'Beenden',
    correctLabel: 'Richtig!',
    wrongLabel: 'Falsch',
    doneTitle: 'Sitzung abgeschlossen!',
    doneScoreTpl: '{correct}/{total} richtig',
    doneXpTpl: 'Du hast +{xp} XP verdient',
    playAgainBtn: 'Nochmal spielen',
    backToDashboardBtn: 'Zurück zum Dashboard',
    hangmanHintLabel: 'Hinweis (Bedeutung)',
    livesLabel: 'Leben',
    guessedLabel: 'Versuchte Buchstaben',
    wordleWonTitle: 'Du hast es erraten! 🎉',
    wordleLostTitle: 'Keine Leben mehr',
    correctWordTpl: 'Richtiges Wort: {word}',
    challengeModeHint: 'Du spielst dieses Spiel für eine Herausforderung.',
    challengeSubmittedMsg: 'Dein Ergebnis wurde an die Herausforderung gesendet!',
    challengeSubmitError: 'Ergebnis konnte nicht gesendet werden — versuche es erneut über die Freunde-Seite.',
    backToChallengesBtn: 'Zurück zu Herausforderungen',
  },
  fr: {
    pageTitle: 'Jeu de mots',
    pageSubtitle: 'Choisis un mode de jeu et gagne des XP en apprenant des mots.',
    chooseModeTitle: 'Comment veux-tu jouer ?',
    modeMultipleLabel: 'Choix multiple',
    modeMultipleDesc: 'Choisis le bon sens parmi 4 options',
    modeWordleLabel: 'Pendu',
    modeWordleDesc: "Devine le mot lettre par lettre à partir de son sens",
    modeTypingLabel: 'Saisie',
    modeTypingDesc: 'Écris le mot à partir de son sens',
    typingPromptLabel: 'Écris le mot qui correspond à ce sens',
    typingInputPlaceholder: 'Écris le mot…',
    typingCheckBtn: 'Vérifier',
    modeListeningLabel: 'Écoute',
    modeListeningDesc: 'Écoute le mot et écris ce que tu entends',
    listeningPromptLabel: 'Écris le mot que tu entends',
    listeningPlayBtn: 'Écouter',
    modeSprintLabel: 'Sprint',
    modeSprintDesc: "Écris autant de mots que possible avant la fin du temps",
    sprintTimeLeftTpl: 'Temps restant : {s}s',
    sprintTimeUpTitle: 'Temps écoulé !',
    modeMatchingLabel: 'Association',
    modeMatchingDesc: 'Associe chaque mot à son sens',
    matchingPromptLabel: 'Associe les mots à leur sens',
    chooseDirectionTitle: 'Dans quel sens veux-tu t\u2019entraîner ?',
    dirWordToMeaningLabel: 'Mot → Sens',
    dirWordToMeaningDesc: 'Vois le mot, choisis le bon sens',
    dirMeaningToWordLabel: 'Sens → Mot',
    dirMeaningToWordDesc: 'Vois le sens, choisis le bon mot (plus difficile, plus de XP)',
    dirDefinitionToWordLabel: 'Définition → Mot',
    dirDefinitionToWordDesc: 'Vois la définition anglaise, choisis le bon mot (le plus difficile, le plus de XP)',
    choosePoolTitle: 'Avec quel pool de mots veux-tu jouer ?',
    poolOwnLabel: 'Mes mots',
    poolOwnDesc: "Entraîne-toi avec les mots que tu apprends",
    poolGeneralLabel: 'Pool général',
    poolGeneralDesc: "Questions aléatoires issues d'un grand pool de mots",
    backBtn: 'Retour',
    startBtn: 'Démarrer le jeu',
    loadingLabel: 'Chargement…',
    genericError: 'Une erreur est survenue, réessaie.',
    ownEmptyError: "Tu n'as pas encore ajouté de mots. Ajoute d'abord quelques mots.",
    generalEmptyError: 'Aucun mot disponible dans le pool général pour cette paire de langues.',
    questionPrompt: 'Que signifie ce mot ?',
    questionPromptReverse: 'Quel mot correspond à ce sens ?',
    questionPromptDefinition: 'Quel mot correspond à cette définition ?',
    questionCounterTpl: 'Question {n}',
    scoreLabel: 'Score',
    xpLabel: 'XP',
    levelUpTpl: '🎉 Niveau {n} !',
    finishBtn: 'Terminer',
    correctLabel: 'Correct !',
    wrongLabel: 'Faux',
    doneTitle: 'Session terminée !',
    doneScoreTpl: '{correct}/{total} correctes',
    doneXpTpl: 'Tu as gagné +{xp} XP',
    playAgainBtn: 'Rejouer',
    backToDashboardBtn: 'Retour au tableau de bord',
    hangmanHintLabel: 'Indice (sens)',
    livesLabel: 'Vies',
    guessedLabel: 'Lettres essayées',
    wordleWonTitle: "Tu l'as trouvé ! 🎉",
    wordleLostTitle: 'Plus de vies',
    correctWordTpl: 'Mot correct : {word}',
    challengeModeHint: 'Tu joues cette partie pour un défi.',
    challengeSubmittedMsg: 'Ton score a été envoyé au défi !',
    challengeSubmitError: "Impossible d'envoyer le score — réessaie depuis la page Amis.",
    backToChallengesBtn: 'Retour aux défis',
  },
  es: {
    pageTitle: 'Juego de palabras',
    pageSubtitle: 'Elige un modo de juego y gana XP mientras aprendes palabras.',
    chooseModeTitle: '¿Cómo quieres jugar?',
    modeMultipleLabel: 'Opción múltiple',
    modeMultipleDesc: 'Elige el significado correcto entre 4 opciones',
    modeWordleLabel: 'Ahorcado',
    modeWordleDesc: 'Adivina la palabra letra por letra a partir de su significado',
    modeTypingLabel: 'Escritura',
    modeTypingDesc: 'Escribe la palabra a partir de su significado',
    typingPromptLabel: 'Escribe la palabra que corresponde a este significado',
    typingInputPlaceholder: 'Escribe la palabra…',
    typingCheckBtn: 'Comprobar',
    modeListeningLabel: 'Escucha',
    modeListeningDesc: 'Escucha la palabra y escribe lo que oyes',
    listeningPromptLabel: 'Escribe la palabra que escuchas',
    listeningPlayBtn: 'Reproducir',
    modeSprintLabel: 'Sprint',
    modeSprintDesc: 'Escribe tantas palabras como puedas antes de que se acabe el tiempo',
    sprintTimeLeftTpl: 'Tiempo restante: {s}s',
    sprintTimeUpTitle: '¡Se acabó el tiempo!',
    modeMatchingLabel: 'Emparejar',
    modeMatchingDesc: 'Empareja cada palabra con su significado',
    matchingPromptLabel: 'Empareja las palabras con sus significados',
    chooseDirectionTitle: '¿En qué dirección quieres practicar?',
    dirWordToMeaningLabel: 'Palabra → Significado',
    dirWordToMeaningDesc: 'Ve la palabra, elige el significado correcto',
    dirMeaningToWordLabel: 'Significado → Palabra',
    dirMeaningToWordDesc: 'Ve el significado, elige la palabra correcta (más difícil, más XP)',
    dirDefinitionToWordLabel: 'Definición → Palabra',
    dirDefinitionToWordDesc: 'Ve la definición en inglés, elige la palabra correcta (más difícil, más XP)',
    choosePoolTitle: '¿Con qué grupo de palabras quieres jugar?',
    poolOwnLabel: 'Mis palabras',
    poolOwnDesc: 'Practica con las palabras que estás aprendiendo',
    poolGeneralLabel: 'Grupo general',
    poolGeneralDesc: 'Preguntas aleatorias de un gran grupo de palabras',
    backBtn: 'Atrás',
    startBtn: 'Iniciar juego',
    loadingLabel: 'Cargando…',
    genericError: 'Algo salió mal, inténtalo de nuevo.',
    ownEmptyError: 'Aún no has añadido palabras. Añade algunas primero.',
    generalEmptyError: 'No hay palabras disponibles en el grupo general para este par de idiomas.',
    questionPrompt: '¿Qué significa esta palabra?',
    questionPromptReverse: '¿Qué palabra corresponde a este significado?',
    questionPromptDefinition: '¿Qué palabra corresponde a esta definición?',
    questionCounterTpl: 'Pregunta {n}',
    scoreLabel: 'Puntuación',
    xpLabel: 'XP',
    levelUpTpl: '🎉 ¡Nivel {n}!',
    finishBtn: 'Terminar',
    correctLabel: '¡Correcto!',
    wrongLabel: 'Incorrecto',
    doneTitle: '¡Sesión completada!',
    doneScoreTpl: '{correct}/{total} correctas',
    doneXpTpl: 'Ganaste +{xp} XP',
    playAgainBtn: 'Jugar de nuevo',
    backToDashboardBtn: 'Volver al panel',
    hangmanHintLabel: 'Pista (significado)',
    livesLabel: 'Vidas',
    guessedLabel: 'Letras probadas',
    wordleWonTitle: '¡La adivinaste! 🎉',
    wordleLostTitle: 'Sin vidas',
    correctWordTpl: 'Palabra correcta: {word}',
    challengeModeHint: 'Estás jugando esta partida para un desafío.',
    challengeSubmittedMsg: '¡Tu puntuación fue enviada al desafío!',
    challengeSubmitError: 'No se pudo enviar la puntuación — puedes reintentar desde la página de Amigos.',
    backToChallengesBtn: 'Volver a los desafíos',
  },
  it: {
    pageTitle: 'Gioco di parole',
    pageSubtitle: 'Scegli una modalità di gioco e guadagna XP imparando parole.',
    chooseModeTitle: 'Come vuoi giocare?',
    modeMultipleLabel: 'Scelta multipla',
    modeMultipleDesc: 'Scegli il significato corretto tra 4 opzioni',
    modeWordleLabel: 'Impiccato',
    modeWordleDesc: 'Indovina la parola lettera per lettera a partire dal suo significato',
    modeTypingLabel: 'Digitazione',
    modeTypingDesc: 'Scrivi la parola a partire dal suo significato',
    typingPromptLabel: 'Scrivi la parola che corrisponde a questo significato',
    typingInputPlaceholder: 'Scrivi la parola…',
    typingCheckBtn: 'Verifica',
    modeListeningLabel: 'Ascolto',
    modeListeningDesc: "Ascolta la parola e scrivi quello che senti",
    listeningPromptLabel: 'Scrivi la parola che senti',
    listeningPlayBtn: 'Riproduci',
    modeSprintLabel: 'Sprint',
    modeSprintDesc: 'Scrivi il maggior numero possibile di parole prima che scada il tempo',
    sprintTimeLeftTpl: 'Tempo rimanente: {s}s',
    sprintTimeUpTitle: 'Tempo scaduto!',
    modeMatchingLabel: 'Abbinamento',
    modeMatchingDesc: 'Abbina ogni parola al suo significato',
    matchingPromptLabel: 'Abbina le parole ai loro significati',
    chooseDirectionTitle: 'In quale direzione vuoi esercitarti?',
    dirWordToMeaningLabel: 'Parola → Significato',
    dirWordToMeaningDesc: 'Vedi la parola, scegli il significato corretto',
    dirMeaningToWordLabel: 'Significato → Parola',
    dirMeaningToWordDesc: 'Vedi il significato, scegli la parola corretta (più difficile, più XP)',
    dirDefinitionToWordLabel: 'Definizione → Parola',
    dirDefinitionToWordDesc: 'Vedi la definizione in inglese, scegli la parola corretta (più difficile, più XP)',
    choosePoolTitle: 'Con quale pool di parole vuoi giocare?',
    poolOwnLabel: 'Le mie parole',
    poolOwnDesc: 'Esercitati con le parole che stai imparando',
    poolGeneralLabel: 'Pool generale',
    poolGeneralDesc: 'Domande casuali da un ampio pool di parole',
    backBtn: 'Indietro',
    startBtn: 'Inizia il gioco',
    loadingLabel: 'Caricamento…',
    genericError: 'Qualcosa è andato storto, riprova.',
    ownEmptyError: 'Non hai ancora aggiunto parole. Aggiungi prima qualche parola.',
    generalEmptyError: 'Nessuna parola disponibile nel pool generale per questa coppia di lingue.',
    questionPrompt: 'Cosa significa questa parola?',
    questionPromptReverse: 'Quale parola corrisponde a questo significato?',
    questionPromptDefinition: 'Quale parola corrisponde a questa definizione?',
    questionCounterTpl: 'Domanda {n}',
    scoreLabel: 'Punteggio',
    xpLabel: 'XP',
    levelUpTpl: '🎉 Livello {n}!',
    finishBtn: 'Termina',
    correctLabel: 'Corretto!',
    wrongLabel: 'Sbagliato',
    doneTitle: 'Sessione completata!',
    doneScoreTpl: '{correct}/{total} corrette',
    doneXpTpl: 'Hai guadagnato +{xp} XP',
    playAgainBtn: 'Gioca ancora',
    backToDashboardBtn: 'Torna alla dashboard',
    hangmanHintLabel: 'Indizio (significato)',
    livesLabel: 'Vite',
    guessedLabel: 'Lettere provate',
    wordleWonTitle: "L'hai indovinata! 🎉",
    wordleLostTitle: 'Vite finite',
    correctWordTpl: 'Parola corretta: {word}',
    challengeModeHint: 'Stai giocando questa partita per una sfida.',
    challengeSubmittedMsg: 'Il tuo punteggio è stato inviato alla sfida!',
    challengeSubmitError: 'Impossibile inviare il punteggio — riprova dalla pagina Amici.',
    backToChallengesBtn: 'Torna alle sfide',
  },
  ja: {
    pageTitle: '単語ゲーム',
    pageSubtitle: 'ゲームモードを選んで、単語を学びながらXPを獲得しよう。',
    chooseModeTitle: 'どうやって遊びますか?',
    modeMultipleLabel: '四択',
    modeMultipleDesc: '4つの選択肢から正しい意味を選ぶ',
    modeWordleLabel: 'ハングマン',
    modeWordleDesc: '意味をヒントに一文字ずつ単語を当てる',
    modeTypingLabel: 'タイピング',
    modeTypingDesc: '意味を見て単語を入力する',
    typingPromptLabel: 'この意味に合う単語を入力してください',
    typingInputPlaceholder: '単語を入力…',
    typingCheckBtn: '確認',
    modeListeningLabel: 'リスニング',
    modeListeningDesc: '単語を聞いて、聞こえたとおりに入力する',
    listeningPromptLabel: '聞こえた単語を入力してください',
    listeningPlayBtn: '再生',
    modeSprintLabel: 'スプリント',
    modeSprintDesc: '時間切れになる前にできるだけ多くの単語を入力しよう',
    sprintTimeLeftTpl: '残り時間: {s}秒',
    sprintTimeUpTitle: '時間切れです!',
    modeMatchingLabel: 'マッチング',
    modeMatchingDesc: '単語とその意味を結びつける',
    matchingPromptLabel: '単語をその意味と結びつけてください',
    chooseDirectionTitle: 'どの方向で練習しますか?',
    dirWordToMeaningLabel: '単語 → 意味',
    dirWordToMeaningDesc: '単語を見て正しい意味を選ぶ',
    dirMeaningToWordLabel: '意味 → 単語',
    dirMeaningToWordDesc: '意味を見て正しい単語を選ぶ(難しい、獲得XPアップ)',
    dirDefinitionToWordLabel: '定義 → 単語',
    dirDefinitionToWordDesc: '英語の定義を見て正しい単語を選ぶ(最も難しい、獲得XP最大)',
    choosePoolTitle: 'どの単語プールで遊びますか?',
    poolOwnLabel: '自分の単語',
    poolOwnDesc: '学習中の単語で練習する',
    poolGeneralLabel: '一般プール',
    poolGeneralDesc: '大きな単語プールからランダムに出題',
    backBtn: '戻る',
    startBtn: 'ゲーム開始',
    loadingLabel: '読み込み中…',
    genericError: '問題が発生しました。もう一度お試しください。',
    ownEmptyError: 'まだ単語を追加していません。まず単語をいくつか追加してください。',
    generalEmptyError: 'この言語ペアの一般プールに単語がありません。',
    questionPrompt: 'この単語の意味は?',
    questionPromptReverse: 'この意味に合う単語はどれ?',
    questionPromptDefinition: 'この定義に合う単語はどれ?',
    questionCounterTpl: '問題 {n}',
    scoreLabel: 'スコア',
    xpLabel: 'XP',
    levelUpTpl: '🎉 レベル{n}!',
    finishBtn: '終了',
    correctLabel: '正解!',
    wrongLabel: '不正解',
    doneTitle: 'セッション完了!',
    doneScoreTpl: '{correct}/{total} 正解',
    doneXpTpl: '+{xp} XP 獲得しました',
    playAgainBtn: 'もう一度プレイ',
    backToDashboardBtn: 'ダッシュボードに戻る',
    hangmanHintLabel: 'ヒント(意味)',
    livesLabel: 'ライフ',
    guessedLabel: '入力した文字',
    wordleWonTitle: '正解です! 🎉',
    wordleLostTitle: 'ライフがなくなりました',
    correctWordTpl: '正解の単語: {word}',
    challengeModeHint: 'これはチャレンジのためのプレイです。',
    challengeSubmittedMsg: 'スコアをチャレンジに送信しました!',
    challengeSubmitError: 'スコアを送信できませんでした — フレンドページから再試行できます。',
    backToChallengesBtn: 'チャレンジに戻る',
  },
  pt: {
    pageTitle: 'Jogo de Palavras',
    pageSubtitle: 'Escolhe um modo de jogo e ganha XP enquanto aprendes palavras.',
    chooseModeTitle: 'Como queres jogar?',
    modeMultipleLabel: 'Escolha Múltipla',
    modeMultipleDesc: 'Escolhe o significado certo entre 4 opções',
    modeWordleLabel: 'Forca',
    modeWordleDesc: 'Adivinha a palavra letra a letra a partir do seu significado',
    modeTypingLabel: 'Digitação',
    modeTypingDesc: 'Escreve a palavra a partir do seu significado',
    typingPromptLabel: 'Escreve a palavra que corresponde a este significado',
    typingInputPlaceholder: 'Escreve a palavra…',
    typingCheckBtn: 'Verificar',
    modeListeningLabel: 'Audição',
    modeListeningDesc: 'Ouve a palavra e escreve o que ouviste',
    listeningPromptLabel: 'Escreve a palavra que ouviste',
    listeningPlayBtn: 'Reproduzir',
    modeSprintLabel: 'Sprint',
    modeSprintDesc: 'Escreve o máximo de palavras possível antes que o tempo acabe',
    sprintTimeLeftTpl: 'Tempo restante: {s}s',
    sprintTimeUpTitle: 'Tempo esgotado!',
    modeMatchingLabel: 'Correspondência',
    modeMatchingDesc: 'Associa cada palavra ao seu significado',
    matchingPromptLabel: 'Associa as palavras aos seus significados',
    chooseDirectionTitle: 'Em que direção queres praticar?',
    dirWordToMeaningLabel: 'Palavra → Significado',
    dirWordToMeaningDesc: 'Vê a palavra, escolhe o significado certo',
    dirMeaningToWordLabel: 'Significado → Palavra',
    dirMeaningToWordDesc: 'Vê o significado, escolhe a palavra certa (mais difícil, mais XP)',
    dirDefinitionToWordLabel: 'Definição → Palavra',
    dirDefinitionToWordDesc: 'Vê a definição em inglês, escolhe a palavra certa (o mais difícil, XP máximo)',
    choosePoolTitle: 'Com que conjunto de palavras queres jogar?',
    poolOwnLabel: 'As Minhas Palavras',
    poolOwnDesc: 'Pratica com as palavras que estás a aprender',
    poolGeneralLabel: 'Conjunto Geral',
    poolGeneralDesc: 'Perguntas aleatórias de um grande conjunto de palavras',
    backBtn: 'Voltar',
    startBtn: 'Começar Jogo',
    loadingLabel: 'A carregar…',
    genericError: 'Algo correu mal, tenta novamente.',
    ownEmptyError: 'Ainda não adicionaste nenhuma palavra. Adiciona algumas palavras primeiro.',
    generalEmptyError: 'Não há palavras disponíveis no conjunto geral para este par de idiomas.',
    questionPrompt: 'O que significa esta palavra?',
    questionPromptReverse: 'Que palavra corresponde a este significado?',
    questionPromptDefinition: 'Que palavra corresponde a esta definição?',
    questionCounterTpl: 'Pergunta {n}',
    scoreLabel: 'Pontuação',
    xpLabel: 'XP',
    levelUpTpl: '🎉 Nível {n}!',
    finishBtn: 'Terminar',
    correctLabel: 'Correto!',
    wrongLabel: 'Errado',
    doneTitle: 'Sessão Concluída!',
    doneScoreTpl: '{correct}/{total} corretas',
    doneXpTpl: 'Ganhaste +{xp} XP',
    playAgainBtn: 'Jogar Novamente',
    backToDashboardBtn: 'Voltar ao Painel',
    hangmanHintLabel: 'Dica (significado)',
    livesLabel: 'Vidas',
    guessedLabel: 'Letras tentadas',
    wordleWonTitle: 'Conseguiste! 🎉',
    wordleLostTitle: 'Sem vidas',
    correctWordTpl: 'Palavra correta: {word}',
    challengeModeHint: 'Estás a jogar este jogo para um desafio.',
    challengeSubmittedMsg: 'A tua pontuação foi enviada para o desafio!',
    challengeSubmitError: 'Não foi possível enviar a tua pontuação — podes tentar novamente na página Amigos.',
    backToChallengesBtn: 'Voltar aos Desafios',
  },
};

const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// Eşleştirme (matching) modunda kart sırasını karıştırmak için basit
// Fisher-Yates — orijinal diziyi bozmadan yeni bir dizi döndürür.
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MATCHING_BATCH_SIZE = 4;

type MatchingItem = {
  uid: string;
  word: string;
  meaning: string;
  word_id?: string;
  general_word_id?: string;
};

type Stage = 'mode' | 'direction' | 'setup' | 'loading' | 'playing' | 'error' | 'done';

export default function GamePage() {
  const { locale } = useLocale();
  const t = STRINGS[locale];
  const searchParams = useSearchParams();

  // Madde 6, Faz 3 — Meydan okuma (challenge) entegrasyonu. Yeni bir oyun
  // akışı yok: /game?challengeId=...&mode=... ile açılınca mod seçimi
  // atlanır (challenge'ın modu zorunlu), oyun normal şekilde oynanır,
  // bitince bitmiş session otomatik olarak challenge'a "sonucum bu" diye
  // gönderilir (bkz. challenge_service.submit_score).
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeSubmitted, setChallengeSubmitted] = useState(false);
  const [challengeSubmitError, setChallengeSubmitError] = useState('');
  // loadNext/handleFinish, mount sırasında useCallback([]) ile bir kez
  // memoize ediliyor (bkz. aşağıdaki eslint-disable'lar) — bu yüzden
  // challengeId/challengeSubmitted state'lerini DEĞİL, her zaman güncel
  // olan ref'leri okuyoruz; aksi halde ilk render'daki (henüz null olan)
  // challengeId closure'a "donmuş" olarak takılır ve gönderim hiç
  // çalışmazdı.
  const challengeIdRef = useRef<string | null>(null);
  const challengeSubmittedRef = useRef(false);

  const [stage, setStage] = useState<Stage>('mode');
  const [gameMode, setGameMode] = useState<GameMode>('multiple_choice');
  const [direction, setDirection] = useState<Direction>('word_to_meaning');
  const [poolSource, setPoolSource] = useState<PoolSource>('general');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState<NextWordResult | null>(null);

  // ── çoktan seçmeli state ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);

  // ── adam asmaca state ──
  const [revealed, setRevealed] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [maxWrongGuesses, setMaxWrongGuesses] = useState(6);
  const [roundResult, setRoundResult] = useState<'won' | 'lost' | null>(null);
  const [revealedWord, setRevealedWord] = useState<string | null>(null);
  const [letterBusy, setLetterBusy] = useState(false);

  // ── yazma (typing) state — dinleme ve sprint modları da bunu paylaşır,
  // çünkü doğruluk kontrolü üçünde de aynı: current.word ile karşılaştırma ──
  const [typedAnswer, setTypedAnswer] = useState('');
  const [typingResult, setTypingResult] = useState<'correct' | 'wrong' | null>(null);

  // ── sprint state — tüm oturum için tek bir geri sayım ──
  const [sprintSecondsLeft, setSprintSecondsLeft] = useState(60);
  const sprintTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const SPRINT_DURATION_SECS = 60;

  // ── eşleştirme (matching) state — tek seferde birden fazla kelime çekilip
  // iki sütun halinde gösterilir, kullanıcı kelime + anlam çiftini tıklayarak
  // eşleştirir. Backend next-word endpoint'i tek tek çağrılarak havuz
  // dolduruluyor (bkz. loadMatchingBatch) — ek bir backend değişikliği yok. ──
  const [matchingItems, setMatchingItems] = useState<MatchingItem[]>([]);
  const [matchingWordSlots, setMatchingWordSlots] = useState<string[]>([]);
  const [matchingMeaningSlots, setMatchingMeaningSlots] = useState<string[]>([]);
  const [matchedUids, setMatchedUids] = useState<string[]>([]);
  const [selectedWordUid, setSelectedWordUid] = useState<string | null>(null);
  const [selectedMeaningUid, setSelectedMeaningUid] = useState<string | null>(null);
  const [wrongPairFlash, setWrongPairFlash] = useState<{ w: string; m: string } | null>(null);

  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [questionNum, setQuestionNum] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [finishResult, setFinishResult] = useState<GameFinishResult | null>(null);

  // URL'den challenge parametrelerini oku — varsa mod seçimi atlanır ve
  // challenge'ın modu zorunlu kılınır (bkz. friends/page.tsx "Oyna" butonu).
  useEffect(() => {
    const cid = searchParams.get('challengeId');
    const modeParam = searchParams.get('mode') as GameMode | null;
    if (!cid || !modeParam) return;
    challengeIdRef.current = cid;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount/parametre değişiminde veri çekme (fetch-on-effect) deseni; senkron setState çağrısı kasıtlı, davranış değiştirilmedi
    setChallengeId(cid);
    setGameMode(modeParam);
    if (modeParam === 'wordle') {
      setDirection('meaning_to_word');
      setStage('setup');
    } else {
      setStage('direction');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bitmiş bir oyun oturumunu challenge'a "sonucum bu" diye gönder —
  // sadece challengeId varsa ve daha önce gönderilmediyse çalışır.
  const submitChallengeIfNeeded = useCallback(async (sid: string) => {
    const cid = challengeIdRef.current;
    if (!cid || challengeSubmittedRef.current) return;
    try {
      await socialApi.submitChallengeScore(cid, sid);
      challengeSubmittedRef.current = true;
      setChallengeSubmitted(true);
    } catch {
      setChallengeSubmitError(t.challengeSubmitError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNext = useCallback(async (sid: string, hadAnswered: boolean, pool: PoolSource) => {
    try {
      const nw = await gamesApi.nextWord(sid);
      if (nw.finished) {
        if (!hadAnswered) {
          setErrorMsg(pool === 'own' ? t.ownEmptyError : t.generalEmptyError);
          setStage('error');
          return;
        }
        try {
          const res = await gamesApi.finishSession(sid);
          setFinishResult(res);
        } catch {
          /* sessiz */
        }
        await submitChallengeIfNeeded(sid);
        setStage('done');
        return;
      }
      setCurrent(nw);
      setSelectedId(null);
      setFeedback(null);
      setRevealed(nw.revealed ?? '');
      setGuessedLetters([]);
      setWrongGuesses(0);
      setMaxWrongGuesses(nw.max_wrong_guesses ?? 6);
      setRoundResult(null);
      setRevealedWord(null);
      setTypedAnswer('');
      setTypingResult(null);
      setQuestionNum((n) => n + 1);
      setStage('playing');
    } catch {
      setErrorMsg(t.genericError);
      setStage('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── eşleştirme (matching) — tek next-word yerine MATCHING_BATCH_SIZE kadar
  // kelimeyi arka arkaya çekip bir "tur" oluşturur. Havuz biterse (nw.finished)
  // ve elimizde hiç kelime yoksa loadNext'teki ile aynı boş-havuz hatası
  // gösterilir; en az bir kelime toplandıysa elimizdekiyle devam edilir.
  //
  // ÖNEMLİ: backend next-word, bir kelimeyi sadece o kelime için gerçek bir
  // "attempt" (games.py -> submit_attempt) kaydedilince havuzdan çıkarıyor
  // (bkz. _attempted_ids). Aynı anda birden fazla next-word çağrısı arasında
  // henüz attempt gönderilmediği için havuz küçükse (ör. test hesaplarındaki
  // 4 kelimelik "own" havuzu) random.choice aynı kelimeyi birden fazla kez
  // seçebilir. Bu yüzden burada word_id/general_word_id'ye göre istemci
  // tarafında tekilleştirme yapılıyor; tekrar gelirse atlanıp yeniden çekiliyor
  // (üst sınır: MATCHING_BATCH_SIZE'ın birkaç katı deneme). ──
  const loadMatchingBatch = useCallback(async (sid: string, hadAnswered: boolean, pool: PoolSource) => {
    setStage('loading');
    try {
      const items: MatchingItem[] = [];
      const seenKeys = new Set<string>();
      const maxTries = MATCHING_BATCH_SIZE * 6;
      let tries = 0;
      while (items.length < MATCHING_BATCH_SIZE && tries < maxTries) {
        tries++;
        const nw = await gamesApi.nextWord(sid);
        if (nw.finished) break;
        const key = nw.word_id ?? nw.general_word_id ?? null;
        if (key && seenKeys.has(key)) continue; // aynı turda zaten var, atla
        if (key) seenKeys.add(key);
        items.push({
          uid: `${items.length}-${key ?? 'x'}-${Math.random().toString(36).slice(2)}`,
          word: nw.word ?? '',
          meaning: nw.meaning ?? '',
          word_id: nw.word_id ?? undefined,
          general_word_id: nw.general_word_id ?? undefined,
        });
      }
      if (items.length === 0) {
        if (!hadAnswered) {
          setErrorMsg(pool === 'own' ? t.ownEmptyError : t.generalEmptyError);
          setStage('error');
          return;
        }
        try {
          const res = await gamesApi.finishSession(sid);
          setFinishResult(res);
        } catch {
          /* sessiz */
        }
        await submitChallengeIfNeeded(sid);
        setStage('done');
        return;
      }
      setMatchingItems(items);
      setMatchedUids([]);
      setSelectedWordUid(null);
      setSelectedMeaningUid(null);
      setWrongPairFlash(null);
      setMatchingWordSlots(shuffleArray(items.map((it) => it.uid)));
      setMatchingMeaningSlots(shuffleArray(items.map((it) => it.uid)));
      setQuestionNum((n) => n + items.length);
      setStage('playing');
    } catch {
      setErrorMsg(t.genericError);
      setStage('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async (mode: GameMode, pool: PoolSource, dir: Direction) => {
    setGameMode(mode);
    setPoolSource(pool);
    setStage('loading');
    setErrorMsg('');
    setScore(0);
    setXpEarned(0);
    setQuestionNum(0);
    setLevelUp(null);
    setFinishResult(null);
    if (mode === 'sprint') setSprintSecondsLeft(SPRINT_DURATION_SECS);
    if (mode === 'matching') {
      setMatchingItems([]);
      setMatchedUids([]);
      setSelectedWordUid(null);
      setSelectedMeaningUid(null);
      setWrongPairFlash(null);
      setMatchingWordSlots([]);
      setMatchingMeaningSlots([]);
    }
    try {
      const session = await gamesApi.createSession(mode, pool, dir);
      setSessionId(session.id);
      if (mode === 'matching') {
        await loadMatchingBatch(session.id, false, pool);
      } else {
        await loadNext(session.id, false, pool);
      }
    } catch {
      setErrorMsg(t.genericError);
      setStage('error');
    }
  };

  // ── çoktan seçmeli cevap (yöne göre doğru metin değişir) ──
  const handleAnswer = async (optionId: string, optionText: string) => {
    if (selectedId || !current || !sessionId) return;
    setSelectedId(optionId);
    const currentDirection = current.direction ?? direction;
    const correctText =
      currentDirection === 'meaning_to_word' || currentDirection === 'definition_to_word'
        ? current.word
        : current.meaning;
    const isCorrect = optionText === correctText;
    setFeedback(isCorrect);
    try {
      const res = await gamesApi.submitAttempt(sessionId, {
        word_id: current.word_id ?? undefined,
        general_word_id: current.general_word_id ?? undefined,
        is_correct: isCorrect,
      });
      setScore(res.session_score);
      setXpEarned((x) => x + res.xp_awarded);
      if (res.leveled_up) setLevelUp(res.new_level);
    } catch {
      /* sessiz */
    }

    setTimeout(() => {
      loadNext(sessionId, true, poolSource);
    }, 900);
  };

  // ── yazma (typing) cevap kontrolü — doğruluk istemci tarafında belirlenir,
  // aynı multiple_choice'ta olduğu gibi (backend next-word yanıtında zaten
  // doğru kelimeyi düz metin olarak döndürüyor, bkz. games.py). ──
  const handleTypingSubmit = async () => {
    if (typingResult || !current || !sessionId || !typedAnswer.trim()) return;
    const correctWord = (current.word ?? '').trim().toLocaleLowerCase();
    const isCorrect = typedAnswer.trim().toLocaleLowerCase() === correctWord;
    setTypingResult(isCorrect ? 'correct' : 'wrong');
    try {
      const res = await gamesApi.submitAttempt(sessionId, {
        word_id: current.word_id ?? undefined,
        general_word_id: current.general_word_id ?? undefined,
        is_correct: isCorrect,
      });
      setScore(res.session_score);
      setXpEarned((x) => x + res.xp_awarded);
      if (res.leveled_up) setLevelUp(res.new_level);
    } catch {
      /* sessiz */
    }

    setTimeout(
      () => {
        loadNext(sessionId, true, poolSource);
      },
      isCorrect ? 900 : 1600
    );
  };

  // ── dinleme (listening) — kelimeyi tarayıcının SpeechSynthesis API'siyle
  // sesli okur. Dil kodu şimdilik verilmiyor (tarayıcı varsayılan/otomatik
  // algılama sesini kullanır); ileride NextWordResult'a öğrenilen dilin
  // BCP-47 kodu eklenirse utter.lang'a bağlanabilir. ──
  const speakWord = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utter);
    } catch {
      /* sessiz — tarayıcı TTS desteklemiyor olabilir */
    }
  }, []);

  // ── eşleştirme (matching) — kelime/anlam çifti tıklanınca kontrol ──
  const attemptMatch = useCallback(
    async (wordUid: string, meaningUid: string) => {
      if (wordUid === meaningUid) {
        const newMatched = [...matchedUids, wordUid];
        setMatchedUids(newMatched);
        setSelectedWordUid(null);
        setSelectedMeaningUid(null);
        setScore((s) => s + 1);
        const item = matchingItems.find((it) => it.uid === wordUid);
        if (sessionId && item) {
          try {
            const res = await gamesApi.submitAttempt(sessionId, {
              word_id: item.word_id,
              general_word_id: item.general_word_id,
              is_correct: true,
            });
            setXpEarned((x) => x + res.xp_awarded);
            if (res.leveled_up) setLevelUp(res.new_level);
          } catch {
            /* sessiz */
          }
        }
        if (newMatched.length === matchingItems.length && sessionId) {
          setTimeout(() => loadMatchingBatch(sessionId, true, poolSource), 600);
        }
      } else {
        setWrongPairFlash({ w: wordUid, m: meaningUid });
        setTimeout(() => {
          setWrongPairFlash(null);
          setSelectedWordUid(null);
          setSelectedMeaningUid(null);
        }, 600);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchedUids, matchingItems, sessionId, poolSource]
  );

  const handleMatchWordClick = (uid: string) => {
    if (matchedUids.includes(uid) || wrongPairFlash) return;
    setSelectedWordUid(uid);
    if (selectedMeaningUid) {
      attemptMatch(uid, selectedMeaningUid);
    }
  };

  const handleMatchMeaningClick = (uid: string) => {
    if (matchedUids.includes(uid) || wrongPairFlash) return;
    setSelectedMeaningUid(uid);
    if (selectedWordUid) {
      attemptMatch(selectedWordUid, uid);
    }
  };

  // ── adam asmaca harf tahmini ──
  const handleGuessLetter = async (letter: string) => {
    if (letterBusy || roundResult || !sessionId || guessedLetters.includes(letter)) return;
    setLetterBusy(true);
    try {
      const res: GuessLetterResult = await gamesApi.guessLetter(sessionId, letter);
      setRevealed(res.revealed);
      setGuessedLetters(res.guessed_letters);
      setWrongGuesses(res.wrong_guesses);
      setMaxWrongGuesses(res.max_wrong_guesses);
      setXpEarned((x) => x + res.xp_awarded);
      if (res.leveled_up) setLevelUp(res.new_level);

      if (res.is_complete) {
        setScore((s) => s + 1);
        setRoundResult('won');
        setRevealedWord(res.word ?? null);
        setTimeout(() => {
          if (sessionId) loadNext(sessionId, true, poolSource);
        }, 1400);
      } else if (res.is_game_over) {
        setRoundResult('lost');
        setRevealedWord(res.word ?? null);
        setTimeout(() => {
          if (sessionId) loadNext(sessionId, true, poolSource);
        }, 1800);
      }
    } catch {
      /* sessiz */
    } finally {
      setLetterBusy(false);
    }
  };

  const handleFinish = async () => {
    if (!sessionId) return;
    if (sprintTimerRef.current) {
      clearInterval(sprintTimerRef.current);
      sprintTimerRef.current = null;
    }
    setStage('loading');
    try {
      const res = await gamesApi.finishSession(sessionId);
      setFinishResult(res);
    } catch {
      /* sessiz */
    }
    await submitChallengeIfNeeded(sessionId);
    setStage('done');
  };

  // ── sprint geri sayımı — 'playing' aşamasına girince başlar, süre 0'a
  // inince oturumu otomatik bitirir. Sekme değişince/oyun bitince temizlenir. ──
  useEffect(() => {
    if (gameMode !== 'sprint' || stage !== 'playing') return;
    if (sprintTimerRef.current) return;
    sprintTimerRef.current = setInterval(() => {
      setSprintSecondsLeft((s) => {
        if (s <= 1) {
          if (sprintTimerRef.current) {
            clearInterval(sprintTimerRef.current);
            sprintTimerRef.current = null;
          }
          handleFinish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (sprintTimerRef.current) {
        clearInterval(sprintTimerRef.current);
        sprintTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, stage]);

  // ── dinleme (listening) — her yeni kelimede otomatik bir kez seslendir ──
  useEffect(() => {
    if (gameMode === 'listening' && stage === 'playing' && current?.word) {
      speakWord(current.word);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, stage, current?.word]);

  // ── Mod seçimi ──
  if (stage === 'mode') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-7 h-7 text-[#534AB7]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-6">{t.pageSubtitle}</p>
          <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3 text-left">
            {t.chooseModeTitle}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setGameMode('multiple_choice');
                setStage('direction');
              }}
              className="w-full flex items-center gap-3 text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#E6F1FB] flex items-center justify-center">
                <ListChecks className="w-4 h-4 text-[#378ADD]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.modeMultipleLabel}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.modeMultipleDesc}</p>
              </div>
            </button>
            <button
              onClick={() => {
                setGameMode('wordle');
                setDirection('meaning_to_word');
                setStage('setup');
              }}
              className="w-full flex items-center gap-3 text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#FAEEDA] flex items-center justify-center">
                <Keyboard className="w-4 h-4 text-[#854F0B]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.modeWordleLabel}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.modeWordleDesc}</p>
              </div>
            </button>
            <button
              onClick={() => {
                setGameMode('typing');
                setDirection('meaning_to_word');
                setStage('setup');
              }}
              className="w-full flex items-center gap-3 text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#FDEAF0] flex items-center justify-center">
                <TypeIcon className="w-4 h-4 text-[#9F1D53]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.modeTypingLabel}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.modeTypingDesc}</p>
              </div>
            </button>
            <button
              onClick={() => {
                setGameMode('listening');
                setDirection('meaning_to_word');
                setStage('setup');
              }}
              className="w-full flex items-center gap-3 text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#E6F1FB] flex items-center justify-center">
                <Ear className="w-4 h-4 text-[#378ADD]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.modeListeningLabel}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.modeListeningDesc}</p>
              </div>
            </button>
            <button
              onClick={() => {
                setGameMode('sprint');
                setDirection('meaning_to_word');
                setSprintSecondsLeft(SPRINT_DURATION_SECS);
                setStage('setup');
              }}
              className="w-full flex items-center gap-3 text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#FFF1D6] flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#9A6400]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.modeSprintLabel}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.modeSprintDesc}</p>
              </div>
            </button>
            <button
              onClick={() => {
                setGameMode('matching');
                setDirection('meaning_to_word');
                setStage('setup');
              }}
              className="w-full flex items-center gap-3 text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#E4F5EA] flex items-center justify-center">
                <Shuffle className="w-4 h-4 text-[#1D7A46]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.modeMatchingLabel}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.modeMatchingDesc}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Yön seçimi (sadece çoktan seçmeli) ──
  if (stage === 'direction') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="w-7 h-7 text-[#534AB7]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-6">{t.chooseDirectionTitle}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setDirection('word_to_meaning');
                setStage('setup');
              }}
              className="w-full text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.dirWordToMeaningLabel}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.dirWordToMeaningDesc}</p>
            </button>
            <button
              onClick={() => {
                setDirection('meaning_to_word');
                setStage('setup');
              }}
              className="w-full text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.dirMeaningToWordLabel}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.dirMeaningToWordDesc}</p>
            </button>
            <button
              onClick={() => {
                setDirection('definition_to_word');
                setStage('setup');
              }}
              className="w-full text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.dirDefinitionToWordLabel}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.dirDefinitionToWordDesc}</p>
            </button>
          </div>
          <button
            onClick={() => setStage('mode')}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 hover:dark:text-slate-400 mt-5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t.backBtn}
          </button>
        </div>
      </div>
    );
  }

  // ── Havuz seçimi / Yükleniyor ──
  if (stage === 'setup' || stage === 'loading') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-7 h-7 text-[#534AB7]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.pageTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-6">{t.choosePoolTitle}</p>

          {stage === 'loading' ? (
            <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500 py-6">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">{t.loadingLabel}</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => start(gameMode, 'general', direction)}
                  className="w-full text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.poolGeneralLabel}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.poolGeneralDesc}</p>
                </button>
                {direction !== 'definition_to_word' && (
                  <button
                    onClick={() => start(gameMode, 'own', direction)}
                    className="w-full text-left border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
                  >
                    <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{t.poolOwnLabel}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{t.poolOwnDesc}</p>
                  </button>
                )}
              </div>
              <button
                onClick={() => setStage(gameMode === 'multiple_choice' ? 'direction' : 'mode')}
                className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 hover:dark:text-slate-400 mt-5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {t.backBtn}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Hata ──
  if (stage === 'error') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="bg-[#FAEEDA] text-[#854F0B] rounded-2xl px-4 py-3 text-sm max-w-md text-center">
          {errorMsg}
        </div>
        <button
          onClick={() => setStage('mode')}
          className="flex items-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {t.playAgainBtn}
        </button>
      </div>
    );
  }

  // ── Bitti ──
  if (stage === 'done') {
    const total = finishResult?.word_count ?? questionNum;
    const correct = finishResult?.correct_count ?? score;
    const xp = finishResult?.xp_earned ?? xpEarned;
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-10 flex flex-col items-center gap-5 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#EAF3DE]">
            <Trophy className="w-8 h-8 text-[#3B6D11]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t.doneTitle}</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              {t.doneScoreTpl.replace('{correct}', String(correct)).replace('{total}', String(total))}
            </p>
          </div>
          <div className="w-full rounded-xl p-4 bg-[#EEEDFE] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#534AB7]" />
            <p className="text-sm font-semibold text-[#534AB7]">{t.doneXpTpl.replace('{xp}', String(xp))}</p>
          </div>

          {challengeId && (
            <div
              className={`w-full rounded-xl p-3 text-xs font-medium text-center ${
                challengeSubmitError
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                  : challengeSubmitted
                    ? 'bg-[#EAF3DE] text-[#3B6D11]'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-slate-500'
              }`}
            >
              {challengeSubmitError || (challengeSubmitted ? t.challengeSubmittedMsg : t.challengeModeHint)}
            </div>
          )}

          <div className="w-full flex flex-col gap-2">
            <button
              onClick={() => setStage('mode')}
              className="w-full flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-3 text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t.playAgainBtn}
            </button>
            {challengeId ? (
              <Link href="/friends" className="w-full text-center text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 hover:dark:text-slate-300 py-2">
                {t.backToChallengesBtn}
              </Link>
            ) : (
              <Link href="/dashboard" className="w-full text-center text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 hover:dark:text-slate-300 py-2">
                {t.backToDashboardBtn}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Oynanış: eşleştirme (matching) — current tekil kelime state'i
  // kullanmıyor (matchingItems kullanıyor), bu yüzden tamamen ayrı, erken
  // bir return olarak ele alınıyor; böylece aşağıdaki `current` null-check'i
  // diğer tüm modlar için temiz kalıyor. ──
  if (gameMode === 'matching') {
    if (matchingItems.length === 0) return null;
    return (
      <div className="p-6 flex flex-col items-center gap-6 max-w-xl mx-auto">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EEEDFE] flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-[#534AB7]" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
              {t.questionCounterTpl.replace('{n}', String(questionNum))}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1 text-[#3B6D11]">
              <span className="w-2 h-2 rounded-full bg-[#3B6D11] inline-block" />
              {t.scoreLabel}: {score}
            </span>
            <span className="flex items-center gap-1 text-[#534AB7]">
              <Sparkles className="w-3 h-3" />
              {xpEarned} {t.xpLabel}
            </span>
          </div>
        </div>

        {levelUp !== null && (
          <div className="w-full bg-[#EEEDFE] text-[#534AB7] rounded-xl px-4 py-2 text-sm font-semibold text-center">
            {t.levelUpTpl.replace('{n}', String(levelUp))}
          </div>
        )}

        <p className="w-full text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center">
          {t.matchingPromptLabel}
        </p>

        <div className="w-full grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            {matchingWordSlots.map((uid) => {
              const item = matchingItems.find((it) => it.uid === uid);
              if (!item) return null;
              const isMatched = matchedUids.includes(uid);
              const isSelected = selectedWordUid === uid;
              const isWrong = wrongPairFlash?.w === uid;
              let cls = 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#378ADD] hover:bg-[#E6F1FB]';
              if (isMatched) cls = 'border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11] opacity-60 cursor-default';
              else if (isWrong) cls = 'border-red-400 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
              else if (isSelected) cls = 'border-[#378ADD] bg-[#E6F1FB] text-[#378ADD]';
              return (
                <button
                  key={uid}
                  onClick={() => handleMatchWordClick(uid)}
                  disabled={isMatched}
                  className={`w-full border-2 rounded-xl px-3 py-3 text-sm font-medium transition-all ${cls}`}
                >
                  {item.word}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2">
            {matchingMeaningSlots.map((uid) => {
              const item = matchingItems.find((it) => it.uid === uid);
              if (!item) return null;
              const isMatched = matchedUids.includes(uid);
              const isSelected = selectedMeaningUid === uid;
              const isWrong = wrongPairFlash?.m === uid;
              let cls = 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#378ADD] hover:bg-[#E6F1FB]';
              if (isMatched) cls = 'border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11] opacity-60 cursor-default';
              else if (isWrong) cls = 'border-red-400 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
              else if (isSelected) cls = 'border-[#378ADD] bg-[#E6F1FB] text-[#378ADD]';
              return (
                <button
                  key={uid}
                  onClick={() => handleMatchMeaningClick(uid)}
                  disabled={isMatched}
                  className={`w-full border-2 rounded-xl px-3 py-3 text-sm font-medium transition-all ${cls}`}
                >
                  {item.meaning}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={handleFinish} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 hover:dark:text-slate-400 underline">
          {t.finishBtn}
        </button>
      </div>
    );
  }

  // ── Oynanış: diğer modlar ──
  if (!current) return null;

  const isWordle = gameMode === 'wordle';
  const isTyping = gameMode === 'typing';
  const isListening = gameMode === 'listening';
  const isSprint = gameMode === 'sprint';
  const isMultipleChoice = gameMode === 'multiple_choice';
  const activeDirection = current.direction ?? direction;
  const isDefinition = activeDirection === 'definition_to_word';
  const isReverse = !isWordle && (activeDirection === 'meaning_to_word' || isDefinition);

  return (
    <div className="p-6 flex flex-col items-center gap-6 max-w-xl mx-auto">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EEEDFE] flex items-center justify-center">
            <Gamepad2 className="w-4 h-4 text-[#534AB7]" />
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
            {t.questionCounterTpl.replace('{n}', String(questionNum))}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1 text-[#3B6D11]">
            <span className="w-2 h-2 rounded-full bg-[#3B6D11] inline-block" />
            {t.scoreLabel}: {score}
          </span>
          <span className="flex items-center gap-1 text-[#534AB7]">
            <Sparkles className="w-3 h-3" />
            {xpEarned} {t.xpLabel}
          </span>
          {isSprint && (
            <span className="flex items-center gap-1 text-[#9A6400]">
              <Zap className="w-3 h-3" />
              {t.sprintTimeLeftTpl.replace('{s}', String(sprintSecondsLeft))}
            </span>
          )}
        </div>
      </div>

      {levelUp !== null && (
        <div className="w-full bg-[#EEEDFE] text-[#534AB7] rounded-xl px-4 py-2 text-sm font-semibold text-center">
          {t.levelUpTpl.replace('{n}', String(levelUp))}
        </div>
      )}

      {isMultipleChoice && (
        <>
          <div className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-8 text-center">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
              {isDefinition ? t.questionPromptDefinition : isReverse ? t.questionPromptReverse : t.questionPrompt}
            </p>
            <p className="text-4xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              {isReverse ? current.meaning : current.word}
            </p>
            {!isReverse && current.example && (
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-3 italic">&ldquo;{current.example}&rdquo;</p>
            )}
          </div>

          <div className="w-full grid grid-cols-1 gap-3">
            {(current.options || []).map((opt) => {
              const correctText = isReverse ? current.word : current.meaning;
              const isCorrectOption = opt.text === correctText;
              const isSelected = opt.id === selectedId;
              const answered = selectedId !== null;

              let cls = 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#378ADD] hover:bg-[#E6F1FB]';
              let icon: React.ReactNode = null;

              if (answered) {
                if (isCorrectOption) {
                  cls = 'border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11]';
                  icon = <CheckCircle2 className="w-4 h-4 shrink-0 text-[#3B6D11]" />;
                } else if (isSelected) {
                  cls = 'border-red-400 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
                  icon = <XCircle className="w-4 h-4 shrink-0 text-red-400 dark:text-red-300" />;
                } else {
                  cls = 'border-gray-100 dark:border-slate-800 text-gray-300 dark:text-slate-600';
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleAnswer(opt.id, opt.text)}
                  disabled={answered}
                  className={`w-full flex items-center gap-3 border-2 rounded-xl px-4 py-3.5 text-sm font-medium text-left transition-all ${cls}`}
                >
                  <span className="flex-1">{opt.text}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {feedback !== null && (
            <p className={`text-sm font-semibold ${feedback ? 'text-[#3B6D11]' : 'text-red-500 dark:text-red-400'}`}>
              {feedback ? t.correctLabel : t.wrongLabel}
            </p>
          )}
        </>
      )}

      {isWordle && (
        <>
          {/* İpucu / anlam */}
          <div className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-6 text-center">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">
              {t.hangmanHintLabel}
            </p>
            <p className="text-lg font-semibold text-gray-800 dark:text-slate-200">{current.meaning}</p>
          </div>

          {/* Canlar */}
          <div className="w-full flex items-center justify-center gap-2">
            <span className="text-xs font-medium text-gray-400 dark:text-slate-500 mr-1">{t.livesLabel}</span>
            {Array.from({ length: maxWrongGuesses }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 ${
                  i < maxWrongGuesses - wrongGuesses
                    ? 'text-red-400 dark:text-red-300 fill-red-400'
                    : 'text-gray-200 dark:text-slate-700 fill-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Boşluklu kelime gösterimi */}
          <div className="w-full flex items-center justify-center flex-wrap gap-2 py-4">
            {revealed.replace(/\s+/g, '').split('').map((ch, i) => (
              <span
                key={i}
                className={`w-9 h-11 flex items-center justify-center rounded-lg text-xl font-bold uppercase ${
                  ch === '_'
                    ? 'bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-transparent'
                    : 'bg-[#EAF3DE] border-2 border-[#3B6D11]/30 text-[#3B6D11]'
                }`}
              >
                {ch === '_' ? '·' : ch}
              </span>
            ))}
          </div>

          {/* Sonuç rozeti */}
          {roundResult && (
            <div
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-center ${
                roundResult === 'won' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              <p>{roundResult === 'won' ? t.wordleWonTitle : t.wordleLostTitle}</p>
              {roundResult === 'lost' && revealedWord && (
                <p className="mt-1 font-normal">{t.correctWordTpl.replace('{word}', revealedWord)}</p>
              )}
            </div>
          )}

          {/* Klavye */}
          {!roundResult && (
            <div className="w-full flex flex-col items-center gap-2">
              {KEYBOARD_ROWS.map((row, i) => (
                <div key={i} className="flex gap-1.5">
                  {row.split('').map((letter) => {
                    const lower = letter.toLowerCase();
                    const isGuessed = guessedLetters.includes(lower);
                    const isCorrectGuess = isGuessed && revealed.toLowerCase().includes(lower);
                    return (
                      <button
                        key={letter}
                        onClick={() => handleGuessLetter(lower)}
                        disabled={isGuessed || letterBusy}
                        className={`w-8 h-10 sm:w-9 sm:h-11 rounded-lg text-sm font-semibold transition-all ${
                          isGuessed
                            ? isCorrectGuess
                              ? 'bg-[#EAF3DE] text-[#3B6D11] border-2 border-[#3B6D11]/30'
                              : 'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 border-2 border-gray-100 dark:border-slate-800'
                            : 'bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#378ADD] hover:bg-[#E6F1FB]'
                        }`}
                      >
                        {letter}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Denenen harfler */}
          {guessedLetters.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
              {t.guessedLabel}: {guessedLetters.join(', ').toUpperCase()}
            </p>
          )}
        </>
      )}

      {(isTyping || isSprint) && (
        <>
          <div className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-8 text-center">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
              {t.typingPromptLabel}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">{current.meaning}</p>
          </div>

          <div className="w-full flex flex-col gap-3">
            <input
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTypingSubmit();
              }}
              disabled={typingResult !== null}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t.typingInputPlaceholder}
              className={`w-full border-2 rounded-xl px-4 py-3.5 text-base text-center font-medium transition-all outline-none ${
                typingResult === 'correct'
                  ? 'border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11]'
                  : typingResult === 'wrong'
                    ? 'border-red-400 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'border-gray-200 dark:border-slate-700 focus:border-[#378ADD]'
              }`}
            />
            {typingResult === null && (
              <button
                onClick={handleTypingSubmit}
                disabled={!typedAnswer.trim()}
                className="w-full bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-medium transition-colors"
              >
                {t.typingCheckBtn}
              </button>
            )}
          </div>

          {typingResult !== null && (
            <p
              className={`text-sm font-semibold text-center ${
                typingResult === 'correct' ? 'text-[#3B6D11]' : 'text-red-500 dark:text-red-400'
              }`}
            >
              {typingResult === 'correct'
                ? t.correctLabel
                : `${t.wrongLabel} — ${t.correctWordTpl.replace('{word}', current.word ?? '')}`}
            </p>
          )}
        </>
      )}

      {isListening && (
        <>
          <div className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-8 text-center">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-4">
              {t.listeningPromptLabel}
            </p>
            <button
              type="button"
              onClick={() => current.word && speakWord(current.word)}
              className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-[#E6F1FB] hover:bg-[#d3e7fa] transition-colors"
              aria-label={t.listeningPlayBtn}
            >
              <Volume2 className="w-7 h-7 text-[#378ADD]" />
            </button>
            {current.meaning && <p className="text-xs text-gray-400 dark:text-slate-500 mt-4 italic">{current.meaning}</p>}
          </div>

          <div className="w-full flex flex-col gap-3">
            <input
              type="text"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTypingSubmit();
              }}
              disabled={typingResult !== null}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t.typingInputPlaceholder}
              className={`w-full border-2 rounded-xl px-4 py-3.5 text-base text-center font-medium transition-all outline-none ${
                typingResult === 'correct'
                  ? 'border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11]'
                  : typingResult === 'wrong'
                    ? 'border-red-400 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'border-gray-200 dark:border-slate-700 focus:border-[#378ADD]'
              }`}
            />
            {typingResult === null && (
              <button
                onClick={handleTypingSubmit}
                disabled={!typedAnswer.trim()}
                className="w-full bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-medium transition-colors"
              >
                {t.typingCheckBtn}
              </button>
            )}
          </div>

          {typingResult !== null && (
            <p
              className={`text-sm font-semibold text-center ${
                typingResult === 'correct' ? 'text-[#3B6D11]' : 'text-red-500 dark:text-red-400'
              }`}
            >
              {typingResult === 'correct'
                ? t.correctLabel
                : `${t.wrongLabel} — ${t.correctWordTpl.replace('{word}', current.word ?? '')}`}
            </p>
          )}
        </>
      )}

      <button onClick={handleFinish} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 hover:dark:text-slate-400 underline">
        {t.finishBtn}
      </button>
    </div>
  );
}
