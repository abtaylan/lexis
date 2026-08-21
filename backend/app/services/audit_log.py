"""
backend/app/services/audit_log.py

Madde 1d — Admin panel: admin işlem geçmişi (audit log).

Diğer "best-effort" servislerle aynı desen (email_service.py,
social_publisher.py): loglama başarısız olursa asıl işlemi
(kullanıcı oluşturma, rol değiştirme vb.) engellememeli — hata
sadece backend log'una yazılır.
"""

from typing import Any, Optional

from app.core.database import supabase_admin


def log_admin_action(
    actor_id: Optional[str],
    actor_email: Optional[str],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    detail: Optional[dict[str, Any]] = None,
) -> None:
    """
    Bir admin işlemini admin_audit_log tablosuna kaydeder.

    action: nokta ile ayrılmış, ad alanlı bir eylem adı — örn.
      'user.create', 'user.role_change', 'user.deactivate', 'user.activate',
      'word_pool.create', 'word_pool.update', 'word_pool.delete'.
    """
    try:
        supabase_admin.table("admin_audit_log").insert(
            {
                "actor_id": actor_id,
                "actor_email": actor_email,
                "action": action,
                "target_type": target_type,
                "target_id": str(target_id) if target_id is not None else None,
                "detail": detail,
            }
        ).execute()
    except Exception as e:
        print(f"AUDIT LOG WARNING ({action}): {e}")
