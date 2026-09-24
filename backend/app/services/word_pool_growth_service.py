"""
backend/app/services/word_pool_growth_service.py

24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 4: kullanicilarin kendi
kelime listelerine ekledigi YENI Ingilizce kelimelerin general_word_pool'a
otomatik katilmasi (oyunlar, "gunun kelimesi", sosyal icerik hepsi bu
havuzdan besleniyor -- bkz. games.py, social_content.py).

NEDEN SADECE learning_lang='en': plan orijinal olarak "Cambridge sozlugu ile
CEFR tespiti, 11 dilde" olarak tanimlanmisti, ama Cambridge'in CEFR seviye
verisi (English Vocabulary Profile) SADECE Ingilizce kelimeler icin var --
diger diller icin boyle bir kaynak yok. Ayrica canli scraping denemesi bu
oturumda dogrulanamadi: Cambridge'in Cloudflare bot korumasi hem
device_bash'in proxy'sinden hem WebFetch'ten hem Claude in Chrome'dan
"guvenlik dogrulamasi" sayfasiyla engellendi -- DOM yapisini gormeden kor
bir scraper yazmak (hicbir zaman seviye bulamama riski) yerine, kullanici
onayiyla AYNI Anthropic API deseni (bkz. exam_question_generator.py::
generate_placement_questions) kullanildi: kelimenin KENDISI Claude'a
siniflandirtiliyor (English Vocabulary Profile bilgisi zaten egitim
verisinde). scraping degil, siniflandirma -- icerik URETILMIYOR, bu yuzden
moderasyon kuyrugu (status='pending') GEREKMIYOR (seed_placement_exam_
questions.py'nin aksine, burada model bir SEVIYE ETIKETI seciyor, yeni
bir metin uretmiyor).

AKIS:
  1. `words` tablosunda source_lang='en' olan, ama general_word_pool'da
     (source_lang='en', target_lang=X, word=Y) henuz karsiligi olmayan
     (word, target_lang) ciftleri toplanir -- kullanicinin kendi sozluk
     aramasi sirasinda zaten doldurulmus meaning_native/meaning_target/
     example/word_type alanlari YENIDEN ARANMADAN kullanilir.
  2. Bu ciftlerdeki DISTINCT kelimeler (dil ciftinden bagimsiz, CEFR
     seviyesi kelimenin kendi ozelligi) batch'ler halinde Anthropic API'ye
     gonderilip CEFR (a1-c2) etiketi aldirilir.
  3. CEFR -> general_word_pool.difficulty_level (3 kademeli: beginner/
     intermediate/advanced) eslemesi level_assessment_service.LEVEL_TO_BAND
     ile AYNI tablo kullanilarak yapilir (tek bir yerde tanimli tutmak
     icin oradan import edilir).
  4. Her cift icin general_word_pool'a insert edilir (seed_lang_core.py::
     word_exists() ile AYNI guvenlik: insertten hemen once tekrar kontrol
     edilir -- ayni calisma icinde iki kez eklenmeyi onler).

/internal/cron/grow-word-pool (cron.py) + GitHub Actions
(.github/workflows/grow-word-pool.yml, gunluk, already_ran_today ile
tekillestirilmis) tarafindan cagrilir.
"""

from app.core.config import settings
from app.core.database import supabase_admin
from app.services.level_assessment_service import LEVEL_TO_BAND

SOURCE_LANG = "en"

# Bir cron calismasinda en fazla bu kadar YENI (word, target_lang) cifti
# islenir -- organik buyume zaten kucuk hacimli (bu servis yazilirken
# canli veride sadece 10 eksik cift vardi), ama bir anda cok sayida yeni
# kelime eklenirse (ornegin toplu ice aktarim) Anthropic API maliyetini/
# suresini sinirlar.
MAX_NEW_WORDS_PER_RUN = 150

# Tek bir Anthropic cagrisinda siniflandirilacak kelime sayisi -- kucuk
# tutuluyor (generate_placement_questions'daki "buyuk tek cagride model
# ciktisi kesilebiliyor" dersiyle tutarli, bkz. o dosyanin docstring'i).
CLASSIFY_BATCH_SIZE = 40

