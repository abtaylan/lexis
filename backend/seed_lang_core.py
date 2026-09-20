"""
backend/seed_lang_core.py

Kullanici istegi (20 Eylul 2026): "her dil icin ayri script olustur" --
seed_all_source_languages.py'nin TEK calistirmada BIRDEN FAZLA dili sirayla
islemesi yerine, artik her kaynak dil icin kendi kucuk script'i var (seed_de.py,
seed_fr.py, seed_es.py, seed_it.py, seed_ar.py, seed_ru.py, seed_ja.py,
seed_pt.py). Bu dosya o script'lerin (ve seed_all_source_languages.py'nin)
ORTAK cekirdegidir -- gercek API cagrilari/dogrulama mantigi TEK YERDE
tutuluyor ki 8+ ayri kopyada birbirinden sapan bug riski olmasin (bu
projenin genelinde "kucuk sabitler/yardimcilar kasten duplike edilir ama
buyuk/gercek is mantigi import edilir" kurali ile tutarli).

YONTEM (kelimeler NEDEN yanlis cevrilmiyor -- seed_source_language_words.py
ile AYNI, ozet):
  1) Her Ingilizce capa kavram (seed_general_word_pool.py'deki KANONIK
     BEGINNER/INTERMEDIATE/ADVANCED listesinden ITHAL edilir, hicbir yeni
     kelime listesi UYDURULMAZ), MyMemory ile GERCEKTEN o kaynak dile
     cevrilir. Ceviri basarisiz olursa ya da kelimenin KENDISIYLE ayni
     donerse (gercek ceviri degil) o kavram o dil icin atlanir.
  2) O gercek kaynak-dili kelimesi, projede zaten canlida kullanilan
     dictionary_service.lookup_word() zinciriyle (Cambridge ->
     dictionaryapi.dev -> MyMemory) HER hedef dile karsi GERCEKTEN
     sozlukten/ceviriden aranir. Sonuc yoksa satir atlanir, UYDURULMAZ.
  3) Ayni (source_lang, target_lang, word) zaten varsa (case-insensitive)
     tekrar eklenmez -- idempotent, kesintiye ugrarsa (Ctrl+C, internet
     kopmasi vb.) GUVENLE tekrar calistirilip kaldigi yerden devam
     ettirilebilir.

DEVRE KESICI (20 Eylul 2026 geri bildirimi): tr calisirken bir noktadan
sonra capa cevirisi ART ARDA onlarca kez basarisiz oldu -- kelime bazli bir
eksiklik degil, MyMemory API'nin gunluk/saatlik istek limitine
takilmasiydi. ANCHOR_FAILURE_CIRCUIT_BREAKER esigi asilinca
RateLimitSuspected firlatilir, cagiran script bunu net bir mesajla
karsilayip erken durur -- saatlerce garanti-basarisiz istek atmak yerine.
"""

import asyncio

from app.core.database import supabase_admin
from app.services.dictionary_providers import mymemory
from app.services.dictionary_service import lookup_word
from seed_general_word_pool import ADVANCED_WORDS, BEGINNER_WORDS, INTERMEDIATE_WORDS

ANCHOR_LANG = "en"

# Lexis'in destekledigi 12 dil (bkz. languages tablosu / migration
# 068_add_korean_chinese_languages.sql) -- diger seed script'leriyle AYNI liste.
ALL_LANGS = ["en", "tr", "de", "fr", "es", "it", "ar", "ru", "ja", "pt", "ko", "zh"]

# Sozluk/ceviri API'lerine nazik davranmak icin istekler arasi bekleme
# (saniye) -- diger seed script'leriyle AYNI deger.
REQUEST_DELAY_SECONDS = 0.4

ANCHOR_FAILURE_CIRCUIT_BREAKER = 20


class RateLimitSuspected(Exception):
    # consecutive_anchor_failures esigi asildiginda seed_language() tarafindan
    # firlatilir -- muhtemel API rate-limit/kota tukenmesi sinyali.
    pass


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
    """Tek bir kaynak dili, ALL_LANGS'teki diger 11 dile karsi tek basina
    isler. RateLimitSuspected firlatabilir -- cagiran script yakalayip
    kullaniciya net bir mesajla haber vermeli (asagidaki script'lerdeki
    __main__ bloklarina bakin)."""
    target_langs = [l for l in ALL_LANGS if l != source_lang]
    print(f"\n=== source_lang={source_lang}, {len(CONCEPTS)} kavram x {len(target_langs)} hedef dil ===\n")
    stats = {"eklendi": 0, "zaten_vardi": 0, "bulunamadi": 0, "capa_cevirisi_basarisiz": 0}
    consecutive_anchor_failures = 0

    for anchor_word, level in CONCEPTS:
        source_word = await get_source_word(source_lang, anchor_word)
        await asyncio.sleep(REQUEST_DELAY_SECONDS)
        if not source_word:
            stats["capa_cevirisi_basarisiz"] += 1
            consecutive_anchor_failures += 1
            print(f"  [CAPA CEVIRISI YOK] {anchor_word}")
            if consecutive_anchor_failures >= ANCHOR_FAILURE_CIRCUIT_BREAKER:
                print(
                    f"\n  [DURDURULDU] {consecutive_anchor_failures} kavram art arda capa "
                    f"cevirisi bulamadi -- tek tek kelimelerin cevrilemez olmasindan degil, "
                    f"muhtemelen MyMemory API gunluk/saatlik istek limitinin dolmasindan "
                    f"kaynaklaniyor. {source_lang} icin kalan kavramlar atlaniyor (hicbir sey "
                    f"uydurulmadi/yanlis yazilmadi -- sadece hic yazilmadi). Birkac saat ya da "
                    f"ertesi gun ayni komutla tekrar calistir, kaldigi yerden (zaten "
                    f"eklenenler atlanarak) guvenle devam eder.\n"
                )
                raise RateLimitSuspected(source_lang)
            continue
        consecutive_anchor_failures = 0

        for target_lang in target_langs:
            outcome = await seed_target(source_lang, source_word, level, target_lang)
            stats[outcome] += 1
            if outcome == "eklendi":
                print(f"  [EKLENDI] {source_word} ({source_lang}->{target_lang}, {level})")
            await asyncio.sleep(REQUEST_DELAY_SECONDS)

    print(f"\n=== {source_lang} tamamlandi ===")
    print(stats)
    return stats
