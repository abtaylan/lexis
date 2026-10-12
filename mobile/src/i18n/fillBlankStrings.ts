// src/i18n/fillBlankStrings.ts — Boşluk Doldurma oyununun varyant seçimi ve
// harf dizme ekranı metinleri (12 Ekim 2026). GAME_STRINGS'e 10 dilde tek tek
// eklemek yerine ayrı, küçük bir sözlük: bilinmeyen dilde İngilizceye düşer.
import type { Locale } from './locales';

export type FillBlankStrings = {
  variantTitle: string;
  choiceLabel: string;
  choiceDesc: string;
  lettersLabel: string;
  lettersDesc: string;
  typingLabel: string;
  typingDesc: string;
  lettersPrompt: string;
  lettersHint: string;
  resetBtn: string;
  meaningHint: string; // {meaning}
};

const TR: FillBlankStrings = {
  variantTitle: 'Nasıl oynamak istersin?',
  choiceLabel: 'Seçenekli',
  choiceDesc: 'Cümledeki boşluğa uyan kelimeyi seçeneklerden seç',
  lettersLabel: 'Harf dizme (zor)',
  lettersDesc: 'Karışık harflere sırayla dokunarak kelimeyi oluştur',
  typingLabel: 'Yazarak (en zor)',
  typingDesc: 'Boşluğa gelecek kelimeyi klavyeyle yaz',
  lettersPrompt: 'Harflere dokunarak boşluğa gelen kelimeyi oluştur',
  lettersHint: 'Harfleri aşağıdan seç',
  resetBtn: 'Sıfırla',
  meaningHint: 'İpucu: {meaning}',
};

const EN: FillBlankStrings = {
  variantTitle: 'How do you want to play?',
  choiceLabel: 'Multiple choice',
  choiceDesc: 'Pick the word that fits the blank in the sentence',
  lettersLabel: 'Letter tiles (hard)',
  lettersDesc: 'Tap the scrambled letters in order to spell the word',
  typingLabel: 'Typing (hardest)',
  typingDesc: 'Type the missing word with the keyboard',
  lettersPrompt: 'Tap the letters to build the missing word',
  lettersHint: 'Pick the letters below',
  resetBtn: 'Reset',
  meaningHint: 'Hint: {meaning}',
};

