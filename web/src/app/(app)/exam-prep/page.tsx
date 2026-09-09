'use client';

// app/(app)/exam-prep/page.tsx — Sınav Hazırlık Alanı (YDS/YÖKDİL/IELTS/TOEFL), web.
// V2 Yol Haritası §1.1 — mobile/src/app/(app)/exam-prep.tsx ile aynı stage-machine
// deseni ve aynı backend akışı (session/next-question/attempt/finish, bkz.
// backend/app/api/routes/exams.py). Bu alan şimdilik sadece native_lang=tr +
// learning_lang=en kullanıcılarına gösteriliyor (backend _exam_area_enabled),
// bu yüzden EXAM_STRINGS de mobildeki examStrings.ts gibi sadece tr/en dolu —
// merkezi lib/i18n.tsx sözlüğüne dokunmadan yerel çeviri (Sidebar.tsx'teki
// GAME_LABEL / dashboard'daki MSG_LABELS ile aynı yaklaşım).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, CheckCircle2, XCircle, Clock, Plus, Loader2, GraduationCap, ChevronLeft,
} from 'lucide-react';
import { examsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type {
  ExamAttemptResult,
  ExamFinishResult,
  ExamSession,
  ExamSessionMode,
  ExamType,
  NextQuestionResult,
} from '@/types';

type Stage = 'loading' | 'disabled' | 'select-type' | 'select-mode' | 'playing' | 'result' | 'error';

const EXAM_TYPE_ORDER: ExamType[] = ['yds', 'yokdil', 'ielts', 'toefl'];

type ExamStrings = {
  pageTitle: string;
  pageSubtitle: string;
  disabledMessage: string;
  examTypeYds: string;
  examTypeYokdil: string;
  examTypeIelts: string;
  examTypeToefl: string;
  comingSoonLabel: string;
  questionCountTpl: string;
  chooseModeTitle: string;
  modePracticeLabel: string;
  modePracticeDesc: string;
  modeMockLabel: string;
  modeMockDesc: string;
  startBtn: string;
  backBtn: string;
  loadingLabel: string;
  genericError: string;
  timeLeftTpl: string;
  questionCounterTpl: string;
  submitBtn: string;
  nextBtn: string;
  correctLabel: string;
  wrongLabel: string;
  explanationLabel: string;
  addWordBtn: string;
  finishBtn: string;
  doneTitle: string;
  doneScoreTpl: string;
  doneXpTpl: string;
  mockBonusTpl: string;
  levelUpTpl: string;
  playAgainBtn: string;
  backToDashboardBtn: string;
  suggestEntryLabel: string;
  grammarEntryLabel: string;
  reviewGrammarTopicTpl: string;
  practiceThisTopicBtn: string;
};

// mobile/src/i18n/examStrings.ts ile birebir aynı tr/en metinler.
const EXAM_STRINGS: Partial<Record<Locale, ExamStrings>> = {
  tr: {
    pageTitle: 'Sınav Hazırlık Alanı',
    pageSubtitle: 'YDS, YÖKDİL, IELTS ve TOEFL için örnek sorularla pratik yap, doğru cevap analizini oku, kelimeleri hazinene ekle.',
    disabledMessage: 'Sınav Hazırlık Alanı şu an sadece İngilizce öğrenen, ana dili Türkçe olan kullanıcılar için kullanılabilir.',
    examTypeYds: 'YDS',
    examTypeYokdil: 'YÖKDİL',
    examTypeIelts: 'IELTS',
    examTypeToefl: 'TOEFL',
    comingSoonLabel: 'Yakında',
    questionCountTpl: '{count} soru',
    chooseModeTitle: 'Nasıl çalışmak istersin?',
    modePracticeLabel: 'Pratik',
    modePracticeDesc: 'Süre sınırı yok, kendi hızında sorularını çöz',
    modeMockLabel: 'Deneme Sınavı',
    modeMockDesc: 'Süreli tam deneme — gerçek sınav temposunu hisset',
    startBtn: 'Başla',
    backBtn: 'Geri',
    loadingLabel: 'Yükleniyor…',
    genericError: 'Bir şeyler ters gitti, tekrar dene.',
    timeLeftTpl: 'Kalan süre: {time}',
    questionCounterTpl: 'Soru {current} / {total}',
    submitBtn: 'Cevapla',
    nextBtn: 'Sonraki Soru',
    correctLabel: 'Doğru!',
    wrongLabel: 'Yanlış',
    explanationLabel: 'Açıklama',
    addWordBtn: 'Kelime Hazineme Ekle',
    finishBtn: 'Bitir',
    doneTitle: 'Tamamlandı!',
    doneScoreTpl: 'Skor: {score} / {total}',
    doneXpTpl: 'Kazanılan XP: {xp}',
    mockBonusTpl: 'Deneme tamamlama bonusu: +{xp} XP',
    levelUpTpl: 'Seviye atladın! Yeni seviye: {level}',
    playAgainBtn: 'Tekrar Dene',
    backToDashboardBtn: 'Panele Dön',
    suggestEntryLabel: 'Soru Öner',
    grammarEntryLabel: 'Gramer Rehberi',
    reviewGrammarTopicTpl: '"{topic}" Konusunu İncele',
    practiceThisTopicBtn: 'Bu Konudan Pratik Yap',
  },
  en: {
    pageTitle: 'Exam Prep Area',
    pageSubtitle: 'Practice with sample questions for YDS, YÖKDİL, IELTS and TOEFL, read the answer analysis, and add words to your vocabulary.',
    disabledMessage: 'The Exam Prep Area is currently available only for Turkish-speaking users learning English.',
    examTypeYds: 'YDS',
    examTypeYokdil: 'YÖKDİL',
    examTypeIelts: 'IELTS',
    examTypeToefl: 'TOEFL',
    comingSoonLabel: 'Coming soon',
    questionCountTpl: '{count} questions',
    chooseModeTitle: 'How would you like to study?',
    modePracticeLabel: 'Practice',
    modePracticeDesc: 'No time limit, go at your own pace',
    modeMockLabel: 'Timed Mock Exam',
    modeMockDesc: 'A timed full mock — feel the real exam pace',
    startBtn: 'Start',
    backBtn: 'Back',
    loadingLabel: 'Loading…',
    genericError: 'Something went wrong, please try again.',
    timeLeftTpl: 'Time left: {time}',
    questionCounterTpl: 'Question {current} / {total}',
    submitBtn: 'Submit',
    nextBtn: 'Next Question',
    correctLabel: 'Correct!',
    wrongLabel: 'Wrong',
    explanationLabel: 'Explanation',
    addWordBtn: 'Add to My Vocabulary',
    finishBtn: 'Finish',
    doneTitle: 'Completed!',
    doneScoreTpl: 'Score: {score} / {total}',
    doneXpTpl: 'XP earned: {xp}',
    mockBonusTpl: 'Mock completion bonus: +{xp} XP',
    levelUpTpl: 'You leveled up! New level: {level}',
    playAgainBtn: 'Try Again',
    backToDashboardBtn: 'Back to Dashboard',
    suggestEntryLabel: 'Suggest a Question',
    grammarEntryLabel: 'Grammar Guide',
    reviewGrammarTopicTpl: 'Review "{topic}"',
    practiceThisTopicBtn: 'Practice This Topic',
  },
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ExamPrepPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const et = EXAM_STRINGS[locale] ?? EXAM_STRINGS.tr!;

  const [stage, setStage] = useState<Stage>('loading');
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [sessionMode, setSessionMode] = useState<ExamSessionMode>('practice');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [question, setQuestion] = useState<NextQuestionResult | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [attemptResult, setAttemptResult] = useState<ExamAttemptResult | null>(null);
  const [finishResult, setFinishResult] = useState<ExamFinishResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [addedWords, setAddedWords] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const { data: examTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['exam-types'],
    queryFn: examsApi.listExamTypes,
  });

  useEffect(() => {
    if (typesLoading) return;
    if (!examTypes || examTypes.length === 0) {
      setStage('disabled');
    } else {
      setStage('select-type');
    }
  }, [examTypes, typesLoading]);

  // Deneme sınavı (timed_mock) geri sayımı.
  useEffect(() => {
    if (stage !== 'playing' || timeLeft === null) return;
    if (timeLeft <= 0) {
      handleFinish();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, timeLeft]);

  async function loadNextQuestion(sessionId: string) {
    setBusy(true);
    try {
      const next = await examsApi.nextQuestion(sessionId);
      if (next.finished) {
        await handleFinish(sessionId);
        return;
      }
      setQuestion(next);
      setSelectedOption(null);
      setAttemptResult(null);
    } catch {
      setStage('error');
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!examType) return;
    setBusy(true);
    try {
      const s = await examsApi.createSession(examType, sessionMode);
      setSession(s);
      setTimeLeft(s.time_limit_seconds ?? null);
      setStage('playing');
      await loadNextQuestion(s.id);
    } catch {
      setStage('error');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    if (!session || !question?.question_id || !selectedOption) return;
    setBusy(true);
    try {
      const result = await examsApi.submitAttempt(session.id, {
        question_id: question.question_id,
        selected_option: selectedOption,
      });
      setAttemptResult(result);
    } catch {
      setStage('error');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddWord(word: string) {
    if (!question?.question_id) return;
    try {
      await examsApi.addWordFromQuestion(question.question_id);
      setAddedWords((prev) => ({ ...prev, [word]: true }));
    } catch {
      /* sessiz — kritik yol değil */
    }
  }

  async function handleFinish(sessionIdOverride?: string) {
    const sid = sessionIdOverride ?? session?.id;
    if (!sid) return;
    setBusy(true);
    try {
      const result = await examsApi.finishSession(sid);
      setFinishResult(result);
      setStage('result');
    } catch {
      setStage('error');
    } finally {
      setBusy(false);
    }
  }

  function resetToStart() {
    setExamType(null);
    setSession(null);
    setQuestion(null);
    setSelectedOption(null);
    setAttemptResult(null);
    setFinishResult(null);
    setTimeLeft(null);
    setAddedWords({});
    setStage('select-type');
  }

  // ── Yükleniyor ──
  if (stage === 'loading') {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">{et.loadingLabel}</span>
        </div>
      </div>
    );
  }

  // ── Kullanılamıyor ──
  if (stage === 'disabled') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-10 flex flex-col items-center gap-4 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#FAEEDA]">
            <BookOpen className="w-7 h-7" style={{ color: '#854F0B' }} />
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">{et.disabledMessage}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full mt-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl py-3 text-sm font-medium transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            {et.backToDashboardBtn}
          </button>
        </div>
      </div>
    );
  }

  // ── Hata ──
  if (stage === 'error') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-10 flex flex-col items-center gap-4 w-full max-w-sm text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{et.genericError}</p>
          <button
            onClick={resetToStart}
            className="w-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl py-3 text-sm font-medium transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            {et.backBtn}
          </button>
        </div>
      </div>
    );
  }

  // ── Sınav türü seçimi ──
  if (stage === 'select-type') {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-[#FAEEDA] flex items-center justify-center">
            <GraduationCap className="w-4 h-4" style={{ color: '#854F0B' }} />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{et.pageTitle}</h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">{et.pageSubtitle}</p>

        <div className="mt-6 flex flex-col gap-3">
          {EXAM_TYPE_ORDER.map((type) => {
            const info = examTypes?.find((t) => t.exam_type === type);
            const available = !!info?.available;
            const label =
              type === 'yds' ? et.examTypeYds : type === 'yokdil' ? et.examTypeYokdil : type === 'ielts' ? et.examTypeIelts : et.examTypeToefl;
            return (
              <button
                key={type}
                disabled={!available}
                onClick={() => {
                  setExamType(type);
                  setStage('select-mode');
                }}
                className={`w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 transition-all ${
                  available ? 'hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-md cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <p className="text-base font-bold text-gray-900 dark:text-slate-100">{label}</p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  {available ? et.questionCountTpl.replace('{count}', String(info?.question_count ?? 0)) : et.comingSoonLabel}
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => router.push('/exam-grammar')}
          className="mt-6 w-full text-center text-sm font-semibold text-[#378ADD] hover:text-[#2d73c4]"
        >
          {et.grammarEntryLabel}
        </button>
        <button
          onClick={() => router.push('/exam-suggest')}
          className="mt-6 w-full text-center text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
        >
          {et.suggestEntryLabel}
        </button>
      </div>
    );
  }

  // ── Mod seçimi ──
  if (stage === 'select-mode') {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{et.chooseModeTitle}</h1>
        <div className="mt-6 flex flex-col gap-3">
          {(['practice', 'timed_mock'] as ExamSessionMode[]).map((mode) => {
            const active = sessionMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setSessionMode(mode)}
                className="w-full text-left bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 transition-all"
                style={{ border: active ? '2px solid #378ADD' : '1px solid #F1F1F4' }}
              >
                <p className="text-base font-bold text-gray-900 dark:text-slate-100">
                  {mode === 'practice' ? et.modePracticeLabel : et.modeMockLabel}
                </p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  {mode === 'practice' ? et.modePracticeDesc : et.modeMockDesc}
                </p>
              </button>
            );
          })}
        </div>
        <div className="mt-8 flex flex-col gap-2">
          <button
            onClick={handleStart}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-60 text-white rounded-xl py-3 text-sm font-medium transition-colors"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {et.startBtn}
          </button>
          <button
            onClick={() => setStage('select-type')}
            className="w-full flex items-center justify-center gap-1 text-gray-500 dark:text-slate-400 rounded-xl py-2.5 text-sm font-medium transition-colors hover:text-gray-700 dark:hover:text-slate-200"
          >
            <ChevronLeft className="w-4 h-4" />
            {et.backBtn}
          </button>
        </div>
      </div>
    );
  }

  // ── Soru çözme ──
  if (stage === 'playing') {
    const isLastAnswered =
      !!attemptResult && !!session && !!question?.question_index && question.question_index >= session.total_questions;
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">
            {question?.question_index && session
              ? et.questionCounterTpl.replace('{current}', String(question.question_index)).replace('{total}', String(session.total_questions))
              : ''}
          </span>
          {timeLeft !== null && (
            <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: '#854F0B' }}>
              <Clock className="w-4 h-4" />
              {et.timeLeftTpl.replace('{time}', formatTime(timeLeft))}
            </span>
          )}
        </div>

        {!question ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">{et.loadingLabel}</p>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-6">
              <p className="text-base text-gray-900 dark:text-slate-100 leading-relaxed">{question.question_text}</p>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {question.options?.map((opt) => {
                const isSelected = selectedOption === opt.id;
                const isCorrectOpt = !!attemptResult && opt.id === attemptResult.correct_option;
                const isWrongSelected = !!attemptResult && isSelected && !attemptResult.is_correct;
                let cls = 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:border-[#378ADD] hover:bg-[#E6F1FB]';
                if (attemptResult) {
                  if (isCorrectOpt) cls = 'border-[#3B6D11] bg-[#EAF3DE] text-[#3B6D11]';
                  else if (isWrongSelected) cls = 'border-red-400 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
                  else cls = 'border-gray-100 dark:border-slate-800 text-gray-300 dark:text-slate-600';
                } else if (isSelected) {
                  cls = 'border-[#378ADD] bg-[#E6F1FB] text-[#185FA5]';
                }
                return (
                  <button
                    key={opt.id}
                    disabled={!!attemptResult}
                    onClick={() => setSelectedOption(opt.id)}
                    className={`w-full flex items-center justify-between gap-3 border-2 rounded-xl px-4 py-3.5 text-sm font-medium text-left transition-all ${cls}`}
                  >
                    <span>{opt.text}</span>
                    {isCorrectOpt && <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#3B6D11' }} />}
                    {isWrongSelected && <XCircle className="w-5 h-5 shrink-0 text-red-400" />}
                  </button>
                );
              })}
            </div>

            {!attemptResult ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedOption || busy}
                className="w-full mt-6 flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {et.submitBtn}
              </button>
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: attemptResult.is_correct ? '#EAF3DE' : '#FEE2E2' }}
                >
                  <p className="text-sm font-bold" style={{ color: attemptResult.is_correct ? '#3B6D11' : '#b91c1c' }}>
                    {attemptResult.is_correct ? et.correctLabel : et.wrongLabel}
                    {attemptResult.xp_awarded > 0 ? `  +${attemptResult.xp_awarded} XP` : ''}
                  </p>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mt-2">{et.explanationLabel}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 leading-relaxed">{attemptResult.explanation}</p>
                  {attemptResult.leveled_up && (
                    <p className="text-sm font-bold mt-2" style={{ color: '#534AB7' }}>
                      {et.levelUpTpl.replace('{level}', String(attemptResult.new_level ?? ''))}
                    </p>
                  )}
                </div>

                {/* Madde #3a/#3b: yanlış cevapta ilgili gramer konusuna
                    yönlendirme + aynı konudan ekstra pratik önerisi. */}
                {!attemptResult.is_correct && (attemptResult.related_grammar_topic || attemptResult.topic_tag) && (
                  <div className="flex flex-col gap-2">
                    {attemptResult.related_grammar_topic && (
                      <button
                        onClick={() => router.push(`/exam-grammar/${attemptResult.related_grammar_topic!.slug}`)}
                        className="w-full border border-[#378ADD] text-[#378ADD] rounded-xl py-2.5 text-sm font-semibold transition-colors hover:bg-[#E6F1FB]"
                      >
                        {et.reviewGrammarTopicTpl.replace('{topic}', attemptResult.related_grammar_topic.title_tr)}
                      </button>
                    )}
                    {attemptResult.topic_tag && (
                      <button
                        onClick={() =>
                          router.push(
                            `/exam-topic-practice?topic_tag=${encodeURIComponent(attemptResult.topic_tag!)}${
                              question?.question_id ? `&exclude_question_id=${encodeURIComponent(question.question_id)}` : ''
                            }`
                          )
                        }
                        className="w-full border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-semibold transition-colors hover:border-gray-300"
                      >
                        {et.practiceThisTopicBtn}
                      </button>
                    )}
                  </div>
                )}

                {!!attemptResult.related_words?.length && (
                  <div className="flex flex-col gap-2">
                    {attemptResult.related_words.map((rw) => (
                      <button
                        key={rw.word}
                        disabled={!!addedWords[rw.word]}
                        onClick={() => handleAddWord(rw.word)}
                        className="w-full flex items-center justify-between gap-3 border border-gray-200 dark:border-slate-700 rounded-xl p-3.5 text-left transition-colors hover:border-gray-300"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{rw.word}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{rw.meaning}</p>
                        </div>
                        {addedWords[rw.word] ? (
                          <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#3B6D11' }} />
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-semibold shrink-0" style={{ color: '#378ADD' }}>
                            <Plus className="w-4 h-4" />
                            {et.addWordBtn}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => (session ? loadNextQuestion(session.id) : undefined)}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-60 text-white rounded-xl py-3 text-sm font-medium transition-colors"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLastAnswered ? et.finishBtn : et.nextBtn}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── Sonuç ──
  if (stage === 'result' && finishResult) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-10 flex flex-col items-center gap-2 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#EAF3DE]">
            <CheckCircle2 className="w-8 h-8" style={{ color: '#3B6D11' }} />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mt-2">{et.doneTitle}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {et.doneScoreTpl.replace('{score}', String(finishResult.score)).replace('{total}', String(finishResult.total_questions))}
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400">{et.doneXpTpl.replace('{xp}', String(finishResult.xp_earned))}</p>
          {finishResult.mock_bonus_xp > 0 && (
            <p className="text-sm font-semibold mt-1" style={{ color: '#534AB7' }}>
              {et.mockBonusTpl.replace('{xp}', String(finishResult.mock_bonus_xp))}
            </p>
          )}
          <div className="w-full mt-6 flex flex-col gap-2">
            <button
              onClick={resetToStart}
              className="w-full bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-3 text-sm font-medium transition-colors"
            >
              {et.playAgainBtn}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl py-3 text-sm font-medium transition-colors hover:bg-gray-200 dark:hover:bg-slate-700"
            >
              {et.backToDashboardBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
