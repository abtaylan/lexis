"""
backend/app/services/public_profile_service.py

Madde 6, Faz 1 — Başkasının profilini görüntüleme. Kullanıcı kararıyla
HERKESE AÇIK: bu servis herhangi bir giriş yapmış kullanıcı için başka
bir kullanıcının istatistik özetini (öğrenilen/öğreniliyor kelime sayısı,
güncel seri) ve çalışma programını döner — ek bir gizlilik/izin kontrolü
yok (bkz. proje durum dosyasındaki Madde 6 notu ve kullanıcı kararı).

stats.py'deki get_stats() ile aynı hesaplama mantığı burada KASITLI olarak
kopyalandı, import edilmedi — stats.py bir route modülü (router içeriyor),
onu buradan import etmek gereksiz bir bağımlılık + router'ı iki kez
kaydetme riski yaratırdı. Aynı desen leaderboard_service.py'nin de
admin_platform.py'den bağımsız kendi profil sorgusunu yazmasıyla tutarlı.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.core.database import supabase_admin
from app.services.block_service import is_blocked_either_way
from app.services.friends_service import friendship_status_map, following_set

_PROFILE_COLS = "id, username, display_name, avatar_url, level, total_xp, created_at, learning_lang"


def _get_profile_by_username(username: str) -> dict[str, Any] | None:
    res = (
        supabase_admin.table("profiles")
        .select(_PROFILE_COLS)
        .eq("username", username)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def _friend_count(user_id: str) -> int:
    res = (
        supabase_admin.table("friendships")
        .select("id", count="exact")
        .eq("status", "accepted")
        .or_(f"requester_id.eq.{user_id},addressee_id.eq.{user_id}")
        .execute()
    )
    return res.count or 0


def get_public_profile(username: str, viewer_id: str) -> dict[str, Any]:
    profile = _get_profile_by_username(username.strip())
    if not profile:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    target_id = profile["id"]
    is_self = target_id == viewer_id

    if not is_self and is_blocked_either_way(viewer_id, target_id):
        raise HTTPException(status_code=403, detail="Bu profili görüntüleyemezsin.")

    friendship_id = None
    if is_self:
        relationship_status = "self"
        is_following = False
    else:
        rel = friendship_status_map(viewer_id).get(target_id)
        relationship_status = rel["status"] if rel else "none"
        friendship_id = rel["friendship_id"] if rel else None
        is_following = target_id in following_set(viewer_id)

    from app.services.follow_service import get_counts
    counts = get_counts(target_id)

    active_lang = profile.get("learning_lang") or "en"

    words = (
        supabase_admin.table("words")
        .select("status", count="exact")
        .eq("user_id", target_id)
        .eq("source_lang", active_lang)
        .execute()
    )
    word_rows = words.data or []
    total = words.count or 0
    learned = sum(1 for w in word_rows if w["status"] == "learned")
    learning = total - learned

    from datetime import date
    today = date.today().isoformat()
    progress = (
        supabase_admin.table("daily_progress")
        .select("date, streak_day")
        .eq("user_id", target_id)
        .eq("date", today)
        .limit(1)
        .execute()
    )
    current_streak = (progress.data or [{}])[0].get("streak_day", 0) if progress.data else 0

    schedule = (
        supabase_admin.table("study_schedule")
        .select("day_of_week, time_slot, activity, duration_min")
        .eq("user_id", target_id)
        .eq("is_active", True)
        .order("day_of_week")
        .execute()
    )

    return {
        "id": target_id,
        "username": profile.get("username"),
        "display_name": profile.get("display_name"),
        "avatar_url": profile.get("avatar_url"),
        "level": profile.get("level", 1),
        "total_xp": profile.get("total_xp", 0),
        "created_at": profile["created_at"],
        "friend_count": _friend_count(target_id),
        "follower_count": counts["follower_count"],
        "following_count": counts["following_count"],
        "relationship_status": relationship_status,
        "friendship_id": friendship_id,
        "is_following": is_following,
        "stats": {
            "learning_lang": active_lang,
            "total_words": total,
            "learned": learned,
            "learning": learning,
            "current_streak": current_streak,
        },
        "schedule": schedule.data or [],
    }
