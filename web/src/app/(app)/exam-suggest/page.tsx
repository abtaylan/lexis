'use client';

// app/(app)/exam-suggest/page.tsx — Sınav Hazırlık: kullanıcı soru önerisi, web.
// mobile/src/app/(app)/exam-suggest.tsx ile aynı form ve aynı backend akışı
// (POST /api/v1/exams/questions/suggest — status=pending, admin onaylayana
// kadar havuzda görünmez). exam-prep/page.tsx'in sınav türü seçim ekranındaki
// "Soru Öner" linkinden açılır.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { examsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import type { ExamType } from '@/types';

const EXAM_TYPE_ORDER: ExamType[] = ['yds', 'yokdil', 'ielts', 'toefl'];
const OPTION_LETTERS = ['a', 'b', 'c', 'd'];

type SuggestStrings = {
  title: string;
  subtitle: string;
  examTypeLabel: string;
  examTypeYds: string;
  examTypeYokdil: string;
  examTypeIelts: string;
  examTypeToefl: string;
  questionLabel: string;
  questionPlaceholder: string;
  optionLabelTpl: string;
  optionPlaceholderTpl: string;
  correctOptionLabel: string;
  explanationLabel: string;
  explanationPlaceholder: string;
  topicLabel: string;
  topicPlaceholder: string;
  submitBtn: string;
  backBtn: string;
  validationError: string;
  genericError: string;
  successTitle: string;
  successBody: string;
  anotherBtn: string;
};

const SUGGEST_STRINGS: Partial<Record<Locale, SuggestStrings>> = {
  tr: {
    title: 'Soru Öner',
    subtitle: 'Kendi hazırladığın soruyu gönder — ekibimiz onayladıktan sonra havuza eklenir ve diğer kullanıcılarla paylaşılır.',
    examTypeLabel: 'Sınav Türü',
    examTypeYds: 'YDS',
    examTypeYokdil: 'YÖKDİL',
    examTypeIelts: 'IELTS',
    examTypeToefl: 'TOEFL',
    questionLabel: 'Soru Metni',
    questionPlaceholder: 'Soruyu buraya yaz — boşluk için ------- kullanabilirsin.',
    optionLabelTpl: 'Şık {letter}',
    optionPlaceholderTpl: 'Şık {letter} metni',
    correctOptionLabel: 'Doğru Şık',
    explanationLabel: 'Açıklama (opsiyonel)',
    explanationPlaceholder: 'Doğru cevabın neden doğru olduğunu kısaca açıkla',
    topicLabel: 'Konu Etiketi (opsiyonel)',
    topicPlaceholder: 'örn. zaman kipleri, phrasal verb, okuma anlama',
    submitBtn: 'Gönder',
    backBtn: 'Geri',
    validationError: 'Lütfen soruyu, dört şıkkı da ve doğru şıkkı doldur.',
    genericError: 'Bir şeyler ters gitti, tekrar dene.',
    successTitle: 'Teşekkürler!',
    successBody: 'Sorun onay kuyruğuna eklendi. Onaylandığında havuza eklenip diğer kullanıcılarla paylaşılacak.',
    anotherBtn: 'Başka Soru Öner',
  },
  en: {
    title: 'Suggest a Question',
    subtitle: 'Submit a question you wrote — once our team approves it, it will be added to the pool and shared with other users.',
    examTypeLabel: 'Exam Type',
    examTypeYds: 'YDS',
    examTypeYokdil: 'YÖKDİL',
    examTypeIelts: 'IELTS',
    examTypeToefl: 'TOEFL',
    questionLabel: 'Question Text',
    questionPlaceholder: 'Write the question here — use ------- for the blank.',
    optionLabelTpl: 'Option {letter}',
    optionPlaceholderTpl: 'Option {letter} text',
    correctOptionLabel: 'Correct Option',
    explanationLabel: 'Explanation (optional)',
    explanationPlaceholder: 'Briefly explain why the correct answer is correct',
    topicLabel: 'Topic Tag (optional)',
    topicPlaceholder: 'e.g. verb tenses, phrasal verbs, reading comprehension',
    submitBtn: 'Submit',
    backBtn: 'Back',
    validationError: 'Please fill in the question, all four options, and the correct option.',
    genericError: 'Something went wrong, please try again.',
    successTitle: 'Thank you!',
    successBody: 'Your question was added to the review queue. Once approved, it will join the pool and be shared with other users.',
    anotherBtn: 'Suggest Another',
  },
};

