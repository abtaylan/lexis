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
  suggestXpAwardedTpl: string;
  suggestAnotherBtn: string;
  // "Hata bildirimi" butonu -- 16 Ekim 2026 (bkz. backend exams.py::report_question)
  reportQuestionBtn: string;
  reportModalTitle: string;
  reportReasonWrongAnswer: string;
  reportReasonTypoUnclear: string;
  reportReasonOther: string;
  reportDetailsLabel: string;
  reportDetailsPlaceholder: string;
  reportSubmitBtn: string;
  reportCancelBtn: string;
  reportSuccessMsg: string;
  reportValidationError: string;
  grammarEntryLabel: string;
  grammarListTitle: string;
  grammarListSubtitle: string;
  grammarEmptyState: string;
  // Task #13/#14 (25 Eylul 2026) -- ogrenilen dil icin henuz Gramer
  // Rehberi icerigi yoksa (grammar_topics tablosu su an sadece
  // learning_lang='en' icin dolu) ekran tamamen bos gorunuyordu; bunun
  // yerine acikca bilgilendiren bir bos durum mesaji.
  grammarLangUnavailable: string;
  grammarExamplesTitle: string;
  grammarMistakesTitle: string;
  grammarPracticeCta: string;
  grammarNoQuestionsYet: string;
  reviewGrammarTopicTpl: string;
  practiceThisTopicBtn: string;
  topicPracticeTitle: string;
  topicPracticeSubtitle: string;
  weeklyQuizTitle: string;
  weeklyQuizSubtitle: string;
  // 23 Kasım 2026 -- "Haftalık Toplu Pratik"
  bulkPracticeTitle: string;
  bulkPracticeSubtitle: string;
  monthlyTacticExamTitle: string;
  monthlyTacticExamSubtitle: string;
  bulkPracticeEntryLabel: string;
  bulkPracticeAllDoneHintLabel: string;
  topicPracticeDoneTitle: string;
  weakTopicsTitle: string;
  weakTopicsSubtitle: string;
  weakTopicsEmpty: string;
  weakTopicsAccuracyTpl: string;
  weakTopicsReviewBtn: string;
  weakTopicsPracticeBtn: string;
  // 18 Eylul 2026 -- seviye tespit sinavi (placement), tum kullanicilara
  // uygulama girisinde zorunlu yonlendirme (bkz. dashboard.tsx).
  placementDoneTitle: string;
  placementLevelResultTpl: string;
  // 23 Ekim 2026 -- çeviri cümlesi kurma pratiği (kutudan tıklama yok,
  // kullanıcı kendi yazar; bkz. web/exam-topic-practice/page.tsx aynı anahtarlar).
  translationCounterTpl: string;
  grammarNoteLabel: string;
  wordHintsLabel: string;
  translationInputPlaceholder: string;
  checkBtn: string;
  modelAnswerLabel: string;
  translationCorrectLabel: string;
  translationWrongLabel: string;
  // 23 Kasım 2026 -- çeviri kartında cümle zorluk bilgisi (level + model_number)
  difficultyLevelLabel: string;
  difficultyScaffoldedLabel: string;
  difficultyFreeLabel: string;
  // 23 Kasım 2026 -- "Sınav Taktikleri" banner'ı
  tacticExampleLabel: string;
  examTacticsEntryLabel: string;
  examTacticsPageTitle: string;
  examTacticsPageSubtitle: string;
  examTacticsGeneralGroupLabel: string;
  examTacticsTopicGroupLabel: string;
  examTacticsPracticeBtn: string;
  examTacticsBadgeLabel: string;
  examTacticsExamplesLabel: string;
  examTacticsTopicLabel: string;
  examTacticsCriticalSummaryLabel: string;
  // 24 Kasım 2026 -- pratiğe cevaplanmadan ÖNCE gösterilen gramer ipucu kutusu
  grammarHintLabel: string;
  grammarHintTenseLabel: string;
  grammarHintStructureLabel: string;
  grammarHintBlankTypeLabel: string;
  grammarHintReasoningLabel: string;
  // 24 Kasım 2026 (4. tur) -- mockup'taki "Önemli Uyarı" banner'ı ve
  // "Cevapları Gizle/Göster" butonu
  importantWarningLabel: string;
  answersToggleHideLabel: string;
  answersToggleShowLabel: string;
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
    suggestXpAwardedTpl: '+{xp} XP kazandın — onaylanınca ek XP de eklenecek.',
    suggestAnotherBtn: 'Başka Soru Öner',
    reportQuestionBtn: 'Soruyu Bildir',
    reportModalTitle: 'Bu Soruyu Bildir',
    reportReasonWrongAnswer: 'Doğru cevap yanlış işaretli',
    reportReasonTypoUnclear: 'Yazım hatası / anlaşılmıyor',
    reportReasonOther: 'Diğer',
    reportDetailsLabel: 'Açıklama (opsiyonel)',
    reportDetailsPlaceholder: 'Sorunu kısaca anlat (opsiyonel)',
    reportSubmitBtn: 'Bildir',
    reportCancelBtn: 'Vazgeç',
    reportSuccessMsg: 'Teşekkürler, bildirimin ekibimize iletildi.',
    reportValidationError: 'Lütfen bir sebep seç.',
    grammarEntryLabel: 'Gramer Rehberi',
    grammarListTitle: 'Gramer Rehberi',
    grammarListSubtitle: 'YDS/YÖKDİL sınavlarında en sık çıkan konular — kural, örnek ve Türkçe konuşanlara özgü hatalar.',
    grammarEmptyState: 'Bu kategoride henüz konu yok.',
    grammarLangUnavailable: 'Gramer Rehberi şu anda sadece İngilizce öğrenenler için hazır. Diğer diller için içerik yakında eklenecek.',
    grammarExamplesTitle: 'Örnekler',
    grammarMistakesTitle: 'Sık Yapılan Hatalar',
    grammarPracticeCta: 'Bu Konuyu Pratik Et',
    grammarNoQuestionsYet: 'Bu konu için henüz pratik sorusu eklenmedi.',
    reviewGrammarTopicTpl: '"{topic}" Konusunu İncele',
    practiceThisTopicBtn: 'Bu Konudan Pratik Yap',
    topicPracticeTitle: 'Konu Pratiği',
    topicPracticeSubtitle: 'Bu konudan birkaç soru daha — XP verilmez, sadece pekiştirme içindir.',
    weeklyQuizTitle: 'Hafta Sonu Quizi',
    weeklyQuizSubtitle: 'Bu haftanın odak konularından karışık sorular.',
    bulkPracticeTitle: 'Haftalık Toplu Pratik',
    bulkPracticeSubtitle: 'Bu haftanın tüm odak konularından geniş kapsamlı bir soru seti -- taktikleri uygulama zamanı.',
    monthlyTacticExamTitle: 'Ayın Taktik Sınavı',
    monthlyTacticExamSubtitle: 'Bu ay öğrendiğin tüm konuların YDS/YÖKDİL formatında taktik sınavı -- ayı tekrar etme zamanı.',
    bulkPracticeEntryLabel: 'Haftalık Toplu Pratik',
    bulkPracticeAllDoneHintLabel: 'Bu haftanın konularını bitirdin — toplu pratik için tam zamanı!',
    topicPracticeDoneTitle: 'Bu tur tamamlandı!',
    weakTopicsTitle: 'Zayıf Konuların',
    weakTopicsSubtitle: 'Son dönemde en çok yanlış yaptığın konular',
    weakTopicsEmpty: 'Henüz zayıf bir konu tespit edilmedi — sınav sorularını çözmeye devam et.',
    weakTopicsAccuracyTpl: 'Doğruluk: %{percent}',
    weakTopicsReviewBtn: 'İncele',
    weakTopicsPracticeBtn: 'Pratik Yap',
    placementDoneTitle: 'Seviye Tespit Sınavı Tamamlandı!',
    placementLevelResultTpl: 'Tahmini seviyen: {level}',
    translationCounterTpl: 'Çeviri {current} / {total}',
    grammarNoteLabel: 'Gramer Notu',
    wordHintsLabel: 'Yardımcı Kelimeler',
    translationInputPlaceholder: 'Çeviriyi buraya yaz…',
    checkBtn: 'Kontrol Et',
    modelAnswerLabel: 'Model Cevap',
    translationCorrectLabel: 'Doğru!',
    translationWrongLabel: 'Yanlış',
    difficultyLevelLabel: 'Seviye',
    difficultyScaffoldedLabel: 'İpuçlu (kolay)',
    difficultyFreeLabel: 'İpuçsuz (zor)',
    tacticExampleLabel: 'Örnek',
    examTacticsEntryLabel: 'Sınav Taktikleri',
    examTacticsPageTitle: 'Sınav Taktikleri',
    examTacticsPageSubtitle: 'YDS/YÖKDİL sorularını gramer veya kelime bilgisi olmadan da hızlıca çözmeni sağlayan pratik taktikler.',
    examTacticsGeneralGroupLabel: 'Genel Stratejiler',
    examTacticsTopicGroupLabel: 'Konu Bazlı Taktikler',
    examTacticsPracticeBtn: 'Taktikle Pratik Yap',
    examTacticsBadgeLabel: 'Taktik',
    examTacticsExamplesLabel: 'Örnekler',
  examTacticsTopicLabel: 'Konu',
    examTacticsCriticalSummaryLabel: 'Kritik Gramer Özeti',
    grammarHintLabel: 'Gramer İpucu',
    grammarHintTenseLabel: 'Zaman',
    grammarHintStructureLabel: 'Yapı',
    grammarHintBlankTypeLabel: 'Boşluk Türü',
    grammarHintReasoningLabel: 'Neden',
    importantWarningLabel: 'Önemli Uyarı',
    answersToggleHideLabel: 'Cevapları Gizle',
    answersToggleShowLabel: 'Cevapları Göster',
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
    suggestXpAwardedTpl: '+{xp} XP earned — you will get bonus XP once it is approved.',
    suggestAnotherBtn: 'Suggest Another',
    reportQuestionBtn: 'Report Question',
    reportModalTitle: 'Report This Question',
    reportReasonWrongAnswer: 'Correct answer is marked wrong',
    reportReasonTypoUnclear: 'Typo / unclear',
    reportReasonOther: 'Other',
    reportDetailsLabel: 'Details (optional)',
    reportDetailsPlaceholder: 'Briefly describe the issue (optional)',
    reportSubmitBtn: 'Report',
    reportCancelBtn: 'Cancel',
    reportSuccessMsg: 'Thanks, your report has been sent to our team.',
    reportValidationError: 'Please select a reason.',
    grammarEntryLabel: 'Grammar Guide',
    grammarListTitle: 'Grammar Guide',
    grammarListSubtitle: 'The most common topics in YDS/YÖKDİL exams — rules, examples, and mistakes specific to Turkish speakers.',
    grammarEmptyState: 'No topics in this category yet.',
    grammarLangUnavailable: 'The Grammar Guide is currently only available for English learners. Content for other languages is coming soon.',
    grammarExamplesTitle: 'Examples',
    grammarMistakesTitle: 'Common Mistakes',
    grammarPracticeCta: 'Practice This Topic',
    grammarNoQuestionsYet: 'No practice questions for this topic yet.',
    reviewGrammarTopicTpl: 'Review "{topic}"',
    practiceThisTopicBtn: 'Practice This Topic',
    topicPracticeTitle: 'Topic Practice',
    topicPracticeSubtitle: 'A few more questions on this topic — no XP, just reinforcement.',
    weeklyQuizTitle: 'Weekend Quiz',
    weeklyQuizSubtitle: "Mixed questions from this week's focus topics.",
    bulkPracticeTitle: 'Weekly Bulk Practice',
    bulkPracticeSubtitle: "A large question set covering all of this week's focus topics -- time to apply the tactics.",
    monthlyTacticExamTitle: "This Month's Tactic Exam",
    monthlyTacticExamSubtitle: 'A YDS/YÖKDİL-style tactic exam covering everything you learned this month -- time to review the month.',
    bulkPracticeEntryLabel: 'Weekly Bulk Practice',
    bulkPracticeAllDoneHintLabel: "You've finished this week's topics — perfect time for bulk practice!",
    topicPracticeDoneTitle: 'Round complete!',
    weakTopicsTitle: 'Your Weak Topics',
    weakTopicsSubtitle: 'Topics you have missed most recently',
    weakTopicsEmpty: 'No weak topics detected yet — keep practicing exam questions.',
    weakTopicsAccuracyTpl: 'Accuracy: {percent}%',
    weakTopicsReviewBtn: 'Review',
    weakTopicsPracticeBtn: 'Practice',
    placementDoneTitle: 'Placement Exam Completed!',
    placementLevelResultTpl: 'Your estimated level: {level}',
    translationCounterTpl: 'Translation {current} / {total}',
    grammarNoteLabel: 'Grammar Note',
    wordHintsLabel: 'Helpful Words',
    translationInputPlaceholder: 'Type your translation here…',
    checkBtn: 'Check',
    modelAnswerLabel: 'Model Answer',
    translationCorrectLabel: 'Correct!',
    translationWrongLabel: 'Wrong',
    difficultyLevelLabel: 'Level',
    difficultyScaffoldedLabel: 'With hints (easy)',
    difficultyFreeLabel: 'Without hints (hard)',
    tacticExampleLabel: 'Example',
    examTacticsEntryLabel: 'Exam Tactics',
    examTacticsPageTitle: 'Exam Tactics',
    examTacticsPageSubtitle: 'Practical tactics to solve YDS/YÖKDİL questions quickly, even without full grammar or vocabulary knowledge.',
    examTacticsGeneralGroupLabel: 'General Strategies',
    examTacticsTopicGroupLabel: 'Topic-Based Tactics',
    examTacticsPracticeBtn: 'Practice With This Tactic',
    examTacticsBadgeLabel: 'Tactic',
    examTacticsExamplesLabel: 'Examples',
  examTacticsTopicLabel: 'Topic',
    examTacticsCriticalSummaryLabel: 'Critical Grammar Summary',
    grammarHintLabel: 'Grammar Hint',
    grammarHintTenseLabel: 'Tense',
    grammarHintStructureLabel: 'Structure',
    grammarHintBlankTypeLabel: 'Blank Type',
    grammarHintReasoningLabel: 'Why',
    importantWarningLabel: 'Important Warning',
    answersToggleHideLabel: 'Hide Answers',
    answersToggleShowLabel: 'Show Answers',
  },
};
