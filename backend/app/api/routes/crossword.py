"""
backend/app/api/routes/crossword.py

Cengel bulmaca (hook crossword) oyun modu endpoint'leri -- 18 Kasim 2026.
Uretim/veri modeli app/services/crossword_service.py'de; bu dosya sadece
HTTP katmani + XP/ilerleme baglama.

Guvenlik notu: get_or_create_puzzle() DB satirinda dogru cevaplar (answer)
duz metin olarak duruyor (general_word_pool emsaliyle tutarli, bkz.
migration 095 yorum notu) ama bu router istemciye asla answer alanini
GONDERMEZ -- dogruluk kontrolu her zaman sunucu tarafinda yapilir.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.services import crossword_service
from app.services.xp_service import award_xp

router = APIRouter()


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


@router.get("/levels")
async def list_levels(current_user=Depends(get_current_user)):
    learning_lang, _native_lang = _user_langs(current_user.id)
    current_level = crossword_service.get_user_progress(current_user.id, learning_lang)
    return {
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


def _public_words(puzzle: dict) -> list[dict]:
    """crossword_puzzle_words satirlarindan answer HARIC, istemciye gidecek
    alanlari cikarir."""
    words = puzzle.get("crossword_puzzle_words") or []
    return [
        {
            "word_id": w["id"],
            "clue_text": w["clue_text"],
            "row_start": w["row_start"],
            "col_start": w["col_start"],
            "direction": w["direction"],
            "answer_length": w["answer_length"],
        }
        for w in words
    ]


@router.get("/levels/{level}")
async def get_level(level: int, current_user=Depends(get_current_user)):
    if level < 1 or level > crossword_service.MAX_LEVEL:
        raise HTTPException(status_code=404, detail="Gecersiz seviye.")
    learning_lang, native_lang = _user_langs(current_user.id)
    try:
        puzzle = crossword_service.get_or_create_puzzle(learning_lang, native_lang, level)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    session = _get_or_create_session(current_user.id, puzzle["id"])
    tier = crossword_service.tier_for_level(level)
    return {
        "level": level,
        "tier_name": tier.name,
        "puzzle_id": puzzle["id"],
        "grid_width": puzzle["grid_width"],
        "grid_height": puzzle["grid_height"],
        "words": _public_words(puzzle),
        "solved_word_ids": session.get("solved_word_ids") or [],
        "completed": session.get("completed_at") is not None,
    }


@router.post("/levels/{level}/words/{word_id}/attempt")
async def attempt_word(
    level: int,
    word_id: str,
    attempt_in: CrosswordAttemptIn,
    current_user=Depends(get_current_user),
):
    learning_lang, native_lang = _user_langs(current_user.id)
    try:
        puzzle = crossword_service.get_or_create_puzzle(learning_lang, native_lang, level)
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
        next_level = crossword_service.advance_user_progress(current_user.id, learning_lang, level)

    return {
        "correct": is_correct,
        "already_solved": already_solved,
        "solved_word_ids": solved_ids,
        "puzzle_complete": puzzle_complete,
        "word_xp_awarded": word_xp_awarded,
        "completion_xp_awarded": completion_xp_awarded,
        "next_level": next_level,
    }
