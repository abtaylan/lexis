"""
backend/app/api/routes/crossword.py

Cengel bulmaca (hook crossword) oyun modu endpoint'leri -- 18 Kasim 2026.
Uretim/veri modeli app/services/crossword_service.py'de; bu dosya sadece
HTTP katmani + XP/ilerleme baglama.

Guvenlik notu: get_or_create_puzzle() DB satirinda dogru cevaplar (answer)
duz metin olarak duruyor (general_word_pool emsaliyle tutarli, bkz.
migration 095 yorum notu) ama bu router istemciye SADECE ZATEN COZULMUS
kelimeler icin answer alanini doner (bkz. _public_words) -- henuz
cozulmemis kelimeler icin asla gonderilmez, dogruluk kontrolu her zaman
sunucu tarafinda yapilir. Bu, mobil tarafin bir seviyeye yarim birakilip
geri donulduğunde cozulmus kelimeleri BOS degil DOLU gostermesini saglar
(aksi halde istemcinin hangi harflerin dogru oldugunu bilmesinin tek yolu
kullanicinin o oturumda yazdigi metin olurdu, ki uygulama yeniden
acildiginda bu kaybolur).

23 Kasim 2026: UC MOD eklendi (`mode` query parametresi, bkz.
crossword_service.py modul docstring'i) -- standard (varsayilan, eskisi
gibi), reverse (ogrenilen dil ipucu -> ana dil cevap), own_pool (kullanicinin
kendi 'Kelimelerim' listesi, HER KULLANICIYA OZEL uretilir). own_pool
icin get_or_create_puzzle'a current_user.id GECILIR -- bu sayede RLS'den
BAGIMSIZ olarak (backend zaten supabase_admin/service-role kullaniyor)
bir kullanicinin own_pool bulmacasi baskasina asla donulmez."""

from __future__ import annotations

import random

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.services import crossword_service
from app.services.xp_service import award_xp

router = APIRouter()


def _validate_mode(mode: str) -> str:
    if mode not in crossword_service.VALID_MODES:
        raise HTTPException(status_code=400, detail=f"Gecersiz mod: '{mode}'.")
    return mode


def _user_langs(user_id: str) -> tuple[str, str]:
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang, learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    data = profile.data or {}
    return data.get("learning_lang", "en"), data.get("native_lang", "tr")


class CrosswordAttemptIn(BaseModel):
    answer: str


# 27 Kasim 2026 kullanici istegi: harf carki ipucu sistemi -- bir kelime
# icin ILK ipucu HINT_XP_COST kadar XP harcar, aynI kelime icin SONRAKI
# ipucular (via_ad=True) reklam izlemeyi GEREKTIRIR, XP ile atlanamaz (bkz.
# get_hint). Kelime cozmenin odulunden (game_crossword_word: 6 XP) daha
# pahali tutuldu ki "ipucuyla coz, XP'de net kazan" dongusu olusmasin.
HINT_XP_COST = 10


class CrosswordHintIn(BaseModel):
    # İstemcinin o kelime icin o ana kadar DOGRU yerlestirdigi harf sayisi --
    # sunucu bir sonraki (henuz bilinmeyen) pozisyondaki harfi dondurur.
    # Cevabin KENDISI asla istemciden gelmez/dogrulanmaz, sadece bu sayac.
    revealed_count: int = 0
    # Istemci bir odullu reklam izlettiyse True gecer -- bu durumda XP
    # HARCANMAZ (ilk kullanimsa bile), ama yine de "bu kelime icin en az bir
    # ipucu kullanildi" olarak isaretlenir (bkz. hinted_word_ids).
    via_ad: bool = False


@router.get("/levels")
async def list_levels(mode: str = Query("standard"), current_user=Depends(get_current_user)):
    mode = _validate_mode(mode)
    learning_lang, _native_lang = _user_langs(current_user.id)
    current_level = crossword_service.get_user_progress(current_user.id, learning_lang, mode)
    return {
        "mode": mode,
        "current_level": current_level,
        "max_level": crossword_service.MAX_LEVEL,
        "tiers": crossword_service.all_tiers_summary(),
    }


def _get_or_create_session(user_id: str, puzzle_id: str) -> dict:
    existing = (
        supabase_admin.table("user_crossword_sessions")
        .select("*")
        .eq("user_id", user_id)
        .eq("puzzle_id", puzzle_id)
        .execute()
        .data
    )
    if existing:
        return existing[0]
    inserted = (
        supabase_admin.table("user_crossword_sessions")
        .insert({"user_id": user_id, "puzzle_id": puzzle_id})
        .execute()
        .data
    )
    return inserted[0]


