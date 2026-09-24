"""
backend/app/services/daily_challenge_service.py

"Gunluk Kelime Avi" (24 Eylul 2026 -- kullanicinin onayladigi fikirlendirme
oturumu, Madde 2 secimi -- bkz. supabase/migrations/082_daily_word_challenge.sql
modul docstring'i): her ogrenilen dil icin GUNDE BIR, TUM kullanicilara ortak
bir kelime secilir; herkes ayni kelimeyi BAGIMSIZ olarak (games.py'deki
tek-oyunculu wordle/adam asmaca modundaki AYNI harf-tahmin mekanigiyle,
duels.py'deki wordle-modu duellosunda da AYNI sekilde tekrar kullanilan
_reveal_pattern/MAX_WRONG_GUESSES deseni) cozmeye calisir.

Kelime SECIMI: general_word_pool.source_lang = learning_lang oldugu icin
kelimenin kendisi (word) hangi target_lang uzerinden sorgulandigindan
BAGIMSIZDIR -- target_lang sadece "bu satir var mi" garantisi icin bir
CAPA (anchor) dil olarak kullanilir. Oturumdaki canli SQL dogrulamasi TUM
12 dilin hem 'en' hem 'tr' target_lang'ina tam ceviri kapsamina sahip
oldugunu gosterdi, bu yuzden _anchor_target_lang() hep 'en' (learning_lang
zaten 'en' ise 'tr') doner -- hangi native_lang'i olursa olsun HER kullanici
icin kelime metni garanti bulunur. Kullanicinin GERCEK native_lang'ine gore
anlam/ornek (clue) ise ayrica, istek anında _lookup_clue() ile cekilir
(coverage bosluksa capa dile duser).
"""

from __future__ import annotations

import random
from datetime import UTC, date, datetime, timedelta

from app.core.database import supabase_admin
from app.services.xp_service import award_xp

MAX_WRONG_GUESSES = 6

# Kac gun geriye bakip "yakin zamanda cikti" diye kelimeyi eleyecegiz --
# kucuk dillerdeki havuzu tuketmeyecek kadar kisa, tekrar hissini onleyecek
# kadar uzun bir pencere.
RECENT_AVOID_DAYS = 60

# Harf-tahmin oyununda cok kisa (2-3 harf, bir-iki tahminde biter) ya da cok
# uzun (10+ harf, sikici) kelimeler iyi bir gunluk bulmaca yapmiyor.
MIN_WORD_LEN = 4
MAX_WORD_LEN = 10


def _reveal_pattern(word: str, guessed_letters: list[str]) -> str:
    """games.py::_reveal_pattern / duels.py::_reveal_pattern ile BIREBIR
    AYNI -- 'apple', ['a','p'] -> 'a p p _ _'."""
    guessed_lower = {g.lower() for g in guessed_letters}
    chars = []
    for ch in word:
        if not ch.isalpha() or ch.lower() in guessed_lower:
            chars.append(ch)
        else:
            chars.append("_")
    return " ".join(chars)


def _anchor_target_lang(learning_lang: str) -> str:
    return "tr" if learning_lang == "en" else "en"


def _active_learning_langs() -> list[str]:
    rows = (
        supabase_admin.table("languages").select("code").eq("is_active", True).execute().data
    ) or []
    return [r["code"] for r in rows if r.get("code")]


def _recent_words(learning_lang: str, before_date: date, days: int = RECENT_AVOID_DAYS) -> set[str]:
    since = (before_date - timedelta(days=days)).isoformat()
    rows = (
        supabase_admin.table("daily_word_challenges")
        .select("word")
        .eq("learning_lang", learning_lang)
        .gte("puzzle_date", since)
        .lt("puzzle_date", before_date.isoformat())
        .execute()
        .data
    ) or []
    return {(r["word"] or "").strip().lower() for r in rows if r.get("word")}


def _pick_word_for_language(learning_lang: str, puzzle_date: date) -> str | None:
    """learning_lang icin gunun kelimesini general_word_pool'dan (anchor
    target_lang uzerinden -- yukaridaki modul docstring'ine bkz.) rastgele
    secer. Uygunluk suzgeci: sadece harflerden olusan, MIN/MAX_WORD_LEN
    araliginda, son RECENT_AVOID_DAYS gunde cikmamis kelimeler. Havuz bu
    kisitlarla bossa (kucuk bir dilde donguye girmis olabiliriz) tekrar
    kisitlamasi gevsetilip yeniden denenir."""
    target_lang = _anchor_target_lang(learning_lang)
    recent = _recent_words(learning_lang, puzzle_date)

    rows = (
        supabase_admin.table("general_word_pool")
        .select("word")
        .eq("source_lang", learning_lang)
        .eq("target_lang", target_lang)
        .eq("is_active", True)
        .execute()
        .data
    ) or []

    def _eligible(w: str) -> bool:
        return bool(w) and w.isalpha() and MIN_WORD_LEN <= len(w) <= MAX_WORD_LEN

    all_candidates = [w for r in rows if _eligible((r.get("word") or "").strip()) for w in [(r.get("word") or "").strip()]]
    fresh_candidates = [w for w in all_candidates if w.lower() not in recent]

    candidates = fresh_candidates or all_candidates
    if not candidates:
        return None
    return random.choice(candidates)


