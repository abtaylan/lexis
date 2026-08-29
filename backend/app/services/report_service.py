"""
backend/app/services/report_service.py

Madde 6 ek — Şikayet/Rapor. block_service.py'nin desenini birebir izler
(thin service, supabase_admin, Türkçe HTTPException mesajları). Engellemenin
aksine (is_blocked_either_way ile mesajlaşma/görüntüleme engellenir), rapor
etmek herhangi bir işlemi ENGELLEMEZ — sadece 018_reports.sql'deki `reports`
tablosuna bir kayıt düşer, admin panelden incelenmesi için (bkz. migration
dosyasındaki not). Bir kullanıcı zaten engellenmiş olsa bile rapor edilebilir.
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from app.core.database import supabase_admin

_VALID_REASONS = {
    "inappropriate_behavior",
    "spam",
    "harassment",
    "hate_speech",
    "impersonation",
    "other",
}


def create_report(
    current_user_id: str,
    target_user_id: str,
    reason: str,
    details: str | None = None,
    message_id: str | None = None,
) -> dict[str, Any]:
    if target_user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Kendini şikayet edemezsin.")

    if reason not in _VALID_REASONS:
        reason = "other"

    target = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("id", target_user_id)
        .limit(1)
        .execute()
    )
    if not target.data:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    row = {
        "reporter_id": current_user_id,
        "reported_user_id": target_user_id,
        "reason": reason,
        "details": (details or "").strip()[:2000] or None,
    }
    if message_id:
        row["message_id"] = message_id

    res = supabase_admin.table("reports").insert(row).execute()
    return res.data[0]
