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
  },
};