def _public_words(puzzle: dict, solved_word_ids: set[str] | None = None) -> list[dict]:
    """crossword_puzzle_words satirlarindan istemciye gidecek alanlari
    cikarir. answer SADECE solved_word_ids icindeki kelimeler icin eklenir
    (kullanici zaten dogru bildigi icin artik gizli degil) -- henuz
    cozulmemis kelimelerde answer alani hic yok."""
    solved_word_ids = solved_word_ids or set()
    words = puzzle.get("crossword_puzzle_words") or []
    out = []
    for w in words:
        row = {
            "word_id": w["id"],
            "clue_text": w["clue_text"],
            "row_start": w["row_start"],
            "col_start": w["col_start"],
            "direction": w["direction"],
            "answer_length": w["answer_length"],
            # 27 Kasim 2026 -- kelime carki tasarimi: harf carkinin kurulabilmesi
            # icin HENUZ COZULMEMIS kelimelerde de cevabin harf KUMESI (SIRASI
            # KARISTIRILMIS) gonderiliyor -- answer alaninin kendisi (dogru
            # SIRAYLA) hala sadece cozulunce gonderiliyor, bu yuzden dogru
            # sirayi istemci asla bilmiyor (anagram/kelime-oyunu janrinda
            # standart davranis -- harf kumesi zaten ipucuyla birlikte acik).
            "letters": random.sample(list(w["answer"]), w["answer_length"]),
        }
        if w["id"] in solved_word_ids:
            row["answer"] = w["answer"]
            # 27 Kasim 2026 kullanici istegi: kelime-carki tasarimina gecis --
            # dogru cevaplanan kelime icin ornek cumle + tanim da donuluyor
            # (bkz. crossword_service.get_or_create_puzzle'daki embed select).
            # Tam olarak biri dolu olur (general_word_pool ya da words), own_pool
            # (words) icin definition hic yok -- o durumda alan atlanir.
            source = w.get("general_word_pool") or w.get("words") or {}
            if source.get("example"):
                row["example"] = source["example"]
            if source.get("definition"):
                row["definition"] = source["definition"]
        out.append(row)
    return out


@router.get("/levels/{level}")
async def get_level(level: int, mode: str = Query("standard"), current_user=Depends(get_current_user)):
    mode = _validate_mode(mode)
    if level < 1 or level > crossword_service.MAX_LEVEL:
        raise HTTPException(status_code=404, detail="Gecersiz seviye.")
    learning_lang, native_lang = _user_langs(current_user.id)
    user_id_for_pool = current_user.id if mode == "own_pool" else None
    try:
        puzzle = crossword_service.get_or_create_puzzle(mode, learning_lang, native_lang, level, user_id=user_id_for_pool)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    session = _get_or_create_session(current_user.id, puzzle["id"])
    tier = crossword_service.tier_for_level(level)
    solved_ids = session.get("solved_word_ids") or []
    return {
        "level": level,
        "mode": mode,
        "tier_name": tier.name,
        "puzzle_id": puzzle["id"],
        "grid_width": puzzle["grid_width"],
        "grid_height": puzzle["grid_height"],
        "words": _public_words(puzzle, set(solved_ids)),
        "solved_word_ids": solved_ids,
        "completed": session.get("completed_at") is not None,
    }


@router.post("/levels/{level}/words/{word_id}/attempt")
async def attempt_word(
    level: int,
    word_id: str,
    attempt_in: CrosswordAttemptIn,
    mode: str = Query("standard"),
    current_user=Depends(get_current_user),
):
    mode = _validate_mode(mode)
    learning_lang, native_lang = _user_langs(current_user.id)
    user_id_for_pool = current_user.id if mode == "own_pool" else None
    try:
        puzzle = crossword_service.get_or_create_puzzle(mode, learning_lang, native_lang, level, user_id=user_id_for_pool)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    words = puzzle.get("crossword_puzzle_words") or []
    word_row = next((w for w in words if w["id"] == word_id), None)
    if word_row is None:
        raise HTTPException(status_code=404, detail="Bulmacada bu kelime yok.")

    session = _get_or_create_session(current_user.id, puzzle["id"])
    solved_ids: list[str] = list(session.get("solved_word_ids") or [])

    is_correct = attempt_in.answer.strip().casefold() == word_row["answer"].strip().casefold()
    word_xp_awarded = 0
    completion_xp_awarded = 0
    next_level: int | None = None
    already_solved = word_id in solved_ids

    if is_correct and not already_solved:
        xp_result = await award_xp(
            user_id=current_user.id,
            source_type="game_crossword_word",
            source_id=puzzle["id"],
        )
        word_xp_awarded = xp_result.amount_awarded
        solved_ids.append(word_id)

    puzzle_complete = len(solved_ids) >= len(words) and len(words) > 0
    newly_completed = puzzle_complete and session.get("completed_at") is None

    update_row: dict = {"solved_word_ids": solved_ids}
    if newly_completed:
        from datetime import UTC, datetime

        update_row["completed_at"] = datetime.now(UTC).isoformat()

    supabase_admin.table("user_crossword_sessions").update(update_row).eq(
        "id", session["id"]
    ).execute()

    if newly_completed:
        tier = crossword_service.tier_for_level(level)
        xp_result = await award_xp(
            user_id=current_user.id,
            source_type="game_crossword_complete",
            amount=tier.completion_xp,
            source_id=puzzle["id"],
        )
        completion_xp_awarded = xp_result.amount_awarded
        next_level = crossword_service.advance_user_progress(current_user.id, learning_lang, level, mode)

    # 27 Kasim 2026 -- kelime carki: dogru cevaplaninca mobil/web'in sonuc
    # panelini (kelime + anlam + ornek cumle + tanim) dolduabilmesi icin
    # answer/example/definition de donuluyor -- _public_words'teki ile AYNI
    # kaynak (get_or_create_puzzle'in embed select'i), sadece burada "henuz
    # bir sonraki GET /levels/{level} gelmeden" aninda lazim oldugu icin
    # ayrica eklendi.
    extra: dict = {}
    if is_correct:
        extra["answer"] = word_row["answer"]
        source = word_row.get("general_word_pool") or word_row.get("words") or {}
        if source.get("example"):
            extra["example"] = source["example"]
        if source.get("definition"):
            extra["definition"] = source["definition"]

    return {
        "correct": is_correct,
        "already_solved": already_solved,
        "solved_word_ids": solved_ids,
        "puzzle_complete": puzzle_complete,
        "word_xp_awarded": word_xp_awarded,
        "completion_xp_awarded": completion_xp_awarded,
        "next_level": next_level,
        **extra,
    }


