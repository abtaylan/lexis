"""
backend/seed_general_word_pool.py

Kelime tahmin oyunu için genel kelime havuzunu (general_word_pool tablosu)
doldurur. Bu script kullanıcı hesabı gerektirmez — service-role
(supabase_admin) client ile doğrudan tabloya yazar.

Anlam/örnek cümleleri UYDURULMAZ: mevcut app.services.dictionary_service
.lookup_word() fonksiyonu (Cambridge -> dictionaryapi.dev -> MyMemory
zinciri, kelime ekleme akışında zaten canlıda kullanılan aynı kod)
çağrılarak gerçek sözlük verisi çekilir. Bir kelime için anlam
bulunamazsa o kelime ATLANIR (tabloya yanlış/uydurma veri yazılmaz) ve
script sonunda "bulunamayan kelimeler" listesi olarak raporlanır.

Kapsam (v1): source_lang='en', target_lang='tr' (README'de şu an tam
desteklenen tek dil çifti bu). Diğer dil çiftleri ileride ayrı bir
script/parametre ile eklenebilir.

Çalıştırma:
    cd backend
    venv\\Scripts\\activate      # Windows
    python seed_general_word_pool.py

Var olan (aynı source_lang + target_lang + word, case-insensitive)
kayıtları tekrar eklemez.
"""

import asyncio

from app.core.database import supabase_admin
from app.services.dictionary_service import lookup_word

SOURCE_LANG = "en"
TARGET_LANG = "tr"

# Sözlük API'lerine nazik davranmak için istekler arası bekleme (saniye)
REQUEST_DELAY_SECONDS = 0.4

# ──────────────────────────────────────────────────────────────────────
# Kelime listesi: (word, difficulty_level)
# difficulty_level: "beginner" | "intermediate" | "advanced"
# Yaygın kullanım sıklığına göre kabaca 3 seviyeye ayrılmış ~300 kelime.
# ────────────────────────────────────────────────────────────────────

BEGINNER_WORDS = [
    "house", "water", "food", "family", "friend", "school", "work", "time",
    "day", "night", "morning", "evening", "big", "small", "good", "bad",
    "happy", "sad", "hot", "cold", "run", "walk", "eat", "drink", "sleep",
    "read", "write", "speak", "listen", "watch", "book", "table", "chair",
    "door", "window", "car", "bus", "train", "city", "country", "street",
    "money", "shop", "market", "phone", "computer", "letter", "name",
    "number", "color", "red", "blue", "green", "yellow", "black", "white",
    "mother", "father", "sister", "brother", "child", "baby", "man",
    "woman", "boy", "girl", "dog", "cat", "bird", "tree", "flower", "sun",
    "moon", "star", "sky", "rain", "snow", "wind", "summer", "winter",
    "spring", "autumn", "week", "month", "year", "hour", "minute",
    "breakfast", "lunch", "dinner", "kitchen", "bedroom", "bathroom",
    "garden", "park", "hospital", "doctor", "teacher", "student", "job",
    "music", "movie",
]

INTERMEDIATE_WORDS = [
    "however", "therefore", "although", "similar", "opportunity",
    "environment", "decision", "government", "economy", "increase",
    "decrease", "achieve", "develop", "improve", "suggest", "consider",
    "evidence", "research", "method", "result", "effect", "cause",
    "benefit", "challenge", "solution", "process", "system", "structure",
    "function", "purpose", "avoid", "prevent", "reduce", "produce",
    "provide", "require", "involve", "include", "exclude", "describe",
    "explain", "compare", "contrast", "analyze", "evaluate", "discuss",
    "argue", "claim", "assume", "predict", "estimate", "measure",
    "calculate", "organize", "manage", "control", "influence", "impact",
    "significant", "essential", "sufficient", "appropriate", "relevant",
    "obvious", "complex", "particular", "specific", "general",
    "individual", "various", "several", "entire", "previous", "current",
    "future", "recent", "immediate", "gradual", "temporary", "permanent",
    "available", "possible", "likely", "unlikely", "certain", "uncertain",
    "aware", "familiar", "curious", "confident", "anxious", "motivated",
    "exhausted", "frustrated", "satisfied", "disappointed", "surprised",
    "concerned", "determined", "flexible",
]

