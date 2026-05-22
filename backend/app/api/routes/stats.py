from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.core.database import supabase_admin
from datetime import date, timedelta

router = APIRouter()


@router.get("/summary")
async def get_stats(current_user=Depends(get_current_user)):
    uid = current_user.id

    # Toplam kelimeler
    words = supabase_admin.table("words").select("status, list_type", count="exact").eq("user_id", uid).execute()
    total = words.count or 0
    learned = sum(1 for w in (words.data or []) if w["status"] == "learned")
    learning = total - learned
    active = sum(1 for w in (words.data or []) if w["list_type"] == "active")
    passive = total - active

    # Streak
    today = date.today().isoformat()
    progress = (
        supabase_admin.table("daily_progress")
        .select("*")
        .eq("user_id", uid)
        .order("date", desc=True)
        .limit(30)
        .execute()
    )

    today_data = next((r for r in (progress.data or []) if r["date"] == today), None)
    current_streak = today_data["streak_day"] if today_data else 0
    today_added = today_data["words_added"] if today_data else 0
    daily_goal = today_data["goal"] if today_data else 5

    return {
        "total_words": total,
        "learned": learned,
        "learning": learning,
        "active_list": active,
        "passive_list": passive,
        "current_streak": current_streak,
        "today_added": today_added,
        "daily_goal": daily_goal,
        "daily_history": progress.data or [],
    }
