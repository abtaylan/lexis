"""
backend/app/services/follow_service.py

Madde 6, Faz 1 — Takip etme: arkadaşlıktan bağımsız, tek yönlü
(Twitter/Instagram tarzı takip/takipçi). bkz. 015_social_friends.sql
(follows tablosu) ve friends_service.py (arkadaşlık, ayrı akış).
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.core.database import supabase_admin
from app.services.block_service import is_blocked_either_way

_PROFILE_COLS = "id, username, display_name, avatar_url, level, is_active"


def _profile_card(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "username": row.get("username"),
        "display_name": row.get("display_name"),
        "avatar_url": row.get("avatar_url"),
        "level": row.get("level", 1),
    }


def follow_user(current_user_id: str, target_id: str) -> None:
    if target_id == current_user_id:
        raise HTTPException(status_code=400, detail="Kendini takip edemezsin.")
    if is_blocked_either_way(current_user_id, target_id):
        raise HTTPException(status_code=403, detail="Bu kullanıcıyı takip edemezsin.")

    target = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("id", target_id)
        .limit(1)
        .execute()
    )
    if not target.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    existing = (
        supabase_admin.table("follows")
        .select("id")
        .eq("follower_id", current_user_id)
        .eq("following_id", target_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return  # zaten takip ediliyor — idempotent

    supabase_admin.table("follows").insert({
        "follower_id": current_user_id,
        "following_id": target_id,
    }).execute()


def unfollow_user(current_user_id: str, target_id: str) -> None:
    supabase_admin.table("follows").delete().eq("follower_id", current_user_id).eq(
        "following_id", target_id
    ).execute()


def list_followers(user_id: str) -> list[dict[str, Any]]:
    res = (
        supabase_admin.table("follows")
        .select("follower_id")
        .eq("following_id", user_id)
        .execute()
    )
    ids = [r["follower_id"] for r in (res.data or [])]
    return _cards_for_ids(ids)


def list_following(user_id: str) -> list[dict[str, Any]]:
    res = (
        supabase_admin.table("follows")
        .select("following_id")
        .eq("follower_id", user_id)
        .execute()
    )
    ids = [r["following_id"] for r in (res.data or [])]
    return _cards_for_ids(ids)


def _cards_for_ids(ids: list[str]) -> list[dict[str, Any]]:
    if not ids:
        return []
    res = (
        supabase_admin.table("profiles")
        .select(_PROFILE_COLS)
        .in_("id", ids)
        .execute()
    )
    return [_profile_card(p) for p in (res.data or [])]


def get_counts(user_id: str) -> dict[str, int]:
    followers = (
        supabase_admin.table("follows")
        .select("id", count="exact")
        .eq("following_id", user_id)
        .execute()
    )
    following = (
        supabase_admin.table("follows")
        .select("id", count="exact")
        .eq("follower_id", user_id)
        .execute()
    )
    return {
        "follower_count": followers.count or 0,
        "following_count": following.count or 0,
    }
