"""
backend/seed_source_language_words.py

Kullanici istegi (18-19 Eylul 2026): "kisinin ... diger seviyelerden
kelimelere calismasi gerekecek" konusmasinin devaminda kesfedilen mimari
boslugu kapatmak icin -- "sistemde kelimeler yanlis cevrilmemeli" sarti
ile.

SORUN: general_word_pool tablosu (source_lang, target_lang) ikilisine gore
kelime tutuyor (ogrenilen dildeki KELIME + hedef dildeki ANLAM). Ama
seed_general_word_pool.py SADECE source_lang='en' uretir -- yani havuz
sadece "Ingilizce OGRENENLER" icin gercekten dolu. Canli veritabaninda
dogrulandi (19 Eylul 2026):
  - source_lang='ko' veya 'zh' olan HICBIR satir yok -- kayit formunda bu
    ikisi de "ogrenilecek dil" olarak secilebiliyor ama secilirse oyunlar/
    duellolar TAMAMEN bos kaliyor (general_word_pool'dan hic aday gelmiyor).
  - source_lang in (ar,de,es,fr,it,ja,pt,ru,tr) olan 90 cift zaten dolu
    ama HER BIRI sabit 303 kelimede -- bunlari ureten bir script repo'da
    hic yok (git log'da hic eklenmemis, muhtemelen gecmis bir oturumda
    tek seferlik/elle yapilmis), yani derinligini artirmak icin
    tekrarlanabilir bir arac yoktu. en-source ciftleri ise 18 Eylul
    genisletmesinden sonra ~1300 kelimeye cikti -- yani Ingilizce
    OGRENMEYEN kullanicilar (canli veride 15/61 aktif kullanici, bkz.
    ar:8/es:3/fr:2/de:1/ru:1) yapisal olarak cok daha sigra bir havuzla
    oynuyor.

BU SCRIPT IKI BOSLUGU DA (hem sifir-kapsam hem sig-derinlik) TEK,
TEKRARLANABILIR bir yontemle kapatir -- seed_general_word_pool.py'nin
TAMAMLAYICISIDIR (onu DEGISTIRMEZ, o hala source_lang='en' icin kullanilir).

YONTEM (kelimeler NEDEN yanlis cevrilmiyor): iki adimin ikisi de GERCEK
dis servis cagrisi, hicbir yerde LLM tahmini/uydurma anlam YOK --
  1) Her Ingilizce capa kelime (seed_general_word_pool.py'deki KANONIK
     BEGINNER_WORDS/INTERMEDIATE_WORDS/ADVANCED_WORDS listesinden ITHAL
     edilir, KOPYALANMAZ -- iki script'in ayni kavram kumesine ankorlu
     kalmasi icin), MyMemory (mymemory.translate) ile GERCEKTEN source_lang'e
     cevrilir -- source_lang'deki asil 'word' alani budur (ornegin
     source_lang='ko' icin word='house' degil, MyMemory'nin cevirdigi
     gercek Korece terim yazilir). Ceviri basarisiz olursa ya da kelimenin
     KENDISIYLE ayni donerse (dictionary_service.py'deki AYNI "gercek
     ceviri mi" kontrolu) o kavram bu dil icin atlanir, UYDURULMAZ.
  2) O gercek source_lang kelimesi, dictionary_service.lookup_word() ile
     -- projede ZATEN canlida kullanilan, Cambridge -> dictionaryapi.dev ->
     MyMemory zincirinin AYNISI -- her hedef dile karsi GERCEKTEN
     sozlukten/ceviriden aranir. Hicbir sonuc bulunamazsa o (kelime,hedef)
     satiri atlanir, bos/uydurma satir YAZILMAZ.

BILINEN SINIR: dictionaryapi.dev bazi diller icin (ozellikle 'zh') tanim
saglamiyor olabilir -- bu durumda lookup_word() kendi ic fallback
zincirine gore sadece MyMemory CEVIRISIYLE (tanim/ornek olmadan) devam
eder; bu HALA gercek bir ceviridir, sadece daha az zengin bir satirdir.

CALISTIRMA (kaynak dil zorunlu, 'en' HARIC cunku o seed_general_word_pool.py
ile yapiliyor):
    cd backend
    venv\\Scripts\\activate      # Windows
    python seed_source_language_words.py ko
    python seed_source_language_words.py zh

ONCELIK ONERISI: Once ko ve zh calistirilmali (su an SIFIR kapsam, en
kritik bosluk). ar/de/es/fr/it/ja/pt/ru/tr'nin derinligini en'in
seviyesine (~1300 kelime) cikarmak istege bagli, AYRI bir zamanda
calistirilabilir -- asagidaki SURE UYARISI'na bakin.

SURE/LIMIT UYARISI: Her kavram icin once 1 ceviri (Ingilizce capa ->
source_lang) + sonra source_lang'den GERI KALAN 11 hedef dilin HER BIRINE
karsi 1 sozluk/ceviri cagrisi yapilir -- yani ~1300 kavram x ~12 gercek
dis API cagrisi = ~15.000 istek/dil. REQUEST_DELAY_SECONDS gecikmesiyle
bu TEK dil icin bile saatler surebilir. MyMemory gunluk limiti .env'deki
MYMEMORY_EMAIL ile yukseltilmis durumda ama yine de tek seferde TEK dil
calistirip sonucu kontrol etmek onerilir -- kesintiye ugrarsa (Ctrl+C,
internet kopmasi vb.) asagidaki idempotency sayesinde GUVENLE tekrar
calistirilabilir, kaldigi yerden devam eder (zaten var olan satirlar
tekrar sorgulanmaz).

Var olan (ayni source_lang + target_lang + word, case-insensitive)
kayitlari tekrar eklemez -- seed_general_word_pool.py ile AYNI
idempotency deseni.
"""

