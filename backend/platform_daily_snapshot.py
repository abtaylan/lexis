"""
platform_daily_snapshot.py

İstatistik & Raporlama V2 öncelik #3, Faz 3 madde E — "Zaman bazlı
periyodik snapshot+cron". backend/app/services/platform_snapshot_service.py
::capture_daily_snapshot()'ı TR takviminde dünkü gün için çalıştırıp
platform_daily_snapshots tablosuna (migration 066) idempotent şekilde
yazar.

Kullanım (yerel test/referans, VPS cron'a hiç bağlanmadı — bkz. aşağıdaki
NOT):
  cd backend
  venv\\Scripts\\activate   (Linux/Mac: source venv/bin/activate)
  python platform_daily_snapshot.py

NOT — expire_premium.py/league_weekly_rollover.py/
distribute_leaderboard_rewards.py ile AYNI durum: bu script yalnızca
Supabase okuyup yazıyor (gerçek dış ağ erişimi gerekmiyor), bu yüzden
üretimdeki GERÇEK periyodik çalıştırma bir Claude scheduled task'ı
tarafından, bu fonksiyonun SQL karşılığıyla yapılıyor (Supabase MCP +
execute_sql) — VPS/Railway cron'una hiç bağlanmadı. Bu dosya yerel
geliştirme/manuel test ve "asıl mantık burada okunabilir" referansı için
var.
"""

import asyncio

from app.services.job_log import job_run
from app.services.platform_snapshot_service import capture_daily_snapshot


async def main() -> dict:
    return await capture_daily_snapshot()


if __name__ == "__main__":
    with job_run("platform_daily_snapshot") as run:
        result = asyncio.run(main())
        run.detail = result
        print(f"[{result['snapshot_date']}] platform_daily_snapshots yazildi: {result}")
