"""
backend/send_ios_update_notification.py

GUNCELLEME (21 Eylul 2026, acilis/kapanis sorunu -- runtimeVersion OTA
hotfix): Bu script ASLINDA 18 Eylul'de 1.0.2'nin App Store'a native
build olarak cikmasi icin yazilmisti ("App Store'da yeni surum yayinda,
guncelleyin" mesaji), AMA 1.0.2 Apple onayinda takildi (once build-number
conflict, sonra UIBackgroundModes/Guideline 2.5.4 reddi) ve o senaryo hic
gerceklesmedi.

Bunun yerine, bugun App Store'daki CANLI 1.0.1/build 10 icin ayri bir OTA
guncellemesi yayinlandi (runtimeVersion "1.0.1" olarak, ayni Google/AdMob/
Apple Sign-In require() crash fix'leri). Bu OTA bazi kullanicilarda
uygulamayi normal acilista otomatik duzeltti, ama BAZI kullanicilarda
uygulama acilista cok hizli/tekrarli coktugu icin OTA guncellemesi hic
indirilip uygulanamadan cokme dongusune giriyor -- bu kullanicilarin
uygulamayi SILIP TEKRAR YUKLEMESI gerekiyor (temiz kurulum, bundle'daki
JS ile once normal acilir, sonra OTA'yi sorunsuz indirir).

Bu yuzden TITLE/BODY "App Store'da guncelleme var" yerine "silip tekrar
yukleyin" mesajina cevrildi -- 1.0.2 henuz App Store'da canli DEGIL, o
yuzden "guncelleyin" mesaji su an yanlis/kafa karistirici olurdu.

send_push_reminder.py ile ayni sebep/desen: Expo Push API'ye gercek ag
erisimi gerektirdigi icin (bkz. app/services/push_service.py) backend'e
GitHub Actions'tan secret-korumali HTTP endpoint (bkz. app/api/routes/
cron.py) uzerinden tetikleniyor. Bu bir gunluk/periyodik job DEGIL --
tek seferlik elle (workflow_dispatch) tetiklenir, already_ran_today
koruması yok.

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python send_ios_update_notification.py
"""

from app.core.database import supabase_admin
from app.services.job_log import job_run
from app.services.push_service import send_push_batch

TITLE = "Lexis'te onemli duzeltme"
BODY = "Acilista sorun yasiyorsaniz: uygulamayi silip App Store'dan tekrar yukleyin -- sorun cozuluyor."


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

    result = send_push_batch(tokens, TITLE, BODY, category="ios_reinstall_fix_1_0_1_ota")
    print(
        f"iOS guncelleme bildirimi gonderildi: '{TITLE}' -- "
        f"{result['sent']} basarili, {result['failed']} basarisiz ({len(tokens)} token)."
    )
    return {"sent_count": result["sent"], "failed_count": result["failed"], "title": TITLE}


if __name__ == "__main__":
    with job_run("send_ios_update_notification") as run:
        res = main()
        run.detail = res
