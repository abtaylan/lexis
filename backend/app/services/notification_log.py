"""
backend/app/services/notification_log.py

Madde 1d — Admin panel: bildirim/e-posta gönderim logları.

email_service.py (OTP + program hatırlatma e-postaları) ve
social_publisher.py (Telegram + Slack günlük içerik paylaşımı)
tarafından, her gönderim denemesinden sonra çağrılır.
"""

from typing import Any, Optional

from app.core.database import supabase_admin


def log_notification(
    channel: str,
    category: str,
    recipient: Optional[str],
    status: str,
    detail: Optional[dict[str, Any]] = None,
) -> None:
    """
    channel:  'email' | 'telegram' | 'slack'
    category: 'otp' | 'schedule_reminder' | 'social_word' | 'social_quiz'
    status:   'sent' | 'skipped' | 'failed'
    """
    try:
        supabase_admin.table("notification_log").insert(
            {
                "channel": channel,
                "category": category,
                "recipient": recipient,
                "status": status,
                "detail": detail,
            }
        ).execute()
    except Exception as e:
        print(f"NOTIFICATION LOG WARNING ({channel}/{category}): {e}")
