"""
backend/app/services/block_service.py

Madde 6, Faz 2 — Engelleme. Tek yönlü kayıt (blocks tablosu: blocker_id ->
blocked_id) ama etki KARŞILIKLI uygulanıyor: is_blocked_either_way() her iki
yönü de kontrol eder ve friends_service / follow_service / public_profile_service
/ messaging_service bu fonksiyonu çağırarak engellenen kullanıcıyla ilgili
işlemleri (arkadaşlık isteği, takip, profil görüntüleme, mesaj gönderme)
engeller — bkz. proje kararı: "Engellenen kullanıcı mesaj gönderemez,
profil/istatistik göremez, arkadaşlık/takip isteği atamaz."

Bir kullanıcıyı engellemek, aralarındaki mevcut arkadaşlığı ve karşılıklı
takip ilişkisini de temizler (aksi halde engellenen biri hâlâ "arkadaş"
görünmeye devam ederdi).
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.core.database import supabase_admin

_PROFILE_COLS = "id, username, display_name, avatar_url, level, is_active"


def _profile_card(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "username": row.get("username"),
        "display_name": row.get("display_name"),
        "avatar_url": row.get("avatar_url"),
        "level": row.get("level", 1),
    }


def is_blocked_either_way(user_a_id: str, user_b_id: str) -> bool:
    """A, B'yi engellemiş VEYA B, A'yı engellemişse True."""
    res = (
        supabase_admin.table("blocks")
        .select("id")
        .or_(
            f"and(blocker_id.eq.{user_a_id},blocked_id.eq.{user_b_id}),"
            f"and(blocker_id.eq.{user_b_id},blocked_id.eq.{user_a_id})"
        )
        .limit(1)
        .execute()
    )
    return bool(res.data)


def block_user(current_user_id: str, target_id: str) -> None:
    if target_id == current_user_id:
        raise HTTPException(status_code=400, detail="Kendini engelleyemezsin.")

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
        supabase_admin.table("blocks")
        .select("id")
        .eq("blocker_id", current_user_id)
        .eq("blocked_id", target_id)
        .limit(1)
        .execute()
    )
    if not existing.data:
        supabase_admin.table("blocks").insert({
            "blocker_id": current_user_id,
            "blocked_id": target_id,
        }).execute()

    # Aradaki arkadaşlığı temizle (yön farketmez).
    friendships = (
        supabase_admin.table("friendships")
        .select("id, requester_id, addressee_id")
        .execute()
    )
    for row in friendships.data or []:
        if {row["requester_id"], row["addressee_id"]} == {current_user_id, target_id}:
            supabase_admin.table("friendships").delete().eq("id", row["id"]).execute()

    # Karşılıklı takip ilişkisini temizle (her iki yön).
    supabase_admin.table("follows").delete().eq("follower_id", current_user_id).eq(
        "following_id", target_id
    ).execute()
    supabase_admin.table("follows").delete().eq("follower_id", target_id).eq(
        "following_id", current_user_id
    ).execute()


def unblock_user(current_user_id: str, target_id: str) -> None:
    supabase_admin.table("blocks").delete().eq("blocker_id", current_user_id).eq(
        "blocked_id", target_id
    ).execute()


def list_blocked(current_user_id: str) -> list[dict[str, Any]]:
    res = (
        supabase_admin.table("blocks")
        .select("blocked_id")
        .eq("blocker_id", current_user_id)
        .execute()
    )
    ids = [r["blocked_id"] for r in (res.data or [])]
    if not ids:
        return []
    profiles = (
        supabase_admin.table("profiles")
        .select(_PROFILE_COLS)
        .in_("id", ids)
        .execute()
    )
    return [_profile_card(p) for p in (profiles.data or [])]
