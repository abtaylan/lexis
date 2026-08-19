from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.services.xp_service import get_xp_summary
from datetime import date, timedelta
from collections import defaultdict

router = APIRouter()

def _get_active_lang(uid: str) -> str:
    """Kullanıcının o an aktif öğrenme dili (profiles.learning_lang aynası).
    Kullanıcı Madde 2 — kelime/istatistik sorguları bu dile göre filtrelenir,
    böylece dashboard "aktif dil" sekmesine göre doğru veriyi gösterir."""
    profile = (
        supabase_admin.table("profiles")
        .select("learning_lang")
        .eq("id", uid)
        .single()
        .execute()
    )
    return (profile.data or {}).get("learning_lang", "en")

@router.get("/summary")
async def get_stats(current_user=Depends(get_current_user)):
    uid = current_user.id
    active_lang = _get_active_lang(uid)

    words = (
        supabase_admin.table("words")
        .select("status, list_type", count="exact")
        .eq("user_id", uid)
        .eq("source_lang", active_lang)
        .execute()
    )
    total = words.count or 0
    learned = sum(1 for w in (words.data or []) if w["status"] == "learned")
    learning = total - learned
    active = sum(1 for w in (words.data or []) if w["list_type"] == "active")
    passive = total - active

    today = date.today().isoformat()
    progress = (
        supabase_admin.table("daily_progress")
        .select("*")
        .eq("user_id", uid)
        .eq("learning_lang", active_lang)
        .order("date", desc=True)
        .limit(30)
        .execute()
    )

    today_data = next((r for r in (progress.data or []) if r["date"] == today), None)
    current_streak = today_data["streak_day"] if today_data else 0
    today_added = today_data["words_added"] if today_data else 0
    daily_goal = today_data.get("goal", 5) if today_data else 5

    return {
        "learning_lang": active_lang,
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

@router.get("/history")
async def get_stats_history(days: int = 14, current_user=Depends(get_current_user)):
    try:
        active_lang = _get_active_lang(current_user.id)
        start = (date.today() - timedelta(days=days)).isoformat()
        result = (
            supabase_admin.table("daily_progress")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("learning_lang", active_lang)
            .gte("date", start)
            .order("date")
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"STATS_HISTORY ERROR: {e}")
        raise HTTPException(status_code=500, detail="Geçmiş verisi alınamadı.")

# ── XP / seviye özeti — XPBar bileşeni için (hesap geneli, dile bağlı değil) ──
@router.get("/xp")
async def get_xp(current_user=Depends(get_current_user)):
    return await get_xp_summary(current_user.id)

# ── Detaylı analiz — grafik sayfası için ──────────────────────
@router.get("/analytics")
async def get_analytics(current_user=Depends(get_current_user)):
    uid = current_user.id
    active_lang = _get_active_lang(uid)

    words = (
        supabase_admin.table("words")
        .select("status, list_type, word_type, repetition_count, created_at, ease_factor")
        .eq("user_id", uid)
        .eq("source_lang", active_lang)
        .execute()
    )
    rows = words.data or []

    total = len(rows)
    learned = sum(1 for w in rows if w["status"] == "learned")
    learning = sum(1 for w in rows if w["status"] == "learning")
    archived = sum(1 for w in rows if w["status"] == "archived")
    active = sum(1 for w in rows if w["list_type"] == "active")
    passive = total - active

    # ── Kelime türüne göre dağılım + öğrenme hızı ──
    by_type = defaultdict(lambda: {"total": 0, "learned": 0, "rep_sum": 0, "rep_count": 0})
    for w in rows:
        t = (w.get("word_type") or "diğer").strip().lower() or "diğer"
        by_type[t]["total"] += 1
        if w["status"] == "learned":
            by_type[t]["learned"] += 1
        rc = int(w.get("repetition_count") or 0)
        by_type[t]["rep_sum"] += rc
        by_type[t]["rep_count"] += 1

    type_breakdown = []
    for t, d in by_type.items():
        avg_rep = round(d["rep_sum"] / d["rep_count"], 1) if d["rep_count"] else 0
        learn_rate = round((d["learned"] / d["total"]) * 100) if d["total"] else 0
        type_breakdown.append({
            "word_type": t,
            "total": d["total"],
            "learned": d["learned"],
            "avg_repetition": avg_rep,  # düşük = daha hızlı öğrenildi
            "learn_rate": learn_rate,  # %
        })
    type_breakdown.sort(key=lambda x: x["total"], reverse=True)

    # ── Günlük eklenen kelime trendi (son 30 gün) ──
    daily_added = defaultdict(int)
    for w in rows:
        d = (w.get("created_at") or "")[:10]
        if d:
            daily_added[d] += 1

    last30 = []
    for i in range(29, -1, -1):
        day = (date.today() - timedelta(days=i)).isoformat()
        last30.append({"date": day, "added": daily_added.get(day, 0)})

    # ── Günlük progress (tekrar + streak) ──
    progress = (
        supabase_admin.table("daily_progress")
        .select("date, words_added, words_reviewed, streak_day, goal")
        .eq("user_id", uid)
        .eq("learning_lang", active_lang)
        .order("date")
        .limit(60)
        .execute()
    )

    return {
        "learning_lang": active_lang,
        "totals": {
            "total": total, "learned": learned, "learning": learning,
            "archived": archived, "active": active, "passive": passive,
        },
        "type_breakdown": type_breakdown,
        "daily_added": last30,
        "daily_progress": progress.data or [],
    }
