"""
expire_premium.py
premium_until tarihi geçmiş kullanicilarin is_premium bayragini kapatir.

Kullanim (cron, gunde bir kez yeterli):
  cd backend
  venv\Scripts\activate   (Linux/Mac: source venv/bin/activate)
  python expire_premium.py

Onerilen cron satiri (VPS'te uzlas.io yedekleme cron'una benzer sekilde):
  0 4 * * * cd /path/to/lexis/backend && venv/bin/python expire_premium.py >> /var/log/lexis_expire_premium.log 2>&1
"""
from datetime import datetime, timezone

from app.core.database import supabase_admin


def main():
    now_iso = datetime.now(timezone.utc).isoformat()

    expired = (
        supabase_admin.table("profiles")
        .select("id, premium_until")
        .eq("is_premium", True)
        .lt("premium_until", now_iso)
        .execute()
    )
    rows = expired.data or []

    for row in rows:
        supabase_admin.table("profiles").update({"is_premium": False}).eq("id", row["id"]).execute()
        supabase_admin.table("subscriptions").update({"status": "expired"}).eq(
            "user_id", row["id"]
        ).eq("status", "active").execute()

    print(f"[{now_iso}] {len(rows)} kullanıcının premium süresi doldu, is_premium=false yapıldı.")


if __name__ == "__main__":
    main()
