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

Okuma (GET) endpoint'leri get_current_admin (hem 'admin' hem
'admin_readonly' kabul eder) ile korunuyor; mutasyon yapan endpoint'ler
get_current_admin_full (sadece 'admin') ile.
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_admin, get_current_admin_full
from app.core.config import settings
from app.core.database import supabase_admin
from app.core.runtime import START_TIME
from app.services.audit_log import log_admin_action

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
            "status": "in_development",
            "note": "React Native (Expo) uygulaması henüz geliştirme aşamasında — canlı sürüm/crash/push metrikleri için bu alan ileride doldurulacak.",
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
        page = supabase_admin.auth.admin.list_users()
        users = page if isinstance(page, list) else getattr(page, "users", [])
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
