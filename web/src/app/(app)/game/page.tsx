'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, Gamepad2, Sparkles } from 'lucide-react';
import { gamesApi, type PoolSource, type NextWordResult, type GameFinishResult } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';

type Strings = {
  pageTitle: string;
  pageSubtitle: string;
  poolOwnLabel: string;
  poolOwnDesc: string;
  poolGeneralLabel: string;
  poolGeneralDesc: string;
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
};

const STRINGS: Record<Locale, Strings> = {
  tr: {
    pageTitle: 'Kelime Tahmin Oyunu',
    pageSubtitle: 'Kelimenin doğru anlamını seç, XP kazan.',
    poolOwnLabel: 'Kendi Kelimelerim',
    poolOwnDesc: 'Öğrendiğin kelimelerle pratik yap',
    poolGeneralLabel: 'Genel Havuz',
    poolGeneralDesc: 'Geniş kelime havuzundan rastgele sorular',
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
  },
  en: {
    pageTitle: 'Word Guessing Game',
    pageSubtitle: 'Pick the right meaning, earn XP.',
    poolOwnLabel: 'My Words',
    poolOwnDesc: 'Practice with the words you are learning',
    poolGeneralLabel: 'General Pool',
    poolGeneralDesc: 'Random questions from a large word pool',
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
  },
  ar: {
    pageTitle: 'لعبة تخمين الكلمات',
    pageSubtitle: 'اختر المعنى الصحيح واكسب نقاط الخبرة.',
    poolOwnLabel: 'كلماتي',
    poolOwnDesc: 'تدرب بالكلمات التي تتعلمها',
    poolGeneralLabel: 'المجموعة العامة',
    poolGeneralDesc: 'أسئلة عشوائية من مجموعة كبيرة من الكلمات',
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
  },
  ru: {
    pageTitle: 'Игра-угадайка слов',
    pageSubtitle: 'Выбери правильное значение и получи опыт.',
    poolOwnLabel: 'Мои слова',
    poolOwnDesc: 'Тренируйся на словах, которые изучаешь',
    poolGeneralLabel: 'Общий пул',
    poolGeneralDesc: 'Случайные вопросы из большого пула слов',
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
  },
  de: {
    pageTitle: 'Wortratespiel',
    pageSubtitle: 'Wähle die richtige Bedeutung und sammle XP.',
    poolOwnLabel: 'Meine Wörter',
    poolOwnDesc: 'Übe mit den Wörtern, die du lernst',
    poolGeneralLabel: 'Allgemeiner Pool',
    poolGeneralDesc: 'Zufällige Fragen aus einem großen Wortpool',
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
  },
  fr: {
    pageTitle: 'Jeu de devinettes de mots',
    pageSubtitle: 'Choisis le bon sens et gagne des XP.',
    poolOwnLabel: 'Mes mots',
    poolOwnDesc: 'Entraîne-toi avec les mots que tu apprends',
    poolGeneralLabel: 'Pool général',
    poolGeneralDesc: "Questions aléatoires issues d'un grand pool de mots",
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
  },
  es: {
    pageTitle: 'Juego de adivinar palabras',
    pageSubtitle: 'Elige el significado correcto y gana XP.',
    poolOwnLabel: 'Mis palabras',
    poolOwnDesc: 'Practica con las palabras que estás aprendiendo',
    poolGeneralLabel: 'Grupo general',
    poolGeneralDesc: 'Preguntas aleatorias de un gran grupo de palabras',
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
  },
  it: {
    pageTitle: 'Gioco di indovina la parola',
    pageSubtitle: 'Scegli il significato corretto e guadagna XP.',
    poolOwnLabel: 'Le mie parole',
    poolOwnDesc: 'Esercitati con le parole che stai imparando',
    poolGeneralLabel: 'Pool generale',
    poolGeneralDesc: 'Domande casuali da un ampio pool di parole',
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
  },
};

type Stage = 'setup' | 'loading' | 'playing' | 'error' | 'done';

export default function GamePage() {
  const { locale } = useLocale();
  const t = STRINGS[locale];

  const [stage, setStage] = useState<Stage>('setup');
  const [poolSource, setPoolSource] = useState<PoolSource>('general');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState<NextWordResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
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
      setQuestionNum((n) => n + 1);
      setStage('playing');
    } catch {
      setErrorMsg(t.genericError);
      setStage('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async (pool: PoolSource) => {
    setPoolSource(pool);
    setStage('loading');
    setErrorMsg('');
    setScore(0);
    setXpEarned(0);
    setQuestionNum(0);
    setLevelUp(null);
    setFinishResult(null);
    try {
      const session = await gamesApi.createSession('multiple_choice', pool);
      setSessionId(session.id);
      await loadNext(session.id, false, pool);
    } catch {
      setErrorMsg(t.genericError);
      setStage('error');
    }
  };

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

  // ── Setup / Loading ──
  if (stage === 'setup' || stage === 'loading') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-7 h-7 text-[#534AB7]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t.pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">{t.pageSubtitle}</p>

          {stage === 'loading' ? (
            <div className="flex flex-col items-center gap-3 text-gray-400 py-6">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">{t.loadingLabel}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => start('general')}
                className="w-full text-left border-2 border-gray-200 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
              >
                <p className="text-sm font-semibold text-gray-800">{t.poolGeneralLabel}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.poolGeneralDesc}</p>
              </button>
              <button
                onClick={() => start('own')}
                className="w-full text-left border-2 border-gray-200 hover:border-[#378ADD] hover:bg-[#E6F1FB] rounded-xl px-4 py-3.5 transition-all"
              >
                <p className="text-sm font-semibold text-gray-800">{t.poolOwnLabel}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.poolOwnDesc}</p>
              </button>
            </div>
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
          onClick={() => setStage('setup')}
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
              onClick={() => setStage('setup')}
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

      <button onClick={handleFinish} className="text-xs text-gray-400 hover:text-gray-600 underline">
        {t.finishBtn}
      </button>
    </div>
  );
}