@router.post("/levels/{level}/words/{word_id}/hint")
async def get_hint(
    level: int,
    word_id: str,
    hint_in: CrosswordHintIn,
    mode: str = Query("standard"),
    current_user=Depends(get_current_user),
):
    """Harf carki icin tek-harf ipucu. Guvenlik: cevabin KENDISI hicbir zaman
    donulmez/istemciden alinmaz -- sadece revealed_count pozisyonundaki TEK
    harf hesaplanip donulur. Ilk ipucu (bu kelime icin hinted_word_ids'te
    yoksa) HINT_XP_COST kadar XP harcar (yetersizse 400); via_ad=True
    gecilirse (odullu reklam izlendiyse) XP hic harcanmaz. Ikinci ve sonraki
    ipucular (kelime zaten hinted_word_ids'teyse) via_ad=True ZORUNLUDUR --
    XP ile atlanamaz (bkz. modul ust bilgisindeki CrosswordHintIn notu)."""
    mode = _validate_mode(mode)
    learning_lang, native_lang = _user_langs(current_user.id)
    user_id_for_pool = current_user.id if mode == "own_pool" else None
    try:
        puzzle = crossword_service.get_or_create_puzzle(mode, learning_lang, native_lang, level, user_id=user_id_for_pool)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    words = puzzle.get("crossword_puzzle_words") or []
    word_row = next((w for w in words if w["id"] == word_id), None)
    if word_row is None:
        raise HTTPException(status_code=404, detail="Bulmacada bu kelime yok.")

    session = _get_or_create_session(current_user.id, puzzle["id"])
    solved_ids: list[str] = list(session.get("solved_word_ids") or [])
    if word_id in solved_ids:
        raise HTTPException(status_code=400, detail="Bu kelime zaten cozulmus.")

    answer: str = word_row["answer"]
    position = max(0, hint_in.revealed_count)
    if position >= len(answer):
        raise HTTPException(status_code=400, detail="Gecersiz pozisyon.")

    hinted_ids: list[str] = list(session.get("hinted_word_ids") or [])
    is_first_hint = word_id not in hinted_ids
    xp_spent = 0

    if not is_first_hint and not hint_in.via_ad:
        raise HTTPException(
            status_code=400,
            detail="Bu kelime icin bir sonraki ipucu reklam izlemeyi gerektiriyor.",
        )

    if is_first_hint and not hint_in.via_ad:
        profile = (
            supabase_admin.table("profiles").select("total_xp").eq("id", current_user.id).single().execute()
        ).data or {}
        if (profile.get("total_xp") or 0) < HINT_XP_COST:
            raise HTTPException(status_code=400, detail="Yetersiz XP.")
        await award_xp(
            user_id=current_user.id,
            source_type="game_crossword_hint",
            amount=-HINT_XP_COST,
            source_id=puzzle["id"],
        )
        xp_spent = HINT_XP_COST

    if is_first_hint:
        hinted_ids.append(word_id)
        supabase_admin.table("user_crossword_sessions").update(
            {"hinted_word_ids": hinted_ids}
        ).eq("id", session["id"]).execute()

    return {
        "position": position,
        "letter": answer[position],
        "xp_spent": xp_spent,
    }
