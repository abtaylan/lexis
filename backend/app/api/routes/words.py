from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.words import WordCreate, WordUpdate, WordResponse, WordListResponse, ReviewResult
from app.services.spaced_repetition import calculate_next_review
from app.services.streak import update_streak
from app.services.xp_service import award_xp
from datetime import datetime, timezone

router = APIRouter()

@router.get("", response_model=WordListResponse)
async def get_words(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    list_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    query = (
        supabase_admin.table("words")
        .select("*", count="exact")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .range((page - 1) * page_size, page * page_size - 1)
    )
    if status:
        query = query.eq("status", status)
    if list_type:
        query = query.eq("list_type", list_type)
    if search:
        query = query.ilike("word", `%${search}%`)

    result = query.execute()
    return WordListResponse(
        items=result.data,
        total=result.count or 0,
        page=page,
        page_size=page_size
    )

@router.post("", response_model=WordResponse, status_code=201)
async def create_word(
    word_in: WordCreate,
    current_user=Depends(get_current_user)
):
    # Aynı kelime daha önce eklendi mi?
    existing = (
        supabase_admin.table("words")
        .select("id")
        .eq("user_id", current_user.id)
        .ilike("word", word_in.word.strip())
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Bu kelime zaten ekli.")

    data = word_in.model_dump()
    data["user_id"] = current_user.id
    data["next_review_at"] = (datetime.now(timezone.utc).isoformat())

    # Kelimenin dil çiftini kullanıcının profilinden al (source=öğrenilen dil, target=ana dil)
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang, learning_lang")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    prof_data = profile.data or {}
    data["source_lang"] = prof_data.get("learning_lang", "en")
    data["target_lang"] = prof_data.get("native_lang", "tr")

    result = supabase_admin.table("words").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Kelime eklenemedi.")

    # Streak güncelle
    await update_streak(current_user.id, "word_added")

    return result.data[0]

@router.patch("/{word_id}", response_model=WordResponse)
async def update_word(
    word_id: str,
    word_in: WordUpdate,
    current_user=Depends(get_current_user)
):
    result = (
        supabase_admin.table("words")
        .update(word_in.model_dump(exclude_none=True))
        .eq("id", word_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı.")
    return result.data[0]

@router.delete("/{word_id}", status_code=204)
async def delete_word(
    word_id: str,
    current_user=Depends(get_current_user)
):
    result = (
        supabase_admin.table("words")
        .delete()
        .eq("id", word_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı.")

@router.post("/{word_id}/review")
async def review_word(
    word_id: str,
    review: ReviewResult,
    current_user=Depends(get_current_user)
):
    """Spaced repetition: flashcard sonucunu kaydet."""
    word = (
        supabase_admin.table("words")
        .select("*")
        .eq("id", word_id)
        .eq("user_id", current_user.id)
        .single()
        .execute()
    )
    if not word.data:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı.")

    updated = calculate_next_review(word.data, review.success)
    supabase_admin.table("words").update(updated).eq("id", word_id).execute()

    await update_streak(current_user.id, "word_reviewed")

    # XP: sadece doğru cevapta kazandır (yanlış tekrar XP vermez)
    xp_result = None
    if review.success:
        xp_result = await award_xp(current_user.id, "flashcard_review", source_id=word_id)

    response = {"message": "Güncellendi", "next_review_at": updated["next_review_at"]}
    if xp_result:
        response["xp"] = xp_result.to_dict()
    return response

@router.get("/due/today")
async def get_due_words(current_user=Depends(get_current_user)):
    """Bugün tekrar edilmesi gereken kelimeler."""
    now = datetime.now(timezone.utc).isoformat()
    result = (
        supabase_admin.table("words")
        .select("*")
        .eq("user_id", current_user.id)
        .lte("next_review_at", now)
        .eq("status", "learning")
        .execute()
    )
    return {"items": result.data, "count": len(result.data)}
