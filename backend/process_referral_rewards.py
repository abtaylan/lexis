"""
process_referral_rewards.py

Referans/Davet Programı (V2 öncelik #8, 12 Eylül 2026) — expire_premium.py /
distribute_leaderboard_rewards.py ile AYNI DESEN: VPS'te gerçek bir sistem
cron'u ile periyodik çalıştırılmak üzere tasarlanmış, bağımsız bir script.

NEDEN raw SQL (bkz. platform_daily_snapshots/content_flags'in Claude
scheduled task'ları) DEĞİL de gerçek bir Python script: bu işin ödül
adımı xp_service.award_xp() üzerinden gidiyor (XP kaydı + profiles.total_xp/
level güncellemesi + seviye atlarsa unvan rozeti — bkz. o fonksiyonun
docstring'i). Bu yan etkileri ham SQL'de elle tekrar etmek KALICI/TELAFİSİZ
bir tutarsızlık riski taşır (bir seviye-atlama eşiği SQL'de "iki kez sayılıp"
ya da "hiç sayılmadan" atlanabilir, sonraki gerçek award_xp() çağrısı bunu
asla telafi edemez — bkz. _award_level_titles'ın (previous_level, new_level]
aralık mantığı). Bu yüzden ödül adımı SADECE gerçek award_xp() ile,
dolayısıyla gerçek bir Python çalıştırmasıyla yapılıyor.

Kural (kullanıcıyla netleşen kapsam, 12 Eylül 2026):
- Ödül davet edilen kişi kayıt olur olmaz DEĞİL, en az REFERRAL_STREAK_
  THRESHOLD (3) günlük seriye (streak) ulaşınca verilir — sahte/atıl hesap
  açıp anında ödül toplamayı (farming) zorlaştırmak için bilinçli bir
  gecikme.
- Davet eden: +REFERRER_XP_BONUS (30) XP + REFERRER_PREMIUM_DAYS (3) gün
  ücretsiz Premium (gerçek bir satın alma DEĞİL, subscriptions'a dokunmaz —
  bkz. _grant_premium_days, distribute_leaderboard_rewards.py'deki aynı adlı
  fonksiyonun BİLİNÇLİ bir yerel kopyası — bu repoda küçük yardımcıları
  script'ler arası import etmek yerine yerel tutma zaten yerleşik bir
  desen, bkz. platform_snapshot_service.py/user_report_service.py'deki
  _pct_change).
- Davet edilen: +REFERRED_XP_BONUS (15) XP "hoş geldin" bonusu (Premium YOK
  — kullanıcıyla netleşen kapsamda Premium sadece davet edene).

İdempotency: referrals.status='pending' filtresi + işlem sonunda 'rewarded'a
çevrilmesi sayesinde script yanlışlıkla iki kez çalıştırılsa bile aynı
referral ikinci kez ödül ÜRETMEZ (ikinci çalıştırmada o satır zaten
'rewarded', sorgu onu hiç getirmez).

Kullanım:
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python process_referral_rewards.py

Önerilen cron satırı (diğer Railway cron servisleriyle aynı proje, YENİ bir
servis olarak eklenmesi gerekiyor — bkz. devir notu, bu ortamdan Railway
servisi oluşturulamıyor):
  0 5 * * * cd /path/to/lexis/backend && venv/bin/python process_referral_rewards.py >> /var/log/lexis_referral_rewards.log 2>&1
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

from app.core.database import supabase_admin
from app.services import xp_service
from app.services.job_log import job_run
from app.services.notify import notify_user

REFERRAL_STREAK_THRESHOLD = 3
REFERRER_XP_BONUS = 30
REFERRED_XP_BONUS = 15
REFERRER_PREMIUM_DAYS = 3


async def _grant_premium_days(user_id: str, days: int) -> None:
    """distribute_leaderboard_rewards.py'deki AYNI ADLI fonksiyonun bilinçli
    yerel kopyası (bkz. modül docstring'i) — mevcut premium_until'den (varsa)
    ya da şu andan `days` gün ileri alır, is_premium=true yapar. subscriptions
    tablosuna dokunmaz; expire_premium.py süresi dolunca otomatik kapatır."""
    profile_res = (
        supabase_admin.table("profiles")
        .select("premium_until")
        .eq("id", user_id)
        .single()
        .execute()
    )
    current_until_raw = (profile_res.data or {}).get("premium_until")
    now = datetime.now(timezone.utc)
    current_until = datetime.fromisoformat(current_until_raw) if current_until_raw else now
    base = max(current_until, now)
    new_until = base + timedelta(days=days)

    supabase_admin.table("profiles").update(
        {"is_premium": True, "premium_until": new_until.isoformat()}
    ).eq("id", user_id).execute()


def _latest_streak(user_id: str) -> int:
    """Kullanıcının EN SON daily_progress satırındaki streak_day'i —
    subscription_segment_service.py'deki (madde H) aynı desenle tutarlı."""
    rows = (
        supabase_admin.table("daily_progress")
        .select("streak_day")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
        .data
    ) or []
    return (rows[0].get("streak_day") or 0) if rows else 0


async def main() -> dict[str, int]:
    pending = (
        supabase_admin.table("referrals")
        .select("id, referrer_id, referred_id")
        .eq("status", "pending")
        .execute()
        .data
    ) or []

    rewarded_count = 0
    for row in pending:
        if _latest_streak(row["referred_id"]) < REFERRAL_STREAK_THRESHOLD:
            continue  # henüz eşiğe ulaşmadı, bir sonraki çalıştırmada tekrar denenir

        await xp_service.award_xp(
            row["referrer_id"],
            "referral_bonus",
            amount=REFERRER_XP_BONUS,
            metadata={"role": "referrer", "referred_id": row["referred_id"]},
        )
        await xp_service.award_xp(
            row["referred_id"],
            "referral_bonus",
            amount=REFERRED_XP_BONUS,
            metadata={"role": "referred", "referrer_id": row["referrer_id"]},
        )
        await _grant_premium_days(row["referrer_id"], REFERRER_PREMIUM_DAYS)

        supabase_admin.table("referrals").update(
            {"status": "rewarded", "rewarded_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", row["id"]).execute()

        try:
            notify_user(
                row["referrer_id"],
                "reward",
                "🎉 Davetin ödüllendirildi!",
                f"Davet ettiğin arkadaşın {REFERRAL_STREAK_THRESHOLD} günlük seriye ulaştı — "
                f"+{REFERRER_XP_BONUS} XP ve {REFERRER_PREMIUM_DAYS} gün ücretsiz Premium kazandın!",
            )
        except Exception as e:
            print(f"REFERRAL REWARD NOTIFICATION WARNING (referrer={row['referrer_id']}): {e}")

        rewarded_count += 1

    print(f"{rewarded_count}/{len(pending)} bekleyen davet ödüllendirildi.")
    return {"rewarded_count": rewarded_count, "pending_checked": len(pending)}


if __name__ == "__main__":
    with job_run("process_referral_rewards") as run:
        summary = asyncio.run(main())
        run.detail = summary
