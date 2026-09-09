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

Receipt (teslimat onayı) takibi (9 Eylül 2026 eklendi): Expo'nun /send
cevabındaki "ok" ticket'ı sadece Expo'nun push'u KABUL ettiğini gösterir —
cihaza (özellikle Android/FCM tarafında) gerçekten ulaştığını GARANTİ
ETMEZ. Gerçek teslimat sonucunu öğrenmek için Expo en az ~15 dk sonra
/getReceipts ile ayrıca sorgulanmalı (bkz. check_push_receipts.py). Bu
yüzden her "ok" ticket'ın id'si notification_log satırının detail
alanına yazılıyor; receipt job'ı bu id'leri kullanıp satırı
'delivered'/'delivery_failed' olarak günceller.
"""

import httpx

from app.core.database import supabase_admin
from app.services.notification_log import log_notification, update_notification_log

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"
BATCH_SIZE = 100
RECEIPT_BATCH_SIZE = 300


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
                ticket_id = ticket.get("id")
                log_notification(
                    "push", category, token, "sent",
                    {"expo_ticket_id": ticket_id, "receipt_checked": False} if ticket_id else None,
                )
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


def check_pending_receipts(max_age_hours: int = 48, min_age_minutes: int = 15) -> dict:
    """
    "sent" (Expo'ya kabul edildi ama teslimatı henüz doğrulanmadı) durumundaki
    push loglarını Expo'nun /getReceipts uç noktasından sorgular, gerçek
    teslimat sonucuna göre 'delivered' / 'delivery_failed' olarak günceller.

    min_age_minutes: Expo receipt'leri hemen değil, gönderimden bir süre sonra
    hazır oluyor — çok taze kayıtları henüz sorgulamıyoruz (bkz. Expo dokümanı).
    max_age_hours: Expo receipt'leri sonsuza kadar saklamıyor (~ birkaç gün);
    bu pencereden eski, hâlâ 'sent' kalmış kayıtlar artık sorgulanmaz (Expo
    zaten receipt'i silmiş olur) — bu satırlar kalıcı olarak 'sent'te kalır,
    bu normaldir, tekrar tekrar sorgulanıp boşuna istek atılmasını önler.
    """
    from datetime import UTC, datetime, timedelta

    now = datetime.now(UTC)
    cutoff_new = (now - timedelta(minutes=min_age_minutes)).isoformat()
    cutoff_old = (now - timedelta(hours=max_age_hours)).isoformat()

    rows = (
        supabase_admin.table("notification_log")
        .select("id, recipient, detail, created_at")
        .eq("channel", "push")
        .eq("status", "sent")
        .lte("created_at", cutoff_new)
        .gte("created_at", cutoff_old)
        .execute()
    ).data or []

    # Sadece expo_ticket_id'si olan ve henüz kontrol edilmemiş satırlar
    pending = [
        r for r in rows
        if (r.get("detail") or {}).get("expo_ticket_id") and not (r.get("detail") or {}).get("receipt_checked")
    ]
    if not pending:
        return {"checked": 0, "delivered": 0, "delivery_failed": 0, "unknown": 0}

    id_to_log = {r["detail"]["expo_ticket_id"]: r for r in pending}
    ticket_ids = list(id_to_log.keys())

    delivered = 0
    delivery_failed = 0
    unknown = 0
    dead_tokens: list[str] = []

    for batch in _chunks(ticket_ids, RECEIPT_BATCH_SIZE):
        try:
            resp = httpx.post(
                EXPO_RECEIPTS_URL,
                json={"ids": batch},
                headers={"Content-Type": "application/json", "Accept": "application/json"},
                timeout=15,
            )
            resp.raise_for_status()
            receipts = (resp.json() or {}).get("data", {})
        except Exception as e:
            print(f"PUSH RECEIPT CHECK ERROR: {e}")
            continue

        for ticket_id in batch:
            receipt = receipts.get(ticket_id)
            log_row = id_to_log[ticket_id]
            if receipt is None:
                # Expo henüz sonuç üretmemiş — bir sonraki çalıştırmada tekrar denenecek
                unknown += 1
                continue

            receipt_status = receipt.get("status")
            base_detail = dict(log_row.get("detail") or {})
            base_detail["receipt_checked"] = True

            if receipt_status == "ok":
                delivered += 1
                update_notification_log(log_row["id"], "delivered", base_detail)
            else:
                delivery_failed += 1
                error_code = (receipt.get("details") or {}).get("error")
                base_detail["error"] = receipt.get("message")
                base_detail["error_code"] = error_code
                update_notification_log(log_row["id"], "delivery_failed", base_detail)
                if error_code == "DeviceNotRegistered" and log_row.get("recipient"):
                    dead_tokens.append(log_row["recipient"])

    if dead_tokens:
        try:
            supabase_admin.table("push_tokens").delete().in_("token", dead_tokens).execute()
            print(f"PUSH RECEIPT: {len(dead_tokens)} geçersiz token (gecikmeli tespit) temizlendi.")
        except Exception as e:
            print(f"PUSH RECEIPT dead token cleanup warning: {e}")

    return {
        "checked": len(pending),
        "delivered": delivered,
        "delivery_failed": delivery_failed,
        "unknown": unknown,
    }
