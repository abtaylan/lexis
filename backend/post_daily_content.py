"""
post_daily_content.py
Madde 3b (revize) — Sosyal medya günlük içerik paylaşımı.

expire_premium.py / send_schedule_reminders.py ile aynı desen: VPS'te gerçek
bir sistem cron'u ile günde bir kez çalıştırılmak üzere tasarlanmış, bağımsız
bir script.

ÖNEMLİ: Bu, hatırlatma DEĞİL — sadece "günün kelimesi" / "quiz sorusu"
içeriğini Telegram kanalına ve Slack'e paylaşır. Diğer platformlar (X,
Instagram, WhatsApp) için paylaşım kullanıcı tarafından elle yapılıyor,
bu script onları kapsamıyor.

Kullanim:
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python post_daily_content.py

Onerilen cron satiri (gunde bir kez, orn. sabah 09:00):
  0 9 * * * cd /path/to/lexis/backend && venv/bin/python post_daily_content.py >> /var/log/lexis_social.log 2>&1

Nasil calisir:
  1. Bugun icin zaten bir kayit var mi kontrol edilir (social_posts.post_date
     UNIQUE) — varsa cikilir (ayni gun icinde birden fazla cron tetiklenmesine
     karsi dedup).
  2. Icerik turu, bir onceki paylasimin turune gore donusumlu belirlenir
     (onceki 'word' ise bugun 'quiz', onceki 'quiz' ise bugun 'word'; hic
     paylasim yoksa 'word' ile baslanir).
  3. general_word_pool'dan (en->tr, tek dolu havuz) uygun icerik secilir,
     Telegram + Slack'e gonderilir, sonuc social_posts'a kaydedilir.

SOCIAL_POST_MODE=fixed (varsayilan) iken gercek paylasim yapilmaz, sadece
log'a yazilir — gercek Telegram/Slack kimlik bilgileri olmadan da guvenle
test edilebilir (bkz. app/core/config.py).
"""

from datetime import date, timezone
from datetime import datetime

from app.core.database import supabase_admin
from app.services.social_content import generate_word_card, pick_quiz, pick_word
from app.services.social_publisher import (
    post_quiz_to_slack,
    post_quiz_to_telegram,
    post_word_to_slack,
    post_word_to_telegram,
)


def _already_posted_today() -> bool:
    result = (
        supabase_admin.table("social_posts")
        .select("id")
        .eq("post_date", date.today().isoformat())
        .limit(1)
        .execute()
    )
    return bool(result.data)


def _next_content_type() -> str:
    last = (
        supabase_admin.table("social_posts")
        .select("content_type")
        .order("post_date", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if not last:
        return "word"
    return "quiz" if last[0]["content_type"] == "word" else "word"


def main():
    if _already_posted_today():
        print(f"[{datetime.now(timezone.utc).isoformat()}] Bugün için zaten bir paylaşım var, çıkılıyor.")
        return

    content_type = _next_content_type()
    row = {"post_date": date.today().isoformat(), "content_type": content_type}

    if content_type == "word":
        chosen = pick_word()
        if not chosen:
            print("Genel havuzda kelime bulunamadı, çıkılıyor.")
            return

        image_bytes = generate_word_card(chosen["word"], chosen["meaning"], chosen.get("example"))
        telegram_ok = post_word_to_telegram(chosen["word"], chosen["meaning"], chosen.get("example"), image_bytes)
        slack_ok = post_word_to_slack(chosen["word"], chosen["meaning"], chosen.get("example"))

        row.update(
            {
                "general_word_id": chosen["id"],
                "telegram_sent": telegram_ok,
                "slack_sent": slack_ok,
            }
        )
    else:
        quiz = pick_quiz()
        if not quiz:
            print("Genel havuzda quiz için yeterli kelime bulunamadı, çıkılıyor.")
            return

        telegram_ok = post_quiz_to_telegram(quiz["question_text"], quiz["options"], quiz["correct_answer"])
        slack_ok = post_quiz_to_slack(quiz["question_text"], quiz["options"], quiz["correct_answer"])

        row.update(
            {
                "general_word_id": quiz["general_word_id"],
                "question_text": quiz["question_text"],
                "options": quiz["options"],
                "correct_answer": quiz["correct_answer"],
                "telegram_sent": telegram_ok,
                "slack_sent": slack_ok,
            }
        )

    try:
        supabase_admin.table("social_posts").insert(row).execute()
    except Exception as e:
        # UNIQUE(post_date) — yarış durumunda burada düşer, paylaşım zaten
        # yapıldıysa bile bu tekrar denemeyi engellemez (kabul edilebilir,
        # çok nadir bir durum: günde bir kez çalışan bir script için).
        print(f"SOCIAL_POSTS INSERT ERROR: {e}")
        return

    print(
        f"[{datetime.now(timezone.utc).isoformat()}] '{content_type}' paylaşıldı "
        f"(telegram={row.get('telegram_sent')}, slack={row.get('slack_sent')})."
    )


if __name__ == "__main__":
    main()