ADVANCED_WORDS = [
    "ambiguous", "meticulous", "ubiquitous", "paradox", "resilience",
    "plausible", "arbitrary", "coherent", "discrepancy", "eloquent",
    "pragmatic", "subtle", "tangible", "intangible", "inevitable",
    "redundant", "superficial", "profound", "comprehensive", "elaborate",
    "ostensibly", "inherently", "inadvertently", "notwithstanding",
    "nonetheless", "albeit", "whereby", "thereby", "henceforth",
    "subsequently", "consequently", "nevertheless", "furthermore",
    "moreover", "whereas", "encompass", "constitute", "undermine",
    "exacerbate", "mitigate", "alleviate", "facilitate", "corroborate",
    "substantiate", "refute", "contend", "postulate", "infer", "deduce",
    "extrapolate", "ascertain", "discern", "scrutinize", "elucidate",
    "delineate", "articulate", "epitomize", "exemplify", "juxtapose",
    "reconcile", "dichotomy", "hypothesis", "empirical", "theoretical",
    "ideological", "paradigm", "phenomenon", "anomaly", "catalyst",
    "precedent", "ramification", "repercussion", "implication",
    "connotation", "denotation", "nuance", "ambivalence", "apathy",
    "empathy", "skepticism", "cynicism", "altruism", "pragmatism",
    "autonomy", "sovereignty", "jurisdiction", "legislation",
    "litigation", "arbitration", "mediation", "negotiation", "diplomacy",
    "sanction", "embargo", "tariff", "subsidy", "deficit", "surplus",
    "inflation", "recession", "austerity",
]

WORDS = (
    [(w, "beginner") for w in BEGINNER_WORDS]
    + [(w, "intermediate") for w in INTERMEDIATE_WORDS]
    + [(w, "advanced") for w in ADVANCED_WORDS]
)


def word_exists(word: str) -> bool:
    existing = (
        supabase_admin.table("general_word_pool")
        .select("id")
        .eq("source_lang", SOURCE_LANG)
        .eq("target_lang", TARGET_LANG)
        .ilike("word", word)
        .execute()
    )
    return bool(existing.data)


async def seed() -> None:
    print(f"{len(WORDS)} kelime işlenecek (en -> tr)...\n")

    inserted, skipped_existing, not_found = 0, 0, []

    for word, level in WORDS:
        if word_exists(word):
            skipped_existing += 1
            print(f"  [ATLA] {word} — zaten havuzda")
            continue

        result = await lookup_word(word, SOURCE_LANG, TARGET_LANG)
        meanings = result.get("meanings") or []

        if not meanings:
            not_found.append(word)
            print(f"  [BULUNAMADI] {word} — {result.get('error')}")
            await asyncio.sleep(REQUEST_DELAY_SECONDS)
            continue

        first = meanings[0]
        meaning_native = (first.get("meaning_native") or "").strip()
        examples = first.get("examples") or []
        example = examples[0] if examples else None

        if not meaning_native:
            not_found.append(word)
            print(f"  [BULUNAMADI] {word} — çeviri boş döndü")
            await asyncio.sleep(REQUEST_DELAY_SECONDS)
            continue

        row = {
            "source_lang": SOURCE_LANG,
            "target_lang": TARGET_LANG,
            "word": word,
            "meaning": meaning_native,
            "example": example,
            "difficulty_level": level,
            "is_active": True,
        }

        insert_result = supabase_admin.table("general_word_pool").insert(row).execute()
        if insert_result.data:
            inserted += 1
            print(f"  [EKLENDI] {word} ({level}) -> {meaning_native}")
        else:
            not_found.append(word)
            print(f"  [HATA] {word} — insert başarısız")

        await asyncio.sleep(REQUEST_DELAY_SECONDS)

    print("\n── Özet ──")
    print(f"Eklendi: {inserted}")
    print(f"Zaten vardı (atlandı): {skipped_existing}")
    print(f"Bulunamadı/hata (atlandı): {len(not_found)}")
    if not_found:
        print("Bulunamayan kelimeler:", ", ".join(not_found))


if __name__ == "__main__":
    asyncio.run(seed())
