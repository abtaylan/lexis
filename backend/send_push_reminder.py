"""
backend/send_push_reminder.py

Kullanıcı isteği (6 Eylül 2026): mobil uygulamada günde 2 kez (sabah/akşam),
kullanıcıyı uygulamaya girip bir etkinlik yapmaya teşvik eden kısa push
bildirimi gönderir.

send_daily_word_email.py ile aynı sebep/desen: Expo Push API'ye gerçek ağ
erişimi gerektirdiği için (bkz. app/services/push_service.py) VPS'teki bu
backend'e GitHub Actions'tan secret-korumalı HTTP endpoint (bkz.
app/api/routes/cron.py) üzerinden tetikleniyor.

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python send_push_reminder.py morning
  python send_push_reminder.py evening

Mesajlar kısa ve net tutuldu (Expo bildirim başlığı/gövdesi olarak
gösterilecek) — her çalıştırmada listeden rastgele biri seçilir, böylece
kullanıcı her gün aynı bildirimi görmez.
"""

import random
import sys

from app.core.database import supabase_admin
from app.services.job_log import job_run
from app.services.push_service import send_push_batch

MORNING_MESSAGES = [
    ("Günaydın! ☀️", "Güne 5 kelimeyle başla, bugünkü hedefini tamamla."),
    ("Bugünkü kelimeler seni bekliyor", "Sabah tekrarı en kalıcı olanıdır — 2 dakikanı ayır."),
    ("Lexis'te yeni bir gün", "Dünkü kelimeleri unutmadan tekrar et."),
    ("Hazır mısın?", "Kısa bir tekrarla güne başla, serini bozma."),
    ("Günaydın!", "Bugün kaç yeni kelime öğreneceksin? Hadi başlayalım."),
    ("Sabah tekrarı zamanı", "Az önce öğrendiklerini pekiştirmenin en iyi yolu: sabah tekrarı."),
]

EVENING_MESSAGES = [
    ("Günü kelimeyle kapat", "Yatmadan önce 5 dakika ayırıp bugünkü kelimeleri tekrar et."),
    ("Serini bugün de sürdür 🔥", "Günlük hedefini tamamlamadıysan son bir fırsat."),
    ("Akşam tekrarı", "Bugün öğrendiklerini pekiştirmek için tam zamanı."),
    ("Bugünü tamamla", "Hedefine az kaldı, birkaç kelimeyle günü bitir."),
    ("Unutmadan tekrar et", "Bugün eklediğin kelimeleri hafızana kazı, hemen aç."),
    ("Son bir bakış", "Yatmadan önce kısa bir quiz ile günü kapat."),
]


def main(slot: str) -> dict:
    messages = MORNING_MESSAGES if slot == "morning" else EVENING_MESSAGES
    title, body = random.choice(messages)

    profiles = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("is_active", True)
        .eq("push_daily_reminder_enabled", True)
        .execute()
    ).data or []
    user_ids = [p["id"] for p in profiles]

    if not user_ids:
        print("Push hatırlatmasına açık aktif kullanıcı yok.")
        return {"sent_count": 0, "failed_count": 0, "slot": slot, "title": title}

    tokens_result = (
        supabase_admin.table("push_tokens")
        .select("token")
        .in_("user_id", user_ids)
        .execute()
    ).data or []
    tokens = [t["token"] for t in tokens_result]

    if not tokens:
        print("Kayıtlı push token yok, gönderilecek cihaz bulunamadı.")
        return {"sent_count": 0, "failed_count": 0, "slot": slot, "title": title}

    result = send_push_batch(tokens, title, body, category=f"daily_reminder_{slot}")
    print(
        f"Push hatırlatması ({slot}) gönderildi: '{title}' — "
        f"{result['sent']} başarılı, {result['failed']} başarısız ({len(tokens)} token)."
    )
    return {"sent_count": result["sent"], "failed_count": result["failed"], "slot": slot, "title": title}


if __name__ == "__main__":
    slot_arg = sys.argv[1] if len(sys.argv) > 1 else "morning"
    if slot_arg not in ("morning", "evening"):
        print(f"Geçersiz slot: {slot_arg} (morning veya evening olmalı)")
        sys.exit(1)

    with job_run(f"send_push_reminder_{slot_arg}") as run:
        res = main(slot_arg)
        run.detail = res
