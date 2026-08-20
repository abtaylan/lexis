"""
backend/app/api/routes/notifications.py

Madde 3a — Dashboard'daki görsel hatırlatma/bildirim alanı.
Bildirim kayıtları buraya backend/send_schedule_reminders.py (standalone cron
script) tarafından yazılır; bu route'lar sadece kullanıcının kendi
bildirimlerini okuması/okundu işaretlemesi için var.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_user
from app.core.database import supabase_admin

router = APIRouter()


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    schedule_item_id: Optional[str] = None
    is_read: bool
    created_at: str


@router.get("")
async def get_notifications(limit: int = 20, current_user=Depends(get_current_user)):
    """
    Kullanıcının en son bildirimlerini (en yeni önce) döner, artı okunmamış sayısı.
    Dashboard'daki bildirim paneli için kullanılıyor.
    """
    limit = max(1, min(limit, 100))
    result = (
        supabase_admin.table("notifications")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    items = result.data or []
    unread_count = sum(1 for n in items if not n.get("is_read"))
    return {"items": items, "unread_count": unread_count}


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, current_user=Depends(get_current_user)):
    result = (
        supabase_admin.table("notifications")
        .update({"is_read": True})
        .eq("id", notification_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı.")
    return result.data[0]


@router.patch("/read-all")
async def mark_all_read(current_user=Depends(get_current_user)):
    supabase_admin.table("notifications").update({"is_read": True}).eq(
        "user_id", current_user.id
    ).eq("is_read", False).execute()
    return {"message": "ok"}
