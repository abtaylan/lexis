"""
backend/send_daily_word_email.py

Kullanıcı isteği (6 Eylül 2026): her gün üyelerin kayıtlı e-postasına,
İngilizce/Türkçe anlam, 2 örnek cümle (+ çevirisi) ve YDS/YÖKDİL/TOEFL
tarzı dilbilgisi analizi içeren bir "günün kelimesi" e-postası gönderir.

send_schedule_reminders.py / post_daily_content.py ile aynı desen: VPS'te
gerçek internet erişimi olan bu backend'e Vercel Cron / GitHub Actions
tarafından secret-korumalı HTTP endpoint (bkz. app/api/routes/cron.py)
üzerinden günde 1 kez tetiklenmesi için tasarlandı — Claude'un cloud
sandbox'ından veya scheduled task'larından SMTP/Resend'e gerçek ağ
erişimi olmadığı için burada da (aynı sebeple) tetiklenemiyor.

Nasıl çalışır:
  1. daily_word_content tablosundan sırası gelen kelime seçilir: önce hiç
     gönderilmemiş (last_sent_at IS NULL) kayıtlardan en eski eklenen,
     yoksa en eski gönderilmiş kayıt (last_sent_at ASC) — böylece havuz
     bitene kadar tekrar olmadan sırayla döner.
  2. profiles.email_daily_word_enabled = true VE is_active = true olan
     kullanıcıların e-postaları (auth.users'dan, admin.py'deki aynı
     desenle) çekilir.
  3. Her birine send_daily_word_email() ile mail atılır.
  4. Seçilen kelimenin last_sent_at'i güncellenir.

Kullanım (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python send_daily_word_email.py

Not: OTP_MODE=fixed iken (varsayılan/geliştirme) gerçek mail atılmaz,
sadece log'a yazılır — email_service.py'deki diğer fonksiyonlarla aynı
güvenlik/test davranışı (bkz. send_otp_email).
"""

from datetime import UTC, datetime

from app.core.database import supabase_admin
from app.services.email_service import send_daily_word_email
from app.services.job_log import job_run


def _pick_word() -> dict | None:
    never_sent = (
        supabase_admin.table("daily_word_content")
        .select("*")
        .eq("is_active", True)
        .is_("last_sent_at", "null")
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    ).data or []
    if never_sent:
        return never_sent[0]

    oldest_sent = (
        supabase_admin.table("daily_word_content")
        .select("*")
        .eq("is_active", True)
        .order("last_sent_at", desc=False)
        .limit(1)
        .execute()
    ).data or []
    return oldest_sent[0] if oldest_sent else None


def main() -> dict:
    word = _pick_word()
    if not word:
        print("daily_word_content boş veya aktif kayıt yok, gönderilecek kelime bulunamadı.")
        return {"sent_count": 0, "word": None}

    profiles = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("is_active", True)
        .eq("email_daily_word_enabled", True)
        .execute()
    ).data or []
    eligible_ids = {p["id"] for p in profiles}

    if not eligible_ids:
        print("Günün kelimesi e-postasına açık aktif kullanıcı yok.")
        return {"sent_count": 0, "word": word["word"]}

    # E-posta auth.users'da tutuluyor — send_schedule_reminders.py ile aynı desen.
    email_map: dict[str, str] = {}
    try:
        page = supabase_admin.auth.admin.list_users()
        users = page if isinstance(page, list) else getattr(page, "users", [])
        for u in users:
            if u.id in eligible_ids and u.email:
                email_map[u.id] = u.email
    except Exception as e:
        print(f"DAILY WORD email map warning: {e}")

    sent = 0
    for user_id, email in email_map.items():
        send_daily_word_email(email, user_id, word)
        sent += 1

    supabase_admin.table("daily_word_content").update(
        {"last_sent_at": datetime.now(UTC).isoformat()}
    ).eq("id", word["id"]).execute()

    print(f"[{datetime.now(UTC).isoformat()}] Günün kelimesi '{word['word']}' {sent} kullanıcıya gönderildi.")
    return {"sent_count": sent, "word": word["word"]}


if __name__ == "__main__":
    with job_run("send_daily_word_email") as run:
        result = main()
        run.detail = result
