"""
backend/seed_all_source_languages.py

Amac: "ko/zh disindaki DIGER dillerin de kendi kelime karsiliklarini
sisteme kaydetmesi" -- yani 12 dilin HER BIRI icin (Ingilizce haric,
o zaten seed_general_word_pool.py ile yapiliyor), kalan 11 dile karsi
gercek kelime karsiliklarinin general_word_pool'a yazilmasi.

Bu script, seed_source_language_words.py ile MANTIK OLARAK BIREBIR
AYNI yontemi kullanir (kasten -- iki script farkli davranmasin diye)
ama TAMAMEN BAGIMSIZ bir kopyadir: seed_source_language_words.py su an
calisiyor olabilecegi icin (once ko, sonra zh) bu yeni script ona hic
dokunmaz / import etmez, calisan islemi hicbir sekilde etkilemez.

FARK: seed_source_language_words.py TEK bir dili islemek icin
tasarlandi (`python seed_source_language_words.py ko` gibi, her dil
icin ayri ayri calistiriliyor). Bu script ise BIRDEN FAZLA kaynak
dili TEK CALISTIRMADA, sirayla isler -- yani ko/zh disinda kalan 9
dili (ar,de,es,fr,it,ja,pt,ru,tr) tek komutla, hepsini sirayla
tamamlar; ayri ayri 9 kere komut yazmana gerek kalmaz.

YONTEM (kelimeler NEDEN yanlis cevrilmiyor -- seed_source_language_words.py
ile AYNI, ozet):
  1) Her Ingilizce capa kavram (seed_general_word_pool.py'deki KANONIK
     BEGINNER/INTERMEDIATE/ADVANCED listesinden ITHAL edilir, hicbir
     yeni kelime listesi UYDURULMAZ), MyMemory ile GERCEKTEN o kaynak
     dile cevrilir. Ceviri basarisiz olursa ya da kelimenin KENDISIYLE
     ayni donerse (gercek ceviri degil) o kavram o dil icin atlanir.
  2) O gercek kaynak-dili kelimesi, projede zaten canlida kullanilan
     dictionary_service.lookup_word() zinciriyle (Cambridge ->
     dictionaryapi.dev -> MyMemory) HER hedef dile karsi GERCEKTEN
     sozlukten/ceviriden aranir. Sonuc yoksa satir atlanir, UYDURULMAZ.
  3) Ayni (source_lang, target_lang, word) zaten varsa (case-insensitive)
     tekrar eklenmez -- idempotent, kesintiye ugrarsa (Ctrl+C, internet
     kopmasi vb.) GUVENLE tekrar calistirilip kaldigi yerden devam
     ettirilebilir.

CALISTIRMA:
    cd backend
    venv\\Scripts\\activate      # Windows

    # Varsayilan: ko ve zh HARIC kalan 9 kaynak dili sirayla islet
    python seed_all_source_languages.py

    # Ya da sadece belirli dil(ler)i islet (orn. once sadece Almanca):
    python seed_all_source_languages.py de

    # Birden fazla ama hepsi degil:
    python seed_all_source_languages.py ar de es

ONEMLI SURE UYARISI: Her kaynak dil basina ~1300 kavram x ~12 gercek
dis API cagrisi = binlerce istek; REQUEST_DELAY_SECONDS gecikmesiyle
TEK dil bile saatler surebilir. 9 dilin HEPSININ tek calistirmada
sirayla bitmesi (varsayilan mod) gunler surebilir -- bu YUZDEN
script Ctrl+C ile GUVENLE durdurulup, daha sonra AYNI komutla (veya
kalan dilleri tek tek belirterek) kaldigi yerden devam ettirilebilir;
onceden eklenen kelimeler tekrar sorgulanmaz. Bilgisayarini/internetini
uzun sure acik tutamayacaksan, dilleri birer birer (`python
seed_all_source_languages.py de` sonra `... es` gibi) kucuk parcalar
halinde calistirmak daha guvenli olabilir.
"""

import asyncio
import sys

from app.core.database import supabase_admin
from app.services.dictionary_providers import mymemory
from app.services.dictionary_service import lookup_word
from seed_general_word_pool import ADVANCED_WORDS, BEGINNER_WORDS, INTERMEDIATE_WORDS

ANCHOR_LANG = "en"

