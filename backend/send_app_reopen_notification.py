"""
backend/send_app_reopen_notification.py

16 Ekim 2026 — kullanici talebi: "o zaman uygulamasi yuklu olanlara bildirim
gonder, bildirim icinde uygulamadan cikis yapip tekrar girsinler tarzinda
ibare olsun. sebebini de acikla ibarede." Baglam: GitHub Actions OTA yayin
gecmisi incelenirken 4-13 Ekim arasinda 4 OTA yayininin (eksik commit'e
eklenmemis AnimatedSplash komponenti yuzunden) art arda BASARISIZ oldugu,
14 Ekim'den sonra ise (panele-don spinner fix'i dahil) hepsinin basarili
oldugu goruldu. Expo Updates varsayilan olarak guncellemeyi SADECE acilista
indirir ve bir SONRAKI acilista uygular -- yani uygulamayi sadece arka
planda kullanip hic tam kapatip acmayan kullanicilar hala eski/hatali JS
bundle'inda kalmis olabilir. Bu script TUM kayitli push token'lara (iOS +
Android, platform filtresi YOK -- send_ios_update_notification.py'den farki
bu) "uygulamayi tamamen kapatip yeniden acin" bildirimi gonderir.

send_ios_update_notification.py ile ayni sebep/desen: Expo Push API'ye
gercek ag erisimi gerektigi icin (bkz. app/services/push_service.py)
backend'e GitHub Actions'tan secret-korumali HTTP endpoint (bkz. app/api/
routes/cron.py) uzerinden tetikleniyor. Bu bir gunluk/periyodik job DEGIL --
tek seferlik elle (workflow_dispatch) tetiklenir, already_ran_today
korumasi YOK.

Kullanim (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python send_app_reopen_notification.py
"""

from app.core.database import supabase_admin
from app.services.job_log import job_run
from app.services.push_service import send_push_batch

TITLE = "Lexis'te onemli bir duzeltme yayinladik"
BODY = (
    "Uygulamayi TAMAMEN kapatip yeniden acar misiniz? Guncellemeler sadece "
    "acilista cihaza iniyor -- bu adim, 'Panele Don' ekraninda takilma gibi "
    "sorunlarin duzeltmesinin cihaziniza ulasmasini saglayacak."
)


def main() -> dict:
    tokens_result = supabase_admin.table("push_tokens").select("token").execute().data or []
    tokens = [t["token"] for t in tokens_result]

    if not tokens:
        print("Kayitli push token yok, gonderilecek cihaz bulunamadi.")
        return {"sent_count": 0, "failed_count": 0, "title": TITLE}

    result = send_push_batch(tokens, TITLE, BODY, category="app_reopen_fix_16_ekim")
    print(
        f"Uygulamayi yeniden ac bildirimi gonderildi: '{TITLE}' -- "
        f"{result['sent']} basarili, {result['failed']} basarisiz ({len(tokens)} token)."
    )
    return {"sent_count": result["sent"], "failed_count": result["failed"], "title": TITLE}


if __name__ == "__main__":
    with job_run("send_app_reopen_notification") as run:
        res = main()
        run.detail = res
