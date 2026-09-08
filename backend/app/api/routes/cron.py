"""
app/api/routes/cron.py — dış tetikleyicili (Vercel Cron / GitHub Actions)
periyodik job'lar için secret-korumalı internal endpoint'ler.

NEDEN BU DOSYA VAR: send_schedule_reminders.py ve post_daily_content.py
gerçek SMTP / Telegram / Slack ağ erişimi gerektiriyor — bu, ne Claude'un
cloud sandbox'ından ne de (aynı ağ kısıtına sahip) bir Claude scheduled
task'ından yapılabiliyor (bkz. backlog dokümanı). expire_premium.py ve
distribute_leaderboard_rewards.py için bu soruna Claude scheduled task +
Supabase MCP SQL çözümü kullanıldı çünkü onlar SADECE Supabase'e yazıyor.
Bu ikisi (reminders + social post) ise gerçek dış servislere konuşuyor, o
yüzden gerçek network'ü olan Railway'deki bu backend'e HTTP ile dışarıdan
"tetikle" diyebileceğimiz bir kapı açılıyor:

  - Vercel Cron (web/vercel.json) → web/src/app/api/cron/post-daily-content
    route'u → burada POST /internal/cron/post-daily-content (günde 1 kez,
    Vercel Hobby planıyla uyumlu).
  - GitHub Actions (.github/workflows/schedule-reminders.yml) → doğrudan
    burada POST /internal/cron/send-schedule-reminders (5 dakikada bir —
    Vercel Hobby "günde 1" sınırını aştığı için Vercel yerine ücretsiz
    GitHub Actions cron kullanılıyor).

GÜVENLİK: Her iki route da `X-Cron-Secret` header'ının backend'deki
CRON_SECRET ortam değişkeniyle birebir eşleşmesini şart koşuyor.
CRON_SECRET boşken (varsayılan) HER istek 401 döner — .env'e gerçek bir
değer girilmeden bu endpoint'ler kullanılamaz hale geliyor, kazayla açık
bir "herkes tetikleyebilir" endpoint riski yok. Ayrıca bu router /api/v1
altında DEĞİL, ayrı bir /internal/cron prefix'inde — normal kullanıcı
auth'undan (get_current_user) tamamen bağımsız, bilerek böyle.
"""

from fastapi import APIRouter, Header, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.services.job_log import already_ran_today, job_run

router = APIRouter()


def _check_secret(x_cron_secret: str | None) -> None:
    if not settings.CRON_SECRET or x_cron_secret != settings.CRON_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/send-schedule-reminders")
async def run_send_schedule_reminders(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    def _run() -> int:
        # Backend root'u (backend/) sys.path'te olduğu için (uvicorn app.main:app
        # backend/ dizininden çalıştırılıyor) standalone script doğrudan import
        # edilebiliyor — send_schedule_reminders.py kendi __main__ bloğunda
        # yaptığı job_run() sarmalamasını burada aynen tekrarlıyoruz, script
        # dosyasının kendisine hiç dokunmadan (VPS'te "python
        # send_schedule_reminders.py" ile elle/gerçek cron'la çalıştırma
        # yolu da bozulmadan duruyor).
        import send_schedule_reminders

        with job_run("send_schedule_reminders") as run:
            sent = send_schedule_reminders.main()
            run.detail = {"sent_count": sent, "trigger": "http_internal_cron"}
        return sent

    sent = await run_in_threadpool(_run)
    return {"status": "ok", "sent_count": sent}


@router.post("/post-daily-content")
async def run_post_daily_content(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    def _run() -> dict:
        import post_daily_content

        with job_run("post_daily_content") as run:
            result = post_daily_content.main()
            run.detail = result if isinstance(result, dict) else {"result": result}
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


# ── Kullanıcı isteği (6 Eylül 2026) — günün kelimesi e-postası + günde 2
# kez push hatırlatması. Yukarıdaki iki endpoint'le birebir aynı sebep/
# desen: SMTP/Resend (e-posta) ve Expo Push API (push) gerçek dış ağ
# erişimi gerektiriyor, bu yüzden Claude tarafında değil, burada, dışarıdan
# (GitHub Actions) tetikleniyor. Script'ler bkz. backend/
# send_daily_word_email.py ve backend/send_push_reminder.py.
#
# GÜVENİLİRLİK GÜNCELLEMESİ (7 Eylül 2026): Bu iki job (+ push'un iki slotu)
# GitHub Actions'ta günde sadece 1-2 kez tetikleniyordu ve cron_job_runs
# tablosunda HİÇ kayıt bırakmadan (run bile oluşmadan) günler geçti — GitHub
# bazı zamanlanmış tick'leri sessizce hiç çalıştırmıyor. Çözüm:
# .github/workflows/daily-word-email.yml ve push-reminders.yml artık hedef
# saat aralığında (örn. 06:00-06:50 UTC) 10 dakikada bir birden fazla kez
# tetikleniyor — schedule-reminders.yml'nin (*/5 * * * *) kanıtlanmış
# güvenilir deseniyle aynı mantık. Aynı günde birden fazla e-posta/push
# gitmesini engellemek için burada `already_ran_today` ile bugün zaten
# başarıyla çalışmışsa asıl iş atlanıyor.
@router.post("/send-daily-word-email")
async def run_send_daily_word_email(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("send_daily_word_email"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        import send_daily_word_email

        with job_run("send_daily_word_email") as run:
            result = send_daily_word_email.main()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


@router.post("/send-push-reminder-morning")
async def run_send_push_reminder_morning(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("send_push_reminder_morning"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        import send_push_reminder

        with job_run("send_push_reminder_morning") as run:
            result = send_push_reminder.main("morning")
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


@router.post("/send-push-reminder-evening")
async def run_send_push_reminder_evening(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("send_push_reminder_evening"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        import send_push_reminder

        with job_run("send_push_reminder_evening") as run:
            result = send_push_reminder.main("evening")
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


# Kullanıcı isteği (8 Eylül 2026) — tüm yabancı dil sınavları için sınav
# hatırlatıcısı (bkz. app/api/routes/exam_reminders.py, send_exam_reminders.py).
# Günde 1 kez çalışması yeterli — push-reminders.yml'nin sabah penceresine
# eklenen ek bir adımla tetikleniyor (bkz. .github/workflows/push-reminders.yml).
@router.post("/send-exam-reminders")
async def run_send_exam_reminders(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("send_exam_reminders"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        import send_exam_reminders

        with job_run("send_exam_reminders") as run:
            result = send_exam_reminders.main()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}
