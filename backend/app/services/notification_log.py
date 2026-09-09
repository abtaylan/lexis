"""
backend/app/services/notification_log.py

Madde 1d — Admin panel: bildirim/e-posta gönderim logları.

email_service.py (OTP + program hatırlatma e-postaları) ve
social_publisher.py (Telegram + Slack günlük içerik paylaşımı)
tarafından, her gönderim denemesinden sonra çağrılır.
"""

from typing import Any

from app.core.database import supabase_admin


def log_notification(
    channel: str,
    category: str,
    recipient: str | None,
    status: str,
    detail: dict[str, Any] | None = None,
) -> str | None:
    """
    channel:  'email' | 'telegram' | 'slack' | 'push'
    category: 'otp' | 'schedule_reminder' | 'social_word' | 'social_quiz' |
              'daily_reminder_morning' | 'daily_reminder_evening'
    status:   'sent' | 'skipped' | 'failed' | 'delivered' | 'delivery_failed'

    Dönüş: eklenen satırın id'si (str) — çağıran taraf bunu saklayıp sonradan
    update_notification_log() ile güncelleyebilir (bkz. push_service.py'nin
    Expo receipt (teslimat onayı) takibi, 9 Eylül 2026). Loglama başarısız
    olursa None döner, asıl gönderim işini engellemez.
    """
    try:
        result = (
            supabase_admin.table("notification_log")
            .insert(
                {
                    "channel": channel,
                    "category": category,
                    "recipient": recipient,
                    "status": status,
                    "detail": detail,
                }
            )
            .execute()
        )
        return result.data[0]["id"] if result.data else None
    except Exception as e:
        print(f"NOTIFICATION LOG WARNING ({channel}/{category}): {e}")
        return None


def update_notification_log(log_id: str, status: str, detail: dict[str, Any] | None = None) -> None:
    """Var olan bir notification_log satırını günceller (örn. Expo receipt
    sonucu geldiğinde 'sent' -> 'delivered'/'delivery_failed')."""
    try:
        update_data: dict[str, Any] = {"status": status}
        if detail is not None:
            update_data["detail"] = detail
        supabase_admin.table("notification_log").update(update_data).eq("id", log_id).execute()
    except Exception as e:
        print(f"NOTIFICATION LOG UPDATE WARNING (id={log_id}): {e}")
