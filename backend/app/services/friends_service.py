"""
backend/app/services/friends_service.py

Madde 6, Faz 1 — Arkadaşlık sistemi (istek gönderme / kabul etme /
reddetme / arkadaşlıktan çıkarma, arkadaş listesi) + kullanıcı arama.

Diğer servislerdeki desenle aynı (bkz. leaderboard_service.py): Supabase
RPC / raw SQL kullanılmıyor, supabase-py query builder ile veri çekilip
Python tarafında birleştiriliyor. Bu iki tablo (friendships, follows)
sadece service-role client (supabase_admin, RLS bypass eder) ile
yazılıyor — bkz. 015_social_friends.sql.

Not — arama: .or_() PostgREST filtresi kullanılmadı çünkü içine kullanıcı
girdisi (serbest metin) konulacaktı; proje genelinde (words.py) arama hep
TEK kolonlu .ilike() ile yapılıyor, burada da aynı yaklaşım korunup
username + display_name için ayrı ayrı sorgulanıp Python'da birleştirildi.
"""

from __future__ import annotations

from datetime import datetime, timezone
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


def _get_profile(user_id: str) -> dict[str, Any] | None:
    res = (
        supabase_admin.table("profiles")
        .select(_PROFILE_COLS)
        .eq("id", user_id)
        .single()
        .execute()
    )
    return res.data


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


def friendship_status_map(current_user_id: str) -> dict[str, dict[str, Any]]:
    """other_user_id -> {"status": 'pending_sent'|'pending_received'|'friends',
    "friendship_id": ...} — sadece pending/accepted satırlar (declined yok sayılır,
    yani reddedilmiş bir istekten sonra taraflardan biri tekrar istek gönderebilir)."""
    res = (
        supabase_admin.table("friendships")
        .select("id, requester_id, addressee_id, status")
        .in_("status", ["pending", "accepted"])
        .execute()
    )
    out: dict[str, dict[str, Any]] = {}
    for row in res.data or []:
        if row["requester_id"] == current_user_id:
            other = row["addressee_id"]
        elif row["addressee_id"] == current_user_id:
            other = row["requester_id"]
        else:
            continue
        if row["status"] == "accepted":
            status = "friends"
        elif row["requester_id"] == current_user_id:
            status = "pending_sent"
        else:
            status = "pending_received"
        out[other] = {"status": status, "friendship_id": row["id"]}
    return out


def following_set(current_user_id: str) -> set[str]:
    res = (
        supabase_admin.table("follows")
        .select("following_id")
        .eq("follower_id", current_user_id)
        .execute()
    )
    return {row["following_id"] for row in (res.data or [])}


def search_users(current_user_id: str, query: str, limit: int = 20) -> list[dict[str, Any]]:
    q = (query or "").strip()
    if not q:
        return []
    limit = max(1, min(limit, 50))

    by_username = (
        supabase_admin.table("profiles")
        .select(_PROFILE_COLS)
        .ilike("username", f"%{q}%")
        .limit(limit)
        .execute()
    )
    by_display = (
        supabase_admin.table("profiles")
        .select(_PROFILE_COLS)
        .ilike("display_name", f"%{q}%")
        .limit(limit)
        .execute()
    )

    seen: dict[str, dict[str, Any]] = {}
    for row in (by_username.data or []) + (by_display.data or []):
        if row["id"] == current_user_id or not row.get("is_active", True):
            continue
        seen[row["id"]] = row
    rows = list(seen.values())[:limit]

    rel_map = friendship_status_map(current_user_id)
    following = following_set(current_user_id)

    items = []
    for r in rows:
        card = _profile_card(r)
        card["relationship_status"] = rel_map.get(r["id"], {}).get("status", "none")
        card["is_following"] = r["id"] in following
        items.append(card)
    return items


def send_friend_request(current_user_id: str, username: str) -> dict[str, Any]:
    target = _get_profile_by_username(username.strip())
    if not target:
        raise HTTPException(status_code=404, detail="Bu kullanıcı adıyla bir kullanıcı bulunamadı.")
    if target["id"] == current_user_id:
        raise HTTPException(status_code=400, detail="Kendine arkadaşlık isteği gönderemezsin.")
    if is_blocked_either_way(current_user_id, target["id"]):
        raise HTTPException(status_code=403, detail="Bu kullanıcıya arkadaşlık isteği gönderilemiyor.")

    existing = friendship_status_map(current_user_id).get(target["id"])
    if existing:
        if existing["status"] == "friends":
            raise HTTPException(status_code=409, detail="Zaten arkadaşsınız.")
        if existing["status"] == "pending_sent":
            raise HTTPException(status_code=409, detail="Zaten bekleyen bir isteğin var.")
        if existing["status"] == "pending_received":
            raise HTTPException(
                status_code=409,
                detail="Bu kullanıcı sana zaten bir arkadaşlık isteği gönderdi — onu kabul edebilirsin.",
            )

    res = (
        supabase_admin.table("friendships")
        .insert({
            "requester_id": current_user_id,
            "addressee_id": target["id"],
            "status": "pending",
        })
        .execute()
    )
    row = res.data[0]

    sender = _get_profile(current_user_id)
    sender_name = (sender or {}).get("display_name") or (sender or {}).get("username") or "Bir kullanıcı"
    supabase_admin.table("notifications").insert({
        "user_id": target["id"],
        "type": "friend_request",
        "title": "Yeni arkadaşlık isteği",
        "message": f"{sender_name} sana bir arkadaşlık isteği gönderdi.",
    }).execute()

    return {
        "id": row["id"],
        "status": row["status"],
        "created_at": row["created_at"],
        "responded_at": row.get("responded_at"),
        "user": _profile_card(target),
    }


