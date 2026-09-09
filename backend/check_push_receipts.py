"""
backend/check_push_receipts.py

Expo push bildirimlerinin GERÇEK teslimat sonucunu kontrol eder (9 Eylül
2026 eklendi). send_push_reminder.py çalıştığında push_service.send_push_batch
sadece Expo'nun push'u KABUL ettiğini ("ok" ticket) notification_log'a
'sent' olarak yazıyor -- bu, cihaza (özellikle Android/FCM tarafında)
gerçekten ulaştığını GARANTİ ETMEZ. Bu script Expo'nun /getReceipts uç
noktasını sorgulayıp satırları 'delivered' / 'delivery_failed' olarak
günceller.

Bağlam: bir kullanıcının (Android, OnePlus8Pro) sabah hatırlatmasını
ALMADIĞI bildirildi (9 Eylül 2026) -- backend logunda "sent" görünüyordu
ama bu Expo'nun kabul ettiğini gösteriyordu, cihaza düştüğünü değil. Bu
job olmadan bu tür teslimat hataları sessizce kayboluyordu.

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python check_push_receipts.py

Railway native cron ile çalıştırılması önerilir (lexis-cron-push-morning /
-evening ile aynı pattern), örn. saatte bir (0 * * * *) -- Expo
receipt'leri gönderimden ~15 dk sonra hazır oluyor, bu job da
min_age_minutes=15 ile zaten bunu bekliyor.
"""

from app.services.job_log import job_run
from app.services.push_service import check_pending_receipts


def main() -> dict:
    result = check_pending_receipts()
    print(
        f"Push receipt kontrolü: {result['checked']} kayıt kontrol edildi -- "
        f"{result['delivered']} teslim edildi, "
        f"{result['delivery_failed']} teslim edilemedi, "
        f"{result['unknown']} henüz sonuçlanmadı."
    )
    return result


if __name__ == "__main__":
    with job_run("check_push_receipts") as run:
        res = main()
        run.detail = res
