// src/i18n/examStrings.ts — Sınav Hazırlık Alanı (YDS/YÖKDİL/IELTS/TOEFL)
// ekranı sözlüğü. Bu alan şimdilik sadece native_lang=tr + learning_lang=en
// kullanıcılarına gösterildiği için (bkz. backend exams.py::_exam_area_enabled)
// sadece tr/en tam olarak dolduruldu — diğer 8 dil için index.tsx'te tr'ye
// düşülüyor (bu kullanıcılar zaten ekranı hiç görmüyor).
import type { Locale } from './locales';

export type ExamStrings = {
  entryLabel: string;
  pageTitle: string;
  pageSubtitle: string;
  bannerCta: string;
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
  addWordDoneTpl: string;
  finishBtn: string;
  doneTitle: string;
  doneScoreTpl: string;
  doneXpTpl: string;
  mockBonusTpl: string;
  levelUpTpl: string;
  playAgainBtn: string;
  backToDashboardBtn: string;
  suggestEntryLabel: string;
  suggestTitle: string;
  suggestSubtitle: string;
  suggestExamTypeLabel: string;
  suggestQuestionLabel: string;
  suggestQuestionPlaceholder: string;
  suggestOptionLabelTpl: string;
  suggestOptionPlaceholderTpl: string;
  suggestCorrectOptionLabel: string;
  suggestExplanationLabel: string;
  suggestExplanationPlaceholder: string;
  suggestTopicLabel: string;
  suggestTopicPlaceholder: string;
  suggestSubmitBtn: string;
  suggestValidationError: string;
  suggestSuccessTitle: string;
  suggestSuccessBody: string;
  suggestAnotherBtn: string;
  grammarEntryLabel: string;
  grammarListTitle: string;
  grammarListSubtitle: string;
  grammarEmptyState: string;
  grammarExamplesTitle: string;
  grammarMistakesTitle: string;
  grammarPracticeCta: string;
  grammarNoQuestionsYet: string;
};

