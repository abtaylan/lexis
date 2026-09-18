"""
backend/weekly_admin_report.py

Kullanici istegi (18 Eylul 2026) -- admine her hafta sistemin genel durumunu
ozetleyen bir e-posta raporu: yeni kullanici sayisi + kaynagi (platform),
web/mobil kullanim orani, sisteme donus sikligi, yeni kayitlarin aktivasyon
orani, hangi bolumlerin (oyun/sinav/gramer/kelime) kullanildigi, sinav
sorularinda sistem geneli yanlis/sik oranlari, ogrenilen dil dagilimi,
reklam geliri ve premium geliri.

notify_membership_changes.py ile ayni desen: VPS'te gercek internet erisimi
olan bu backend'e Vercel Cron / GitHub Actions tarafindan secret-korumali
HTTP endpoint (bkz. app/api/routes/cron.py) uzerinden haftada 1 kez
tetiklenmesi icin tasarlandi.

Bilinen veri kapsami sinirlari (dokumanda da not edildi -- Lexis Istatistik &
Analitik Katalogu, "Ek kapsam" bolumu):
  - Quiz modulu (web/src/app/(app)/quiz/page.tsx) hicbir session/attempt
    tablosuna yazmiyor -- "hangi bolumler kullaniliyor" metriginde Quiz
    kasitli olarak YOK, uydurma bir sayi verilmiyor.
  - exam_attempts suan (18 Eylul 2026 itibariyle) toplamda sadece birkac
    satir iceriyor -- haftalik yanlis soru/sik orani bu yuzden kucuk
    orneklemli olabilir, rapor bunu acikca belirtiyor (bkz. exam_total_attempts).
  - Reklam geliri (AdMob) hicbir tabloda tutulmuyor -- rapor bunu "manuel
    kontrol gerekiyor" diye acikca isaretliyor, asla 0 veya tahmini bir
    rakam UYDURMUYOR.
  - Premium geliri `subscriptions` tablosundan hesaplaniyor (mevcut
    GET /admin/payments/summary ile ayni mantik) -- Premium artik sadece
    mobil IAP oldugundan, bu tablonun gercek satin almalari App
    Store/Play Store webhook'lari araciligiyla dogru yansitip yansitmadigi
    ayrica dogrulanmali; rapor bu tabloyu "subscriptions tablosundaki
    kayitlara gore" diye net bir kaynak notuyla sunuyor.

Kullanim (manuel test):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python weekly_admin_report.py

Not: OTP_MODE=fixed iken (varsayilan/gelistirme) gercek mail atilmaz,
sadece log'a yazilir -- email_service.py'deki diger fonksiyonlarla ayni
guvenlik/test davranisi.
"""

from collections import Counter
from datetime import UTC, datetime, timedelta

from app.core.config import settings
from app.core.database import supabase_admin
from app.services.email_service import send_weekly_admin_report_email
from app.services.job_log import job_run


def _count(table: str, date_col: str, since_iso: str) -> int:
    """Belirtilen tabloda since_iso'dan bu yana olusan satir sayisi (sadece
    sayi -- satirlarin kendisi cekilmiyor)."""
    try:
        res = (
            supabase_admin.table(table)
            .select("id", count="exact")
            .gte(date_col, since_iso)
            .limit(1)
            .execute()
        )
        return res.count or 0
    except Exception as e:
        print(f"WEEKLY ADMIN REPORT WARNING ({table} count): {e}")
        return 0


