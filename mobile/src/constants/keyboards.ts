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
export const LATIN_KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
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
export const ARABIC_KEYBOARD_ROWS = ['ضصثقفغعهخحج', 'شسيبلاتنمكط', 'ذءؤرئةوزظد'];
export const CYRILLIC_KEYBOARD_ROWS = ['ЙЦУКЕНГШЩЗХЪ', 'ФЫВАПРОЛДЖЭ', 'ЯЧСМИТЬБЮ'];

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
