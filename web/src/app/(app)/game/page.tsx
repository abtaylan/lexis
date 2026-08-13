'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import {
  gamesApi,
  type PoolSource,
  type GameMode,
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
  },
  en: {
    pageTitle: 'Word Game',
    pageSubtitle: 'Pick a game mode and earn XP while learning words.',
    chooseModeTitle: 'How do you want to play?',
    modeMultipleLabel: 'Multiple Choice',
    modeMultipleDesc: 'Pick the right meaning from 4 options',
    modeWordleLabel: 'Hangman',
    modeWordleDesc: 'Guess the word letter by letter from its meaning',
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
  },
  ar: {
    pageTitle: 'لعبة الكلمات',
    pageSubtitle: 'اختر نمط لعب واكسب نقاط الخبرة أثناء تعلم الكلمات.',
    chooseModeTitle: 'كيف تريد أن تلعب؟',
    modeMultipleLabel: 'اختيار من متعدد',
    modeMultipleDesc: 'اختر المعنى الصحيح من بين 4 خيارات',
    modeWordleLabel: 'المشنقة',
    modeWordleDesc: 'خمّن الكلمة حرفًا بحرف من خلال معناها',
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
  },
  ru: {
    pageTitle: 'Словесная игра',
    pageSubtitle: 'Выбери режим игры и получай опыт, изучая слова.',
    chooseModeTitle: 'Как хочешь играть?',
    modeMultipleLabel: 'Множественный выбор',
    modeMultipleDesc: 'Выбери правильное значение из 4 вариантов',
    modeWordleLabel: 'Виселица',
    modeWordleDesc: 'Угадай слово по буквам, глядя на его значение',
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
  },
  de: {
    pageTitle: 'Wortspiel',
    pageSubtitle: 'Wähle einen Spielmodus und sammle XP beim Lernen.',
    chooseModeTitle: 'Wie möchtest du spielen?',
    modeMultipleLabel: 'Multiple Choice',
    modeMultipleDesc: 'Wähle die richtige Bedeutung aus 4 Optionen',
    modeWordleLabel: 'Galgenmännchen',
    modeWordleDesc: 'Errate das Wort anhand der Bedeutung, Buchstabe für Buchstabe',
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
  },
  fr: {
    pageTitle: 'Jeu de mots',
    pageSubtitle: 'Choisis un mode de jeu et gagne des XP en apprenant des mots.',
    chooseModeTitle: 'Comment veux-tu jouer ?',
    modeMultipleLabel: 'Choix multiple',
    modeMultipleDesc: 'Choisis le bon sens parmi 4 options',
    modeWordleLabel: 'Pendu',
    modeWordleDesc: "Devine le mot lettre par lettre à partir de son sens",
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
  },
  es: {
    pageTitle: 'Juego de palabras',
    pageSubtitle: 'Elige un modo de juego y gana XP mientras aprendes palabras.',
    chooseModeTitle: '¿Cómo quieres jugar?',
    modeMultipleLabel: 'Opción múltiple',
    modeMultipleDesc: 'Elige el significado correcto entre 4 opciones',
    modeWordleLabel: 'Ahorcado',
    modeWordleDesc: 'Adivina la palabra letra por letra a partir de su significado',
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
  },
  it: {
    pageTitle: 'Gioco di parole',
    pageSubtitle: 'Scegli una modalità di gioco e guadagna XP imparando parole.',
    chooseModeTitle: 'Come vuoi giocare?',
    modeMultipleLabel: 'Scelta multipla',
    modeMultipleDesc: 'Scegli il significato corretto tra 4 opzioni',
    modeWordleLabel: 'Impiccato',
    modeWordleDesc: 'Indovina la parola lettera per lettera a partire dal suo significato',
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
  },
};

const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

type Stage = 'mode' | 'setup' | 'loading' | 'playing' | 'error' | 'done';