_SUBMIT_LEVELS_TOOL = {
    "name": "submit_word_levels",
    "description": "Her Ingilizce kelime icin CEFR (Diller icin Avrupa Ortak "
    "Basvuru Metni) zorluk seviyesini bildirir.",
    "input_schema": {
        "type": "object",
        "properties": {
            "levels": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "word": {
                            "type": "string",
                            "description": "Siniflandirilan kelime, aynen verildigi gibi.",
                        },
                        "level": {
                            "type": "string",
                            "enum": ["a1", "a2", "b1", "b2", "c1", "c2"],
                            "description": "Kelimenin English Vocabulary Profile / genel "
                            "kullanim sikligina gore en uygun CEFR seviyesi.",
                        },
                    },
                    "required": ["word", "level"],
                },
            }
        },
        "required": ["levels"],
    },
}


class WordLevelClassificationError(Exception):
    pass


def _build_classify_prompt(words: list[str]) -> str:
    word_list = "\n".join(f"- {w}" for w in words)
    return (
        "Asagidaki Ingilizce kelimelerin her biri icin, bir Ingilizce ogrencisinin "
        "bu kelimeyi hangi CEFR seviyesinde (A1, A2, B1, B2, C1 veya C2) ogrenmesi "
        "beklenir? Cambridge English Vocabulary Profile'daki gibi genel kullanim "
        "sikligi ve gunluk hayattaki onemine gore degerlendir -- teknik/nadir "
        "kelimeler daha yuksek, temel/gunluk kelimeler daha dusuk seviyeye "
        "yazilmali.\n\n"
        f"{word_list}\n\n"
        "Sadece submit_word_levels aracini cagirarak cevap ver, ek metin yazma. "
        "Listedeki HER kelime icin tam olarak bir satir don, hicbirini atlama."
    )


def classify_cefr_levels(words: list[str]) -> dict[str, str]:
    """Verilen kelime listesini (kucuk bir batch, bkz. CLASSIFY_BATCH_SIZE)
    tek bir Anthropic API cagrisiyla CEFR seviyelerine esler. Model listedeki
    bir kelimeyi atlarsa, o kelime donen sozlukte YER ALMAZ -- cagiran taraf
    (grow_word_pool) sozlukte olmayan kelimeleri atlar, uydurma bir seviye
    ATANMAZ."""
    if not words:
        return {}
    if not settings.ANTHROPIC_API_KEY:
        raise WordLevelClassificationError(
            "ANTHROPIC_API_KEY yapilandirilmamis -- CEFR siniflandirmasi kapali."
        )

    from anthropic import Anthropic, APIError

    prompt = _build_classify_prompt(words)
    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=60.0)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2048,
            tools=[_SUBMIT_LEVELS_TOOL],
            tool_choice={"type": "tool", "name": "submit_word_levels"},
            messages=[{"role": "user", "content": prompt}],
        )
    except APIError as exc:
        raise WordLevelClassificationError(f"Anthropic API hatasi: {exc}") from exc
    except Exception as exc:
        raise WordLevelClassificationError(
            f"CEFR siniflandirmasi beklenmeyen hatayla basarisiz oldu "
            f"({type(exc).__name__}): {exc}"
        ) from exc

    tool_use = next(
        (block for block in response.content if getattr(block, "type", None) == "tool_use"),
        None,
    )
    if tool_use is None:
        raise WordLevelClassificationError("Model tool_use blogu dondurmedi.")

    raw_levels = tool_use.input.get("levels") or []
    result: dict[str, str] = {}
    for item in raw_levels:
        if not isinstance(item, dict):
            continue
        w = (item.get("word") or "").strip()
        lvl = (item.get("level") or "").strip().lower()
        if w and lvl in LEVEL_TO_BAND:
            result[w.lower()] = lvl
    return result


def _existing_pool_keys() -> set[tuple[str, str]]:
    rows = (
        supabase_admin.table("general_word_pool")
        .select("word, target_lang")
        .eq("source_lang", SOURCE_LANG)
        .execute()
        .data
    ) or []
    return {((r.get("word") or "").strip().lower(), r.get("target_lang")) for r in rows}


