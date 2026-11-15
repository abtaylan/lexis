"""
backend/send_feature_image_scan_notification.py

10 Kasım 2026 — kullanıcı isteği: "Yeni özellik de mobilde yayınlanınca
mobil cihazdakilere yeni alert gönder ve premium özellik olarak bu
özellikten bahseden bir alert içeriği hazırla." Bağlam: aynı gün eklenen
"Görsel Tara" (görsel OCR + çeviri + kelime listesi) premium özelliği —
hem iOS hem Android build'leri EAS'e gönderildi (commit 328ec49, iOS build
25 / Android build 18).

send_app_reopen_notification.py ile AYNI desen (TÜM platformlara, platform
filtresi YOK) — buradaki fark bir hata duyurusu değil, yeni bir özellik
duyurusu olması. `data.route` alanı mobil tarafta deep-link için kullanılıyor
(bkz. mobile/src/app/(app)/_layout.tsx notification response listener'ı,
"feature_announcement" tipi) — bildirime dokununca kullanıcı doğrudan
Görsel Tara ekranına yönlendiriliyor.

ÖNEMLİ: Bu script'i App Store/Play Console incelemesi TAMAMLANIP yeni
sürüm (1.0.4, build 25/18) gerçekten canlıya çıkmadan ÇALIŞTIRMAYIN —
aksi halde bildirime dokunan kullanıcılar henüz mağazada yayında olmayan
bir özelliğe yönlendirilmiş olur (çoğu zaten güncel sürümü otomatik
alacağı için fark etmeyebilir, ama henüz güncellemeyenlerde ekran mevcut
olmayabilir).

send_ios_update_notification.py ile AYNI sebep/desen: Expo Push API gerçek
dış ağ erişimi gerektirdiği için (bkz. app/services/push_service.py)
backend'e GitHub Actions'tan secret-korumalı HTTP endpoint (bkz. app/api/
routes/cron.py) üzerinden tetikleniyor. Tek seferlik elle (workflow_dispatch)
tetiklenir, already_ran_today koruması YOK.

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python send_feature_image_scan_notification.py
"""

from app.core.database import supabase_admin
from app.services.job_log import job_run
from app.services.push_service import send_push_batch

TITLE = "Yeni özellik: Görsel Tara"
BODY = (
    "Bir görsel çek, içindeki metni çevirelim ve kelimeleri listene eklemen "
    "için çıkaralım. Premium üyelere özel yeni özellik — hemen dene!"
)
DEEP_LINK_ROUTE = "/(app)/image-scan"


def main() -> dict:
    tokens_result = supabase_admin.table("push_tokens").select("token").execute().data or []
    tokens = [t["token"] for t in tokens_result]

    if not tokens:
        print("Kayitli push token yok, gonderilecek cihaz bulunamadi.")
        return {"sent_count": 0, "failed_count": 0, "title": TITLE}

    result = send_push_batch(
        tokens,
        TITLE,
        BODY,
        category="feature_announcement_image_scan",
        data={"type": "feature_announcement", "route": DEEP_LINK_ROUTE},
    )
    print(
        f"Gorsel Tara duyuru bildirimi gonderildi: '{TITLE}' -- "
        f"{result['sent']} basarili, {result['failed']} basarisiz ({len(tokens)} token)."
    )
    return {"sent_count": result["sent"], "failed_count": result["failed"], "title": TITLE}


if __name__ == "__main__":
    with job_run("send_feature_image_scan_notification") as run:
        res = main()
        run.detail = res
