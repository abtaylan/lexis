"""
backend/notify_membership_changes.py

Kullanici istegi (16 Eylul 2026): "sistem ilk defa uye olan veya uyelikten
cikanlari her gun bana bildiren bir sistem yapalim" -- her gun, onceki 24
saat icinde YENI UYE OLAN (bot hesaplari haric) ve HESABINI TAMAMEN SILEN
kullanicilarin ozet listesini settings.ADMIN_NOTIFICATION_EMAIL adresine
e-posta ile gonderir.

post_daily_content.py / send_daily_word_email.py ile ayni desen: VPS'te
gercek internet erisimi olan bu backend'e Vercel Cron / GitHub Actions
tarafindan secret-korumali HTTP endpoint (bkz. app/api/routes/cron.py)
uzerinden gunde 1 kez tetiklenmesi icin tasarlandi.

Kapsam (bilincli sinirlama, kullanici onayladi -- 16 Eylul 2026): "uyelikten
cikma" burada SADECE hesabini tamamen silen kullanicilar anlamina gelir
(bkz. account_deletions tablosu, migration 074 -- delete_account() ve
delete_user_permanently() bu tabloya satir silinmeden hemen once yaziyor).
Premium abonelik iptalleri bu rapora DAHIL DEGIL.

Kullanim (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python notify_membership_changes.py

Not: OTP_MODE=fixed iken (varsayilan/gelistirme) gercek mail atilmaz,
sadece log'a yazilir -- email_service.py'deki diger fonksiyonlarla ayni
guvenlik/test davranisi.
"""

from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.core.database import supabase_admin
from app.services.auth_users import list_all_auth_users
from app.services.email_service import send_membership_digest_email
from app.services.job_log import job_run


def main() -> dict:
    if not settings.ADMIN_NOTIFICATION_EMAIL:
        print("ADMIN_NOTIFICATION_EMAIL bos, uyelik raporu gonderilemedi.")
        return {"sent": False, "reason": "no_admin_email_configured"}

    since = (datetime.now(UTC) - timedelta(hours=24)).isoformat()
    report_date = datetime.now(UTC).date().isoformat()

    new_profiles = (
        supabase_admin.table("profiles")
        .select("id, display_name, created_at")
        .gte("created_at", since)
        .eq("is_bot", False)
        .order("created_at")
        .execute()
    ).data or []

    deletions = (
        supabase_admin.table("account_deletions")
        .select("user_id, email, display_name, deleted_at")
        .gte("deleted_at", since)
        .order("deleted_at")
        .execute()
    ).data or []

    # E-posta auth.users'da tutuluyor -- diger script'lerle ayni desen (bkz.
    # send_daily_word_email.py / send_schedule_reminders.py).
    email_map: dict[str, str] = {}
    if new_profiles:
        try:
            ids = {p["id"] for p in new_profiles}
            for u in list_all_auth_users():
                if u.id in ids and u.email:
                    email_map[u.id] = u.email
        except Exception as e:
            print(f"NOTIFY MEMBERSHIP email map warning: {e}")

    new_users = [
        {"email": email_map.get(p["id"]), "display_name": p.get("display_name")}
        for p in new_profiles
    ]
    deleted_users = [
        {"email": d.get("email"), "display_name": d.get("display_name")}
        for d in deletions
    ]

    sent = send_membership_digest_email(
        settings.ADMIN_NOTIFICATION_EMAIL, report_date, new_users, deleted_users
    )

    print(
        f"[{datetime.now(UTC).isoformat()}] Uyelik raporu: +{len(new_users)} yeni, "
        f"-{len(deleted_users)} silinen -> {settings.ADMIN_NOTIFICATION_EMAIL} (sent={sent})"
    )

    return {
        "sent": sent,
        "new_count": len(new_users),
        "deleted_count": len(deleted_users),
    }


if __name__ == "__main__":
    with job_run("notify_membership_changes") as run:
        run.detail = main()
