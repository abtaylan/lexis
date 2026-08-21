"""
backend/app/services/challenge_service.py

Madde 6, Faz 3 — Meydan okuma (challenge). YENİ bir oyun akışı YOK:
mevcut game_sessions tablosunu ve /api/v1/games oyun uçlarını olduğu gibi
kullanır. Akış:

  1) A, arkadaşı B'ye bir oyun modu (game_mode) için meydan okuma gönderir
     (create_challenge) — status='pending'.
  2) B kabul eder (respond_to_challenge, accept=True) — status='accepted'.
  3) Her iki taraf da KENDİ zamanında o oyun modunu normal şekilde oynar
     (mevcut /games akışı, değişiklik yok) ve bitmiş bir game_session elde
     eder.
  4) Her taraf kendi bitmiş session'ını submit_score ile "bu benim
     sonucum" diye gönderir. Her iki taraf da gönderince backend skorları
     karşılaştırıp kazananı belirler, status='completed' yapar ve her
     ikisine bildirim gönderir.

Meydan okuma sadece ARKADAŞLAR arasında yapılabilir (friends_service.
friendship_status_map ile kontrol edilir) — bu hem "kendine anlamsız
istek" hem de "tanımadığın biri sürekli meydan okusun" senaryolarını
engeller. Arkadaşlık zaten karşılıklı engelleme durumunda otomatik
düşürüldüğü için (block_service.block_user arkadaşlığı siler) burada
ayrıca bir engelleme kontrolüne gerek yok.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from app.core.database import supabase_admin
from app.services.friends_service import friendship_status_map

_PROFILE_COLS = "id, username, display_name, avatar_url, level, is_active"

_ACTIVE_STATUSES = ("pending", "accepted")


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


def _get_challenge_or_404(challenge_id: str) -> dict[str, Any]:
    res = (
        supabase_admin.table("challenges")
        .select("*")
        .eq("id", challenge_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Meydan okuma bulunamadı.")
    return rows[0]


def _item(row: dict[str, Any], current_user_id: str) -> dict[str, Any]:
    is_challenger = row["challenger_id"] == current_user_id
    other_id = row["challenged_id"] if is_challenger else row["challenger_id"]
    other = _get_profile(other_id)
    your_session_id = row["challenger_session_id"] if is_challenger else row["challenged_session_id"]
    opponent_session_id = row["challenged_session_id"] if is_challenger else row["challenger_session_id"]

    you_won: bool | None = None
    if row["status"] == "completed" and row.get("winner_id"):
        you_won = row["winner_id"] == current_user_id

    return {
        "id": row["id"],
        "mode": row["mode"],
        "status": row["status"],
        "is_challenger": is_challenger,
        "other_user": _profile_card(other) if other else None,
        "your_session_id": your_session_id,
        "opponent_session_id": opponent_session_id,
        "winner_id": row.get("winner_id"),
        "you_won": you_won,
        "created_at": row["created_at"],
        "responded_at": row.get("responded_at"),
        "completed_at": row.get("completed_at"),
    }


def create_challenge(current_user_id: str, target_username: str, mode: str) -> dict[str, Any]:
    target = (
        supabase_admin.table("profiles")
        .select(_PROFILE_COLS)
        .eq("username", target_username.strip())
        .limit(1)
        .execute()
    )
    rows = target.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Bu kullanıcı adıyla bir kullanıcı bulunamadı.")
    other = rows[0]
    if other["id"] == current_user_id:
        raise HTTPException(status_code=400, detail="Kendine meydan okuyamazsın.")

    rel = friendship_status_map(current_user_id).get(other["id"])
    if not rel or rel["status"] != "friends":
        raise HTTPException(status_code=403, detail="Sadece arkadaşlarına meydan okuyabilirsin.")

    existing = (
        supabase_admin.table("challenges")
        .select("id, challenger_id, challenged_id, status")
        .in_("status", list(_ACTIVE_STATUSES))
        .execute()
    )
    for r in existing.data or []:
        if {r["challenger_id"], r["challenged_id"]} == {current_user_id, other["id"]}:
            raise HTTPException(status_code=409, detail="Bu kullanıcıyla zaten devam eden bir meydan okuman var.")

    row = (
        supabase_admin.table("challenges")
        .insert({
            "challenger_id": current_user_id,
            "challenged_id": other["id"],
            "mode": mode,
            "status": "pending",
        })
        .execute()
    ).data[0]

    challenger = _get_profile(current_user_id)
    challenger_name = (challenger or {}).get("display_name") or (challenger or {}).get("username") or "Bir kullanıcı"
    supabase_admin.table("notifications").insert({
        "user_id": other["id"],
        "type": "challenge_invite",
        "title": "Yeni meydan okuma",
        "message": f"{challenger_name} seni bir oyuna meydan okudu.",
    }).execute()

    return _item(row, current_user_id)


def respond_to_challenge(current_user_id: str, challenge_id: str, accept: bool) -> dict[str, Any]:
    row = _get_challenge_or_404(challenge_id)
    if row["challenged_id"] != current_user_id:
        raise HTTPException(status_code=403, detail="Bu meydan okumayı yalnızca davet edilen yanıtlayabilir.")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Bu meydan okuma zaten yanıtlanmış.")

    new_status = "accepted" if accept else "declined"
    updated = (
        supabase_admin.table("challenges")
        .update({"status": new_status, "responded_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", challenge_id)
        .execute()
    ).data[0]

    if accept:
        accepter = _get_profile(current_user_id)
        accepter_name = (accepter or {}).get("display_name") or (accepter or {}).get("username") or "Bir kullanıcı"
        supabase_admin.table("notifications").insert({
            "user_id": row["challenger_id"],
            "type": "challenge_accept",
            "title": "Meydan okuman kabul edildi",
            "message": f"{accepter_name} meydan okumanı kabul etti — sıra oynamakta!",
        }).execute()

    return _item(updated, current_user_id)


def cancel_challenge(current_user_id: str, challenge_id: str) -> None:
    row = _get_challenge_or_404(challenge_id)
    if row["challenger_id"] != current_user_id:
        raise HTTPException(status_code=403, detail="Bu meydan okumayı yalnızca gönderen iptal edebilir.")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Sadece bekleyen bir meydan okuma iptal edilebilir.")
    supabase_admin.table("challenges").update({"status": "cancelled"}).eq("id", challenge_id).execute()


def submit_score(current_user_id: str, challenge_id: str, session_id: str) -> dict[str, Any]:
    row = _get_challenge_or_404(challenge_id)
    if current_user_id not in (row["challenger_id"], row["challenged_id"]):
        raise HTTPException(status_code=403, detail="Bu meydan okumaya katılımcı değilsin.")
    if row["status"] != "accepted":
        raise HTTPException(status_code=409, detail="Bu meydan okuma henüz kabul edilmemiş veya zaten tamamlanmış.")

    session = (
        supabase_admin.table("game_sessions")
        .select("id, user_id, mode, score, ended_at")
        .eq("id", session_id)
        .limit(1)
        .execute()
    )
    session_rows = session.data or []
    if not session_rows:
        raise HTTPException(status_code=404, detail="Oyun oturumu bulunamadı.")
    s = session_rows[0]
    if s["user_id"] != current_user_id:
        raise HTTPException(status_code=403, detail="Bu oyun oturumu sana ait değil.")
    if s["mode"] != row["mode"]:
        raise HTTPException(status_code=400, detail="Oyun oturumunun modu meydan okumayla eşleşmiyor.")
    if not s.get("ended_at"):
        raise HTTPException(status_code=400, detail="Bu oyun oturumu henüz tamamlanmamış.")

    is_challenger = row["challenger_id"] == current_user_id
    field = "challenger_session_id" if is_challenger else "challenged_session_id"
    updated = (
        supabase_admin.table("challenges")
        .update({field: session_id})
        .eq("id", challenge_id)
        .execute()
    ).data[0]

    challenger_session_id = updated.get("challenger_session_id")
    challenged_session_id = updated.get("challenged_session_id")

    if challenger_session_id and challenged_session_id:
        sessions = (
            supabase_admin.table("game_sessions")
            .select("id, user_id, score")
            .in_("id", [challenger_session_id, challenged_session_id])
            .execute()
        )
        by_id = {r["id"]: r for r in (sessions.data or [])}
        challenger_score = (by_id.get(challenger_session_id) or {}).get("score", 0)
        challenged_score = (by_id.get(challenged_session_id) or {}).get("score", 0)

        if challenger_score > challenged_score:
            winner_id = row["challenger_id"]
        elif challenged_score > challenger_score:
            winner_id = row["challenged_id"]
        else:
            winner_id = None

        updated = (
            supabase_admin.table("challenges")
            .update({
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "winner_id": winner_id,
            })
            .eq("id", challenge_id)
            .execute()
        ).data[0]

        for uid in (row["challenger_id"], row["challenged_id"]):
            if winner_id is None:
                msg = "Meydan okuma berabere bitti!"
            elif uid == winner_id:
                msg = "Meydan okumayı kazandın!"
            else:
                msg = "Meydan okumayı kaybettin — bir dahaki sefere!"
            supabase_admin.table("notifications").insert({
                "user_id": uid,
                "type": "challenge_result",
                "title": "Meydan okuma sonuçlandı",
                "message": msg,
            }).execute()

    return _item(updated, current_user_id)


def list_challenges(current_user_id: str) -> dict[str, list[dict[str, Any]]]:
    res = (
        supabase_admin.table("challenges")
        .select("*")
        .or_(f"challenger_id.eq.{current_user_id},challenged_id.eq.{current_user_id}")
        .order("created_at", desc=True)
        .execute()
    )
    rows = res.data or []

    incoming, outgoing, active, completed = [], [], [], []
    for r in rows:
        item = _item(r, current_user_id)
        if r["status"] == "pending":
            (outgoing if item["is_challenger"] else incoming).append(item)
        elif r["status"] == "accepted":
            active.append(item)
        elif r["status"] == "completed":
            completed.append(item)
    return {
        "incoming": incoming,
        "outgoing": outgoing,
        "active": active,
        "completed": completed[:20],
    }
