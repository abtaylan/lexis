"""
backend/app/api/routes/admin_platform.py

Madde 1d — Admin panelinin kapsamlı yönetim platformuna dönüştürülmesi.

admin.py (kullanıcı listesi/detayı/oluşturma + temel istatistik) yerinde
kalıyor; bu dosya, aynı /api/v1/admin prefix'i altında eklenen YENİ alanları
barındırıyor:

  - GET /system-health      → sistem sağlığı / servis durumu takibi
  - GET /stats/detailed     → dil dağılımı, büyüme grafiği, retention
  - GET /payments           → gelen ödemeler takibi (iyzico/subscriptions)
  - GET /payments/summary
  - GET/POST/PATCH/DELETE /word-pool → kelime havuzu içerik yönetimi
  - GET /social-posts       → sosyal medya otomasyon durumu
  - GET /notifications-log  → bildirim/e-posta gönderim logları
  - GET /game-analytics     → oyun/içerik analitiği
  - GET /audit-log          → admin işlem geçmişi
  - GET /content-accuracy/summary    → İstatistik & Raporlama Faz 1 (11 Eylül
    2026) — 3'lü segmentasyon (sistem soruları / sistem kelimeleri / kullanıcı
    kelimeleri) özet doğruluk
  - GET /content-accuracy/questions  → soru bazında doğruluk + her yanlış
    şıkkın seçilme dağılımı (exam_question_stats view'ı)
  - GET /content-accuracy/words      → kelime bazında doğru/yanlış tahmin
    yüzdesi (system_word_stats / user_word_stats view'ları, migration 062)
  - POST /content-accuracy/flags/scan → İçerik doğruluğu/güvenilirliği
    için otomatik anomali taraması (Faz 3 madde C, migration 065) — düşük
    doğruluklu soru/kelimeleri content_flags tablosuna işaretler.
  - GET/PATCH /content-accuracy/flags → işaretlenen içerik listesi ve
    admin inceleme durumu güncellemesi (open/fixed/dismissed).
  - GET /platform-stats/snapshots     → Faz 3 madde E (zaman bazlı
    periyodik snapshot+cron) — platform_daily_snapshots tablosundaki
    geçmiş günlük özet metrikler (trend görünümü, migration 066).
    Üretimde bu tablo GÜNLÜK bir Claude scheduled task tarafından
    doldurulur (bkz. devir notu); bu buton MANUEL yeniden
    tetikleme/doldurma içindir (ör. bir günü kaçırdıysa).
  - POST /platform-stats/snapshots/capture → dünü (veya body'de verilen
    bir tarihi) manuel olarak yakalar/yeniden hesaplar (idempotent).
  - GET /subscription-segments → Faz 3 madde H — premium vs free
    kullanıcı segmentlerinin katılım/performans karşılaştırması (aktiflik
    oranı, kelime tekrarı, yeni kelime, konu doğruluğu, XP, seri —
    study_sessions/topic_practice_attempts üretimde BOŞ olduğu için
    çalışma süresi/oturum sayısı YOK, bkz. subscription_segment_service.py
    docstring'i). 12 Eylül 2026 itibarıyla canlı veride premium segment
    BOŞ — insufficient_data bayrağıyla yönetiliyor.
  - GET /platform-stats/benchmark → Faz 3 madde I — seçilen periyodu bir
    önceki eşit uzunluktaki periyotla karşılaştırır (bkz.
    platform_snapshot_service.py::get_snapshot_benchmark). "Takvim" (günlük
    ısı haritası) ve "filtreleme" (gün aralığı seçici) tarafı saf frontend
    — mevcut /platform-stats/snapshots uç noktasının verisiyle besleniyor.

Okuma (GET) endpoint'leri get_current_admin (hem 'admin' hem
'admin_readonly' kabul eder) ile korunuyor; mutasyon yapan endpoint'ler
get_current_admin_full (sadece 'admin') ile.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.core.auth import get_current_admin, get_current_admin_full
from app.core.config import settings
from app.core.database import supabase_admin
from app.core.runtime import START_TIME
from app.services.audit_log import log_admin_action
from app.services.auth_users import list_all_auth_users
from app.services.content_flag_service import (
    get_content_flags,
    scan_content_flags,
    update_content_flag,
)
from app.services.platform_snapshot_service import capture_daily_snapshot, get_snapshot_benchmark, get_snapshots
from app.services.report_export_service import build_platform_snapshots_document, render, SUPPORTED_FORMATS
from app.services.subscription_segment_service import get_subscription_segments

router = APIRouter()

CRON_JOB_NAMES = ["expire_premium", "send_schedule_reminders", "post_daily_content"]


# ================================================================
# 1) Sistem sağlığı / servis durumu takibi
# ================================================================
@router.get("/system-health")
async def system_health(admin=Depends(get_current_admin)):
    # DB erişilebilirliği + kabaca gecikme ölçümü
    db_status = "ok"
    db_latency_ms: float | None = None
    t0 = datetime.now(UTC)
    try:
        supabase_admin.table("profiles").select("id").limit(1).execute()
        db_latency_ms = (datetime.now(UTC) - t0).total_seconds() * 1000
    except Exception as e:
        db_status = "error"
        print(f"SYSTEM_HEALTH db ping error: {e}")

    # Her cron job için en son çalışmayı bul
    cron_jobs = []
    for job_name in CRON_JOB_NAMES:
        last = (
            supabase_admin.table("cron_job_runs")
            .select("*")
            .eq("job_name", job_name)
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        ).data
        cron_jobs.append({
            "job_name": job_name,
            "last_run": last[0] if last else None,
            "scheduled": False,  # Madde 4 (kalan): henüz VPS cron'una bağlanmadı
        })

    uptime_seconds = int((datetime.now(UTC).timestamp()) - START_TIME)

    return {
        "backend": {
            "status": "ok",
            "uptime_seconds": uptime_seconds,
            "version": "1.0.0",
        },
        "database": {
            "status": db_status,
            "latency_ms": round(db_latency_ms, 1) if db_latency_ms is not None else None,
        },
        "integrations": {
            "iyzico_configured": bool(settings.IYZICO_API_KEY and settings.IYZICO_SECRET_KEY),
            "otp_mode": settings.OTP_MODE,
            "smtp_configured": bool(settings.SMTP_USER and settings.SMTP_PASSWORD),
            "social_post_mode": settings.SOCIAL_POST_MODE,
            "telegram_configured": bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHANNEL_ID),
            "slack_configured": bool(settings.SLACK_WEBHOOK_URL),
        },
        "cron_jobs": cron_jobs,
        "mobile_app": {
            "status": "live_ios_pending_android",
            "note": "iOS App Store'da yayında/aktif. Android Play Console'da kapalı test + prod-erişim inceleme sürecinde. Canlı sürüm/crash/push metrikleri için bu alan ileride store API'leriyle doldurulacak.",
        },
    }


# ================================================================
# 2) Detaylı istatistikler — dil dağılımı, büyüme, retention
# ================================================================
@router.get("/stats/detailed")
async def stats_detailed(days: int = 30, admin=Depends(get_current_admin)):
    days = max(7, min(days, 180))
    since = (datetime.now(UTC) - timedelta(days=days)).date().isoformat()

    # ── Dil dağılımı ────────────────────────────────────────────
    active_langs = (
        supabase_admin.table("user_learning_languages")
        .select("learning_lang")
        .eq("is_active", True)
        .execute()
    ).data or []
    learning_lang_counts: dict[str, int] = {}
    for row in active_langs:
        code = row["learning_lang"]
        learning_lang_counts[code] = learning_lang_counts.get(code, 0) + 1

    profiles_langs = (
        supabase_admin.table("profiles").select("native_lang").execute()
    ).data or []
    native_lang_counts: dict[str, int] = {}
    for row in profiles_langs:
        code = row.get("native_lang") or "unknown"
        native_lang_counts[code] = native_lang_counts.get(code, 0) + 1

    # ── Büyüme (son N gün, günlük yeni kullanıcı) ───────────────
    created = (
        supabase_admin.table("profiles")
        .select("created_at")
        .gte("created_at", since)
        .execute()
    ).data or []
    growth_map: dict[str, int] = {}
    for row in created:
        day = (row.get("created_at") or "")[:10]
        if day:
            growth_map[day] = growth_map.get(day, 0) + 1
    growth = [{"date": d, "new_users": growth_map.get(d, 0)} for d in _date_range(days)]

    # ── Retention (basit tanım) ──────────────────────────────────
    # "En az 7 gün önce kayıt olmuş kullanıcıların kaçı son 7 gün içinde
    # en az bir daily_progress kaydı üretti" — kabaca bir haftalık aktif
    # kullanım oranı. Kohort bazlı, tarih-hassas bir retention hesabı
    # (D1/D7/D30) için daha zengin bir olay/aktivite tablosu gerekir; bu,
    # mevcut şemadan çıkarılabilecek makul bir ilk yaklaşım.
    cutoff = (datetime.now(UTC) - timedelta(days=7)).isoformat()
    eligible_ids = {
        row["id"] for row in (
            supabase_admin.table("profiles").select("id").lt("created_at", cutoff).execute()
        ).data or []
    }
    eligible_count = len(eligible_ids)

    recent_progress = (
        supabase_admin.table("daily_progress")
        .select("user_id")
        .gte("date", (datetime.now(UTC) - timedelta(days=7)).date().isoformat())
        .execute()
    ).data or []
    active_recent_ids = {row["user_id"] for row in recent_progress}

    retained = len(active_recent_ids & eligible_ids)
    retention_rate = round((retained / eligible_count) * 100, 1) if eligible_count else 0.0

    return {
        "language_distribution": {
            "learning_lang": learning_lang_counts,
            "native_lang": native_lang_counts,
        },
        "growth": growth,
        "retention": {
            "eligible_users": eligible_count,
            "active_last_7_days": retained,
            "retention_rate_percent": retention_rate,
            "definition": "7+ gün önce kayıt olan kullanıcılardan son 7 günde en az bir daily_progress kaydı üretenlerin oranı",
        },
    }


def _date_range(days: int) -> list[str]:
    today = datetime.now(UTC).date()
    return [(today - timedelta(days=i)).isoformat() for i in range(days - 1, -1, -1)]


# ================================================================
# 3) Gelen ödemeler takibi
# ================================================================
@router.get("/payments")
async def list_payments(
    status_filter: str | None = None,
    plan_code: str | None = None,
    admin=Depends(get_current_admin),
):
    query = supabase_admin.table("subscriptions").select("*").order("created_at", desc=True)
    if status_filter:
        query = query.eq("status", status_filter)
    if plan_code:
        query = query.eq("plan_code", plan_code)
    rows = query.execute().data or []

    user_ids = sorted({r["user_id"] for r in rows})
    profile_map = {}
    if user_ids:
        profiles = (
            supabase_admin.table("profiles")
            .select("id, display_name, username")
            .in_("id", user_ids)
            .execute()
        ).data or []
        profile_map = {p["id"]: p for p in profiles}

    email_map = {}
    try:
        users = list_all_auth_users()
        for u in users:
            email_map[u.id] = u.email
    except Exception as e:
        print(f"LIST_PAYMENTS email map warning: {e}")

    enriched = []
    for r in rows:
        p = profile_map.get(r["user_id"], {})
        enriched.append({
            **r,
            "display_name": p.get("display_name"),
            "username": p.get("username"),
            "email": email_map.get(r["user_id"]),
        })

    return {"payments": enriched, "total": len(enriched)}


@router.get("/payments/summary")
async def payments_summary(admin=Depends(get_current_admin)):
    rows = supabase_admin.table("subscriptions").select("plan_code, status").execute().data or []

    by_status: dict[str, int] = {}
    by_plan_active: dict[str, int] = {}
    for r in rows:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
        if r["status"] == "active":
            by_plan_active[r["plan_code"]] = by_plan_active.get(r["plan_code"], 0) + 1

    mrr_estimate = (
        by_plan_active.get("monthly", 0) * settings.PREMIUM_MONTHLY_PRICE
        + by_plan_active.get("yearly", 0) * (settings.PREMIUM_YEARLY_PRICE / 12)
    )

    return {
        "total_subscriptions": len(rows),
        "by_status": by_status,
        "active_by_plan": by_plan_active,
        "mrr_estimate": round(mrr_estimate, 2),
        "currency": "TRY",
    }


# ================================================================
# 4) Kelime havuzu içerik yönetimi (general_word_pool)
# ================================================================
class WordPoolCreate(BaseModel):
    source_lang: str
    target_lang: str
    word: str
    meaning: str
    example: str | None = None
    difficulty_level: str | None = None


class WordPoolUpdate(BaseModel):
    word: str | None = None
    meaning: str | None = None
    example: str | None = None
    difficulty_level: str | None = None
    is_active: bool | None = None


@router.get("/word-pool")
async def list_word_pool(
    source_lang: str | None = None,
    target_lang: str | None = None,
    search: str | None = None,
    include_inactive: bool = False,
    page: int = 1,
    page_size: int = 50,
    admin=Depends(get_current_admin),
):
    page = max(1, page)
    page_size = max(1, min(page_size, 200))
    query = supabase_admin.table("general_word_pool").select("*", count="exact")
    if source_lang:
        query = query.eq("source_lang", source_lang)
    if target_lang:
        query = query.eq("target_lang", target_lang)
    if not include_inactive:
        query = query.eq("is_active", True)
    if search:
        query = query.ilike("word", f"%{search}%")

    start = (page - 1) * page_size
    result = query.order("created_at", desc=True).range(start, start + page_size - 1).execute()

    # Dil çifti başına kaç kelime var — "hangi dillerde havuz boş" sorusuna
    # (doc'taki general_word_pool takip maddesi) admin panelden cevap vermek için.
    all_rows = (
        supabase_admin.table("general_word_pool")
        .select("source_lang, target_lang")
        .eq("is_active", True)
        .execute()
    ).data or []
    coverage: dict[str, int] = {}
    for r in all_rows:
        key = f"{r['source_lang']}->{r['target_lang']}"
        coverage[key] = coverage.get(key, 0) + 1

    return {
        "items": result.data or [],
        "total": result.count or 0,
        "page": page,
        "page_size": page_size,
        "coverage": coverage,
    }


@router.post("/word-pool", status_code=201)
async def create_word_pool_entry(req: WordPoolCreate, admin=Depends(get_current_admin_full)):
    result = supabase_admin.table("general_word_pool").insert(req.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Kelime eklenemedi.")
    row = result.data[0]
    log_admin_action(admin.id, admin.email, "word_pool.create", "general_word_pool", row["id"], req.model_dump())
    return row


@router.patch("/word-pool/{entry_id}")
async def update_word_pool_entry(entry_id: str, req: WordPoolUpdate, admin=Depends(get_current_admin_full)):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Güncellenecek alan yok.")
    result = supabase_admin.table("general_word_pool").update(updates).eq("id", entry_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    log_admin_action(admin.id, admin.email, "word_pool.update", "general_word_pool", entry_id, updates)
    return result.data[0]


@router.delete("/word-pool/{entry_id}")
async def delete_word_pool_entry(entry_id: str, admin=Depends(get_current_admin_full)):
    # Sert silme değil — is_active=false (soft delete). Oyun motoru zaten
    # sadece is_active=true kayıtları kullanıyor (bkz. 006_xp_and_games.sql
    # RLS policy'si), geçmiş game_attempts referansları da korunur.
    result = supabase_admin.table("general_word_pool").update({"is_active": False}).eq("id", entry_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    log_admin_action(admin.id, admin.email, "word_pool.delete", "general_word_pool", entry_id)
    return {"message": "Kelime pasif edildi."}


# ================================================================
# 5) Sosyal medya otomasyon durumu
# ================================================================
@router.get("/social-posts")
async def list_social_posts(limit: int = 30, admin=Depends(get_current_admin)):
    limit = max(1, min(limit, 100))
    posts = (
        supabase_admin.table("social_posts")
        .select("*")
        .order("post_date", desc=True)
        .limit(limit)
        .execute()
    ).data or []

    last_run = (
        supabase_admin.table("cron_job_runs")
        .select("*")
        .eq("job_name", "post_daily_content")
        .order("started_at", desc=True)
        .limit(1)
        .execute()
    ).data

    return {
        "posts": posts,
        "last_cron_run": last_run[0] if last_run else None,
        "mode": settings.SOCIAL_POST_MODE,
    }


# ================================================================
# 6) Bildirim / e-posta gönderim logları
# ================================================================
@router.get("/notifications-log")
async def list_notifications_log(
    channel: str | None = None,
    category: str | None = None,
    status_filter: str | None = None,
    limit: int = 50,
    admin=Depends(get_current_admin),
):
    limit = max(1, min(limit, 200))
    query = supabase_admin.table("notification_log").select("*", count="exact")
    if channel:
        query = query.eq("channel", channel)
    if category:
        query = query.eq("category", category)
    if status_filter:
        query = query.eq("status", status_filter)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return {"items": result.data or [], "total": result.count or 0}


# ================================================================
# 7) Oyun / içerik analitiği
# ================================================================
@router.get("/game-analytics")
async def game_analytics(admin=Depends(get_current_admin)):
    sessions = (
        supabase_admin.table("game_sessions")
        .select("mode, pool_source, learning_lang, score, xp_earned, ended_at")
        .execute()
    ).data or []

    attempts = (
        supabase_admin.table("game_attempts")
        .select("is_correct, session_id")
        .execute()
    ).data or []

    by_mode: dict[str, dict] = {}
    for s in sessions:
        mode = s["mode"]
        bucket = by_mode.setdefault(mode, {"sessions": 0, "completed": 0, "total_score": 0, "total_xp": 0})
        bucket["sessions"] += 1
        bucket["total_score"] += s.get("score") or 0
        bucket["total_xp"] += s.get("xp_earned") or 0
        if s.get("ended_at"):
            bucket["completed"] += 1

    by_lang: dict[str, int] = {}
    for s in sessions:
        lang = s.get("learning_lang") or "unknown"
        by_lang[lang] = by_lang.get(lang, 0) + 1

    total_attempts = len(attempts)
    correct_attempts = sum(1 for a in attempts if a.get("is_correct"))
    accuracy = round((correct_attempts / total_attempts) * 100, 1) if total_attempts else 0.0

    mode_summary = []
    for mode, b in by_mode.items():
        mode_summary.append({
            "mode": mode,
            "sessions": b["sessions"],
            "completed_sessions": b["completed"],
            "avg_score": round(b["total_score"] / b["sessions"], 1) if b["sessions"] else 0,
            "total_xp_earned": b["total_xp"],
        })

    return {
        "total_sessions": len(sessions),
        "by_mode": sorted(mode_summary, key=lambda x: -x["sessions"]),
        "by_learning_lang": by_lang,
        "total_attempts": total_attempts,
        "accuracy_percent": accuracy,
    }


# ================================================================
# 8b) Canlı aktiflik — "şu an aktif kullanıcı" + bölüm bazlı kullanım
#     (4 Eylül 2026 — admin panel "Genel Bakış" sayfası için eklendi)
# ================================================================
@router.get("/live-activity")
async def live_activity(admin=Depends(get_current_admin)):
    now = datetime.now(UTC)
    since_30d = (now - timedelta(days=30)).isoformat()

    # last_seen_at her authenticated istekte core/auth.py::_touch_last_seen
    # tarafından güncelleniyor — hem web hem mobil aynı backend'i kullandığı
    # için ikisini de kapsıyor.
    profiles = (
        supabase_admin.table("profiles").select("id, last_seen_at").execute()
    ).data or []

    cutoff_5min = now - timedelta(minutes=5)
    cutoff_1h = now - timedelta(hours=1)
    today_str = now.date().isoformat()
    online_now = online_1h = active_today = 0
    for p in profiles:
        ls = p.get("last_seen_at")
        if not ls:
            continue
        ls_dt = datetime.fromisoformat(ls)
        if ls_dt >= cutoff_5min:
            online_now += 1
        if ls_dt >= cutoff_1h:
            online_1h += 1
        if ls_dt.date().isoformat() == today_str:
            active_today += 1

    # ── Bölüm bazlı kullanım (son 30 gün, benzersiz kullanıcı sayısı) ──
    # Ayrı bir "event log" tablosu kurmak yerine, her bölümün zaten kendi
    # tablosundaki created_at/started_at üzerinden benzersiz kullanıcı
    # sayısını çıkarıyoruz — mevcut şemadan ek altyapı gerekmeden çıkarılabilir.
    def distinct_users(table: str, col: str, date_col: str, extra_filter=None) -> int:
        q = supabase_admin.table(table).select(col).gte(date_col, since_30d)
        if extra_filter:
            q = extra_filter(q)
        rows = q.execute().data or []
        return len({r[col] for r in rows if r.get(col)})

    words_users = distinct_users("words", "user_id", "created_at")
    game_users = distinct_users("game_sessions", "user_id", "started_at")

    flashcard_rows = (
        supabase_admin.table("xp_events")
        .select("user_id")
        .eq("source_type", "flashcard_review")
        .gte("created_at", since_30d)
        .execute()
    ).data or []
    flashcard_users = len({r["user_id"] for r in flashcard_rows})

    # Çalışma programı bir "aktivite" değil, standing bir ayar — bu yüzden
    # 30 günlük pencere yerine "kaç kullanıcının aktif programı var" sayılıyor.
    schedule_rows = (
        supabase_admin.table("study_schedule").select("user_id").eq("is_active", True).execute()
    ).data or []
    schedule_users = len({r["user_id"] for r in schedule_rows})

    msg_rows = (
        supabase_admin.table("messages").select("sender_id").gte("created_at", since_30d).execute()
    ).data or []
    friend_rows = (
        supabase_admin.table("friendships")
        .select("requester_id, addressee_id")
        .gte("created_at", since_30d)
        .execute()
    ).data or []
    follow_rows = (
        supabase_admin.table("follows").select("follower_id").gte("created_at", since_30d).execute()
    ).data or []
    social_ids = {r["sender_id"] for r in msg_rows if r.get("sender_id")}
    for r in friend_rows:
        if r.get("requester_id"):
            social_ids.add(r["requester_id"])
        if r.get("addressee_id"):
            social_ids.add(r["addressee_id"])
    for r in follow_rows:
        if r.get("follower_id"):
            social_ids.add(r["follower_id"])
    social_users = len(social_ids)

    feature_usage = sorted(
        [
            {"feature": "Kelime Ekleme / Sözlük", "users": words_users},
            {"feature": "Oyun / Quiz", "users": game_users},
            {"feature": "Flashcard Tekrarı", "users": flashcard_users},
            {"feature": "Çalışma Programı", "users": schedule_users},
            {"feature": "Sosyal (Arkadaş/Mesaj)", "users": social_users},
        ],
        key=lambda x: -x["users"],
    )

    return {
        "online_now": online_now,
        "online_last_hour": online_1h,
        "active_today": active_today,
        "total_users": len(profiles),
        "feature_usage_30d": feature_usage,
    }


# ================================================================
# 8) Admin işlem geçmişi (audit log)
# ================================================================
@router.get("/audit-log")
async def list_audit_log(
    action: str | None = None,
    target_type: str | None = None,
    limit: int = 50,
    admin=Depends(get_current_admin),
):
    limit = max(1, min(limit, 200))
    query = supabase_admin.table("admin_audit_log").select("*", count="exact")
    if action:
        query = query.eq("action", action)
    if target_type:
        query = query.eq("target_type", target_type)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return {"items": result.data or [], "total": result.count or 0}

# ================================================================
# 9) İçerik doğruluk analitiği — İstatistik & Raporlama Faz 1
#    (11 Eylül 2026). "3'lü segmentasyon": sistem soruları
#    (exam_questions/exam_question_stats), sistem kelimeleri
#    (general_word_pool/system_word_stats) ve kullanıcının kendi
#    kelimeleri (words/user_word_stats, migration 062). Ayrı bir
#    sayaç servisi yok — hepsi mevcut view'lardan okunuyor, bu
#    yüzden ekstra bakım/senkron yükü yaratmıyor. Sıradaki fazlar:
#    admin/reports sayfasının bu uçları tüketmesi, periyodik
#    özet+e-posta gönderimi, kurum/ülke bazlı kırılım.
# ================================================================
@router.get("/content-accuracy/summary")
async def content_accuracy_summary(admin=Depends(get_current_admin)):
    def _agg(table: str) -> dict:
        rows = (
            supabase_admin.table(table)
            .select("total_attempts, correct_count, wrong_count")
            .gt("total_attempts", 0)
            .execute()
            .data
        ) or []
        total_attempts = sum(r["total_attempts"] for r in rows)
        total_correct = sum(r["correct_count"] for r in rows)
        return {
            "items_with_attempts": len(rows),
            "total_attempts": total_attempts,
            "accuracy_percent": round((total_correct / total_attempts) * 100, 1) if total_attempts else None,
        }

    # Faz 3 madde C — veri kapsamı gözlem noktası: topic_practice_attempts
    # tüm kullanıcılarda boş olabilir (bkz. devir notları), bunu admin
    # panelde şeffafça göstermek için toplam satır sayısını da dönüyoruz.
    topic_practice_total = (
        supabase_admin.table("topic_practice_attempts")
        .select("id", count="exact")
        .limit(1)
        .execute()
        .count
    ) or 0

    return {
        "system_questions": _agg("exam_question_stats"),
        "system_words": _agg("system_word_stats"),
        "user_words": _agg("user_word_stats"),
        "topic_practice_attempts_total": topic_practice_total,
    }


@router.get("/content-accuracy/questions")
async def content_accuracy_questions(
    exam_type: str | None = None,
    min_attempts: int = 5,
    limit: int = 50,
    order: str = "weakest",  # weakest | strongest | most_attempted
    admin=Depends(get_current_admin),
):
    """Soru bazında doğruluk oranı + option_counts (her şıkkın kaç kez
    seçildiği, buradan yanlış şıkların seçilme yüzdesi hesaplanabilir).
    Varsayılan sıralama en zayıf (en düşük accuracy_ratio) sorular önde."""
    limit = max(1, min(limit, 200))
    min_attempts = max(0, min_attempts)

    query = (
        supabase_admin.table("exam_question_stats")
        .select(
            "question_id, exam_type, learning_lang, topic_tag, difficulty_level,"
            " total_attempts, correct_count, wrong_count, accuracy_ratio, option_counts"
        )
        .gte("total_attempts", min_attempts)
    )
    if exam_type:
        query = query.eq("exam_type", exam_type)

    if order == "most_attempted":
        query = query.order("total_attempts", desc=True)
    elif order == "strongest":
        query = query.order("accuracy_ratio", desc=True)
    else:
        query = query.order("accuracy_ratio", desc=False)

    rows = query.limit(limit).execute().data or []

    question_ids = [r["question_id"] for r in rows]
    question_by_id: dict[str, dict] = {}
    if question_ids:
        qrows = (
            supabase_admin.table("exam_questions")
            .select("id, question_text, correct_option")
            .in_("id", question_ids)
            .execute()
            .data
        ) or []
        question_by_id = {q["id"]: q for q in qrows}

    items = []
    for r in rows:
        q = question_by_id.get(r["question_id"], {})
        items.append({
            **r,
            "question_text": q.get("question_text"),
            "correct_option": q.get("correct_option"),
        })

    return {"items": items, "total_returned": len(items)}


@router.get("/content-accuracy/words")
async def content_accuracy_words(
    source: str = "system",  # system (general_word_pool, global) | user (words, kullanıcı bazlı)
    min_attempts: int = 5,
    limit: int = 50,
    order: str = "weakest",  # weakest | strongest | most_attempted
    admin=Depends(get_current_admin),
):
    """Kelime bazında doğru/yanlış tahmin yüzdesi. source=system → tüm
    kullanıcılar bazında genel_word_pool doğruluğu (ülke/genel özet
    raporları için); source=user → words tablosundaki (kullanıcı bazlı
    SRS kartları) doğruluk."""
    if source not in ("system", "user"):
        raise HTTPException(status_code=400, detail="source 'system' veya 'user' olmalı")
    limit = max(1, min(limit, 200))
    min_attempts = max(0, min_attempts)

    table = "system_word_stats" if source == "system" else "user_word_stats"
    query = supabase_admin.table(table).select("*").gte("total_attempts", min_attempts)

    if order == "most_attempted":
        query = query.order("total_attempts", desc=True)
    elif order == "strongest":
        query = query.order("accuracy_ratio", desc=True)
    else:
        query = query.order("accuracy_ratio", desc=False)

    rows = query.limit(limit).execute().data or []
    return {"items": rows, "total_returned": len(rows), "source": source}


# ================================================================
# 10) İçerik doğruluğu/güvenilirlik paneli — İstatistik & Raporlama
#    Faz 3 madde C (bkz. migration 065_content_flags.sql,
#    content_flag_service.py). Faz 1/2'nin "doğruluğa göre sırala"
#    görünümüne ek olarak, otomatik ANOMALİ TESPİTİ + admin inceleme
#    iş akışı: option_counts'ta baskın yanlış şık varsa (cevap anahtarı
#    hatalı olabilir) veya doğruluk aşırı düşükse içerik işaretlenir,
#    admin "düzeltildi"/"göz ardı et" olarak kapatabilir. Tarama hem bu
#    buton hem de (Faz 3 madde E'den itibaren) günlük bir Claude
#    scheduled task ile otomatik çalışıyor.
# ================================================================
@router.post("/content-accuracy/flags/scan")
async def scan_content_accuracy_flags(admin=Depends(get_current_admin_full)):
    result = await scan_content_flags()
    log_admin_action(admin.id, admin.email, "content_flags.scan", detail=result["total"])
    return result


@router.get("/content-accuracy/flags")
async def list_content_accuracy_flags(
    status: str | None = None,
    content_type: str | None = None,
    limit: int = 50,
    admin=Depends(get_current_admin),
):
    if status and status not in ("open", "fixed", "dismissed"):
        raise HTTPException(status_code=400, detail="status 'open', 'fixed' veya 'dismissed' olmalı")
    if content_type and content_type not in ("exam_question", "system_word", "user_word"):
        raise HTTPException(status_code=400, detail="content_type geçersiz")
    items = await get_content_flags(status=status, content_type=content_type, limit=limit)
    return {"items": items, "total_returned": len(items)}


class ContentFlagUpdate(BaseModel):
    status: str
    admin_note: str | None = None


@router.patch("/content-accuracy/flags/{flag_id}")
async def patch_content_accuracy_flag(
    flag_id: str,
    req: ContentFlagUpdate,
    admin=Depends(get_current_admin_full),
):
    try:
        row = await update_content_flag(flag_id, req.status, req.admin_note, admin.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    log_admin_action(admin.id, admin.email, "content_flags.update", "content_flags", flag_id, req.model_dump())
    return row
# ================================================================
# Faz 3 madde E — Zaman bazlı periyodik snapshot+cron. Madde A/B/D'nin
# rapor hesaplamaları hep CANLI (bu dönem vs bir önceki dönem) — bu
# platform_daily_snapshots tablosu geçmiş birçok dönem boyunca trend
# görmek için (madde H/I'nin üzerine inşa edeceği ham veri). Üretimde
# GÜNLÜK bir Claude scheduled task bunu doldurur (bkz. devir notu,
# expire_premium.py/league_weekly_rollover.py ile AYNI desen — backend'de
# referans Python fonksiyonu var ama üretim periyodik çalıştırması VPS
# cron'una hiç bağlanmadı). Bu iki uç nokta MANUEL görüntüleme/yeniden
# tetikleme için.
# ================================================================
@router.get("/platform-stats/snapshots")
async def list_platform_snapshots(days: int = 30, admin=Depends(get_current_admin)):
    rows = await get_snapshots(days=days)
    return {"items": rows, "total_returned": len(rows)}


class SnapshotCaptureRequest(BaseModel):
    target_date: str | None = None  # YYYY-MM-DD, verilmezse "dün" (TR takvimi)


@router.post("/platform-stats/snapshots/capture")
async def capture_platform_snapshot(
    req: SnapshotCaptureRequest | None = None,
    admin=Depends(get_current_admin_full),
):
    target_date = None
    if req and req.target_date:
        from datetime import date as _date

        try:
            target_date = _date.fromisoformat(req.target_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="target_date 'YYYY-MM-DD' formatında olmalı")

    result = await capture_daily_snapshot(target_date=target_date)
    log_admin_action(admin.id, admin.email, "platform_snapshots.capture", detail=result)
    return result


# ── Platform Günlük Özet Export — İstatistik & Raporlama V2 öncelik #3,
# madde F ── CSV/XLSX/PDF indirme (bkz. get_current_admin — admin_readonly
# da erişebilir, tıpkı /platform-stats/snapshots GET'i gibi salt okunur).
@router.get("/platform-stats/snapshots/export")
async def export_platform_snapshots(
    days: int = 30, format: str = "xlsx", admin=Depends(get_current_admin)
):
    if format not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Geçersiz format. Şunlardan biri olmalı: {', '.join(SUPPORTED_FORMATS)}")

    rows = await get_snapshots(days=days)
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang")
        .eq("id", admin.id)
        .single()
        .execute()
    ).data or {}
    lang = profile.get("native_lang") or "tr"
    generated_at = (datetime.now(UTC) + timedelta(hours=3)).strftime("%d.%m.%Y %H:%M")
    doc = build_platform_snapshots_document(rows, generated_at=generated_at, lang=lang)
    body, media_type = render(doc, format, lang=lang)
    filename = f"lexis-platform-ozet-{days}gun.{format}"
    return Response(
        content=body,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ================================================================
# 11) Abonelik-segment korelasyonu — Faz 3 madde H
# ================================================================
@router.get("/subscription-segments")
async def subscription_segments(days: int = 30, admin=Depends(get_current_admin)):
    return await get_subscription_segments(days=days)


# ================================================================
# 12) Platform trend karşılaştırması (periyot benchmark) — Faz 3 madde I
# ================================================================
@router.get("/platform-stats/benchmark")
async def platform_stats_benchmark(days: int = 30, admin=Depends(get_current_admin)):
    return await get_snapshot_benchmark(days=days)