# Lexis'in destekledigi 12 dil (bkz. languages tablosu / migration
# 068_add_korean_chinese_languages.sql) -- seed_source_language_words.py
# ile AYNI liste.
ALL_LANGS = ["en", "tr", "de", "fr", "es", "it", "ar", "ru", "ja", "pt", "ko", "zh"]

# Varsayilan: 'en' (zaten seed_general_word_pool.py ile yapiliyor) ve
# 'ko'/'zh' (seed_source_language_words.py ile ayri ayri calisiyor/
# calistirildi) HARIC kalan TUM kaynak diller.
DEFAULT_SOURCE_LANGS = [l for l in ALL_LANGS if l not in (ANCHOR_LANG, "ko", "zh")]

if len(sys.argv) > 1:
    requested = sys.argv[1:]
    invalid = [l for l in requested if l not in ALL_LANGS or l == ANCHOR_LANG]
    if invalid:
        print(f"Gecersiz dil kodu/kodlari: {invalid}")
        print(f"Gecerli kodlar ('{ANCHOR_LANG}' haric): {[l for l in ALL_LANGS if l != ANCHOR_LANG]}")
        sys.exit(1)
    SOURCE_LANGS = requested
else:
    SOURCE_LANGS = DEFAULT_SOURCE_LANGS

# Sozluk/ceviri API'lerine nazik davranmak icin istekler arasi bekleme
# (saniye) -- diger seed script'leriyle AYNI deger.
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


async def get_source_word(source_lang: str, anchor_word: str) -> str | None:
    """Ingilizce capa kavrami source_lang'e GERCEKTEN cevirir (MyMemory).
    Ceviri basarisiz olursa ya da kelimenin KENDISIYLE ayni donerse
    (gercek bir ceviri degil) None doner -- UYDURULMAZ."""
    translated = await mymemory.translate(anchor_word, ANCHOR_LANG, source_lang)
    if not translated.strip():
        return None
    if translated.strip().casefold() == anchor_word.strip().casefold():
        return None
    return translated.strip()


async def seed_target(source_lang: str, source_word: str, level: str, target_lang: str) -> str:
    """Tek bir (source_word, target_lang) ciftini isler.
    Donus: 'eklendi' | 'zaten_vardi' | 'bulunamadi'."""
    if word_exists(source_lang, target_lang, source_word):
        return "zaten_vardi"

    result = await lookup_word(source_word, source_lang, target_lang)
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
        "source_lang": source_lang,
        "target_lang": target_lang,
        "word": source_word,
        "meaning": meaning_native,
        "example": example,
        "difficulty_level": level,
        "is_active": True,
    }
    insert_result = supabase_admin.table("general_word_pool").insert(row).execute()
    return "eklendi" if insert_result.data else "bulunamadi"


async def seed_language(source_lang: str) -> dict:
    target_langs = [l for l in ALL_LANGS if l != source_lang]
    print(f"\n=== source_lang={source_lang}, {len(CONCEPTS)} kavram x {len(target_langs)} hedef dil ===\n")
    stats = {"eklendi": 0, "zaten_vardi": 0, "bulunamadi": 0, "capa_cevirisi_basarisiz": 0}

    for anchor_word, level in CONCEPTS:
        source_word = await get_source_word(source_lang, anchor_word)
        await asyncio.sleep(REQUEST_DELAY_SECONDS)
        if not source_word:
            stats["capa_cevirisi_basarisiz"] += 1
            print(f"  [CAPA CEVIRISI YOK] {anchor_word}")
            continue

        for target_lang in target_langs:
            outcome = await seed_target(source_lang, source_word, level, target_lang)
            stats[outcome] += 1
            if outcome == "eklendi":
                print(f"  [EKLENDI] {source_word} ({source_lang}->{target_lang}, {level})")
            await asyncio.sleep(REQUEST_DELAY_SECONDS)

    print(f"\n=== {source_lang} tamamlandi ===")
    print(stats)
    return stats


async def main() -> None:
    print(f"=== Toplam {len(SOURCE_LANGS)} kaynak dil, SIRAYLA islenecek: {SOURCE_LANGS} ===")
    all_stats = {}
    for source_lang in SOURCE_LANGS:
        all_stats[source_lang] = await seed_language(source_lang)

    print("\n\n=== TUMU TAMAMLANDI -- ozet ===")
    for lang, stats in all_stats.items():
        print(f"  {lang}: {stats}")


if __name__ == "__main__":
    asyncio.run(main())
