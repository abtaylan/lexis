"""
backend/reassess_user_levels.py

Kullanici istegi (18 Eylul 2026 -- bkz. app/services/level_assessment_
service.py docstring'i icin ayni istek): "kisinin seviyesi artabilir de
azalabilir de, belirli araliklarla bu durumu analiz etmek lazim ona gore
diger seviyelerden kelimelere calismasi gerekecek. Bunun icin bir yontem
gelistirmelisin."

NE YAPAR: level_assessment_service.reassess_all_users()'i cagirir --
current_level/placement_level'i olan ve son RECHECK_COOLDOWN_DAYS gunde
kontrol edilmemis TUM kullanici+dil ciftlerini tarar, her biri icin son
REASSESS_WINDOW_DAYS gunluk oyun dogruluk oranina bakarak current_level'i
gerekirse bir CEFR kademesi yukari/asagi kaydirir (bkz. o modulun
docstring'i -- tam yontem detayi orada).

Calistirma: backend/ dizininden `python reassess_user_levels.py`
(Railway'de PERIYODIK/cron olarak calistirilmasi onerilir -- bu repo'da
cron config yok, league_weekly_rollover.py/expire_premium.py gibi diger
periyodik script'lerle AYNI desen: Railway'in kendi cron dashboard
ozelligi uzerinden harici olarak zamanlanir. Onerilen siklik: GUNLUK
(orn. "0 3 * * *" -- gece 03:00 UTC) -- RECHECK_COOLDOWN_DAYS=6 zaten
her kullaniciyi haftada ~1 kez kontrol ettigi icin gunluk calistirma
"her kullanici en gec 1 gun icinde, cooldown'u dolan ilk firsatta
kontrol edilir" garantisini saglar, league_weekly_rollover.py'nin
saatlik calisma geregi (hassas kapanis zamanlamasi) gibi bir zaman
hassasiyeti burada YOK -- bu yuzden gunluk yeterli).

job_run ile cron_job_runs tablosuna kaydediliyor (diger periyodik
script'lerle -- league_weekly_rollover.py, expire_premium.py vb. --
ayni desen, bkz. app/services/job_log.py).
"""

import asyncio

from app.services.level_assessment_service import reassess_all_users

try:
    from app.services.job_log import job_run
except ImportError:
    # bkz. league_weekly_rollover.py'deki ayni yorum -- SADECE loglamayi
    # devre disi birakir, asil reassessment islevini ETKILEMEZ.
    from contextlib import contextmanager

    @contextmanager
    def job_run(_name):
        yield None


async def main() -> None:
    with job_run("reassess_user_levels") as run:
        result = reassess_all_users()
        if run is not None:
            run.detail = result
        print(
            f"BITTI. Kontrol edilen: {result['checked']}, "
            f"yukselen: {result['upgraded']}, dusen: {result['downgraded']}, "
            f"degismeyen: {result['unchanged']}, "
            f"yetersiz-veri: {result['skipped_insufficient_data']}"
        )


if __name__ == "__main__":
    asyncio.run(main())
