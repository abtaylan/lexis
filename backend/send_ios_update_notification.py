"""
backend/send_ios_update_notification.py

Kullanici istegi (18 Eylul 2026): iOS App Store'da 1.0.2 (build 15 -- acilista
cokme/ATT NSUserTrackingUsageDescription duzeltmesi, bkz. commit 7a61ef6)
yayina girdiginde, kayitli TUM iOS push token'larina tek seferlik "yeni surum
yayinda, hemen guncelleyin" bildirimi gonderir.

send_push_reminder.py ile ayni sebep/desen: Expo Push API'ye gercek ag
erisimi gerektirdigi icin (bkz. app/services/push_service.py) backend'e
GitHub Actions'tan secret-korumali HTTP endpoint (bkz. app/api/routes/
cron.py) uzerinden tetikleniyor. FARK: bu bir gunluk/periyodik job DEGIL --
sadece bu surum yayina girdiginde BIR KEZ elle (workflow_dispatch)
tetiklenecek, bu yuzden already_ran_today koruması yok ve cron.py'deki
endpoint'i de gunluk guard kullanmiyor.

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python send_ios_update_notification.py
"""

from app.core.database import supabase_admin
from app.services.job_log import job_run
from app.services.push_service import send_push_batch

TITLE = "Lexis guncellendi! \U0001F389"
BODY = "Yeni surum App Store'da yayinda -- acilis sorunlarini gideren guncellemeyi hemen indirin."


def main() -> dict:
    tokens_result = (
        supabase_admin.table("push_tokens")
        .select("token")
        .eq("platform", "ios")
        .execute()
    ).data or []
    tokens = [t["token"] for t in tokens_result]

    if not tokens:
        print("Kayitli iOS push token yok, gonderilecek cihaz bulunamadi.")
        return {"sent_count": 0, "failed_count": 0, "title": TITLE}

    result = send_push_batch(tokens, TITLE, BODY, category="ios_update_1_0_2")
    print(
        f"iOS guncelleme bildirimi gonderildi: '{TITLE}' -- "
        f"{result['sent']} basarili, {result['failed']} basarisiz ({len(tokens)} token)."
    )
    return {"sent_count": result["sent"], "failed_count": result["failed"], "title": TITLE}


if __name__ == "__main__":
    with job_run("send_ios_update_notification") as run:
        res = main()
        run.detail = res
