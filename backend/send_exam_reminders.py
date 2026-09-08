"""
backend/send_exam_reminders.py

Kullanıcı isteği (8 Eylül 2026): "sınav hatırlatıcısı ekleyelim mobil
uygulama ve web uygulama sayfasına (tüm yabancı dil sınavları için
olmalı)". Kullanıcının eklediği her sınav (YDS, YÖKDİL, e-YDS, TOEFL,
IELTS vb. — bkz. app/api/routes/exam_reminders.py) için sınava kalan gün
eşiklerinde (30/14/7/3/1/0) hem uygulama-içi hem gerçek push bildirimi
gönderir (bkz. app/services/notify.py'deki gibi, ama dedup'ın nasıl
çalıştığı farklı olduğu için — schedule_item değil exam_reminder+gün eşiği
bazlı, bkz. migration 022 — burada notify_user() yerine doğrudan aynı iki
adımı (insert + push) tekrarlıyoruz, send_schedule_reminders.py'deki
dedup-önce-push-sonra deseniyle aynı sebep).

Kullanım (manuel test):
  cd backend
  python send_exam_reminders.py
"""

from datetime import date

from app.core.database import supabase_admin
from app.services.job_log import job_run
from app.services.push_service import send_push_batch

# Sınava kalan gün eşikleri — bu günlerden birine denk gelen her sınav için
# bildirim gönderilir (günde 1 kez çalıştığı varsayımıyla — bkz. cron.py'deki
# already_ran_today koruması).
THRESHOLDS = {30, 14, 7, 3, 1, 0}


def _title_and_body(exam_name: str, days_left: int) -> tuple[str, str]:
    if days_left == 0:
        return f"Bugün sınav günü! 🎯 {exam_name}", "Başarılar! Son bir bakış atıp sakin ol, hazırsın."
    if days_left == 1:
        return f"Yarın sınav! 📌 {exam_name}", "Son gün — ağır tekrar yapma, dinlenmeye öncelik ver."
    return (
        f"{exam_name} sınavına {days_left} gün kaldı",
        "Çalışma programını kontrol et, tekrarlarını aksatma.",
    )


def main() -> dict:
    today = date.today()
    exams = (
        supabase_admin.table("exam_reminders")
        .select("id, user_id, exam_name, exam_date")
        .gte("exam_date", today.isoformat())
        .execute()
    ).data or []

    sent_count = 0
    for exam in exams:
        exam_date = date.fromisoformat(exam["exam_date"])
        days_left = (exam_date - today).days
        if days_left not in THRESHOLDS:
            continue

        title, body = _title_and_body(exam["exam_name"], days_left)

        # Dedup: notifications tablosundaki UNIQUE(exam_reminder_id,
        # reminder_days_before) kısıtı (bkz. migration 022) aynı sınav için
        # aynı eşikte ikinci kez satır eklenmesini veritabanı seviyesinde
        # engelliyor — script tekrar tetiklenirse (GitHub Actions'ın aynı
        # pencerede birden fazla kez çalışması gibi) çift bildirim gitmez.
        try:
            supabase_admin.table("notifications").insert(
                {
                    "user_id": exam["user_id"],
                    "type": "exam_reminder",
                    "title": title,
                    "message": body,
                    "exam_reminder_id": exam["id"],
                    "reminder_days_before": days_left,
                }
            ).execute()
        except Exception as e:
            print(f"EXAM REMINDER INSERT SKIP ({exam['id']}, {days_left}g): {e}")
            continue

        try:
            tokens_res = (
                supabase_admin.table("push_tokens")
                .select("token")
                .eq("user_id", exam["user_id"])
                .execute()
            )
            tokens = [t["token"] for t in (tokens_res.data or []) if t.get("token")]
            if tokens:
                send_push_batch(tokens, title, body, "exam_reminder")
        except Exception as e:
            print(f"EXAM REMINDER PUSH WARNING ({exam['id']}): {e}")

        sent_count += 1

    print(f"Sınav hatırlatması: {sent_count} bildirim gönderildi ({len(exams)} yaklaşan sınav tarandı).")
    return {"sent_count": sent_count, "scanned": len(exams)}


if __name__ == "__main__":
    with job_run("send_exam_reminders") as run:
        res = main()
        run.detail = res