def _get_friendship_or_404(friendship_id: str) -> dict[str, Any]:
    res = (
        supabase_admin.table("friendships")
        .select("*")
        .eq("id", friendship_id)
        .single()
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Arkadaşlık isteği bulunamadı.")
    return res.data


def respond_to_request(current_user_id: str, friendship_id: str, accept: bool) -> dict[str, Any]:
    row = _get_friendship_or_404(friendship_id)
    if row["addressee_id"] != current_user_id:
        raise HTTPException(status_code=403, detail="Bu isteği yalnızca alıcı yanıtlayabilir.")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Bu istek zaten yanıtlanmış.")

    new_status = "accepted" if accept else "declined"
    updated = (
        supabase_admin.table("friendships")
        .update({"status": new_status, "responded_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", friendship_id)
        .execute()
    ).data[0]

    if accept:
        accepter = _get_profile(current_user_id)
        accepter_name = (accepter or {}).get("display_name") or (accepter or {}).get("username") or "Bir kullanıcı"
        supabase_admin.table("notifications").insert({
            "user_id": row["requester_id"],
            "type": "friend_accept",
            "title": "Arkadaşlık isteğin kabul edildi",
            "message": f"{accepter_name} arkadaşlık isteğini kabul etti.",
        }).execute()

    other = _get_profile(row["requester_id"])
    return {
        "id": updated["id"],
        "status": updated["status"],
        "created_at": updated["created_at"],
        "responded_at": updated.get("responded_at"),
        "user": _profile_card(other) if other else None,
    }


def remove_friend(current_user_id: str, other_user_id: str) -> None:
    res = (
        supabase_admin.table("friendships")
        .select("id, requester_id, addressee_id, status")
        .eq("status", "accepted")
        .execute()
    )
    match = next(
        (
            r for r in (res.data or [])
            if {r["requester_id"], r["addressee_id"]} == {current_user_id, other_user_id}
        ),
        None,
    )
    if not match:
        raise HTTPException(status_code=404, detail="Arkadaşlık bulunamadı.")
    supabase_admin.table("friendships").delete().eq("id", match["id"]).execute()


def list_friends(current_user_id: str) -> list[dict[str, Any]]:
    res = (
        supabase_admin.table("friendships")
        .select("id, requester_id, addressee_id, status, created_at, responded_at")
        .eq("status", "accepted")
        .or_(f"requester_id.eq.{current_user_id},addressee_id.eq.{current_user_id}")
        .order("responded_at", desc=True)
        .execute()
    )
    rows = res.data or []
    other_ids = [
        (r["addressee_id"] if r["requester_id"] == current_user_id else r["requester_id"])
        for r in rows
    ]
    if not other_ids:
        return []
    profiles_res = (
        supabase_admin.table("profiles")
        .select(_PROFILE_COLS)
        .in_("id", other_ids)
        .execute()
    )
    profiles = {p["id"]: p for p in (profiles_res.data or [])}

    items = []
    for r in rows:
        other_id = r["addressee_id"] if r["requester_id"] == current_user_id else r["requester_id"]
        p = profiles.get(other_id)
        if not p:
            continue
        items.append({
            "id": r["id"],
            "status": r["status"],
            "created_at": r["created_at"],
            "responded_at": r.get("responded_at"),
            "user": _profile_card(p),
        })
    return items


def list_pending(current_user_id: str) -> dict[str, list[dict[str, Any]]]:
    res = (
        supabase_admin.table("friendships")
        .select("id, requester_id, addressee_id, status, created_at, responded_at")
        .eq("status", "pending")
        .or_(f"requester_id.eq.{current_user_id},addressee_id.eq.{current_user_id}")
        .order("created_at", desc=True)
        .execute()
    )
    rows = res.data or []
    other_ids = list({
        (r["addressee_id"] if r["requester_id"] == current_user_id else r["requester_id"])
        for r in rows
    })
    profiles: dict[str, Any] = {}
    if other_ids:
        profiles_res = (
            supabase_admin.table("profiles")
            .select(_PROFILE_COLS)
            .in_("id", other_ids)
            .execute()
        )
        profiles = {p["id"]: p for p in (profiles_res.data or [])}

    incoming, outgoing = [], []
    for r in rows:
        is_incoming = r["addressee_id"] == current_user_id
        other_id = r["requester_id"] if is_incoming else r["addressee_id"]
        p = profiles.get(other_id)
        if not p:
            continue
        item = {
            "id": r["id"],
            "status": r["status"],
            "created_at": r["created_at"],
            "responded_at": r.get("responded_at"),
            "user": _profile_card(p),
        }
        (incoming if is_incoming else outgoing).append(item)
    return {"incoming": incoming, "outgoing": outgoing}
