"""
backend/app/api/routes/notifications.py

Madde 3a — Dashboard'daki görsel hatırlatma/bildirim alanı.
Bildirim kayıtları buraya backend/send_schedule_reminders.py (standalone cron
script) tarafından yazılır; bu route'lar sadece kullanıcının kendi
bildirimlerini okuması/okundu işaretlemesi için var.
"""


from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.core.tokens import verify_action_token

router = APIRouter()

# cat -> profiles sütunu eşlemesi (bkz. migration 019). Yeni bir "tek tık
# kapatma" bildirim türü eklenirse buraya bir satır eklemek yeterli.
_UNSUBSCRIBE_COLUMNS = {
    "daily_word": "email_daily_word_enabled",
    "push_reminder": "push_daily_reminder_enabled",
}


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    schedule_item_id: str | None = None
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


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, current_user=Depends(get_current_user)):
    """
    KULLANICI GERİ BİLDİRİMİ (7 Eylül 2026): "bildirim temizle özelliği
    olmalı" — tek bir bildirimi kalıcı olarak siler. Sahiplik kontrolü
    için user_id eşleşmesi zorunlu (başka birinin bildirimini silemesin).
    """
    result = (
        supabase_admin.table("notifications")
        .delete()
        .eq("id", notification_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı.")
    return {"message": "ok"}


@router.delete("")
async def clear_notifications(current_user=Depends(get_current_user)):
    """Kullanıcının tüm bildirimlerini temizler ("Tümünü temizle")."""
    supabase_admin.table("notifications").delete().eq("user_id", current_user.id).execute()
    return {"message": "ok"}


@router.get("/unsubscribe", response_class=HTMLResponse)
async def unsubscribe(uid: str, token: str, cat: str = "daily_word"):
    """
    Girişsiz "tek tık" abonelikten çıkma linki — günün kelimesi e-postasının
    altındaki linke tıklandığında açılır (bkz. email_service.py::
    send_daily_word_email). Kullanıcı login olmadan bu bildirim türünü
    kapatabilsin diye auth gerektirmiyor; bunun yerine SECRET_KEY ile
    imzalanmış bir token doğrulanıyor (bkz. app/core/tokens.py) — böylece
    başka birinin user_id'sini tahmin edip onun ayarını değiştirmesi
    engellenir.
    """
    column = _UNSUBSCRIBE_COLUMNS.get(cat)
    if not column or not verify_action_token(uid, cat, token):
        return HTMLResponse(
            "<div style='font-family:Arial;text-align:center;padding:40px;'>"
            "<h2>Lexis</h2><p>Bu bağlantı geçersiz veya süresi dolmuş.</p></div>",
            status_code=400,
        )

    supabase_admin.table("profiles").update({column: False}).eq("id", uid).execute()
    return HTMLResponse(
        "<div style='font-family:Arial;text-align:center;padding:40px;'>"
        "<h2>Lexis</h2><p>Bu bildirim türü kapatıldı. İstersen ileride uygulamadan "
        "tekrar açabilirsin.</p></div>"
    )
