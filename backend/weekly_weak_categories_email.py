"""
backend/weekly_weak_categories_email.py

Madde 4b (24 Eylül 2026) -- "haftalık AI zayıf kategori özeti e-postası".
backend/monthly_user_report.py ile AYNI desen (VPS'te gerçek internet
erişimi olan bu backend'e GitHub Actions tarafından secret-korumalı HTTP
endpoint üzerinden -- bkz. app/api/routes/cron.py -- haftada 1 kez
tetiklenmesi için tasarlandı).

Her AKTIF, bot olmayan kullanıcı için app/services/weak_categories_service.py
::get_weak_word_types ve get_weak_difficulty_levels çağrılır (son 30 gün,
words.py/games.py'deki ilgili route'lerin varsayılanlarıyla AYNI pencere).
İKİ liste de boşsa (o hafta hiç zayıf kategori verisi yoksa) kullanıcıya
HİÇ e-posta gönderilmez -- boş bir "her şey harika!" e-postası spam
sayılır, diğer soft-disable desenleriyle aynı mantık (bkz. dashboard'daki
widget'lar, DailyWordCard vb.).

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python weekly_weak_categories_email.py

Not: OTP_MODE=fixed iken (varsayılan/geliştirme) gerçek mail atılmaz,
sadece log'a yazılır.
"""

import asyncio
from datetime import UTC, datetime

from app.core.database import supabase_admin
from app.services.auth_users import list_all_auth_users
from app.services.email_service import send_weekly_weak_categories_email
from app.services.job_log import job_run
from app.services.weak_categories_service import (
    get_weak_difficulty_levels,
    get_weak_word_types,
)

_LOOKBACK_DAYS = 30


async def _build_and_send(profile: dict, email: str, report_date: str) -> str:
    """Döner: 'sent' | 'failed' | 'skipped_no_data'."""
    user_id = profile["id"]
    active_lang = profile.get("learning_lang") or "en"

    weak_word_types = await asyncio.to_thread(get_weak_word_types, user_id, active_lang, _LOOKBACK_DAYS, 5)
    weak_difficulty = await asyncio.to_thread(get_weak_difficulty_levels, user_id, _LOOKBACK_DAYS, 5)

    if not weak_word_types and not weak_difficulty:
        return "skipped_no_data"

    ok = send_weekly_weak_categories_email(
        email, profile.get("display_name"), report_date, weak_word_types, weak_difficulty
    )
    return "sent" if ok else "failed"


async def _main_async() -> dict:
    report_date = datetime.now(UTC).date().isoformat()

    profiles = (
        supabase_admin.table("profiles")
        .select("id, display_name, learning_lang")
        .eq("is_bot", False)
        .eq("is_active", True)
        .execute()
    ).data or []

    if not profiles:
        return {"sent": 0, "failed": 0, "skipped_no_email": 0, "skipped_no_data": 0, "total_users": 0}

    email_map: dict[str, str] = {}
    try:
        ids = {p["id"] for p in profiles}
        for u in list_all_auth_users():
            if u.id in ids and u.email:
                email_map[u.id] = u.email
    except Exception as e:
        print(f"WEEKLY WEAK CATEGORIES EMAIL email map warning: {e}")

    sent = 0
    failed = 0
    skipped_no_email = 0
    skipped_no_data = 0
    for profile in profiles:
        email = email_map.get(profile["id"])
        if not email:
            skipped_no_email += 1
            continue
        try:
            outcome = await _build_and_send(profile, email, report_date)
            if outcome == "sent":
                sent += 1
            elif outcome == "skipped_no_data":
                skipped_no_data += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
            print(f"WEEKLY WEAK CATEGORIES EMAIL ERROR (user {profile['id']}): {e}")

    return {
        "sent": sent,
        "failed": failed,
        "skipped_no_email": skipped_no_email,
        "skipped_no_data": skipped_no_data,
        "total_users": len(profiles),
    }


def main() -> dict:
    result = asyncio.run(_main_async())
    print(f"[{datetime.now(UTC).isoformat()}] Haftalik zayif kategori ozeti: {result}")
    return result


if __name__ == "__main__":
    with job_run("weekly_weak_categories_email") as run:
        run.detail = main()