def main() -> dict:
    if not settings.ADMIN_NOTIFICATION_EMAIL:
        print("ADMIN_NOTIFICATION_EMAIL bos, haftalik rapor gonderilemedi.")
        return {"sent": False, "reason": "no_admin_email_configured"}

    now = datetime.now(UTC)
    since = now - timedelta(days=7)
    since_iso = since.isoformat()
    report_date = now.date().isoformat()
    period_label = f"{since.date().isoformat()} / {now.date().isoformat()}"

    # 1) Yeni kullanicilar + kaynak (signup_platform)
    new_profiles = (
        supabase_admin.table("profiles")
        .select("id, signup_platform, created_at")
        .gte("created_at", since_iso)
        .eq("is_bot", False)
        .execute()
    ).data or []
    new_user_ids = [p["id"] for p in new_profiles]
    new_by_platform = Counter(p.get("signup_platform") or "bilinmiyor" for p in new_profiles)

    # 2) Web/mobil kullanim orani + sisteme donus sikligi (login_events)
    logins = (
        supabase_admin.table("login_events")
        .select("user_id, platform, created_at")
        .gte("created_at", since_iso)
        .execute()
    ).data or []
    logins_by_platform = Counter(entry.get("platform") or "bilinmiyor" for entry in logins)
    logins_by_user = Counter(entry["user_id"] for entry in logins)
    distinct_login_users = len(logins_by_user)
    returning_users = sum(1 for c in logins_by_user.values() if c >= 2)
    avg_logins_per_user = round(len(logins) / distinct_login_users, 2) if distinct_login_users else 0.0

    # 3) Yeni kayit olanlarin aktivasyon orani -- kayittan sonra en az 1
    # oyun/sinav/gramer/kelime aktivitesi var mi (Quiz haric -- takip
    # edilmiyor, bkz. dosya basindaki not)
    activation_user_ids: set[str] = set()
    if new_user_ids:
        for table in ("game_sessions", "exam_sessions", "topic_practice_attempts", "study_sessions"):
            try:
                rows = (
                    supabase_admin.table(table)
                    .select("user_id")
                    .in_("user_id", new_user_ids)
                    .execute()
                ).data or []
                activation_user_ids.update(r["user_id"] for r in rows)
            except Exception as e:
                print(f"WEEKLY ADMIN REPORT WARNING ({table} activation): {e}")

    # 4) Bolum/modul kullanim dagilimi (bu hafta baslayan/olusan kayit sayisi)
    module_counts = {
        "Oyunlar": _count("game_sessions", "started_at", since_iso),
        "Sinav Hazirlik": _count("exam_sessions", "started_at", since_iso),
        "Gramer Pratigi": _count("topic_practice_attempts", "created_at", since_iso),
        "Kelime / Flashcard": _count("study_sessions", "started_at", since_iso),
        # Quiz modulu kasitli olarak yok -- hicbir tabloya yazmiyor.
    }

    # 5) Sistem geneli yanlis soru + sik oranlari (bu hafta, exam_attempts)
    week_attempts = (
        supabase_admin.table("exam_attempts")
        .select("question_id, selected_option, is_correct, created_at")
        .gte("created_at", since_iso)
        .execute()
    ).data or []
    total_attempts = len(week_attempts)
    wrong_attempts = [a for a in week_attempts if not a.get("is_correct")]
    wrong_rate = round(100 * len(wrong_attempts) / total_attempts, 1) if total_attempts else None
    wrong_option_counts = Counter(a.get("selected_option") or "bilinmiyor" for a in wrong_attempts)

    # 6) Hangi diller ogreniliyor (aktif, bot olmayan kullanicilarin
    # learning_lang dagilimi -- anlik goruntu, haftaya ozel degil)
    lang_rows = (
        supabase_admin.table("profiles")
        .select("learning_lang")
        .eq("is_bot", False)
        .eq("is_active", True)
        .execute()
    ).data or []
    lang_counts = Counter((r.get("learning_lang") or "bilinmiyor") for r in lang_rows)

    # 7) Premium geliri -- subscriptions tablosu (GET /admin/payments/summary
    # ile ayni hesap mantigi)
    sub_rows = (
        supabase_admin.table("subscriptions").select("plan_code, status").execute()
    ).data or []
    active_by_plan = Counter(r["plan_code"] for r in sub_rows if r.get("status") == "active")
    mrr_estimate = round(
        active_by_plan.get("monthly", 0) * settings.PREMIUM_MONTHLY_PRICE
        + active_by_plan.get("yearly", 0) * (settings.PREMIUM_YEARLY_PRICE / 12),
        2,
    )

    stats = {
        "period_label": period_label,
        "new_users_total": len(new_profiles),
        "new_by_platform": dict(new_by_platform),
        "logins_by_platform": dict(logins_by_platform),
        "distinct_login_users": distinct_login_users,
        "returning_users": returning_users,
        "avg_logins_per_user": avg_logins_per_user,
        "activation_count": len(activation_user_ids),
        "activation_rate": (
            round(100 * len(activation_user_ids) / len(new_user_ids), 1) if new_user_ids else None
        ),
        "module_counts": module_counts,
        "exam_total_attempts": total_attempts,
        "exam_wrong_count": len(wrong_attempts),
        "exam_wrong_rate": wrong_rate,
        "exam_wrong_option_counts": dict(wrong_option_counts),
        "lang_counts": dict(lang_counts),
        "premium_active_by_plan": dict(active_by_plan),
        "premium_mrr_estimate": mrr_estimate,
        "premium_currency": "TRY",
        "premium_total_subscriptions_rows": len(sub_rows),
    }

    sent = send_weekly_admin_report_email(settings.ADMIN_NOTIFICATION_EMAIL, report_date, stats)

    print(
        f"[{now.isoformat()}] Haftalik admin raporu: +{stats['new_users_total']} yeni user, "
        f"{module_counts} -> {settings.ADMIN_NOTIFICATION_EMAIL} (sent={sent})"
    )

    return {"sent": sent, **{k: v for k, v in stats.items() if k != "period_label"}}


if __name__ == "__main__":
    with job_run("weekly_admin_report") as run:
        run.detail = main()