export default function ExamSuggestPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const st = SUGGEST_STRINGS[locale] ?? SUGGEST_STRINGS.tr!;

  const [examType, setExamType] = useState<ExamType>('yds');
  const [questionText, setQuestionText] = useState('');
  const [optionTexts, setOptionTexts] = useState<Record<string, string>>({ a: '', b: '', c: '', d: '' });
  const [correctOption, setCorrectOption] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [topicTag, setTopicTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function resetForm() {
    setQuestionText('');
    setOptionTexts({ a: '', b: '', c: '', d: '' });
    setCorrectOption(null);
    setExplanation('');
    setTopicTag('');
    setError(null);
    setDone(false);
  }

  async function handleSubmit() {
    const options = OPTION_LETTERS.map((letter) => ({ id: letter, text: optionTexts[letter].trim() }));
    const allFilled = questionText.trim().length > 0 && options.every((o) => o.text.length > 0) && !!correctOption;
    if (!allFilled) {
      setError(st.validationError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await examsApi.suggestQuestion({
        exam_type: examType,
        question_text: questionText.trim(),
        options,
        correct_option: correctOption!,
        explanation: explanation.trim() || undefined,
        topic_tag: topicTag.trim() || undefined,
      });
      setDone(true);
    } catch {
      setError(st.genericError);
    } finally {
      setBusy(false);
    }
  }

  const examTypeLabel = (type: ExamType) =>
    type === 'yds' ? st.examTypeYds : type === 'yokdil' ? st.examTypeYokdil : type === 'ielts' ? st.examTypeIelts : st.examTypeToefl;

  if (done) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-4">{st.successTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">{st.successBody}</p>
          <div className="mt-6 w-full flex flex-col gap-3">
            <button
              onClick={resetForm}
              className="w-full py-3 rounded-xl bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm"
            >
              {st.anotherBtn}
            </button>
            <button
              onClick={() => router.push('/exam-prep')}
              className="w-full py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-semibold text-sm"
            >
              {st.backBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => router.push('/exam-prep')}
        className="flex items-center gap-1 text-sm text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 mb-3"
      >
        <ChevronLeft className="w-4 h-4" />
        {st.backBtn}
      </button>

      <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">{st.title}</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 leading-relaxed">{st.subtitle}</p>

      <div className="mt-6">
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">{st.examTypeLabel}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAM_TYPE_ORDER.map((type) => (
            <button
              key={type}
              onClick={() => setExamType(type)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                examType === type
                  ? 'bg-[#FAEEDA] border-transparent text-[#854F0B]'
                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300'
              }`}
            >
              {examTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">{st.questionLabel}</label>
        <textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder={st.questionPlaceholder}
          rows={3}
          className="mt-2 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-3 text-sm resize-none"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTION_LETTERS.map((letter) => (
          <div key={letter}>
            <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              {st.optionLabelTpl.replace('{letter}', letter.toUpperCase())}
            </label>
            <input
              value={optionTexts[letter]}
              onChange={(e) => setOptionTexts((prev) => ({ ...prev, [letter]: e.target.value }))}
              placeholder={st.optionPlaceholderTpl.replace('{letter}', letter.toUpperCase())}
              className="mt-2 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-3 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">{st.correctOptionLabel}</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {OPTION_LETTERS.map((letter) => (
            <button
              key={letter}
              onClick={() => setCorrectOption(letter)}
              className={`w-10 h-10 rounded-full text-sm font-bold border transition-colors ${
                correctOption === letter
                  ? 'bg-[#FAEEDA] border-transparent text-[#854F0B]'
                  : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300'
              }`}
            >
              {letter.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">{st.explanationLabel}</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder={st.explanationPlaceholder}
          rows={2}
          className="mt-2 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-3 text-sm resize-none"
        />
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-gray-500 dark:text-slate-400">{st.topicLabel}</label>
        <input
          value={topicTag}
          onChange={(e) => setTopicTag(e.target.value)}
          placeholder={st.topicPlaceholder}
          className="mt-2 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 p-3 text-sm"
        />
      </div>

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

      <button
        onClick={handleSubmit}
        disabled={busy}
        className="mt-6 w-full py-3 rounded-xl bg-gray-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-sm disabled:opacity-60"
      >
        {st.submitBtn}
      </button>
    </div>
  );
}
