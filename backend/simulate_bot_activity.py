"""
simulate_bot_activity.py

Faz 3f (10 Eylül 2026 kullanıcı isteği — "kullanıcı azlığı noktasında
computer user'lar") — bot (is_bot=true) kullanıcıların haftalık lig
liderlik tablosunda CANLI görünmesi için periyodik, küçük, rastgele
xp_events kayıtları üretir.

NEDEN GEREKLİ: leagues.py'deki haftalık sıralama xp_events'ten CANLI
hesaplanıyor (bkz. o modülün docstring'i) — bot'lara bir kereye mahsus
XP verilirse hafta ilerledikçe sıralamaları donuk kalır, gerçek
kullanıcı(lar) zamanla onları kolayca geçer ve lig cansız görünür.
Bu script periyodik çalışarak (VPS cron) bot'ların XP'sini gerçek bir
öğrenci gibi HAFTA BOYUNCA kademeli artırır.

distribute_leaderboard_rewards.py / expire_premium.py ile AYNI DESEN:
VPS'te gerçek bir sistem cron'u ile çalıştırılmak üzere bağımsız script
(in-process scheduler YOK).

Kullanım:
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python simulate_bot_activity.py

Önerilen cron satırı (günde ~6 kez, gün içine yayılsın diye 3 saatte bir):
  0 */3 * * * cd /path/to/lexis/backend && venv/bin/python simulate_bot_activity.py >> /var/log/lexis_bot_activity.log 2>&1

Her çalıştırmada, o an AKTİF bir lig üyeliği olan her bot için %65
olasılıkla (her bot her 3 saatte bir "ders çalışmıyor" — gerçekçi
aralıklı desen) bot_difficulty'ye göre ölçeklenen tek bir xp_events
kaydı eklenir:
  kolay -> 3-10 XP     orta -> 6-16 XP     zor -> 10-24 XP     usta -> 15-32 XP

profiles.total_xp KASITLI OLARAK güncellenmiyor (award_xp()'nin aksine) —
bot'ların genel seviyesi/toplam XP'si hiçbir ekranda gösterilmiyor,
sadece BU HAFTAKİ lig sıralaması xp_events'i okuyor (bkz. yukarısı);
gereksiz bir profiles UPDATE'inden kaçınılıyor.
"""

from __future__ import annotations

import asyncio
import random
from datetime import UTC, datetime, timedelta

from app.core.database import supabase_admin
from app.services.job_log import job_run
import league_weekly_rollover

DIFFICULTY_XP_RANGE: dict[str, tuple[int, int]] = {
    "kolay": (3, 10),
    "orta": (6, 16),
    "zor": (10, 24),
    "usta": (15, 32),
}

PARTICIPATION_PROBABILITY = 0.65


def _active_bot_user_ids() -> list[tuple[str, str]]:
    """Bu hafta AKTİF bir lig üyeliği olan bot'ları (id, bot_difficulty)
    olarak döndürür. leagues.py'deki mevcut modüllerle AYNI desen —
    embed/join YOK, basit ardışık sorgular (bu kod tabanında zaten
    tercih edilen yaklaşım, bkz. _find_active_league_for_user)."""
    bot_rows = (
        supabase_admin.table("profiles")
        .select("id, bot_difficulty")
        .eq("is_bot", True)
        .execute()
        .data
    ) or []
    if not bot_rows:
        return []
    difficulty_by_id = {b["id"]: b.get("bot_difficulty") or "orta" for b in bot_rows}

    active_league_ids = [
        row["id"]
        for row in (
            supabase_admin.table("leagues")
            .select("id")
            .eq("status", "active")
            .execute()
            .data
        )
        or []
    ]
    if not active_league_ids:
        return []

    membership_rows = (
        supabase_admin.table("league_memberships")
        .select("user_id, league_id")
        .in_("league_id", active_league_ids)
        .in_("user_id", list(difficulty_by_id.keys()))
        .execute()
        .data
    ) or []

    seen: dict[str, str] = {}
    for r in membership_rows:
        seen[r["user_id"]] = difficulty_by_id.get(r["user_id"], "orta")
    return list(seen.items())


def main() -> int:
    # Faz 3 devami (10 Eylul 2026 -- "ligden cikma ve dusme siralamasi...
    # ne kadar surede olacak"): haftasi BITMIS (week_end gecmis) lig
    # gruplarini kapatir + gercek terfi/dusmeyi UYGULAR (bkz.
    # league_weekly_rollover.py modul yorumu -- ayrintili aciklama
    # orada). AYNI 3 saatlik cron'a eklendi (Railway'de YENI bir servis
    # kurmaya gerek kalmadan) -- bir grup, haftasi bittikten en fazla
    # ~3 saat sonra kapanir, bu da bu kullanim senaryosu icin ihmal
    # edilebilir bir gecikme. Once ESKI haftayi kapatir, SONRA asagidaki
    # seed_tier_leagues YENI haftanin gruplarini acar -- sira onemli.
    try:
        asyncio.run(league_weekly_rollover.main())
    except Exception as exc:  # noqa: BLE001 -- rollover basarisiz olsa bile bot XP simulasyonu devam etsin
        print(f"league_weekly_rollover hatasi (yoksayildi): {exc}")

    # Faz 3 devami (10 Eylul 2026 -- "lig sayfasi yavas aciliyor"): tum
    # kademelerin en az 2 grup dolu olmasini garanti eden seed_tier_leagues
    # RPC'si eskiden get_league_overview icinde HER istekte senkron
    # cagriliyordu -- bu da lig sayfasinin acilisini yavaslatiyordu. Bu
    # zaten periyodik (3 saatte bir) calisan bot-aktivite cron'una tasindi:
    # istek anindan tamamen bagimsiz, kullanici hicbir gecikme hissetmiyor.
    try:
        supabase_admin.rpc("seed_tier_leagues", {"p_target_groups_per_tier": 2}).execute()
    except Exception as exc:  # noqa: BLE001 -- seed basarisiz olsa bile bot XP simulasyonu devam etsin
        print(f"seed_tier_leagues RPC hatasi (yoksayildi): {exc}")

    bots = _active_bot_user_ids()
    inserted = 0
    now = datetime.now(UTC)

    for user_id, difficulty in bots:
        if random.random() > PARTICIPATION_PROBABILITY:
            continue
        lo, hi = DIFFICULTY_XP_RANGE.get(difficulty, DIFFICULTY_XP_RANGE["orta"])
        amount = random.randint(lo, hi)
        # Tam "now" yerine son ~20 dakika içine küçük bir rastgele kaydırma —
        # aynı anda onlarca botun created_at'inin birebir aynı saniye olması
        # (cron tetiklenme anı) yerine, liderlik tablosunda daha organik bir
        # zaman dağılımı görünsün diye.
        jitter = timedelta(minutes=random.uniform(0, 20))
        supabase_admin.table("xp_events").insert(
            {
                "user_id": user_id,
                "source_type": "bot_activity",
                "amount": amount,
                "created_at": (now - jitter).isoformat(),
                "metadata": {},
            }
        ).execute()
        inserted += 1

    return inserted


if __name__ == "__main__":
    with job_run("simulate_bot_activity") as run:
        count = main()
        run.detail = {"xp_events_inserted": count}
        print(f"simulate_bot_activity: {count} bot XP olayı eklendi.")
