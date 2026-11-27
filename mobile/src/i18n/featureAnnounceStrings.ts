// featureAnnounceStrings.ts — "3 Yeni Özellik" uygulama-içi poster alert
// içeriği (27 Kasım 2026 kullanıcı talebi: "bu posterleri sistemde ana
// dili TR olmayanlar için hangi ana dilde user varsa onun dilinde
// paylaşılmalı mobil ve web de, sosyal medyalarda sadece TR poster olması
// yeterli"). Bu yüzden bu dosya SADECE uygulama-içi (web + mobil) poster
// alert bileşeni içindir; sosyal medya paylaşımı tek bir TR statik görsel
// ile yapılır, ayrı bir yerelleştirmeye ihtiyaç yoktur.
//
// lingoTitle/lingoDesc ve crosswordTitle/crosswordDesc değerleri, oyun
// modu seçim ekranındaki (game/page.tsx / gameStrings.ts) modeLingoLabel/
// modeLingoDesc ve modeCrosswordLabel/modeCrosswordDesc ile BİREBİR AYNI
// alınmıştır (tutarlılık için) — scanTitle, Sidebar.tsx::IMAGE_SCAN_LABEL
// ile birebir aynıdır. scanDesc ise bu üç özellik için ortak "kart" formatı
// tamamlansın diye buraya özel yazılmıştır (başka bir yerde karşılığı yok).
//
// web/src/lib/featureAnnounceStrings.ts ile bu dosya AYNI içeriktedir —
// games.py/duels.py'deki kasıtlı modül bağımsızlığı kuralıyla aynı
// gerekçeyle (mobil/web birbirinden habersiz, bağımsız derlenir).

export type FeatureAnnounceLocale = 'tr' | 'en' | 'ar' | 'ru' | 'de' | 'fr' | 'es' | 'it' | 'ja' | 'pt';

export interface FeatureAnnounceStrings {
  kicker: string;
  headline: string;
  subtitle: string;
  cta: string;
  dismiss: string;
  newTag: string;
  scanTitle: string;
  scanDesc: string;
  crosswordTitle: string;
  crosswordDesc: string;
  lingoTitle: string;
  lingoDesc: string;
}

