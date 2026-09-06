"""
backend/app/services/push_service.py

Mobil uygulama Faz 2 — gerçek push bildirim GÖNDERİMİ. Faz 1'de (bkz.
app/api/routes/push_tokens.py) sadece token kaydı vardı; bu servis o
token'lara Expo Push API üzerinden gerçekten bildirim yollar.

Expo Push API (https://exp.host) HTTPS (443) üzerinden çalışıyor —
email_service.py'deki Resend gibi bu da Railway'in ham SMTP (587)
bağlantılarını engelleyen kısıtlamasından etkilenmiyor, ek bir API key/
hesap gerektirmiyor (Expo projesi zaten mobile/app.json'da tanımlı).

Expo tek istekte en fazla 100 mesaj kabul ediyor, bu yüzden batch'leniyor.
Bir token için "DeviceNotRegistered" hatası dönmesi, uygulamanın cihazdan
kaldırıldığı/token'ın artık geçersiz olduğu anlamına gelir — böyle token'lar
push_tokens tablosundan otomatik silinir, zamanla ölü token birikmez.
"""

import httpx

from app.core.database import supabase_admin
from app.services.notification_log import log_notification

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
BATCH_SIZE = 100


def _chunks(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def send_push_batch(tokens: list[str], title: str, body: str, category: str) -> dict:
    """
    tokens: Expo push token listesi (push_tokens.token).
    category: notification_log'a yazılacak kategori, örn.
              'daily_reminder_morning' / 'daily_reminder_evening'.
    Döner: {"sent": int, "failed": int}
    """
    if not tokens:
        return {"sent": 0, "failed": 0}

    sent = 0
    failed = 0

    for batch in _chunks(tokens, BATCH_SIZE):
        messages = [
            {
                "to": token,
                "title": title,
                "body": body,
                "sound": "default",
                "channelId": "default",
            }
            for token in batch
        ]
        try:
            resp = httpx.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=15,
            )
            resp.raise_for_status()
            tickets = (resp.json() or {}).get("data", [])
        except Exception as e:
            print(f"PUSH BATCH SEND ERROR: {e}")
            for token in batch:
                log_notification("push", category, token, "failed", {"error": str(e)})
            failed += len(batch)
            continue

        dead_tokens = []
        for token, ticket in zip(batch, tickets):
            status = ticket.get("status")
            if status == "ok":
                sent += 1
                log_notification("push", category, token, "sent", None)
            else:
                failed += 1
                error_code = (ticket.get("details") or {}).get("error")
                log_notification(
                    "push", category, token, "failed",
                    {"error": ticket.get("message"), "error_code": error_code},
                )
                if error_code == "DeviceNotRegistered":
                    dead_tokens.append(token)

        if dead_tokens:
            try:
                supabase_admin.table("push_tokens").delete().in_("token", dead_tokens).execute()
                print(f"PUSH: {len(dead_tokens)} geçersiz token temizlendi.")
            except Exception as e:
                print(f"PUSH dead token cleanup warning: {e}")

    return {"sent": sent, "failed": failed}
