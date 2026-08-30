"""
backend/app/services/messaging_service.py

Madde 6, Faz 2 — Mesajlaşma. Basit polling tabanlı: bu kod tabanında hiçbir
yerde Supabase Realtime kullanılmıyor (bkz. proje kararı), frontend belirli
aralıklarla GET /social/conversations ve GET /social/conversations/{username}
uçlarını tekrar çağırarak günceller.

conversations tablosu iki kullanıcı için normalize edilmiş TEK satır tutar
(user_a_id/user_b_id — hangisinin "a" hangisinin "b" olduğu önemli değil,
016_social_messaging_and_challenges.sql'deki LEAST/GREATEST unique index
bunu garanti eder). Aynı normalize mantığı burada Python tarafında da
uygulanıyor ki insert her zaman tutarlı olsun.

Engelleme (block_service.is_blocked_either_way) mesaj gönderirken VE bir
konuşmayı açarken kontrol edilir — engellenen/engelleyen taraf birbirine
mesaj gönderemez ve geçmişi göremez.
"""

from __future__ import annotations

from datetime import UTC, datetime
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
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


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


def _find_conversation(user_a_id: str, user_b_id: str) -> dict[str, Any] | None:
    res = (
        supabase_admin.table("conversations")
        .select("*")
        .or_(
            f"and(user_a_id.eq.{user_a_id},user_b_id.eq.{user_b_id}),"
            f"and(user_a_id.eq.{user_b_id},user_b_id.eq.{user_a_id})"
        )
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def _get_or_create_conversation(user_a_id: str, user_b_id: str) -> dict[str, Any]:
    existing = _find_conversation(user_a_id, user_b_id)
    if existing:
        return existing
    lo, hi = sorted([user_a_id, user_b_id])
    try:
        res = (
            supabase_admin.table("conversations")
            .insert({"user_a_id": lo, "user_b_id": hi})
            .execute()
        )
        return res.data[0]
    except Exception:
        # Eşzamanlı iki istek aynı anda konuşma oluşturmaya çalışmış olabilir
        # (unique index bunu engeller) — bu durumda mevcut satırı geri döndür.
        existing = _find_conversation(user_a_id, user_b_id)
        if existing:
            return existing
        raise


def _other_user_id(conversation: dict[str, Any], current_user_id: str) -> str:
    return (
        conversation["user_b_id"]
        if conversation["user_a_id"] == current_user_id
        else conversation["user_a_id"]
    )


def list_conversations(current_user_id: str) -> list[dict[str, Any]]:
    res = (
        supabase_admin.table("conversations")
        .select("*")
        .or_(f"user_a_id.eq.{current_user_id},user_b_id.eq.{current_user_id}")
        .order("last_message_at", desc=True)
        .execute()
    )
    conversations = res.data or []
    items = []
    for conv in conversations:
        other_id = _other_user_id(conv, current_user_id)
        other = _get_profile(other_id)
        if not other:
            continue

        last_msg = (
            supabase_admin.table("messages")
            .select("body, created_at, sender_id")
            .eq("conversation_id", conv["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        last_rows = last_msg.data or []
        preview = last_rows[0]["body"] if last_rows else None
        preview_sender_id = last_rows[0]["sender_id"] if last_rows else None

        unread = (
            supabase_admin.table("messages")
            .select("id", count="exact")
            .eq("conversation_id", conv["id"])
            .eq("sender_id", other_id)
            .is_("read_at", "null")
            .execute()
        )

        items.append({
            "id": conv["id"],
            "other_user": _profile_card(other),
            "last_message_preview": preview,
            "last_message_sender_id": preview_sender_id,
            "last_message_at": conv["last_message_at"],
            "unread_count": unread.count or 0,
        })
    return items


def get_thread(current_user_id: str, other_username: str, limit: int = 100) -> dict[str, Any]:
    other = _get_profile_by_username(other_username.strip())
    if not other:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if other["id"] == current_user_id:
        raise HTTPException(status_code=400, detail="Kendinle konuşma başlatamazsın.")
    if is_blocked_either_way(current_user_id, other["id"]):
        raise HTTPException(status_code=403, detail="Bu kullanıcıyla mesajlaşamazsın.")

    conv = _get_or_create_conversation(current_user_id, other["id"])
    limit = max(1, min(limit, 200))

    msgs = (
        supabase_admin.table("messages")
        .select("*")
        .eq("conversation_id", conv["id"])
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )

    # Karşı taraftan gelen okunmamış mesajları okundu işaretle.
    supabase_admin.table("messages").update(
        {"read_at": datetime.now(UTC).isoformat()}
    ).eq("conversation_id", conv["id"]).eq("sender_id", other["id"]).is_(
        "read_at", "null"
    ).execute()

    return {
        "conversation_id": conv["id"],
        "other_user": _profile_card(other),
        "messages": msgs.data or [],
    }


def send_message(current_user_id: str, other_username: str, body: str) -> dict[str, Any]:
    text = (body or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Mesaj boş olamaz.")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Mesaj çok uzun.")

    other = _get_profile_by_username(other_username.strip())
    if not other:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    if other["id"] == current_user_id:
        raise HTTPException(status_code=400, detail="Kendine mesaj gönderemezsin.")
    if is_blocked_either_way(current_user_id, other["id"]):
        raise HTTPException(status_code=403, detail="Bu kullanıcıya mesaj gönderemezsin.")

    conv = _get_or_create_conversation(current_user_id, other["id"])
    now = datetime.now(UTC).isoformat()

    msg = (
        supabase_admin.table("messages")
        .insert({
            "conversation_id": conv["id"],
            "sender_id": current_user_id,
            "body": text,
        })
        .execute()
    ).data[0]

    supabase_admin.table("conversations").update({"last_message_at": now}).eq(
        "id", conv["id"]
    ).execute()

    sender = _get_profile(current_user_id)
    sender_name = (sender or {}).get("display_name") or (sender or {}).get("username") or "Bir kullanıcı"
    supabase_admin.table("notifications").insert({
        "user_id": other["id"],
        "type": "new_message",
        "title": "Yeni mesaj",
        "message": f"{sender_name} sana bir mesaj gönderdi.",
    }).execute()

    return msg


def unread_total(current_user_id: str) -> int:
    convs = (
        supabase_admin.table("conversations")
        .select("id")
        .or_(f"user_a_id.eq.{current_user_id},user_b_id.eq.{current_user_id}")
        .execute()
    )
    conv_ids = [c["id"] for c in (convs.data or [])]
    if not conv_ids:
        return 0
    res = (
        supabase_admin.table("messages")
        .select("id", count="exact")
        .in_("conversation_id", conv_ids)
        .neq("sender_id", current_user_id)
        .is_("read_at", "null")
        .execute()
    )
    return res.count or 0
