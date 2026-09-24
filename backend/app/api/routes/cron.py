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


# Kullanıcı isteği (16 Eylül 2026) — günlük üyelik bildirimi ("yeni üye olan
# veya üyelikten çıkanları her gün bana bildiren bir sistem"). Yukarıdaki
# job'larla aynı sebep/desen: Resend (e-posta) gerçek dış ağ erişimi
# gerektiriyor, bu yüzden burada, dışarıdan (GitHub Actions) tetikleniyor.
# Script: backend/notify_membership_changes.py.
@router.post("/notify-membership-changes")
async def run_notify_membership_changes(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("notify_membership_changes"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        import notify_membership_changes

        with job_run("notify_membership_changes") as run:
            result = notify_membership_changes.main()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


# Kullanici istegi (18 Eylul 2026) -- haftalik admin ozet raporu (yeni
# uyeler + kaynagi, web/mobil kullanim, bolum kullanimi, sinav sik oranlari,
# dil dagilimi, premium/reklam geliri). Yukaridaki job'larla ayni sebep/
# desen: Resend (e-posta) gercek dis ag erisimi gerektiriyor, bu yuzden
# burada, disaridan (GitHub Actions) tetikleniyor.
# Script: backend/weekly_admin_report.py.
@router.post("/weekly-admin-report")
async def run_weekly_admin_report(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("weekly_admin_report"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        import weekly_admin_report

        with job_run("weekly_admin_report") as run:
            result = weekly_admin_report.main()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


# Kullanici istegi (18 Eylul 2026) -- tum aktif kullanicilara aylik gelisim
# raporu e-postasi (kendi istatistikleri + gelisim + platform siralamasi).
# Yukaridaki job'larla ayni sebep/desen: Resend (e-posta) gercek dis ag
# erisimi gerektiriyor, bu yuzden burada, disaridan (GitHub Actions)
# tetikleniyor. Script: backend/monthly_user_report.py.
@router.post("/monthly-user-report")
async def run_monthly_user_report(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("monthly_user_report"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        import monthly_user_report

        with job_run("monthly_user_report") as run:
            result = monthly_user_report.main()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


# Kullanici istegi (18 Eylul 2026) -- iOS App Store'da 1.0.2 (acilis cokmesi
# duzeltmesi) yayina girdiginde tum kayitli iOS push token'larina tek seferlik
# "yeni surum yayinda, hemen guncelleyin" bildirimi. Yukaridaki job'larla ayni
# sebep/desen: Expo Push API gercek dis ag erisimi gerektiriyor, bu yuzden
# burada, disaridan (GitHub Actions, workflow_dispatch -- SADECE elle) tetik-
# leniyor. Script: backend/send_ios_update_notification.py. Diger job'lardan
# FARKI: bu gunluk/periyodik degil, tek seferlik bir yayin duyurusu oldugu
# icin already_ran_today guard'i YOK -- tetikleme zaten elle yapiliyor.
@router.post("/send-ios-update-notification")
async def run_send_ios_update_notification(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    def _run() -> dict:
        import send_ios_update_notification

        with job_run("send_ios_update_notification") as run:
            result = send_ios_update_notification.main()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


# 24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 1: dinamik seviye
# degerlendirmesi. backend/reassess_user_levels.py "Railway cron'dan
# gunluk calistirilmali" diyordu ama hic zamanlanmamisti (cron_job_runs'ta
# tek kayit yok). Diger gunluk isler gibi GitHub Actions'tan tetikleniyor
# (.github/workflows/reassess-user-levels.yml), gunde tek calisma
# already_ran_today ile garanti.
@router.post("/reassess-user-levels")
async def run_reassess_user_levels(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("reassess_user_levels"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        from app.services.level_assessment_service import reassess_all_users

        with job_run("reassess_user_levels") as run:
            result = reassess_all_users()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


# 24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 3 (2. bolum): soru
# tukenmesi otomatik tamamlama. Periyodik recheck sinavlari onceki gorulen
# sorulari haric tuttugu icin dil+seviye havuzlari zamanla tukenebilir
# (bkz. question_replenishment_service.py docstring). Diger gunluk
# job'lar gibi GitHub Actions'tan tetiklenir
# (.github/workflows/replenish-exam-questions.yml), gunde tek calisma
# already_ran_today ile garanti. Uretilen sorular status='pending' --
# admin onayi olmadan kullaniciya asla gosterilmez (seed script'iyle
# AYNI moderasyon guvenligi).
@router.post("/replenish-exam-questions")
async def run_replenish_exam_questions(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("replenish_exam_questions"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        from app.services.question_replenishment_service import replenish_exam_questions

        with job_run("replenish_exam_questions") as run:
            result = replenish_exam_questions()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


# 24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 4: general_word_pool'u
# kullanicilarin kendi eklediği yeni Ingilizce kelimelerle otomatik
# buyutur (CEFR seviyesi Anthropic API ile siniflandirilir, bkz.
# word_pool_growth_service.py docstring -- Cambridge canli scraping
# denemesi bu ozellik gelistirilirken Cloudflare bot korumasina takilip
# dogrulanamadi, kullanici onayiyla AI siniflandirmasina gecildi). Diger
# gunluk job'lar gibi GitHub Actions'tan tetiklenir
# (.github/workflows/grow-word-pool.yml), gunde tek calisma
# already_ran_today ile garanti. Icerik URETILMIYOR (sadece kullanicinin
# zaten kendi sozluk aramasiyla dogruladigi kelime+anlam siniflandiriliyor),
# bu yuzden admin moderasyon kuyrugu GEREKMIYOR -- diger iki AI-destekli
# cron'un (reassess-user-levels, replenish-exam-questions) aksine.
@router.post("/grow-word-pool")
async def run_grow_word_pool(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("grow_word_pool"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        from app.services.word_pool_growth_service import grow_word_pool

        with job_run("grow_word_pool") as run:
            result = grow_word_pool()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}


# "Gunluk Kelime Avi" (24 Eylul 2026, Madde 2 secimi -- bkz.
# daily_challenge_service.py modul docstring'i): her aktif ogrenilen dil
# icin GUNUN kelimesini onceden uretir (kullanicilar /daily-challenge/today
# istek atinca CANLI secim yapmak yerine -- boylece TUM kullanicilar ayni
# kelimeyi gorur, klasik Wordle'in "herkes ayni bulmacayi cozuyor" sosyal
# mekanigiyle tutarli). Diger gunluk job'lar gibi GitHub Actions'tan
# tetiklenir (.github/workflows/generate-daily-challenges.yml), gunde tek
# calisma already_ran_today ile garanti (+ tablodaki UNIQUE (learning_lang,
# puzzle_date) kisiti ikinci bir guvenlik agi).
@router.post("/generate-daily-challenges")
async def run_generate_daily_challenges(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
):
    _check_secret(x_cron_secret)

    if already_ran_today("generate_daily_challenges"):
        return {"status": "skipped", "reason": "already_ran_today"}

    def _run() -> dict:
        from app.services.daily_challenge_service import generate_daily_word_challenges

        with job_run("generate_daily_challenges") as run:
            result = generate_daily_word_challenges()
            run.detail = result
        return result

    result = await run_in_threadpool(_run)
    return {"status": "ok", "result": result}