def generate_daily_word_challenges(puzzle_date: date | None = None) -> dict:
    """Cron: her aktif ogrenilen dil icin bugunun (UTC) kelimesini
    olusturur (yoksa). already_ran_today() job seviyesinde idempotency
    sagladigi icin burada ayrica gun-basi kontrolu yok, ama UNIQUE
    (learning_lang, puzzle_date) kisiti + asagidaki 'var mi' kontrolu ile
    manuel yeniden tetikleme de guvenli (idempotent) kalir."""
    target_date = puzzle_date or datetime.now(UTC).date()
    langs = _active_learning_langs()

    created: list[str] = []
    skipped_existing: list[str] = []
    skipped_no_word: list[str] = []

    for lang in langs:
        existing = (
            supabase_admin.table("daily_word_challenges")
            .select("id")
            .eq("learning_lang", lang)
            .eq("puzzle_date", target_date.isoformat())
            .limit(1)
            .execute()
            .data
        )
        if existing:
            skipped_existing.append(lang)
            continue

        word = _pick_word_for_language(lang, target_date)
        if not word:
            skipped_no_word.append(lang)
            continue

        supabase_admin.table("daily_word_challenges").insert(
            {"learning_lang": lang, "puzzle_date": target_date.isoformat(), "word": word}
        ).execute()
        created.append(lang)

    return {
        "puzzle_date": target_date.isoformat(),
        "created": created,
        "skipped_existing": skipped_existing,
        "skipped_no_word": skipped_no_word,
    }


def _lookup_clue(learning_lang: str, native_lang: str, word: str) -> dict | None:
    """Kullanicinin GERCEK native_lang'ine gore anlam/ornek. Coverage
    bosluguysa (12 dilin disinda bir native_lang, ya da o kelime icin o
    cift henuz seed edilmemis) capa dile (_anchor_target_lang) duser --
    boylece clue hicbir zaman sessizce bos donmez."""
    rows = (
        supabase_admin.table("general_word_pool")
        .select("meaning, example, definition")
        .eq("source_lang", learning_lang)
        .eq("target_lang", native_lang)
        .ilike("word", word)
        .eq("is_active", True)
        .limit(1)
        .execute()
        .data
    ) or []
    if rows:
        return rows[0]

    anchor = _anchor_target_lang(learning_lang)
    if anchor == native_lang:
        return None
    rows = (
        supabase_admin.table("general_word_pool")
        .select("meaning, example, definition")
        .eq("source_lang", learning_lang)
        .eq("target_lang", anchor)
        .ilike("word", word)
        .eq("is_active", True)
        .limit(1)
        .execute()
        .data
    ) or []
    return rows[0] if rows else None


def _get_or_create_attempt(user_id: str, learning_lang: str, puzzle_date: date) -> dict:
    rows = (
        supabase_admin.table("daily_word_attempts")
        .select("*")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .eq("puzzle_date", puzzle_date.isoformat())
        .limit(1)
        .execute()
        .data
    ) or []
    if rows:
        return rows[0]
    inserted = (
        supabase_admin.table("daily_word_attempts")
        .insert(
            {
                "user_id": user_id,
                "learning_lang": learning_lang,
                "puzzle_date": puzzle_date.isoformat(),
            }
        )
        .execute()
        .data
    )
    return inserted[0]