export const EXAM_STRINGS: Partial<Record<Locale, ExamStrings>> = {
  tr: {
    entryLabel: 'Sınav Hazırlık',
    pageTitle: 'Sınav Hazırlık Alanı',
    pageSubtitle: 'YDS, YÖKDİL, IELTS ve TOEFL için örnek sorularla pratik yap, doğru cevap analizini oku, kelimeleri hazinene ekle.',
    bannerCta: 'Sorulara Başla',
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
    addWordDoneTpl: '{count} kelime hazinene eklendi',
    finishBtn: 'Bitir',
    doneTitle: 'Tamamlandı!',
    doneScoreTpl: 'Skor: {score} / {total}',
    doneXpTpl: 'Kazanılan XP: {xp}',
    mockBonusTpl: 'Deneme tamamlama bonusu: +{xp} XP',
    levelUpTpl: 'Seviye atladın! Yeni seviye: {level}',
    playAgainBtn: 'Tekrar Dene',
    backToDashboardBtn: 'Panele Dön',
    suggestEntryLabel: 'Soru Öner',
    suggestTitle: 'Soru Öner',
    suggestSubtitle: 'Kendi hazırladığın soruyu gönder — ekibimiz onayladıktan sonra havuza eklenir ve diğer kullanıcılarla paylaşılır.',
    suggestExamTypeLabel: 'Sınav Türü',
    suggestQuestionLabel: 'Soru Metni',
    suggestQuestionPlaceholder: 'Soruyu buraya yaz — boşluk için ------- kullanabilirsin.',
    suggestOptionLabelTpl: 'Şık {letter}',
    suggestOptionPlaceholderTpl: 'Şık {letter} metni',
    suggestCorrectOptionLabel: 'Doğru Şık',
    suggestExplanationLabel: 'Açıklama (opsiyonel)',
    suggestExplanationPlaceholder: 'Doğru cevabın neden doğru olduğunu kısaca açıkla',
    suggestTopicLabel: 'Konu Etiketi (opsiyonel)',
    suggestTopicPlaceholder: 'örn. zaman kipleri, phrasal verb, okuma anlama',
    suggestSubmitBtn: 'Gönder',
    suggestValidationError: 'Lütfen soruyu, dört şıkkı da ve doğru şıkkı doldur.',
    suggestSuccessTitle: 'Teşekkürler!',
    suggestSuccessBody: 'Sorun onay kuyruğuna eklendi. Onaylandığında havuza eklenip diğer kullanıcılarla paylaşılacak.',
    suggestAnotherBtn: 'Başka Soru Öner',
    grammarEntryLabel: 'Gramer Rehberi',
    grammarListTitle: 'Gramer Rehberi',
    grammarListSubtitle: 'YDS/YÖKDİL sınavlarında en sık çıkan konular — kural, örnek ve Türkçe konuşanlara özgü hatalar.',
    grammarEmptyState: 'Bu kategoride henüz konu yok.',
    grammarExamplesTitle: 'Örnekler',
    grammarMistakesTitle: 'Sık Yapılan Hatalar',
    grammarPracticeCta: 'Bu Konuyu Pratik Et',
    grammarNoQuestionsYet: 'Bu konu için henüz pratik sorusu eklenmedi.',
  },
  en: {
    entryLabel: 'Exam Prep',
    pageTitle: 'Exam Prep Area',
    pageSubtitle: 'Practice with sample questions for YDS, YÖKDİL, IELTS and TOEFL, read the answer analysis, and add words to your vocabulary.',
    bannerCta: 'Start Practicing',
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
    addWordDoneTpl: '{count} word(s) added to your vocabulary',
    finishBtn: 'Finish',
    doneTitle: 'Completed!',
    doneScoreTpl: 'Score: {score} / {total}',
    doneXpTpl: 'XP earned: {xp}',
    mockBonusTpl: 'Mock completion bonus: +{xp} XP',
    levelUpTpl: 'You leveled up! New level: {level}',
    playAgainBtn: 'Try Again',
    backToDashboardBtn: 'Back to Dashboard',
    suggestEntryLabel: 'Suggest a Question',
    suggestTitle: 'Suggest a Question',
    suggestSubtitle: 'Submit a question you wrote — once our team approves it, it will be added to the pool and shared with other users.',
    suggestExamTypeLabel: 'Exam Type',
    suggestQuestionLabel: 'Question Text',
    suggestQuestionPlaceholder: 'Write the question here — use ------- for the blank.',
    suggestOptionLabelTpl: 'Option {letter}',
    suggestOptionPlaceholderTpl: 'Option {letter} text',
    suggestCorrectOptionLabel: 'Correct Option',
    suggestExplanationLabel: 'Explanation (optional)',
    suggestExplanationPlaceholder: 'Briefly explain why the correct answer is correct',
    suggestTopicLabel: 'Topic Tag (optional)',
    suggestTopicPlaceholder: 'e.g. verb tenses, phrasal verbs, reading comprehension',
    suggestSubmitBtn: 'Submit',
    suggestValidationError: 'Please fill in the question, all four options, and the correct option.',
    suggestSuccessTitle: 'Thank you!',
    suggestSuccessBody: 'Your question was added to the review queue. Once approved, it will join the pool and be shared with other users.',
    suggestAnotherBtn: 'Suggest Another',
    grammarEntryLabel: 'Grammar Guide',
    grammarListTitle: 'Grammar Guide',
    grammarListSubtitle: 'The most common topics in YDS/YÖKDİL exams — rules, examples, and mistakes specific to Turkish speakers.',
    grammarEmptyState: 'No topics in this category yet.',
    grammarExamplesTitle: 'Examples',
    grammarMistakesTitle: 'Common Mistakes',
    grammarPracticeCta: 'Practice This Topic',
    grammarNoQuestionsYet: 'No practice questions for this topic yet.',
  },
};
