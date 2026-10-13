"""
backend/weekly_admin_report.py

Kullanici istegi (18 Eylul 2026) -- admine her hafta sistemin genel durumunu
ozetleyen bir e-posta raporu.

SADELESTIRME + GELIR BOLUMU GUNCELLEMESI (13 Ekim 2026, kullanici istegi:
"bana da sadece bundan sonra gunluk olarak degil haftalik olarak rapor
maili gonder, ve sadece uye rapor bilgisi gelsin, ayrica o raporda admob
veya premium uyelikten elde edilen gelir bilgisi eklensin, bu zamana kadar
total kazanc ve o hafta kazanlian gelir bilgisi olsun"):

  1) KAPSAM DARALTILDI -- rapor artik SADECE uyelik bilgisini (yeni uye
     sayisi + kaynagi/platform) ve gelir bilgisini iceriyor. Onceki surumde
     olan web/mobil kullanim orani, donus sikligi, aktivasyon orani, bolum
     kullanim dagilimi, sinav yanlis/sik oranlari ve ogrenilen dil dagilimi
     bolumleri KALDIRILDI (kullanici istegi: "sadece uye rapor bilgisi
     gelsin"). Bu metrikler hala admin panelinde (/admin/*) canli olarak
     mevcut, sadece haftalik mail icinden cikarildi.

  2) GUNLUK UYELIK MAILI KALDIRILDI -- notify_membership_changes.py'nin
     GitHub Actions tetikleyicisi (.github/workflows/notify-membership-
     changes.yml) kaldirildi (kullanici onayi: "evet, gunluk uyelik
     mailini kaldir"). Uyelik bilgisi artik SADECE bu haftalik raporda.

  3) GELIR BOLUMU -- Premium icin iki rakam hesaplaniyor:
       - premium_mrr_estimate: AKTIF aboneliklerin tahmini aylik gelir
         hizi (eskisi gibi, GET /admin/payments/summary ile ayni mantik).
       - premium_total_to_date_estimate: subscriptions tablosundaki TUM
         satirlar (durumdan bagimsiz) plan_code'a gore fiyatlandirilarak
         toplanir -- "bu zamana kadar toplam kazanc" icin KABA bir tahmin.
       - premium_this_week_estimate: ayni hesap, sadece bu hafta
         OLUSTURULAN (created_at >= since) satirlarla sinirli.
     ONEMLI SINIRLAMA (dokumanda da acikca belirtiliyor, rapora da
     yaziliyor): subscriptions tablosunda gercek odenen tutar (amount)
     tutulmuyor, sadece plan_code + durum + tarih var. Bu yuzden bu
     rakamlar GERCEK tahsil edilen tutarin (App Store/Play Store komisyonu
     dusulmemis, iade/chargeback dusulmemis) bir TAHMINIDIR, muhasebe
     kaydi degildir -- ayni eski MRR tahmini gibi "subscriptions
     tablosundaki kayitlara gore" notuyla sunuluyor.
     AdMob icin hala otomatik takip YOK (AdMob Reporting API entegrasyonu
     henuz kurulmadi -- kullanicidan servis hesabi/API erisimi bekleniyor).
     Entegrasyon geldiginde buraya gercek admob_revenue_total_estimate /
     admob_revenue_week_estimate alanlari eklenecek; o zamana kadar rapor
     "manuel kontrol gerekiyor" notuyla aciktan isaretliyor, ASLA 0 veya
     uydurma bir rakam GOSTERMIYOR.

notify_membership_changes.py ile ayni desen: VPS'te gercek internet erisimi
olan bu backend'e Vercel Cron / GitHub Actions tarafindan secret-korumali
HTTP endpoint (bkz. app/api/routes/cron.py) uzerinden haftada 1 kez
tetiklenmesi icin tasarlandi.

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


def _plan_price(plan_code: str) -> float:
    if plan_code == "monthly":
        return settings.PREMIUM_MONTHLY_PRICE
    if plan_code == "yearly":
        return settings.PREMIUM_YEARLY_PRICE
    return 0.0


def main() -> dict:
    if not settings.ADMIN_NOTIFICATION_EMAIL:
        print("ADMIN_NOTIFICATION_EMAIL bos, haftalik rapor gonderilemedi.")
        return {"sent": False, "reason": "no_admin_email_configured"}

    now = datetime.now(UTC)
    since = now - timedelta(days=7)
    since_iso = since.isoformat()
    report_date = now.date().isoformat()
    period_label = f"{since.date().isoformat()} / {now.date().isoformat()}"

    # 1) Yeni kullanicilar + kaynak (signup_platform) -- bu haftaki rapor
    # artik SADECE uyelik + gelir iceriyor (bkz. dosya basi not, madde 1).
    new_profiles = (
        supabase_admin.table("profiles")
        .select("id, signup_platform, created_at")
        .gte("created_at", since_iso)
        .eq("is_bot", False)
        .execute()
    ).data or []
    new_by_platform = Counter(p.get("signup_platform") or "bilinmiyor" for p in new_profiles)

    # 2) Premium geliri -- subscriptions tablosu (bkz. dosya basi not, madde 3).
    sub_rows = (
        supabase_admin.table("subscriptions")
        .select("plan_code, status, created_at")
        .execute()
    ).data or []
    active_by_plan = Counter(r["plan_code"] for r in sub_rows if r.get("status") == "active")
    mrr_estimate = round(
        active_by_plan.get("monthly", 0) * settings.PREMIUM_MONTHLY_PRICE
        + active_by_plan.get("yearly", 0) * (settings.PREMIUM_YEARLY_PRICE / 12),
        2,
    )
    premium_total_to_date_estimate = round(
        sum(_plan_price(r.get("plan_code", "")) for r in sub_rows), 2
    )
    premium_this_week_estimate = round(
        sum(
            _plan_price(r.get("plan_code", ""))
            for r in sub_rows
            if (r.get("created_at") or "") >= since_iso
        ),
        2,
    )

    stats = {
        "period_label": period_label,
        "new_users_total": len(new_profiles),
        "new_by_platform": dict(new_by_platform),
        "premium_active_by_plan": dict(active_by_plan),
        "premium_mrr_estimate": mrr_estimate,
        "premium_total_to_date_estimate": premium_total_to_date_estimate,
        "premium_this_week_estimate": premium_this_week_estimate,
        "premium_currency": "TRY",
        "premium_total_subscriptions_rows": len(sub_rows),
    }

    sent = send_weekly_admin_report_email(settings.ADMIN_NOTIFICATION_EMAIL, report_date, stats)

    print(
        f"[{now.isoformat()}] Haftalik admin raporu: +{stats['new_users_total']} yeni user, "
        f"premium tahmini (bu hafta={premium_this_week_estimate}, toplam={premium_total_to_date_estimate}) "
        f"-> {settings.ADMIN_NOTIFICATION_EMAIL} (sent={sent})"
    )

    return {"sent": sent, **{k: v for k, v in stats.items() if k != "period_label"}}


if __name__ == "__main__":
    with job_run("weekly_admin_report") as run:
        run.detail = main()
