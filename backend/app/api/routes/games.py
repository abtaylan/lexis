from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.games import (
    GameStartRequest, GameSessionResponse, GameWordItem,
    GameAttemptCreate, GameAttemptResponse, GameFinishResponse,
    GameHistoryItem, GameModesResponse,
)
from datetime import datetime, timezone
import random

router = APIRouter()

XP_PER_CORRECT = 3
VALID_MODES = ["wordle", "multiple_choice", "typing", "matching", "listening", "sprint"]
VALID_POOL_SOURCES = ["own", "general"]


@router.get("/modes", response_model=GameModesResponse)
async def get_modes():
    """Kullanılabilir oyun modları ve kelime havuzu kaynakları."""
    return GameModesResponse(modes=VALID_MODES, pool_sources=VALID_POOL_SOURCES)


@router.post("/start", response_model=GameSessionResponse)
async def start_game(req: GameStartRequest, current_user=Depends(get_current_user)):
    if req.mode not in VALID_MODES:
        raise HTTPException(status_code=400, detail="Geçersiz oyun modu.")
    if req.pool_source not in VALID_POOL_SOURCES:
        raise HTTPException(status_code=400, detail="Geçersiz kelime havuzu.")

    profile = (
        supabase_admin.table("profiles")
        .select("learning_lang, native_lang")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    learning_lang = (profile.data or {}).get("learning_lang", "en")
    native_lang = (profile.data or {}).get("native_lang", "tr")

    pool_source = req.pool_source
    words: List[dict] = []

    if pool_source == "own":
        result = (
            supabase_admin.table("words")
            .select("id, word, meaning, example")
            .eq("user_id", current_user.id)
            .limit(100)
            .execute()
        )
        own_words = result.data or []
        if len(own_words) >= 4:
            random.shuffle(own_words)
            words = own_words[: req.word_count]
        else:
            # Kişisel kelime listesi yetersizse genel havuza düş
            pool_source = "general"

    if pool_source == "general":
        # Havuzdaki kelimeler source_lang → target_lang yönünde tutulur
        # (örn. source_lang='en', target_lang='tr' = "İngilizce kelime,
        # Türkçe anlamı"). Önce kullanıcının tam dil çiftini dene.
        result = (
            supabase_admin.table("general_word_pool")
            .select("id, word, meaning, example")
            .eq("source_lang", learning_lang)
            .eq("target_lang", native_lang)
            .eq("is_active", True)
            .limit(200)
            .execute()
        )
        pool = result.data or []
        if not pool:
            # Tam dil çifti için veri yoksa, en azından öğrenilen dile ait
            # herhangi bir kayıt dene (anlam farklı dilde olabilir).
            fallback = (
                supabase_admin.table("general_word_pool")
                .select("id, word, meaning, example")
                .eq("source_lang", learning_lang)
                .eq("is_active", True)
                .limit(200)
                .execute()
            )
            pool = fallback.data or []
        random.shuffle(pool)
        words = pool[: req.word_count]

    if len(words) < 4:
        raise HTTPException(
            status_code=400,
            detail="Oyun için yeterli kelime bulunamadı (en az 4 kelime gerekli).",
        )

    session_data = {
        "user_id": current_user.id,
        "mode": req.mode,
        "pool_source": pool_source,
        "direction": req.direction,
        "learning_lang": learning_lang,
        "score": 0,
        "xp_earned": 0,
        "state": {"word_ids": [w["id"] for w in words]},
    }
    result = supabase_admin.table("game_sessions").insert(session_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Oyun oturumu oluşturulamadı.")
    session = result.data[0]

    return GameSessionResponse(
        id=session["id"],
        mode=session["mode"],
        pool_source=session["pool_source"],
        direction=session["direction"],
        learning_lang=session["learning_lang"],
        score=session["score"],
        xp_earned=session["xp_earned"],
        started_at=session["started_at"],
        ended_at=session.get("ended_at"),
        words=[GameWordItem(**w) for w in words],
    )


@router.post("/{session_id}/attempt", response_model=GameAttemptResponse)
async def submit_attempt(
    session_id: str,
    attempt: GameAttemptCreate,
    current_user=Depends(get_current_user),
):
    session = (
        supabase_admin.table("game_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", current_user.id)
        .single()
        .execute()
    )
    if not session.data:
        raise HTTPException(status_code=404, detail="Oyun oturumu bulunamadı.")
    if session.data.get("ended_at"):
        raise HTTPException(status_code=400, detail="Bu oyun oturumu zaten tamamlandı.")

    xp = XP_PER_CORRECT if attempt.is_correct else 0
    attempt_data = {
        "session_id": session_id,
        "word_id": attempt.word_id,
        "general_word_id": attempt.general_word_id,
        "is_correct": attempt.is_correct,
        "attempts_count": attempt.attempts_count,
        "time_taken_ms": attempt.time_taken_ms,
        "xp_awarded": xp,
    }
    result = supabase_admin.table("game_attempts").insert(attempt_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Deneme kaydedilemedi.")

    new_score = session.data["score"] + (1 if attempt.is_correct else 0)
    new_xp = session.data["xp_earned"] + xp
    supabase_admin.table("game_sessions").update(
        {"score": new_score, "xp_earned": new_xp}
    ).eq("id", session_id).execute()

    total_xp = 0
    if xp:
        try:
            prof = (
                supabase_admin.table("profiles")
                .select("total_xp")
                .eq("id", current_user.id)
                .single()
                .execute()
            )
            current_total = (prof.data or {}).get("total_xp", 0) or 0
            total_xp = current_total + xp
            supabase_admin.table("profiles").update(
                {"total_xp": total_xp}
            ).eq("id", current_user.id).execute()
        except Exception as e:
            print(f"GAME_ATTEMPT xp update warning: {e}")

    return GameAttemptResponse(
        id=result.data[0]["id"],
        is_correct=attempt.is_correct,
        xp_awarded=xp,
        total_score=new_score,
        total_xp=total_xp,
    )


@router.post("/{session_id}/finish", response_model=GameFinishResponse)
async def finish_game(session_id: str, current_user=Depends(get_current_user)):
    session = (
        supabase_admin.table("game_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", current_user.id)
        .single()
        .execute()
    )
    if not session.data:
        raise HTTPException(status_code=404, detail="Oyun oturumu bulunamadı.")

    now = datetime.now(timezone.utc).isoformat()
    result = (
        supabase_admin.table("game_sessions")
        .update({"ended_at": now})
        .eq("id", session_id)
        .execute()
    )
    updated = result.data[0] if result.data else session.data

    return GameFinishResponse(
        id=updated["id"],
        score=updated["score"],
        xp_earned=updated["xp_earned"],
        ended_at=updated.get("ended_at") or now,
    )


@router.get("/history", response_model=List[GameHistoryItem])
async def get_history(limit: int = 20, current_user=Depends(get_current_user)):
    result = (
        supabase_admin.table("game_sessions")
        .select("id, mode, pool_source, score, xp_earned, started_at, ended_at")
        .eq("user_id", current_user.id)
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []
