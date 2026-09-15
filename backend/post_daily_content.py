"""
post_daily_content.py
Madde 3b (revize) — Sosyal medya günlük içerik paylaşımı.

expire_premium.py / send_schedule_reminders.py ile aynı desen: VPS'te gerçek
bir sistem cron'u ile günde bir kez çalıştırılmak üzere tasarlanmış, bağımsız
bir script.

ÖNEMLİ: Bu, hatırlatma DEĞİL — sadece "günün kelimesi" / "quiz sorusu" /
"YDS-YÖKDİL sınav sorusu" içeriğini Telegram kanalına ve Slack'e paylaşır.
Diğer platformlar (X, Instagram, WhatsApp) için paylaşım kullanıcı tarafından
elle yapılıyor, bu script onları kapsamıyor.

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
  2. Icerik turu, CONTENT_CYCLE listesindeki 3'lu donusume gore belirlenir:
     word -> quiz -> exam_question -> word -> ... (hic paylasim yoksa
     "word" ile baslanir; taninmayan/eski bir content_type gorulurse de
     donguye "word"ten yeniden baslanir).
  3. Ilgili kaynaktan icerik secilir (word: daily_word_content, quiz:
     general_word_pool, exam_question: exam_questions), Telegram + Slack'e
     gonderilir, sonuc social_posts'a kaydedilir.

SOCIAL_POST_MODE=fixed (varsayilan) iken gercek paylasim yapilmaz, sadece
log'a yazilir — gercek Telegram/Slack kimlik bilgileri olmadan da guvenle
test edilebilir (bkz. app/core/config.py).
"""

from datetime import date, timezone
from datetime import datetime

from app.core.database import supabase_admin
from app.services.job_log import job_run
from app.services.social_content import (
    generate_word_card,
    pick_daily_word,
    pick_exam_question,
    pick_quiz,
)
from app.services.social_publisher import (
    post_exam_question_to_slack,
    post_exam_question_to_telegram,
    post_quiz_to_slack,
    post_quiz_to_telegram,
    post_word_to_slack,
    post_word_to_telegram,
)

CONTENT_CYCLE = ["word", "quiz", "exam_question"]


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
        return CONTENT_CYCLE[0]
    try:
        idx = CONTENT_CYCLE.index(last[0]["content_type"])
    except ValueError:
        return CONTENT_CYCLE[0]
    return CONTENT_CYCLE[(idx + 1) % len(CONTENT_CYCLE)]


def main() -> dict:
    if _already_posted_today():
        print(f"[{datetime.now(timezone.utc).isoformat()}] Bugün için zaten bir paylaşım var, çıkılıyor.")
        return {"posted": False, "reason": "already_posted_today"}

    content_type = _next_content_type()
    row = {"post_date": date.today().isoformat(), "content_type": content_type}

    if content_type == "word":
        chosen = pick_daily_word()
        if not chosen:
            print("daily_word_content içinde kelime bulunamadı, çıkılıyor.")
            return {"posted": False, "reason": "no_word_available", "content_type": content_type}

        image_bytes = generate_word_card(
            chosen["word"], chosen["meaning_native"], chosen.get("example_1_target"), chosen.get("level")
        )
        telegram_ok = post_word_to_telegram(
            chosen["word"],
            chosen["meaning_native"],
            chosen.get("example_1_target"),
            image_bytes,
            example_2=chosen.get("example_2_target"),
            grammar_note=chosen.get("grammar_note_native"),
            level=chosen.get("level"),
        )
        slack_ok = post_word_to_slack(
            chosen["word"],
            chosen["meaning_native"],
            chosen.get("example_1_target"),
            example_2=chosen.get("example_2_target"),
            grammar_note=chosen.get("grammar_note_native"),
            level=chosen.get("level"),
        )

        row.update(
            {
                "content_ref_id": chosen["id"],
                "telegram_sent": telegram_ok,
                "slack_sent": slack_ok,
            }
        )
    elif content_type == "quiz":
        quiz = pick_quiz()
        if not quiz:
            print("Genel havuzda quiz için yeterli kelime bulunamadı, çıkılıyor.")
            return {"posted": False, "reason": "no_quiz_available", "content_type": content_type}

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
    else:  # "exam_question"
        exam_q = pick_exam_question()
        if not exam_q:
            print("exam_questions içinde uygun YDS/YÖKDİL sorusu bulunamadı, çıkılıyor.")
            return {"posted": False, "reason": "no_exam_question_available", "content_type": content_type}

        telegram_ok = post_exam_question_to_telegram(
            exam_q["exam_type"],
            exam_q["question_text"],
            exam_q["options"],
            exam_q["correct_answer"],
            exam_q.get("explanation"),
        )
        slack_ok = post_exam_question_to_slack(
            exam_q["exam_type"],
            exam_q["question_text"],
            exam_q["options"],
            exam_q["correct_answer"],
            exam_q.get("explanation"),
        )

        row.update(
            {
                "content_ref_id": exam_q["id"],
                "exam_type": exam_q["exam_type"],
                "question_text": exam_q["question_text"],
                "options": exam_q["options"],
                "correct_answer": exam_q["correct_answer"],
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
        return {"posted": False, "reason": "insert_error", "content_type": content_type, "error": str(e)}

    print(
        f"[{datetime.now(timezone.utc).isoformat()}] '{content_type}' paylaşıldı "
        f"(telegram={row.get('telegram_sent')}, slack={row.get('slack_sent')})."
    )
    return {
        "posted": True,
        "content_type": content_type,
        "telegram_sent": row.get("telegram_sent"),
        "slack_sent": row.get("slack_sent"),
    }


if __name__ == "__main__":
    with job_run("post_daily_content") as run:
        run.detail = main()
