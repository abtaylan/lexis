from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.words import (
    ReviewResult,
    WeakWordTypeItem,
    WeakWordTypesResult,
    WordCreate,
    WordListResponse,
    WordResponse,
    WordUpdate,
)
from app.services.spaced_repetition import calculate_next_review
from app.services.streak import update_streak
from app.services.xp_service import award_xp

router = APIRouter()

@router.get("", response_model=WordListResponse)
async def get_words(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = None,
    list_type: str | None = None,
    search: str | None = None,
    current_user=Depends(get_current_user)
):
    # Kullanıcının aktif öğrenme diline göre filtrele (Kullanıcı Madde 2 —
    # kelime listesi, dashboard'da o an seçili olan dile ait kelimeleri gösterir)
    profile = (
        supabase_admin.table("profiles")
        .select("learning_lang")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    active_lang = (profile.data or {}).get("learning_lang", "en")

    query = (
        supabase_admin.table("words")
        .select("*", count="exact")
        .eq("user_id", current_user.id)
        .eq("source_lang", active_lang)
        .order("created_at", desc=True)
        .range((page - 1) * page_size, page * page_size - 1)
    )
    if status:
        query = query.eq("status", status)
    if list_type:
        query = query.eq("list_type", list_type)
    if search:
        query = query.ilike("word", f"%{search}%")

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
    data["next_review_at"] = (datetime.now(UTC).isoformat())

    # Kelimenin dil çiftini kullanıcının profilinden al (source=öğrenilen dil, target=ana dil)
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang, learning_lang")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    prof_data = profile.data or {}
    active_lang = prof_data.get("learning_lang", "en")
    data["source_lang"] = active_lang
    data["target_lang"] = prof_data.get("native_lang", "tr")

    result = supabase_admin.table("words").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Kelime eklenemedi.")

    # Streak güncelle (kelimenin eklendiği dile ait)
    await update_streak(current_user.id, "word_added", learning_lang=active_lang)

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

    # Streak, kelimenin AİT OLDUĞU dile yazılır (kullanıcı o sırada başka bir
    # dili aktif çalışıyor olsa bile — Kullanıcı Madde 2)
    word_lang = word.data.get("source_lang")
    await update_streak(current_user.id, "word_reviewed", learning_lang=word_lang)

    # XP: sadece doğru cevapta kazandır (yanlış tekrar XP vermez)
    xp_result = None
    if review.success:
        xp_result = await award_xp(current_user.id, "flashcard_review", source_id=word_id)

    response = {"message": "Güncellendi", "next_review_at": updated["next_review_at"]}
    if xp_result:
        response["xp"] = xp_result.to_dict()
    return response

@router.get("/stats/weak-word-types", response_model=WeakWordTypesResult)
async def weak_word_types(
    days: int = 30,
    limit: int = 5,
    current_user=Depends(get_current_user),
):
    """Kelime tarafında 'zayıf kelime türü' özeti (V2 madde #6 — Faz 2).

    NOT (10 Eylül 2026): exams.py::weak_topics'teki gibi bir "deneme geçmişi"
    tablosu (quiz_results/study_sessions) üzerinden HESAPLANMIYOR — o tablolar
    şemada var ama backend'in hiçbir yerinde INSERT edilmiyor (flashcard
    review akışı /words/{id}/review, geçmiş kaydı tutmadan doğrudan words
    satırındaki SM-2 alanlarını güncelliyor, bkz. review_word). Bu yüzden bu
    uç, kelimenin GÜNCEL ease_factor'üne bakıyor: calculate_next_review
    başarısız tekrarda ease_factor'ü düşürüyor (min 1.3), başarılıda
    artırıyor (varsayılan 2.5) — bir word_type'ın ortalama ease_factor'ü
    2.5'in altındaysa o tür net olarak zorlanılıyor demektir.

    Sadece en az bir kez tekrar edilmiş (last_reviewed_at dolu) ve word_type'ı
    olan kelimeler dahil edilir — mobil tarafta 10 Eylül 2026'ya kadar
    word_type hiç gönderilmiyordu (bkz. mobile/src/app/(app)/words.tsx bug
    fix), o yüzden eski kelimelerde bu alan büyük oranda boş olacaktır; yeni
    eklenen kelimelerle zamanla dolacak.
    """
    days = max(1, min(days, 365))
    limit = max(1, min(limit, 20))

    profile = (
        supabase_admin.table("profiles")
        .select("learning_lang")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    active_lang = (profile.data or {}).get("learning_lang", "en")
    since_iso = (datetime.now(UTC) - timedelta(days=days)).isoformat()

    rows = (
        supabase_admin.table("words")
        .select("word_type, ease_factor")
        .eq("user_id", current_user.id)
        .eq("source_lang", active_lang)
        .not_.is_("word_type", "null")
        .not_.is_("last_reviewed_at", "null")
        .gte("last_reviewed_at", since_iso)
        .execute()
        .data
    ) or []

    buckets: dict[str, dict[str, float]] = {}
    for r in rows:
        wt = (r.get("word_type") or "").strip().lower()
        if not wt:
            continue
        b = buckets.setdefault(wt, {"count": 0, "ease_sum": 0.0})
        b["count"] += 1
        b["ease_sum"] += float(r.get("ease_factor") or 2.5)

    items = [
        WeakWordTypeItem(
            word_type=wt,
            word_count=int(b["count"]),
            avg_ease_factor=round(b["ease_sum"] / b["count"], 2),
        )
        for wt, b in buckets.items()
        if (b["ease_sum"] / b["count"]) < 2.5
    ]
    items.sort(key=lambda i: i.avg_ease_factor)
    items = items[:limit]

    return WeakWordTypesResult(period_days=days, items=items)

@router.get("/due/today")
async def get_due_words(current_user=Depends(get_current_user)):
    """Bugün tekrar edilmesi gereken kelimeler (aktif öğrenme diline ait)."""
    profile = (
        supabase_admin.table("profiles")
        .select("learning_lang")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    active_lang = (profile.data or {}).get("learning_lang", "en")

    now = datetime.now(UTC).isoformat()
    result = (
        supabase_admin.table("words")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("source_lang", active_lang)
        .lte("next_review_at", now)
        .eq("status", "learning")
        .execute()
    )
    return {"items": result.data, "count": len(result.data)}