export default function GamePage() {
  const { locale } = useLocale();
  const t = STRINGS[locale];

  const [stage, setStage] = useState<Stage>('mode');
  const [gameMode, setGameMode] = useState<GameMode>('multiple_choice');
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

  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [questionNum, setQuestionNum] = useState(0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [finishResult, setFinishResult] = useState<GameFinishResult | null>(null);

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
      setQuestionNum((n) => n + 1);
      setStage('playing');
    } catch {
      setErrorMsg(t.genericError);
      setStage('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async (mode: GameMode, pool: PoolSource) => {
    setGameMode(mode);
    setPoolSource(pool);
    setStage('loading');
    setErrorMsg('');
    setScore(0);
    setXpEarned(0);
    setQuestionNum(0);
    setLevelUp(null);
    setFinishResult(null);
    try {
      const session = await gamesApi.createSession(mode, pool);
      setSessionId(session.id);
      await loadNext(session.id, false, pool);
    } catch {
      setErrorMsg(t.genericError);
      setStage('error');
    }
  };

  // ── çoktan seçmeli cevap ──
  const handleAnswer = async (optionId: string, optionText: string) => {
    if (selectedId || !current || !sessionId) return;
    setSelectedId(optionId);
    const isCorrect = optionText === current.meaning;
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
    setStage('loading');
    try {
      const res = await gamesApi.finishSession(sessionId);
      setFinishResult(res);
    } catch {
      /* sessiz */
    }
    setStage('done');
  };

  // ── Mod seçimi ──
  if (stage === 'mode') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-7 h-7 text-[#534AB7]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t.pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">{t.pageSubtitle}</p>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 text-left">
            {t.chooseModeTitle}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setGameMode('multiple_choice'); setStage('setup'); }}
              className="w-full flex items-center gap-3 text-left border-2 border-gray-200 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#E6F1FB] flex items-center justify-center">
                <ListChecks className="w-4 h-4 text-[#378ADD]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{t.modeMultipleLabel}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.modeMultipleDesc}</p>
              </div>
            </button>
            <button
              onClick={() => {
                setGameMode('wordle');
                setStage('setup');
              }}
              className="w-full flex items-center gap-3 text-left border-2 border-gray-200 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
            >
              <div className="w-9 h-9 shrink-0 rounded-lg bg-[#FAEEDA] flex items-center justify-center">
                <Keyboard className="w-4 h-4 text-[#854F0B]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{t.modeWordleLabel}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.modeWordleDesc}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Havuz seçimi / Yükleniyor ──
  if (stage === 'setup' || stage === 'loading') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-7 h-7 text-[#534AB7]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t.pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">{t.choosePoolTitle}</p>

          {stage === 'loading' ? (
            <div className="flex flex-col items-center gap-3 text-gray-400 py-6">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">{t.loadingLabel}</span>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => start(gameMode, 'general')}
                  className="w-full text-left border-2 border-gray-200 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800">{t.poolGeneralLabel}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.poolGeneralDesc}</p>
                </button>
                <button
                  onClick={() => start(gameMode, 'own')}
                  className="w-full text-left border-2 border-gray-200 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
                >
                  <p className="text-sm font-semibold text-gray-800">{t.poolOwnLabel}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.poolOwnDesc}</p>
                </button>
              </div>
              <button
                onClick={() => setStage('mode')}
                className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-gray-600 mt-5"
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center gap-5 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#EAF3DE]">
            <Trophy className="w-8 h-8 text-[#3B6D11]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{t.doneTitle}</p>
            <p className="text-sm text-gray-500 mt-1">
              {t.doneScoreTpl.replace('{correct}', String(correct)).replace('{total}', String(total))}
            </p>
          </div>
          <div className="w-full rounded-xl p-4 bg-[#EEEDFE] flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#534AB7]" />
            <p className="text-sm font-semibold text-[#534AB7]">{t.doneXpTpl.replace('{xp}', String(xp))}</p>
          </div>
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={() => setStage('mode')}
              className="w-full flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-3 text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t.playAgainBtn}
            </button>
            <Link href="/dashboard" className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2">
              {t.backToDashboardBtn}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Oynanış ──
  if (!current) return null;

  const isWordle = gameMode === 'wordle';

  return (
    <div className="p-6 flex flex-col items-center gap-6 max-w-xl mx-auto">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EEEDFE] flex items-center justify-center">
            <Gamepad2 className="w-4 h-4 text-[#534AB7]" />
          </div>
          <span className="text-sm font-semibold text-gray-700">
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

      {!isWordle && (
        <>
          <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{t.questionPrompt}</p>
            <p className="text-4xl font-bold text-gray-900 tracking-tight">{current.word}</p>
            {current.example && (
              <p className="text-sm text-gray-400 mt-3 italic">&ldquo;{current.example}&rdquo;</p>
            )}
          </div>

          <div className="w-full grid grid-cols-1 gap-3">
            {(current.options || []).map((opt) => {
              const isCorrectOption = opt.text === current.meaning;
              const isSelected = opt.id === selectedId;
              const answered = selectedId !== null;

              let cls = 'border-gray-200 text-gray-700 hover:border-[#378ADD] hover:bg-[#E6F1FB]';
              let icon: React.ReactNode = null;

              if (answered) {
                if (isCorrectOption) {
                  cls = 'border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11]';
                  icon = <CheckCircle2 className="w-4 h-4 shrink-0 text-[#3B6D11]" />;
                } else if (isSelected) {
                  cls = 'border-red-400 bg-red-50 text-red-600';
                  icon = <XCircle className="w-4 h-4 shrink-0 text-red-400" />;
                } else {
                  cls = 'border-gray-100 text-gray-300';
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
            <p className={`text-sm font-semibold ${feedback ? 'text-[#3B6D11]' : 'text-red-500'}`}>
              {feedback ? t.correctLabel : t.wrongLabel}
            </p>
          )}
        </>
      )}

      {isWordle && (
        <>
          {/* İpucu / anlam */}
          <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {t.hangmanHintLabel}
            </p>
            <p className="text-lg font-semibold text-gray-800">{current.meaning}</p>
          </div>

          {/* Canlar */}
          <div className="w-full flex items-center justify-center gap-2">
            <span className="text-xs font-medium text-gray-400 mr-1">{t.livesLabel}</span>
            {Array.from({ length: maxWrongGuesses }).map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 ${
                  i < maxWrongGuesses - wrongGuesses
                    ? 'text-red-400 fill-red-400'
                    : 'text-gray-200 fill-gray-200'
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
                    ? 'bg-gray-50 border-2 border-gray-200 text-transparent'
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
                roundResult === 'won' ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-red-50 text-red-600'
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
                              : 'bg-gray-100 text-gray-300 border-2 border-gray-100'
                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#378ADD] hover:bg-[#E6F1FB]'
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
            <p className="text-xs text-gray-400 text-center">
              {t.guessedLabel}: {guessedLetters.join(', ').toUpperCase()}
            </p>
          )}
        </>
      )}

      <button onClick={handleFinish} className="text-xs text-gray-400 hover:text-gray-600 underline">
        {t.finishBtn}
      </button>
    </div>
  );
}