def _candidate_word_rows() -> list[dict]:
    rows = (
        supabase_admin.table("words")
        .select("word, target_lang, meaning_native, meaning_target, example, word_type, word_type_native")
        .eq("source_lang", SOURCE_LANG)
        .execute()
        .data
    ) or []
    return rows


def grow_word_pool(
    max_new_words: int = MAX_NEW_WORDS_PER_RUN, batch_size: int = CLASSIFY_BATCH_SIZE
) -> dict:
    """general_word_pool'u (source_lang='en') kullanicilarin kendi kelime
    listelerinde birikmis ama havuzda henuz olmayan kelimelerle buyutur.
    Donen ozet: candidates, classified, inserted, skipped_no_level,
    classification_errors."""
    rows = _candidate_word_rows()
    existing = _existing_pool_keys()

    # (kelime_kucuk, target_lang) -> en tamamlanmis satir (orijinal harf
    # buyuklugu + varsa ornek cumle korunur, ayni cift birden fazla
    # kullanicida farkli eksiklikte olabilir).
    by_key: dict[tuple[str, str], dict] = {}
    for r in rows:
        w = (r.get("word") or "").strip()
        tl = r.get("target_lang")
        if not w or not tl:
            continue
        key = (w.lower(), tl)
        if key in existing:
            continue
        current = by_key.get(key)
        if current is None or (
            not (current.get("example") or "").strip() and (r.get("example") or "").strip()
        ):
            by_key[key] = r

    candidates = list(by_key.items())[:max_new_words]
    if not candidates:
        return {"candidates": 0, "classified": 0, "inserted": 0, "skipped_no_level": 0}

    distinct_words = sorted({w for (w, _tl), _r in candidates})
    level_by_word: dict[str, str] = {}
    classification_errors = 0
    for i in range(0, len(distinct_words), batch_size):
        batch = distinct_words[i : i + batch_size]
        try:
            level_by_word.update(classify_cefr_levels(batch))
        except WordLevelClassificationError:
            classification_errors += 1
            continue

    inserted = 0
    skipped_no_level = 0
    skipped_no_meaning = 0
    for (word_lower, target_lang), row in candidates:
        level = level_by_word.get(word_lower)
        if not level:
            skipped_no_level += 1
            continue
        # general_word_pool.meaning == kelimenin target_lang'e (kullanicinin
        # ana diline) cevirisi -- seed_lang_core.py::seed_pair ile AYNI
        # sozlesme. Bos ise ATLANIR, kelimenin kendisiyle DOLDURULMAZ (o,
        # havuzu "meaning == word" gibi anlamsiz satirlarla kirletir).
        meaning_native = (row.get("meaning_native") or "").strip()
        if not meaning_native:
            skipped_no_meaning += 1
            continue
        # Insert'ten hemen once tekrar kontrol -- word_exists() ile AYNI
        # guvenlik (seed_lang_core.py), ayni calisma icinde cift eklemeyi
        # onler (ornegin iki farkli target_lang ayni English kelimeyi
        # paylasiyorsa, veya bir onceki adimda baska bir surec eklediyse).
        already = (
            supabase_admin.table("general_word_pool")
            .select("id")
            .eq("source_lang", SOURCE_LANG)
            .eq("target_lang", target_lang)
            .ilike("word", row["word"])
            .execute()
            .data
        )
        if already:
            continue
        insert_row = {
            "source_lang": SOURCE_LANG,
            "target_lang": target_lang,
            "word": row["word"],
            "meaning": meaning_native,
            "example": row.get("example"),
            "difficulty_level": LEVEL_TO_BAND[level],
            "is_active": True,
        }
        result = supabase_admin.table("general_word_pool").insert(insert_row).execute()
        if result.data:
            inserted += 1

    return {
        "candidates": len(candidates),
        "classified": len(level_by_word),
        "inserted": inserted,
        "skipped_no_level": skipped_no_level,
        "skipped_no_meaning": skipped_no_meaning,
        "classification_errors": classification_errors,
    }