export const FEATURE_ANNOUNCE_STRINGS: Record<FeatureAnnounceLocale, FeatureAnnounceStrings> = {
  tr: {
    kicker: 'YENİ GÜNCELLEME',
    headline: '3 Yeni Özellik Seni Bekliyor',
    subtitle: 'Görsel Tara, Çengel Bulmaca ve Lingo artık Lexis\'te',
    cta: 'Hemen Dene',
    dismiss: 'Daha sonra',
    newTag: 'YENİ',
    scanTitle: 'Görsel Tara',
    scanDesc: 'Fotoğraftaki metni oku, anında çevir, kelimeleri tek dokunuşla listene ekle.',
    crosswordTitle: 'Çengel Bulmaca',
    crosswordDesc: 'İpuçlarına bakarak bulmacayı tamamla.',
    lingoTitle: 'Lingo',
    lingoDesc: 'Tam kelimeyi tahmin et, doğru harfler yerinde kalır.',
  },
  en: {
    kicker: 'NEW UPDATE',
    headline: '3 New Features Are Here',
    subtitle: 'Scan Image, Hook Crossword and Lingo are now in Lexis',
    cta: 'Try Now',
    dismiss: 'Maybe later',
    newTag: 'NEW',
    scanTitle: 'Scan Image',
    scanDesc: 'Read text from a photo, translate it instantly, and add words to your list in one tap.',
    crosswordTitle: 'Hook Crossword',
    crosswordDesc: 'Solve the puzzle using the clues.',
    lingoTitle: 'Lingo',
    lingoDesc: 'Guess the whole word — correct letters lock in place.',
  },
  ar: {
    kicker: 'تحديث جديد',
    headline: '3 ميزات جديدة بانتظارك',
    subtitle: 'مسح الصورة، الكلمات المتقاطعة، ولينجو متوفرة الآن في Lexis',
    cta: 'جرّب الآن',
    dismiss: 'لاحقًا',
    newTag: 'جديد',
    scanTitle: 'مسح الصورة',
    scanDesc: 'اقرأ النص من صورة، ترجمه فورًا، وأضف الكلمات إلى قائمتك بلمسة واحدة.',
    crosswordTitle: 'الكلمات المتقاطعة',
    crosswordDesc: 'أكمل الكلمات المتقاطعة باستخدام الأدلة.',
    lingoTitle: 'لينجو',
    lingoDesc: 'خمّن الكلمة كاملة، الأحرف الصحيحة تبقى في مكانها.',
  },
  ru: {
    kicker: 'НОВОЕ ОБНОВЛЕНИЕ',
    headline: 'Тебя ждут 3 новые функции',
    subtitle: 'Сканирование изображений, кроссворд и Линго теперь в Lexis',
    cta: 'Попробовать',
    dismiss: 'Позже',
    newTag: 'НОВОЕ',
    scanTitle: 'Сканировать изображение',
    scanDesc: 'Прочитай текст с фото, переведи мгновенно и добавь слова в свой список одним касанием.',
    crosswordTitle: 'Кроссворд',
    crosswordDesc: 'Реши кроссворд, используя подсказки.',
    lingoTitle: 'Линго',
    lingoDesc: 'Угадай слово целиком — правильные буквы остаются на месте.',
  },
  de: {
    kicker: 'NEUES UPDATE',
    headline: '3 neue Funktionen warten auf dich',
    subtitle: 'Bild scannen, Kreuzworträtsel und Lingo sind jetzt in Lexis',
    cta: 'Jetzt ausprobieren',
    dismiss: 'Später',
    newTag: 'NEU',
    scanTitle: 'Bild scannen',
    scanDesc: 'Lies den Text aus einem Foto, übersetze ihn sofort und füge Wörter mit einem Tipp zu deiner Liste hinzu.',
    crosswordTitle: 'Kreuzworträtsel',
    crosswordDesc: 'Löse das Rätsel mithilfe der Hinweise.',
    lingoTitle: 'Lingo',
    lingoDesc: 'Errate das ganze Wort — richtige Buchstaben bleiben stehen.',
  },
  fr: {
    kicker: 'NOUVELLE MISE À JOUR',
    headline: '3 nouvelles fonctionnalités t\'attendent',
    subtitle: 'Scanner une image, Mots Croisés et Lingo sont maintenant dans Lexis',
    cta: 'Essayer maintenant',
    dismiss: 'Plus tard',
    newTag: 'NOUVEAU',
    scanTitle: 'Scanner une image',
    scanDesc: 'Lis le texte d\'une photo, traduis-le instantanément et ajoute les mots à ta liste en un geste.',
    crosswordTitle: 'Mots Croisés',
    crosswordDesc: 'Résous la grille à l\'aide des indices.',
    lingoTitle: 'Lingo',
    lingoDesc: 'Devine le mot entier — les lettres correctes restent en place.',
  },
  es: {
    kicker: 'NUEVA ACTUALIZACIÓN',
    headline: 'Te esperan 3 nuevas funciones',
    subtitle: 'Escanear imagen, Crucigrama y Lingo ya están en Lexis',
    cta: 'Probar ahora',
    dismiss: 'Más tarde',
    newTag: 'NUEVO',
    scanTitle: 'Escanear imagen',
    scanDesc: 'Lee el texto de una foto, tradúcelo al instante y añade palabras a tu lista con un toque.',
    crosswordTitle: 'Crucigrama',
    crosswordDesc: 'Resuelve el crucigrama usando las pistas.',
    lingoTitle: 'Lingo',
    lingoDesc: 'Adivina la palabra completa — las letras correctas se quedan fijas.',
  },
  it: {
    kicker: 'NUOVO AGGIORNAMENTO',
    headline: 'Ti aspettano 3 nuove funzionalità',
    subtitle: 'Scansiona immagine, Cruciverba e Lingo sono ora su Lexis',
    cta: 'Prova ora',
    dismiss: 'Più tardi',
    newTag: 'NUOVO',
    scanTitle: 'Scansiona immagine',
    scanDesc: 'Leggi il testo di una foto, traducilo all\'istante e aggiungi le parole al tuo elenco con un tocco.',
    crosswordTitle: 'Cruciverba',
    crosswordDesc: 'Risolvi il cruciverba usando gli indizi.',
    lingoTitle: 'Lingo',
    lingoDesc: 'Indovina la parola intera — le lettere corrette restano fisse.',
  },
  ja: {
    kicker: '新しいアップデート',
    headline: '3つの新機能が登場',
    subtitle: '画像をスキャン、クロスワード、Lingoが今Lexisに登場',
    cta: '今すぐ試す',
    dismiss: '後で',
    newTag: '新規',
    scanTitle: '画像をスキャン',
    scanDesc: '写真の中の文字を読み取り、即座に翻訳して、タップ一つで単語リストに追加。',
    crosswordTitle: 'クロスワード',
    crosswordDesc: 'ヒントを見てクロスワードを完成させよう。',
    lingoTitle: 'Lingo',
    lingoDesc: '単語全体を当てよう — 正解した文字はそのまま固定される。',
  },
  pt: {
    kicker: 'NOVA ATUALIZAÇÃO',
    headline: '3 novos recursos te esperam',
    subtitle: 'Escanear Imagem, Palavras Cruzadas e Lingo já estão no Lexis',
    cta: 'Experimentar agora',
    dismiss: 'Mais tarde',
    newTag: 'NOVO',
    scanTitle: 'Escanear Imagem',
    scanDesc: 'Leia o texto de uma foto, traduza na hora e adicione palavras à sua lista com um toque.',
    crosswordTitle: 'Palavras Cruzadas',
    crosswordDesc: 'Resolve as palavras cruzadas usando as dicas.',
    lingoTitle: 'Lingo',
    lingoDesc: 'Adivinha a palavra inteira — as letras certas ficam fixas.',
  },
};
