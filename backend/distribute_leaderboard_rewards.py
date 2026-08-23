"""
distribute_leaderboard_rewards.py
Madde "Ödül sistemi" — haftalık/aylık liderlik tablosunun ilk 10'una rozet +
bonus XP, ilk 3'e (haftalık) / ilk 3'e (aylık) daha büyük bonus, 1.'lere ek
olarak birkaç gün ücretsiz Premium verir.

expire_premium.py / send_schedule_reminders.py ile AYNI DESEN: VPS'te gerçek
bir sistem cron'u ile periyodik çalıştırılmak üzere tasarlanmış, bağımsız bir
script (in-process scheduler/Celery YOK — bu proje için gereksiz bir altyapı
yükü olurdu).

Kullanım:
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python distribute_leaderboard_rewards.py

Önerilen cron satırları (haftalık: her Pazartesi 04:10, aylık: her ayın 1'i
04:10 — expire_premium.py'nin 04:00'ından hemen sonra, günün sakin saati):
  10 4 * * 1 cd /path/to/lexis/backend && venv/bin/python distribute_leaderboard_rewards.py >> /var/log/lexis_rewards.log 2>&1
  10 4 1 * * cd /path/to/lexis/backend && venv/bin/python distribute_leaderboard_rewards.py >> /var/log/lexis_rewards.log 2>&1

Script her çalıştığında HEM geçen haftayı HEM geçen ayı kontrol eder (aylık
sadece ayın 1'inde gerçek iş yapar — diğer günlerde "geçen ay" için ödüller
zaten dağıtılmış olduğundan badge_service.award_badge no-op döner). Bu
yüzden tek satırlık haftalık cron da yeterli olurdu ama iki satır (yukarıda)
daha az gereksiz sorgu anlamına gelir.

Ödül seviyeleri (bkz. STREAK_MILESTONES için streak.py'deki eşdeğer yorum —
buradaki miktarlar da o ölçekle tutarlı olacak şekilde seçildi):
  Haftalık  1.      → rozet weekly_top1  + 150 XP + 2 gün Premium
  Haftalık  2-3.     → rozet weekly_top3  + 80 XP
  Haftalık  4-10.    → rozet weekly_top10 + 30 XP
  Aylık     1.       → rozet monthly_top1  + 500 XP + 7 gün Premium
  Aylık     2-3.     → rozet monthly_top3  + 250 XP
  Aylık     4-10.    → rozet monthly_top10 + 100 XP

İdempotency: badge_service.award_badge (user_id, badge_code, period_key)
üzerinde DB seviyesinde UNIQUE index'e dayanıyor — script yanlışlıkla iki kez
çalıştırılsa bile aynı kullanıcı aynı dönem için ikinci kez XP/Premium/
bildirim ALMAZ (award_badge False dönünce döngü o kullanıcı için hiçbir şey
yapmadan devam eder).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Literal

from app.core.database import supabase_admin
from app.services import badge_service, xp_service
from app.services.job_log import job_run
from app.services.leaderboard_service import get_top_n_for_reward

Period = Literal["weekly", "monthly"]

# rank aralığı (dahil) -> (badge_code, bonus_xp, premium_bonus_days)
REWARD_TIERS: dict[Period, list[tuple[range, str, int, int]]] = {
    "weekly": [
        (range(1, 2), "weekly_top1", 150, 2),
        (range(2, 4), "weekly_top3", 80, 0),
        (range(4, 11), "weekly_top10", 30, 0),
    ],
    "monthly": [
        (range(1, 2), "monthly_top1", 500, 7),
        (range(2, 4), "monthly_top3", 250, 0),
        (range(4, 11), "monthly_top10", 100, 0),
    ],
}

PERIOD_LABEL_TR = {"weekly": "haftalık", "monthly": "aylık"}


def _tier_for_rank(period: Period, rank: int) -> tuple[str, int, int] | None:
    for rank_range, badge_code, bonus_xp, premium_days in REWARD_TIERS[period]:
        if rank in rank_range:
            return badge_code, bonus_xp, premium_days
    return None


async def _grant_premium_days(user_id: str, days: int) -> None:
    """Kullanıcının premium_until'ünü (varsa mevcut bitiş tarihinden, yoksa
    şu andan) `days` gün ileri alır ve is_premium=true yapar. Gerçek bir
    abonelik satın alımı DEĞİL — bkz. subscriptions tablosuna hiç
    dokunulmuyor, sadece profiles üzerinde geçici bir bonus. expire_premium.py
    süresi dolunca is_premium'u otomatik kapatır (subscriptions'ta 'active'
    satırı olmayan kullanıcılar için o script'in ikinci UPDATE'i zaten no-op)."""
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


async def _reward_period(period: Period) -> int:
    result = await get_top_n_for_reward(period, limit=10)
    period_key = result["period_key"]
    rewarded_count = 0

    for entry in result["top"]:
        tier = _tier_for_rank(period, entry["rank"])
        if tier is None:
            continue
        badge_code, bonus_xp, premium_days = tier
        user_id = entry["user_id"]

        newly_awarded = await badge_service.award_badge(
            user_id, badge_code, period_key=period_key, meta={"rank": entry["rank"], "xp": entry["xp"]}
        )
        if not newly_awarded:
            continue  # bu dönem için zaten ödüllendirilmiş (script tekrar çalıştırılmış)

        await xp_service.award_xp(
            user_id,
            "leaderboard_reward",
            amount=bonus_xp,
            metadata={"period": period, "period_key": period_key, "rank": entry["rank"], "badge_code": badge_code},
        )

        if premium_days > 0:
            await _grant_premium_days(user_id, premium_days)

        label = PERIOD_LABEL_TR[period]
        premium_note = f" + {premium_days} gün Premium" if premium_days > 0 else ""
        try:
            supabase_admin.table("notifications").insert(
                {
                    "user_id": user_id,
                    "type": "reward",
                    "title": f"🏆 {label.capitalize()} liderlik tablosunda {entry['rank']}. sırasın!",
                    "message": f"Tebrikler! Bu {label} dönemde {entry['rank']}. oldun — +{bonus_xp} XP ve yeni bir rozet kazandın{premium_note}.",
                }
            ).execute()
        except Exception as e:
            print(f"REWARD NOTIFICATION WARNING (user={user_id}, period={period}): {e}")

        rewarded_count += 1

    print(f"[{period}/{period_key}] {rewarded_count} kullanıcı ödüllendirildi ({len(result['top'])} aday sıralandı).")
    return rewarded_count


async def main() -> dict[str, int]:
    weekly_count = await _reward_period("weekly")
    monthly_count = await _reward_period("monthly")
    return {"weekly_rewarded": weekly_count, "monthly_rewarded": monthly_count}


if __name__ == "__main__":
    with job_run("distribute_leaderboard_rewards") as run:
        summary = asyncio.run(main())
        run.detail = summary
