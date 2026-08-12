"""
backend/app/api/routes/games.py

Kelime tahmin oyunu endpoint'leri.

İki kelime kaynağı desteklenir (pool_source):
- "own"     -> kullanıcının kendi words tablosu (o an öğrendiği/eklediği kelimeler)
- "general" -> general_word_pool (genel, ortak kelime havuzu, seed script ile doldurulur)

Kaynak havuzun boyutu sabit/sınırlı değildir: next-word her çağrıda o session'da
daha önce sorulmamış kelimeler arasından canlı sorgu ile seçilir. "own" için
kullanıcı kelime ekledikçe havuz büyür; "general" için seed script tekrar
çalıştırılarak istenildiği kadar kelime eklenebilir.
"""

import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.games import (
    AttemptCreate,
    AttemptResponse,
    FinishSessionResponse,
    GameSessionCreate,
    GameSessionResponse,
    GameWordOption,
    NextWordResponse,
)
from app.services.xp_service import award_xp

router = APIRouter()

# Tek seferde çekilecek aday kelime sayısı üst sınırı (performans içindir,
# oyunun toplam kelime sayısını SINIRLAMAZ — havuzdaki her kelime, session
# başına en fazla bir kez sorulana kadar sırayla erişilebilir olmaya devam eder).
CANDIDATE_FETCH_LIMIT = 500
DISTRACTOR_FETCH_LIMIT = 30


def _get_profile_langs(user_id: str) -> tuple[str, str]:
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang, learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    data = profile.data or {}
    return data.get("learning_lang", "en"), data.get("native_lang", "tr")


