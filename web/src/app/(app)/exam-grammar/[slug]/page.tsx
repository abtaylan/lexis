'use client';

// app/(app)/exam-grammar/[slug]/page.tsx — Sınav Hazırlık: Gramer Rehberi konu
// detay sayfası, web. mobile/src/app/(app)/exam-grammar-detail.tsx ile aynı
// desen. Dinamik segment için useParams() kullanılıyor (bkz. u/[username]/page.tsx
// ve messages/[username]/page.tsx'teki aynı yaklaşım).
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, Plus, RefreshCw, XCircle, Languages, HelpCircle } from 'lucide-react';
import { grammarApi, wordsApi } from '@/lib/api';
import { useLocale, type Locale } from '@/lib/i18n';
import { markTopicVisited } from '@/lib/grammarProgress';
import type { StudyPassageResponse, StudyPassageVocabItem, StudyPassageQuestion } from '@/types';

const L: Partial<Record<Locale, Record<string, string>>> = {
  tr: {
    back: 'Geri',
    error: 'Bir şeyler ters gitti, tekrar dene.',
    examplesTitle: 'Örnekler',
    mistakesTitle: 'Sık Yapılan Hatalar',
    practiceCta: 'Bu Konuyu Pratik Et',
    noQuestionsYet: 'Bu konu için henüz pratik sorusu eklenmedi.',
    passageTitle: 'Günün Okuma Parçası',
    passageGenerate: 'Okuma Parçası Üret',
    passageRegenerate: 'Yeni Parça Üret',
    passageVocabTitle: 'Parçadaki Zor Kelimeler',
    passageAdd: 'Ekle',
    passageAdded: 'Eklendi',
    passagePhrasalLabel: 'PHRASAL VERB',
    passageError: 'Okuma parçası üretilemedi, tekrar dener misin?',
    wordAddError: 'Kelime eklenemedi, tekrar dener misin?',
    passageShowTr: 'Türkçesini Göster',
    passageHideTr: 'Türkçesini Gizle',
    passageQuestionsTitle: 'Okuduğunu Anlama Soruları',
    passageQuestionCheck: 'Kontrol Et',
    passageQuestionCorrect: 'Doğru!',
    passageQuestionWrong: 'Yanlış',
  },
  en: {
    back: 'Back',
    error: 'Something went wrong, please try again.',
    examplesTitle: 'Examples',
    mistakesTitle: 'Common Mistakes',
    practiceCta: 'Practice This Topic',
    noQuestionsYet: 'No practice questions for this topic yet.',
    passageTitle: "Today's Study Passage",
    passageGenerate: 'Generate Passage',
    passageRegenerate: 'Generate New Passage',
    passageVocabTitle: 'Challenging Words in This Passage',
    passageAdd: 'Add',
    passageAdded: 'Added',
    passagePhrasalLabel: 'PHRASAL VERB',
    passageError: 'Could not generate the passage, try again?',
    wordAddError: 'Could not add the word, try again?',
    passageShowTr: 'Show Turkish Translation',
    passageHideTr: 'Hide Turkish Translation',
    passageQuestionsTitle: 'Comprehension Questions',
    passageQuestionCheck: 'Check',
    passageQuestionCorrect: 'Correct!',
    passageQuestionWrong: 'Incorrect',
  },
};

