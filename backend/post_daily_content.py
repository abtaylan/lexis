"""
post_daily_content.py
Madde 3b (revize 2) — Sosyal medya günlük içerik paylaşımı.

expire_premium.py / send_schedule_reminders.py ile aynı desen: VPS'te gerçek
bir sistem cron'u ile günde bir kez çalıştırılmak üzere tasarlanmış, bağımsız
bir script.

ÖNEMLİ: Bu, hatırlatma DEĞİL — Telegram kanalına ve Slack'e HER GÜN hem
"günün kelimesi" HEM bir soru (quiz / YDS-YÖKDİL sınav sorusu, dönüşümlü)
paylaşır. Diğer platformlar (X, Instagram, WhatsApp) için paylaşım kullanıcı
tarafından elle yapılıyor, bu script onları kapsamıyor.

16 EYLÜL 2026 REVİZYONU (kullanıcı geri bildirimi: "bugün telegramda sadece
soru geldi, kelime gelmedi"): önceki tasarımda günde SADECE TEK BİR içerik
türü, 3'lü bir döngüyle (word -> quiz -> exam_question -> word -> ...)
paylaşılıyordu — bu yüzden bazı günler kelime hiç gelmiyordu (kullanıcının
asıl isteği hep buydu: hem kelime hem soru her gün). Artık kelime HER GÜN
ayrıca paylaşılıyor; quiz/exam_question ise kendi aralarında (2'li) dönüşümlü
olarak HER GÜN ikinci bir gönderi olarak paylaşılıyor. social_posts tablosunda
aynı gün için artık biri "word" biri "quiz"/"exam_question" olmak üzere iki
satır olabiliyor (bkz. migration 073, UNIQUE(post_date, content_type)).

Kullanim:
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python post_daily_content.py

Onerilen cron satiri (gunde bir kez, orn. sabah 09:00):
  0 9 * * * cd /path/to/lexis/backend && venv/bin/python post_daily_content.py >> /var/log/lexis_social.log 2>&1

Nasil calisir:
  1. Bugun icin "word" turunde bir kayit var mi kontrol edilir (dedup) — yoksa
     daily_word_content'ten kelime secilir, gorsel kart uretilir, Telegram +
     Slack'e gonderilir, sonuc social_posts'a ayrı bir satir olarak kaydedilir.
  2. Bugun icin "quiz" ya da "exam_question" turunde bir kayit var mi kontrol
     edilir (dedup) — yoksa QUESTION_CYCLE'daki 2'li donusume gore (bir onceki
     soru turune gore quiz<->exam_question) tur belirlenir, ilgili kaynaktan
     (quiz: general_word_pool, exam_question: exam_questions) icerik secilir,
     Telegram + Slack'e gonderilir, sonuc ayrı bir satir olarak kaydedilir.
  3. Ikisi de zaten bugun icin paylasilmissa (ayni gun icinde birden fazla
     cron tetiklenmesine karsi) hicbir sey yapilmaz.

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

# Kelime artık her gün ayrıca paylaşılıyor (aşağıdaki döngüye dahil değil) —
# bu döngü sadece "günün sorusu" ikinci gönderisinin quiz mi yoksa sınav
# sorusu mu olacağını belirliyor.
QUESTION_CYCLE = ["quiz", "exam_question"]


def _posted_today(content_types: list[str]) -> bool:
    result = (
        supabase_admin.table("social_posts")
        .select("id")
        .eq("post_date", date.today().isoformat())
        .in_("content_type", content_types)
        .limit(1)
        .execute()
    )
    return bool(result.data)


def _next_question_type() -> str:
    last = (
        supabase_admin.table("social_posts")
        .select("content_type")
        .in_("content_type", QUESTION_CYCLE)
        .order("post_date", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if not last:
        return QUESTION_CYCLE[0]
    try:
        idx = QUESTION_CYCLE.index(last[0]["content_type"])
    except ValueError:
        return QUESTION_CYCLE[0]
    return QUESTION_CYCLE[(idx + 1) % len(QUESTION_CYCLE)]


def _insert_social_post(row: dict) -> bool:
    try:
        supabase_admin.table("social_posts").insert(row).execute()
        return True
    except Exception as e:
        # UNIQUE(post_date, content_type) — yarış durumunda burada düşer,
        # paylaşım zaten yapıldıysa bile bu tekrar denemeyi engellemez
        # (kabul edilebilir, çok nadir bir durum: günde bir kez çalışan bir
        # script için).
        print(f"SOCIAL_POSTS INSERT ERROR: {e}")
        return False


def _post_word() -> dict:
    chosen = pick_daily_word()
    if not chosen:
        print("daily_word_content içinde kelime bulunamadı, çıkılıyor.")
        return {"posted_word": False, "word_reason": "no_word_available"}

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

    row = {
        "post_date": date.today().isoformat(),
        "content_type": "word",
        "content_ref_id": chosen["id"],
        "telegram_sent": telegram_ok,
        "slack_sent": slack_ok,
    }
    inserted = _insert_social_post(row)
    return {
        "posted_word": inserted,
        "word_telegram_sent": telegram_ok,
        "word_slack_sent": slack_ok,
    }


def _post_question() -> dict:
    content_type = _next_question_type()

    if content_type == "quiz":
        quiz = pick_quiz()
        if not quiz:
            print("Genel havuzda quiz için yeterli kelime bulunamadı, çıkılıyor.")
            return {"posted_question": False, "question_reason": "no_quiz_available"}

        telegram_ok = post_quiz_to_telegram(quiz["question_text"], quiz["options"], quiz["correct_answer"])
        slack_ok = post_quiz_to_slack(quiz["question_text"], quiz["options"], quiz["correct_answer"])

        row = {
            "post_date": date.today().isoformat(),
            "content_type": "quiz",
            "general_word_id": quiz["general_word_id"],
            "question_text": quiz["question_text"],
            "options": quiz["options"],
            "correct_answer": quiz["correct_answer"],
            "telegram_sent": telegram_ok,
            "slack_sent": slack_ok,
        }
    else:  # "exam_question"
        exam_q = pick_exam_question()
        if not exam_q:
            print("exam_questions içinde uygun YDS/YÖKDİL sorusu bulunamadı, çıkılıyor.")
            return {"posted_question": False, "question_reason": "no_exam_question_available"}

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

        row = {
            "post_date": date.today().isoformat(),
            "content_type": "exam_question",
            "content_ref_id": exam_q["id"],
            "exam_type": exam_q["exam_type"],
            "question_text": exam_q["question_text"],
            "options": exam_q["options"],
            "correct_answer": exam_q["correct_answer"],
            "telegram_sent": telegram_ok,
            "slack_sent": slack_ok,
        }

    inserted = _insert_social_post(row)
    return {
        "posted_question": inserted,
        "question_content_type": content_type,
        "question_telegram_sent": telegram_ok,
        "question_slack_sent": slack_ok,
    }


def main() -> dict:
    result: dict = {}

    if _posted_today(["word"]):
        print(f"[{datetime.now(timezone.utc).isoformat()}] Bugün için kelime zaten paylaşılmış, atlanıyor.")
        result.update({"posted_word": False, "word_reason": "already_posted_today"})
    else:
        result.update(_post_word())

    if _posted_today(QUESTION_CYCLE):
        print(f"[{datetime.now(timezone.utc).isoformat()}] Bugün için soru zaten paylaşılmış, atlanıyor.")
        result.update({"posted_question": False, "question_reason": "already_posted_today"})
    else:
        result.update(_post_question())

    print(
        f"[{datetime.now(timezone.utc).isoformat()}] Günlük içerik tamamlandı: "
        f"word={result.get('posted_word')}, question={result.get('posted_question')} "
        f"({result.get('question_content_type', '-')})."
    )
    return result


if __name__ == "__main__":
    with job_run("post_daily_content") as run:
        run.detail = main()