import asyncio
import sys

from app.core.database import supabase_admin
from app.services.dictionary_providers import mymemory
from app.services.dictionary_service import lookup_word
from seed_general_word_pool import ADVANCED_WORDS, BEGINNER_WORDS, INTERMEDIATE_WORDS

ANCHOR_LANG = "en"

# Lexis'in desteklegi 12 dil (bkz. languages tablosu / migration
# 068_add_korean_chinese_languages.sql). seed_general_word_pool.py'deki
# TARGET_LANGS ile AYNI listeye 'en' eklenmis hali -- iki script de
# BILEREK bu hardcoded listeyi kullaniyor (DB'den okumuyor), o script'in
# kendi yorumundaki desenle tutarli.
ALL_LANGS = ["en", "tr", "de", "fr", "es", "it", "ar", "ru", "ja", "pt", "ko", "zh"]

if len(sys.argv) < 2 or sys.argv[1] not in ALL_LANGS or sys.argv[1] == ANCHOR_LANG:
    valid = [l for l in ALL_LANGS if l != ANCHOR_LANG]
    print("Kullanim: python seed_source_language_words.py <dil kodu>")
    print(f"Gecerli dil kodlari ('{ANCHOR_LANG}' haric -- o seed_general_word_pool.py ile yapiliyor): {valid}")
    sys.exit(1)

SOURCE_LANG = sys.argv[1]
TARGET_LANGS = [l for l in ALL_LANGS if l != SOURCE_LANG]

# Sozluk/ceviri API'lerine nazik davranmak icin istekler arasi bekleme (saniye)
# -- seed_general_word_pool.py ile AYNI deger.
REQUEST_DELAY_SECONDS = 0.4

CONCEPTS = (
    [(w, "beginner") for w in BEGINNER_WORDS]
    + [(w, "intermediate") for w in INTERMEDIATE_WORDS]
    + [(w, "advanced") for w in ADVANCED_WORDS]
)


def word_exists(source_lang: str, target_lang: str, word: str) -> bool:
    existing = (
        supabase_admin.table("general_word_pool")
        .select("id")
        .eq("source_lang", source_lang)
        .eq("target_lang", target_lang)
        .ilike("word", word)
        .execute()
    )
    return bool(existing.data)


async def get_source_word(anchor_word: str) -> str | None:
    """Ingilizce capa kelimeyi (kavram) source_lang'e GERCEKTEN cevirir
    (MyMemory) -- source_lang'deki asil 'word' alani budur. Ceviri
    basarisiz olursa ya da kelimenin KENDISIYLE ayni donerse (gercek bir
    ceviri degil, bkz. dictionary_service.py'deki ayni kontrol) None
    doner, o kavram bu dil icin atlanir -- UYDURULMAZ."""
    translated = await mymemory.translate(anchor_word, ANCHOR_LANG, SOURCE_LANG)
    if not translated.strip():
        return None
    if translated.strip().casefold() == anchor_word.strip().casefold():
        return None
    return translated.strip()


async def seed_target(source_word: str, level: str, target_lang: str) -> str:
    """Tek bir (source_word, target_lang) ciftini isler.
    Donus: 'eklendi' | 'zaten_vardi' | 'bulunamadi'."""
    if word_exists(SOURCE_LANG, target_lang, source_word):
        return "zaten_vardi"

    result = await lookup_word(source_word, SOURCE_LANG, target_lang)
    meanings = result.get("meanings") or []
    if not meanings:
        return "bulunamadi"

    first = meanings[0]
    meaning_native = (first.get("meaning_native") or "").strip()
    examples = first.get("examples") or []
    example = examples[0] if examples else None

    if not meaning_native:
        return "bulunamadi"

    row = {
        "source_lang": SOURCE_LANG,
        "target_lang": target_lang,
        "word": source_word,
        "meaning": meaning_native,
        "example": example,
        "difficulty_level": level,
        "is_active": True,
    }
    insert_result = supabase_admin.table("general_word_pool").insert(row).execute()
    return "eklendi" if insert_result.data else "bulunamadi"


async def seed() -> None:
    print(f"\n=== source_lang={SOURCE_LANG}, {len(CONCEPTS)} kavram x {len(TARGET_LANGS)} hedef dil ===\n")
    stats = {"eklendi": 0, "zaten_vardi": 0, "bulunamadi": 0, "capa_cevirisi_basarisiz": 0}

    for anchor_word, level in CONCEPTS:
        source_word = await get_source_word(anchor_word)
        await asyncio.sleep(REQUEST_DELAY_SECONDS)
        if not source_word:
            stats["capa_cevirisi_basarisiz"] += 1
            print(f"  [CAPA CEVIRISI YOK] {anchor_word}")
            continue

        for target_lang in TARGET_LANGS:
            outcome = await seed_target(source_word, level, target_lang)
            stats[outcome] += 1
            if outcome == "eklendi":
                print(f"  [EKLENDI] {source_word} ({SOURCE_LANG}->{target_lang}, {level})")
            await asyncio.sleep(REQUEST_DELAY_SECONDS)

    print(f"\n=== {SOURCE_LANG} tamamlandi ===")
    print(stats)


if __name__ == "__main__":
    asyncio.run(seed())