// Günün Okuma Parçası (15 Ekim 2026, kullanıcı isteği — bkz. backend
// services/study_passage_generator.py modül docstring'i): o gün çalışılan
// gramer konusunu içeren AI-üretimi kısa okuma parçası + zor kelimeler
// (tek tıkla kendi kelime listesine eklenebilir) + bir phrasal verb.
function StudyPassageSection({ slug, t }: { slug: string; t: Record<string, string> }) {
  const [passage, setPassage] = useState<StudyPassageResponse | null>(null);
  const [addedWords, setAddedWords] = useState<Record<string, boolean>>({});
  const [passageError, setPassageError] = useState('');
  const [addError, setAddError] = useState('');
  const [showTr, setShowTr] = useState(false);
  // 15 Ekim 2026, kullanıcı isteği: her soru için seçilen şık + kontrol
  // edildikten sonra doğru/yanlış + açıklama gösterimi.
  const [quizSelected, setQuizSelected] = useState<Record<number, number>>({});
  const [quizChecked, setQuizChecked] = useState<Record<number, boolean>>({});

  const passageMutation = useMutation({
    mutationFn: () => grammarApi.getStudyPassage(slug),
    onSuccess: (data) => {
      setPassage(data);
      setAddedWords({});
      setPassageError('');
      setShowTr(false);
      setQuizSelected({});
      setQuizChecked({});
    },
    onError: () => setPassageError(t.passageError),
  });

  const addWordMutation = useMutation({
    mutationFn: (item: StudyPassageVocabItem) =>
      wordsApi.create({
        word: item.word,
        meaning: item.meaning_tr,
        meaning_native: item.meaning_tr,
        word_type: item.part_of_speech ?? undefined,
        list_type: 'active',
      }),
  });

  const handleAddWord = (item: StudyPassageVocabItem) => {
    setAddError('');
    addWordMutation.mutate(item, {
      onSuccess: () => setAddedWords((prev) => ({ ...prev, [item.word]: true })),
      onError: () => setAddError(t.wordAddError),
    });
  };

  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2.5">{t.passageTitle}</h2>

      {!passage ? (
        <button
          onClick={() => passageMutation.mutate()}
          disabled={passageMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-[#378ADD] hover:bg-[#2d73c4] disabled:opacity-60 text-white rounded-xl py-3 text-sm font-medium transition-colors"
        >
          {passageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {t.passageGenerate}
        </button>
      ) : (
        <div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{passage.title_tr}</h3>
            <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed mt-2.5">{passage.passage_en}</p>
            {passage.passage_tr && (
              <>
                <button
                  onClick={() => setShowTr((s) => !s)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#378ADD] hover:underline"
                >
                  <Languages className="w-3.5 h-3.5" />
                  {showTr ? t.passageHideTr : t.passageShowTr}
                </button>
                {showTr && (
                  <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed mt-2 bg-gray-50 dark:bg-slate-800/60 rounded-xl p-3">
                    {passage.passage_tr}
                  </p>
                )}
              </>
            )}
            {passage.comprehension_note_tr && (
              <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed mt-2.5">{passage.comprehension_note_tr}</p>
            )}
          </div>

          {passage.vocabulary.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-400 dark:text-slate-500 mb-2">{t.passageVocabTitle}</p>
              <div className="flex flex-col gap-2">
                {passage.vocabulary.map((item) => {
                  const added = addedWords[item.word];
                  return (
                    <div
                      key={item.word}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                          {item.word}
                          {item.part_of_speech && (
                            <span className="text-xs font-normal text-gray-400 dark:text-slate-500"> ({item.part_of_speech})</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.meaning_tr}</p>
                      </div>
                      <button
                        onClick={() => handleAddWord(item)}
                        disabled={added || addWordMutation.isPending}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          added ? 'bg-[#EAF3DE] text-[#3B6D11]' : 'bg-[#E6F1FB] text-[#378ADD] hover:bg-[#d3e8fa]'
                        }`}
                      >
                        {added ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {added ? t.passageAdded : t.passageAdd}
                      </button>
                    </div>
                  );
                })}
              </div>
              {addError && <p className="text-xs text-red-500 mt-2">{addError}</p>}
            </div>
          )}

          {passage.phrasal_verb && (
            <div className="mt-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3.5">
              <p className="text-xs font-bold" style={{ color: '#534AB7' }}>{t.passagePhrasalLabel}</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mt-1">
                {passage.phrasal_verb.phrase} — {passage.phrasal_verb.meaning_tr}
              </p>
              {passage.phrasal_verb.example_sentence && (
                <p className="text-xs text-gray-400 dark:text-slate-500 italic mt-1">{passage.phrasal_verb.example_sentence}</p>
              )}
            </div>
          )}

          {passage.questions.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />{t.passageQuestionsTitle}
              </p>
              <div className="flex flex-col gap-3">
                {passage.questions.map((q: StudyPassageQuestion, qi: number) => {
                  const selected = quizSelected[qi];
                  const checked = quizChecked[qi];
                  const isCorrect = checked && selected === q.correct_index;
                  return (
                    <div key={qi} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3.5">
                      <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">{qi + 1}. {q.question_tr}</p>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {q.options.map((opt, oi) => {
                          const isSelected = selected === oi;
                          const showAsCorrect = checked && oi === q.correct_index;
                          const showAsWrong = checked && isSelected && oi !== q.correct_index;
                          return (
                            <button
                              key={oi}
                              onClick={() => !checked && setQuizSelected((prev) => ({ ...prev, [qi]: oi }))}
                              disabled={checked}
                              className={`text-left text-xs rounded-lg px-3 py-2 border transition-colors ${
                                showAsCorrect
                                  ? 'bg-[#EAF3DE] border-[#3B6D11] text-[#3B6D11]'
                                  : showAsWrong
                                  ? 'bg-[#FDEEEA] border-[#9A3412] text-[#9A3412]'
                                  : isSelected
                                  ? 'bg-[#E6F1FB] border-[#378ADD] text-[#185FA5]'
                                  : 'bg-gray-50 dark:bg-slate-800/60 border-gray-100 dark:border-slate-800 text-gray-600 dark:text-slate-300'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {!checked ? (
                        <button
                          onClick={() => setQuizChecked((prev) => ({ ...prev, [qi]: true }))}
                          disabled={selected === undefined}
                          className="mt-2.5 text-xs font-semibold text-[#378ADD] disabled:opacity-40 hover:underline"
                        >
                          {t.passageQuestionCheck}
                        </button>
                      ) : (
                        <div className="mt-2.5 flex items-start gap-1.5">
                          {isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#3B6D11] shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-[#9A3412] shrink-0 mt-0.5" />
                          )}
                          <p className={`text-xs ${isCorrect ? 'text-[#3B6D11]' : 'text-[#9A3412]'}`}>
                            <span className="font-bold">{isCorrect ? t.passageQuestionCorrect : t.passageQuestionWrong}</span>
                            {q.explanation_tr && <> — {q.explanation_tr}</>}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => passageMutation.mutate()}
            disabled={passageMutation.isPending}
            className="w-full flex items-center justify-center gap-2 mt-4 border-2 border-gray-200 dark:border-slate-700 hover:border-[#378ADD] disabled:opacity-60 text-gray-600 dark:text-slate-300 rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            {passageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t.passageRegenerate}
          </button>
        </div>
      )}
      {passageError && <p className="text-xs text-red-500 mt-2">{passageError}</p>}
    </div>
  );
}

export default function ExamGrammarDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const router = useRouter();
  const { locale } = useLocale();
  const t = L[locale] ?? L.tr!;

  const { data: topic, isLoading, isError } = useQuery({
    queryKey: ['grammar-topic', slug],
    queryFn: () => grammarApi.getTopic(slug),
    enabled: !!slug,
  });

  // Harita görünümünde (exam-grammar/page.tsx) ilerlemenin işaretlenebilmesi
  // için, konu başarıyla yüklendiğinde "ziyaret edildi" olarak kaydedilir
  // (sadece localStorage, bkz. lib/grammarProgress.ts).
  useEffect(() => {
    if (topic?.slug) markTopicVisited(topic.slug);
  }, [topic?.slug]);

  const paragraphs = (topic?.rule_content_md ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <div className="p-6 max-w-xl mx-auto">
      <button
        onClick={() => router.push('/exam-grammar')}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : isError || !topic ? (
        <p className="text-sm text-red-600 dark:text-red-400">{t.error}</p>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {topic.exam_relevance.map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#E6F1FB', color: '#378ADD' }}>
                {tag.toUpperCase()}
              </span>
            ))}
            <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#EEEDFE', color: '#534AB7' }}>
              {topic.level.toUpperCase()}
            </span>
          </div>

          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mt-3">{topic.title_tr}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">{topic.summary_tr}</p>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-5 mt-5">
            {paragraphs.map((line, idx) => {
              const isBullet = line.startsWith('- ');
              return (
                <p
                  key={idx}
                  className={`text-sm text-gray-700 dark:text-slate-300 leading-relaxed ${idx === 0 ? '' : 'mt-2.5'} ${isBullet ? 'ml-4' : ''}`}
                >
                  {isBullet ? `•  ${line.slice(2)}` : line}
                </p>
              );
            })}
          </div>

          {topic.example_sentences.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2.5">{t.examplesTitle}</h2>
              <div className="flex flex-col gap-2">
                {topic.example_sentences.map((example, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3.5">
                    <p className="text-sm text-gray-800 dark:text-slate-200">{example.en}</p>
                    {example.tr && <p className="text-sm text-gray-400 dark:text-slate-500 mt-0.5">{example.tr}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {topic.common_mistakes.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2.5">{t.mistakesTitle}</h2>
              <div className="flex flex-col gap-2">
                {topic.common_mistakes.map((mistake, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 p-3.5">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{mistake.wrong}</p>
                    </div>
                    <div className="flex items-start gap-2 mt-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#3B6D11' }} />
                      <p className="text-sm" style={{ color: '#3B6D11' }}>{mistake.correct}</p>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">{mistake.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            {topic.has_practice_questions ? (
              <button
                onClick={() => router.push(`/exam-topic-practice?topic_tag=${encodeURIComponent(slug)}`)}
                className="w-full bg-[#378ADD] hover:bg-[#2d73c4] text-white rounded-xl py-3 text-sm font-medium transition-colors"
              >
                {t.practiceCta}
              </button>
            ) : (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center">{t.noQuestionsYet}</p>
            )}
          </div>

          <StudyPassageSection slug={slug} t={t} />

          <div className="mb-4" />
        </div>
      )}
    </div>
  );
}
