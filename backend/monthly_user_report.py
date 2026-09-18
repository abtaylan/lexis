"""
backend/monthly_user_report.py

Kullanici istegi (18 Eylul 2026): "tum userlara her ay bu istatistikleri
kapsayan (kendi istatistikleri, gelisim durumu, sistemde olan userlara gore
gelisim siralamasindaki yeri) rapor gonderilecek, ilk rapordan sonra diger
aylarda gonderilecek rapor bir onceki ay ve sisteme dahil olduktan itibaren
ki gelisimlerini ayri gorecek."

Her AKTIF, bot olmayan kullaniciya (is_bot=False, is_active=True) aylik bir
gelisim raporu e-postasi gonderir:
  - "Kayit tarihinden bugune" bolumu HER ZAMAN gonderilir
    (user_report_service.get_user_growth_report ile hesaplanir).
  - "Son 30 gun" bolumu SADECE hesap yasi >= 30 gun ise eklenir
    (daha yeni hesaplarda bu blok kayittan-bugune ile neredeyse ayni
    seyi tekrar eder, bu yuzden atlanir -- "ilk rapor" davranisi budur).

notify_membership_changes.py / weekly_admin_report.py ile ayni desen: VPS'te
gercek internet erisimi olan bu backend'e Vercel Cron / GitHub Actions
tarafindan secret-korumali HTTP endpoint (bkz. app/api/routes/cron.py)
uzerinden ayda 1 kez tetiklenmesi icin tasarlandi.

Kullanim (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python monthly_user_report.py

Not: OTP_MODE=fixed iken (varsayilan/gelistirme) gercek mail atilmaz,
sadece log'a yazilir.
"""

import asyncio
from datetime import UTC, datetime

from app.core.database import supabase_admin
from app.services.auth_users import list_all_auth_users
from app.services.email_service import send_monthly_user_report_email
from app.services.job_log import job_run
from app.services.user_report_service import get_user_growth_report, get_user_report

_MIN_ACCOUNT_AGE_DAYS_FOR_MONTH_BLOCK = 30


async def _build_and_send(user: dict, email: str, report_date: str) -> bool:
    user_id = user["id"]
    created_at = datetime.fromisoformat(user["created_at"].replace("Z", "+00:00"))
    account_age_days = (datetime.now(UTC) - created_at).days

    since_signup = await get_user_growth_report(user_id, created_at)
    last_30_days = None
    if account_age_days >= _MIN_ACCOUNT_AGE_DAYS_FOR_MONTH_BLOCK:
        last_30_days = await get_user_report(user_id, period="month")

    return send_monthly_user_report_email(
        email, user.get("display_name"), report_date, since_signup, last_30_days
    )


async def _main_async() -> dict:
    report_date = datetime.now(UTC).date().isoformat()

    profiles = (
        supabase_admin.table("profiles")
        .select("id, display_name, created_at")
        .eq("is_bot", False)
        .eq("is_active", True)
        .execute()
    ).data or []

    if not profiles:
        return {"sent": 0, "failed": 0, "skipped_no_email": 0, "total_users": 0}

    email_map: dict[str, str] = {}
    try:
        ids = {p["id"] for p in profiles}
        for u in list_all_auth_users():
            if u.id in ids and u.email:
                email_map[u.id] = u.email
    except Exception as e:
        print(f"MONTHLY USER REPORT email map warning: {e}")

    sent = 0
    failed = 0
    skipped_no_email = 0
    for profile in profiles:
        email = email_map.get(profile["id"])
        if not email:
            skipped_no_email += 1
            continue
        try:
            ok = await _build_and_send(profile, email, report_date)
            if ok:
                sent += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
            print(f"MONTHLY USER REPORT ERROR (user {profile['id']}): {e}")

    return {
        "sent": sent,
        "failed": failed,
        "skipped_no_email": skipped_no_email,
        "total_users": len(profiles),
    }


def main() -> dict:
    result = asyncio.run(_main_async())
    print(f"[{datetime.now(UTC).isoformat()}] Aylik kullanici raporu: {result}")
    return result


if __name__ == "__main__":
    with job_run("monthly_user_report") as run:
        run.detail = main()