def _get_session(session_id: str, user_id: str) -> dict:
    result = (
        supabase_admin.table("game_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Oyun oturumu bulunamadı.")
    return result.data[0]


def _attempted_ids(session_id: str, field: str) -> list[str]:
    result = (
        supabase_admin.table("game_attempts")
        .select(field)
        .eq("session_id", session_id)
        .execute()
    )
    return [row[field] for row in (result.data or []) if row.get(field)]


def _build_options(correct_text: str, distractor_texts: list[str]) -> list[GameWordOption]:
    picks = random.sample(distractor_texts, min(3, len(distractor_texts)))
    texts = [correct_text] + picks
    random.shuffle(texts)
    return [GameWordOption(id=str(i), text=t) for i, t in enumerate(texts)]


@router.post("/sessions", response_model=GameSessionResponse, status_code=201)
async def create_session(
    session_in: GameSessionCreate,
    current_user=Depends(get_current_user),
):
    row = {
        "user_id": current_user.id,
        "mode": session_in.mode.value,
        "pool_source": session_in.pool_source.value,
        "score": 0,
        "xp_earned": 0,
    }
    result = supabase_admin.table("game_sessions").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Oturum oluşturulamadı.")
    return result.data[0]


@router.get("/sessions/{session_id}/next-word", response_model=NextWordResponse)
async def next_word(
    session_id: str,
    current_user=Depends(get_current_user),
):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    pool_source = session["pool_source"]
    mode = session["mode"]

    if pool_source == "own":
        attempted = _attempted_ids(session_id, "word_id")
        query = (
            supabase_admin.table("words")
            .select("id, word, meaning, meaning_native, example")
            .eq("user_id", current_user.id)
        )
        if attempted:
            query = query.not_.in_("id", attempted)
        candidates = (query.limit(CANDIDATE_FETCH_LIMIT).execute().data) or []

        if not candidates:
            return NextWordResponse(finished=True)

        chosen = random.choice(candidates)
        meaning_text = chosen.get("meaning_native") or chosen.get("meaning")

        options = None
        if mode == "multiple_choice":
            distractor_query = (
                supabase_admin.table("words")
                .select("id, meaning, meaning_native")
                .eq("user_id", current_user.id)
                .neq("id", chosen["id"])
                .limit(DISTRACTOR_FETCH_LIMIT)
            )
            distractor_rows = distractor_query.execute().data or []
            distractor_texts = [
                (d.get("meaning_native") or d.get("meaning")) for d in distractor_rows
            ]
            options = _build_options(meaning_text, distractor_texts)

        return NextWordResponse(
            finished=False,
            word_id=chosen["id"],
            word=chosen["word"],
            meaning=meaning_text,
            example=chosen.get("example"),
            options=options,
        )

    # pool_source == "general"
    learning_lang, native_lang = _get_profile_langs(current_user.id)
    attempted = _attempted_ids(session_id, "general_word_id")
    query = (
        supabase_admin.table("general_word_pool")
        .select("id, word, meaning, example")
        .eq("source_lang", learning_lang)
        .eq("target_lang", native_lang)
        .eq("is_active", True)
    )
    if attempted:
        query = query.not_.in_("id", attempted)
    candidates = (query.limit(CANDIDATE_FETCH_LIMIT).execute().data) or []

    if not candidates:
        return NextWordResponse(finished=True)

    chosen = random.choice(candidates)

    options = None
    if mode == "multiple_choice":
        distractor_query = (
            supabase_admin.table("general_word_pool")
            .select("id, meaning")
            .eq("source_lang", learning_lang)
            .eq("target_lang", native_lang)
            .neq("id", chosen["id"])
            .limit(DISTRACTOR_FETCH_LIMIT)
        )
        distractor_rows = distractor_query.execute().data or []
        distractor_texts = [d["meaning"] for d in distractor_rows]
        options = _build_options(chosen["meaning"], distractor_texts)

    return NextWordResponse(
        finished=False,
        general_word_id=chosen["id"],
        word=chosen["word"],
        meaning=chosen["meaning"],
        example=chosen.get("example"),
        options=options,
    )


@router.post("/sessions/{session_id}/attempt", response_model=AttemptResponse, status_code=201)
async def submit_attempt(
    session_id: str,
    attempt_in: AttemptCreate,
    current_user=Depends(get_current_user),
):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    if not attempt_in.word_id and not attempt_in.general_word_id:
        raise HTTPException(status_code=422, detail="word_id veya general_word_id gerekli.")

    xp_awarded = 0
    leveled_up = False
    new_level = None

    if attempt_in.is_correct:
        source_type = f"game_{session['mode']}"
        xp_result = await award_xp(
            user_id=current_user.id,
            source_type=source_type,  # type: ignore[arg-type]
            source_id=session_id,
        )
        xp_awarded = xp_result.amount_awarded
        leveled_up = xp_result.leveled_up
        new_level = xp_result.level

    attempt_row = {
        "session_id": session_id,
        "word_id": attempt_in.word_id,
        "general_word_id": attempt_in.general_word_id,
        "is_correct": attempt_in.is_correct,
        "attempts_count": attempt_in.attempts_count,
        "time_taken_ms": attempt_in.time_taken_ms,
        "xp_awarded": xp_awarded,
    }
    attempt_result = supabase_admin.table("game_attempts").insert(attempt_row).execute()
    if not attempt_result.data:
        raise HTTPException(status_code=500, detail="Deneme kaydedilemedi.")

    new_score = session["score"] + (1 if attempt_in.is_correct else 0)
    new_xp_earned = session["xp_earned"] + xp_awarded
    supabase_admin.table("game_sessions").update(
        {"score": new_score, "xp_earned": new_xp_earned}
    ).eq("id", session_id).execute()

    return AttemptResponse(
        id=attempt_result.data[0]["id"],
        is_correct=attempt_in.is_correct,
        xp_awarded=xp_awarded,
        session_score=new_score,
        leveled_up=leveled_up,
        new_level=new_level,
    )


@router.post("/sessions/{session_id}/finish", response_model=FinishSessionResponse)
async def finish_session(
    session_id: str,
    current_user=Depends(get_current_user),
):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    ended_at = datetime.now(timezone.utc).isoformat()
    update_result = (
        supabase_admin.table("game_sessions")
        .update({"ended_at": ended_at})
        .eq("id", session_id)
        .execute()
    )
    if not update_result.data:
        raise HTTPException(status_code=500, detail="Oturum kapatılamadı.")

    updated = update_result.data[0]

    attempts_result = (
        supabase_admin.table("game_attempts")
        .select("is_correct")
        .eq("session_id", session_id)
        .execute()
    )
    attempts = attempts_result.data or []
    word_count = len(attempts)
    correct_count = sum(1 for a in attempts if a.get("is_correct"))

    return FinishSessionResponse(
        id=updated["id"],
        mode=updated["mode"],
        pool_source=updated["pool_source"],
        score=updated["score"],
        xp_earned=updated["xp_earned"],
        started_at=updated["started_at"],
        ended_at=updated["ended_at"],
        word_count=word_count,
        correct_count=correct_count,
    )
