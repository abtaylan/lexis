// src/constants/keyboards.ts — Harf-tahmin oyunlarinda (Adam Asmaca /
// Gunluk Kelime Avi, wordle modu) ekran-uzeri klavyenin ogrenilen dile
// gore hangi alfabeyi gostermesi gerektigini tek bir yerden tanimlar.
//
// KOK NEDEN (26 Eylul 2026, kullanici bildirimi): "Gunluk Kelime Avi"
// (daily-word.tsx) ekrani, game.tsx'teki wordle modundan GORSEL OLARAK
// kopyalanirken (bkz. daily-word.tsx dosya basi yorumu), game.tsx'te
// 7 Eylul'de zaten eklenmis olan Arapca klavye duzeltmesini (bkz. asagidaki
// ARABIC_KEYBOARD_ROWS) PORT ETMEMISTI -- yani Arapca ogrenen bir kullanici
// bu ekranda hala sabit Latin QWERTY goruyordu, Arapca harfleri hic tahmin
// edemiyordu. Ayrica game.tsx'in kendisi de SADECE Arapca'yi kapsiyordu --
// Rusca (Kiril alfabesi) icin hicbir zaman bir klavye tanimlanmamisti.
//
// Bu dosya artik TEK kaynak: hem game.tsx hem daily-word.tsx buradan
// import eder, boylece ileride "kopyala-unut" regresyonu tekrarlanmaz.
//
// KAPSAM DISI (bilincli, ayri bir urun karari gerektiriyor): Korece (ko,
// Hangul heceleri), Cince (zh, Han karakterleri) ve Japonca (ja, Kana/
// Kanji) icin harf-harf tahmin oyun modeli alfabetik degil -- bu diller
// icin "klavye" binlerce/yuzlerce sembol icermesi gerekir, pratik degil.
// Bu ucu icin gercek cozum ayri bir oyun mekanigi (hece secimi, ipucu
// bazli vb.) -- bu dosyanin kapsami disinda. isLetterGuessSupported()
// bu ucunu false dondurur, kullanan ekranlar bu durumda klavyeyi hic
// gostermeyip "bu dil icin bu oyun modu yakinda" mesaji gostermeli.
// 27 Kasim 2026 kullanici istegi -- "Adam Asmaca" (harf-tahmin) klavyesinde
// tuslar kucuk kaliyordu: 3 satirda (10/9/7 harf) her tus dar olmak zorunda.
// Artik TEK alfabe DIZISI (satir sayisindan bagimsiz) tanimlaniyor, ekrana
// cizilirken chunkKeyboardAlphabet() ile satir basina EN FAZLA 6 harf (ilk
// satirlar) sonra 4 harfe inen bir dizilimle bolunuyor -- boylece her tus
// daha genis/buyuk render edilebiliyor (bkz. game.tsx/daily-word.tsx'teki
// styles.key boyut artisi). Latin alfabede (26 harf) bu TAM OLARAK 6+6+6+4+4
// satirina denk geliyor; daha uzun alfabelerde (Arapca/Kirilce) taper 4'te
// devam ediyor.
const LATIN_ALPHABET = 'QWERTYUIOPASDFGHJKLZXCVBNM';

// Bir alfabe dizisini satir basina [6,6,6,4,4,4,4,...] (6'dan sonra hep 4)
// seklinde boler -- 26 harfte TAM 5 satir (6/6/6/4/4), daha uzun alfabelerde
// taper devam eder.
function chunkKeyboardAlphabet(alphabet: string): string[] {
  const sizes = [6, 6, 6, 4, 4];
  const rows: string[] = [];
  let i = 0;
  let sizeIdx = 0;
  while (i < alphabet.length) {
    const size = sizes[sizeIdx] ?? 4;
    rows.push(alphabet.slice(i, i + size));
    i += size;
    sizeIdx++;
  }
  return rows;
}

export const LATIN_KEYBOARD_ROWS = chunkKeyboardAlphabet(LATIN_ALPHABET);
// KULLANICI GERİ BİLDİRİMİ (3 Ekim 2026 — eşin WhatsApp ekran görüntüsü,
// gerçek telefon Arapça klavyesi): önceki dizilim alfabetik sırayla
// (elif-be-te...) 28 temel harfi listeliyordu ama ة (te merbuta), ء
// (hemze), ئ, ؤ gibi gerçek klavyede ayrı tuş olan varyant harfleri hiç
// İÇERMİYORDU — "devlet" (دولة) kelimesini ة ile yazmak isteyen kullanıcı
// oyun klavyesinde bu tuşu bulamıyordu (bkz. game.tsx'teki
// ARABIC_TEH_VARIANTS_RE normalizasyonu — o sadece karşılaştırmayı
// yumuşatıyordu, kök nedeni -klavyede tuşun hiç olmamasını- çözmüyordu).
// Artık gerçek telefon Arapça klavyesiyle BİREBİR aynı 3 satır/32 tuş
// dizilimi kullanılıyor (ekran görüntüsünden harf harf kopyalandı), hem
// standart 28 harfi hem de ة/ء/ئ/ؤ varyantlarını içeriyor.
// Not: ARABIC_KEYBOARD_ROWS gercek telefon klavyesiyle BIREBIR satir/tus
// dizilimi icin bilincli olarak 3 satirda SABIT tutuluyor (bkz. 3 Ekim 2026
// yorumu yukarida) -- chunkKeyboardAlphabet'e tabi TUTULMUYOR. Kirilce ise
// chunk'lanarak daha buyuk tuslardan faydalaniyor.
export const ARABIC_KEYBOARD_ROWS = ['ضصثقفغعهخحج', 'شسيبلاتنمكط', 'ذءؤرئةوزظد'];
const CYRILLIC_ALPHABET = 'ЙЦУКЕНГШЩЗХЪФЫВАПРОЛДЖЭЯЧСМИТЬБЮ';
export const CYRILLIC_KEYBOARD_ROWS = chunkKeyboardAlphabet(CYRILLIC_ALPHABET);

const KEYBOARD_ROWS_BY_LANG: Record<string, string[]> = {
  ar: ARABIC_KEYBOARD_ROWS,
  ru: CYRILLIC_KEYBOARD_ROWS,
};

// Harf-harf tahmin oyun modeli (adam asmaca / wordle) bu diller icin
// alfabetik olmadigi icin desteklenmiyor -- bkz. yukaridaki not.
const LETTER_GUESS_UNSUPPORTED_LANGS = new Set(['ja', 'ko', 'zh']);

export function getKeyboardRowsForLanguage(learningLang: string | undefined | null): string[] {
  if (!learningLang) return LATIN_KEYBOARD_ROWS;
  return KEYBOARD_ROWS_BY_LANG[learningLang] ?? LATIN_KEYBOARD_ROWS;
}

export function isLetterGuessSupported(learningLang: string | undefined | null): boolean {
  if (!learningLang) return true;
  return !LETTER_GUESS_UNSUPPORTED_LANGS.has(learningLang);
}