const DICT: Partial<Record<Locale, FillBlankStrings>> = {
  tr: TR,
  en: EN,
  de: {
    variantTitle: 'Wie möchtest du spielen?',
    choiceLabel: 'Multiple Choice',
    choiceDesc: 'Wähle das Wort, das in die Lücke passt',
    lettersLabel: 'Buchstaben (schwer)',
    lettersDesc: 'Tippe die gemischten Buchstaben der Reihe nach an',
    typingLabel: 'Tippen (am schwersten)',
    typingDesc: 'Tippe das fehlende Wort mit der Tastatur',
    lettersPrompt: 'Tippe die Buchstaben, um das fehlende Wort zu bilden',
    lettersHint: 'Wähle unten die Buchstaben',
    resetBtn: 'Zurücksetzen',
    meaningHint: 'Hinweis: {meaning}',
  },
  fr: {
    variantTitle: 'Comment veux-tu jouer ?',
    choiceLabel: 'Choix multiple',
    choiceDesc: 'Choisis le mot qui complète la phrase',
    lettersLabel: 'Lettres (difficile)',
    lettersDesc: 'Touche les lettres mélangées dans l’ordre',
    typingLabel: 'Saisie (très difficile)',
    typingDesc: 'Écris le mot manquant au clavier',
    lettersPrompt: 'Touche les lettres pour former le mot manquant',
    lettersHint: 'Choisis les lettres ci-dessous',
    resetBtn: 'Réinitialiser',
    meaningHint: 'Indice : {meaning}',
  },
  es: {
    variantTitle: '¿Cómo quieres jugar?',
    choiceLabel: 'Opción múltiple',
    choiceDesc: 'Elige la palabra que encaja en el hueco',
    lettersLabel: 'Letras (difícil)',
    lettersDesc: 'Toca las letras desordenadas en orden',
    typingLabel: 'Escribir (muy difícil)',
    typingDesc: 'Escribe la palabra que falta con el teclado',
    lettersPrompt: 'Toca las letras para formar la palabra que falta',
    lettersHint: 'Elige las letras de abajo',
    resetBtn: 'Reiniciar',
    meaningHint: 'Pista: {meaning}',
  },
  it: {
    variantTitle: 'Come vuoi giocare?',
    choiceLabel: 'Scelta multipla',
    choiceDesc: 'Scegli la parola che completa la frase',
    lettersLabel: 'Lettere (difficile)',
    lettersDesc: 'Tocca le lettere mescolate in ordine',
    typingLabel: 'Digitando (molto difficile)',
    typingDesc: 'Scrivi la parola mancante con la tastiera',
    lettersPrompt: 'Tocca le lettere per formare la parola mancante',
    lettersHint: 'Scegli le lettere qui sotto',
    resetBtn: 'Azzera',
    meaningHint: 'Suggerimento: {meaning}',
  },
  pt: {
    variantTitle: 'Como você quer jogar?',
    choiceLabel: 'Múltipla escolha',
    choiceDesc: 'Escolha a palavra que completa a lacuna',
    lettersLabel: 'Letras (difícil)',
    lettersDesc: 'Toque nas letras embaralhadas em ordem',
    typingLabel: 'Digitando (muito difícil)',
    typingDesc: 'Digite a palavra que falta no teclado',
    lettersPrompt: 'Toque nas letras para formar a palavra que falta',
    lettersHint: 'Escolha as letras abaixo',
    resetBtn: 'Redefinir',
    meaningHint: 'Dica: {meaning}',
  },
  ru: {
    variantTitle: 'Как хочешь играть?',
    choiceLabel: 'Выбор ответа',
    choiceDesc: 'Выбери слово, которое подходит в пропуск',
    lettersLabel: 'Буквы (сложно)',
    lettersDesc: 'Нажимай на перемешанные буквы по порядку',
    typingLabel: 'Ввод (самый сложный)',
    typingDesc: 'Введи пропущенное слово с клавиатуры',
    lettersPrompt: 'Нажимай на буквы, чтобы собрать пропущенное слово',
    lettersHint: 'Выбери буквы ниже',
    resetBtn: 'Сбросить',
    meaningHint: 'Подсказка: {meaning}',
  },
  ar: {
    variantTitle: 'كيف تريد أن تلعب؟',
    choiceLabel: 'اختيار من متعدد',
    choiceDesc: 'اختر الكلمة المناسبة للفراغ في الجملة',
    lettersLabel: 'الحروف (صعب)',
    lettersDesc: 'المس الحروف المبعثرة بالترتيب لتكوين الكلمة',
    typingLabel: 'الكتابة (الأصعب)',
    typingDesc: 'اكتب الكلمة الناقصة بلوحة المفاتيح',
    lettersPrompt: 'المس الحروف لتكوين الكلمة الناقصة',
    lettersHint: 'اختر الحروف من الأسفل',
    resetBtn: 'إعادة',
    meaningHint: 'تلميح: {meaning}',
  },
  ja: {
    variantTitle: 'どうやって遊びますか？',
    choiceLabel: '選択式',
    choiceDesc: '空欄に合う単語を選ぶ',
    lettersLabel: '文字タイル（難）',
    lettersDesc: 'バラバラの文字を順番にタップして単語を作る',
    typingLabel: '入力（最難）',
    typingDesc: '抜けている単語をキーボードで入力',
    lettersPrompt: '文字をタップして空欄の単語を作ろう',
    lettersHint: '下から文字を選んでください',
    resetBtn: 'リセット',
    meaningHint: 'ヒント: {meaning}',
  },
};

export function getFillBlankStrings(locale: Locale): FillBlankStrings {
  return DICT[locale] ?? EN;
}