def compute_streak(user_id: str, learning_lang: str, upto_date: date) -> int:
    """Ardisik TAMAMLANMIS (basarili -- is_complete) gun sayisi, upto_date'ten
    (bugun) geriye dogru. Bugun henuz tamamlanmadiysa dunden baslar (klasik
    Wordle 'streak' davranisi -- gunun kelimesini henuz cozmemis olmak tek
    basina streak'i sifirlamaz, sadece o gunun artisi henuz eklenmemis
    olur; dun de bosluk varsa zaten 0 doner)."""
    rows = (
        supabase_admin.table("daily_word_attempts")
        .select("puzzle_date")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .eq("is_complete", True)
        .lte("puzzle_date", upto_date.isoformat())
        .order("puzzle_date", desc=True)
        .limit(400)
        .execute()
        .data
    ) or []
    completed_dates = {date.fromisoformat(r["puzzle_date"]) for r in rows}
    if not completed_dates:
        return 0

    cursor = upto_date if upto_date in completed_dates else upto_date - timedelta(days=1)
    streak = 0
    while cursor in completed_dates:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def get_today_challenge(user_id: str, learning_lang: str, native_lang: str) -> dict | None:
    """Bugunun (UTC) kelime avi durumunu doner. Gunun kelimesi henuz
    olusturulmadiysa (cron henuz calismadi / bu dil icin uygun kelime
    bulunamadi) None doner -- caller (route) bunu soft-disable olarak ele
    alir (CefrBadge/XPBar'daki AYNI desen: veri yoksa sessizce gosterme)."""
    today = datetime.now(UTC).date()
    challenge_rows = (
        supabase_admin.table("daily_word_challenges")
        .select("word")
        .eq("learning_lang", learning_lang)
        .eq("puzzle_date", today.isoformat())
        .limit(1)
        .execute()
        .data
    ) or []
    if not challenge_rows:
        return None
    word = challenge_rows[0]["word"]

    attempt = _get_or_create_attempt(user_id, learning_lang, today)
    guessed_letters = attempt.get("guessed_letters") or []
    is_complete = bool(attempt.get("is_complete"))
    is_failed = bool(attempt.get("is_failed"))
    is_round_over = is_complete or is_failed

    # Not: ipucu (meaning/example) HER ZAMAN gosterilir (kelimenin kendisi
    # degil) -- games.py'deki wordle modunda da anlam basta gosterilir,
    # harf tahmini "hangi kelime" sorusunu cozer, "ne anlama geliyor"
    # sorusunu degil. Bu yuzden clue'yu round bitmeden de cekiyoruz.
    clue = _lookup_clue(learning_lang, native_lang, word)

    return {
        "puzzle_date": today.isoformat(),
        "learning_lang": learning_lang,
        "revealed": _reveal_pattern(word, guessed_letters),
        "guessed_letters": guessed_letters,
        "wrong_guesses": attempt.get("wrong_guesses") or 0,
        "max_wrong_guesses": MAX_WRONG_GUESSES,
        "is_complete": is_complete,
        "is_failed": is_failed,
        "word": word if is_round_over else None,
        "meaning": (clue or {}).get("meaning"),
        "example": (clue or {}).get("example"),
        "streak": compute_streak(user_id, learning_lang, today),
    }


async def guess_letter(user_id: str, learning_lang: str, native_lang: str, letter: str) -> dict:
    """games.py::guess_letter / duels.py'deki wordle-modu guess-letter ile
    AYNI harf-harf mantigi -- gunluk/tek-oyunculu oldugu icin round/duel
    kavrami yok, tek gate 'bugunun kelimesi var mi + kullanici bugun bitirdi
    mi'. Ilk basarili tamamlanmada (just_completed) XP verilir -- ayni
    kelime uzerinde tekrar harf gonderilse bile (zaten is_complete=True
    kontrolu asagida bunu engelliyor) ikinci kez XP verilmez."""
    today = datetime.now(UTC).date()
    challenge_rows = (
        supabase_admin.table("daily_word_challenges")
        .select("word")
        .eq("learning_lang", learning_lang)
        .eq("puzzle_date", today.isoformat())
        .limit(1)
        .execute()
        .data
    ) or []
    if not challenge_rows:
        raise ValueError("no_challenge_today")
    word = challenge_rows[0]["word"]

    attempt = _get_or_create_attempt(user_id, learning_lang, today)
    if attempt.get("is_complete") or attempt.get("is_failed"):
        raise ValueError("already_finished")

    guessed = list(attempt.get("guessed_letters") or [])
    wrong_guesses = int(attempt.get("wrong_guesses") or 0)
    letter = letter.strip().lower()
    if not letter:
        raise ValueError("invalid_letter")
    correct = letter in word.lower()

    if letter not in guessed:
        guessed.append(letter)
        if not correct:
            wrong_guesses += 1

    revealed = _reveal_pattern(word, guessed)
    is_complete = "_" not in revealed
    is_failed = (not is_complete) and wrong_guesses >= MAX_WRONG_GUESSES
    is_round_over = is_complete or is_failed
    just_completed = is_complete and not attempt.get("is_complete")

    update_payload = {
        "guessed_letters": guessed,
        "wrong_guesses": wrong_guesses,
        "is_complete": is_complete,
        "is_failed": is_failed,
    }
    if is_round_over and not attempt.get("completed_at"):
        update_payload["completed_at"] = datetime.now(UTC).isoformat()

    supabase_admin.table("daily_word_attempts").update(update_payload).eq("id", attempt["id"]).execute()

    if just_completed:
        await award_xp(user_id=user_id, source_type="daily_word_challenge")

    clue = _lookup_clue(learning_lang, native_lang, word)

    return {
        "letter": letter,
        "correct": correct,
        "revealed": revealed,
        "guessed_letters": guessed,
        "wrong_guesses": wrong_guesses,
        "max_wrong_guesses": MAX_WRONG_GUESSES,
        "is_complete": is_complete,
        "is_failed": is_failed,
        "word": word if is_round_over else None,
        "meaning": (clue or {}).get("meaning"),
        "example": (clue or {}).get("example"),
        "streak": compute_streak(user_id, learning_lang, today),
    }
