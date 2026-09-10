"""
backend/league_weekly_rollover.py

V2 Faz 3 devami (10 Eylul 2026 kullanici sorusu -- "ligden cikma ve
dusme siralamasi var bu guzel ama neye gore cikip duşecekler, sure mi
olcut olacak, yani siralama 1 hafta icin mi gecerli olacak, ne kadar
surede cikma dusme olacak"):

CEVAP / MEKANIZMA -- bu script'in uyguladigi kural:
  - Olcut: SÜRE. Her lig grubu (leagues satiri) tam 1 HAFTA gecerlidir
    (week_start = Pazartesi 00:00 TR, week_end = bir sonraki Pazartesi
    00:00 TR -- bkz. migration'lardaki date_trunc('week', ...) hesabi).
  - Siralama: o hafta xp_events'ten CANLI toplanan XP'ye gore (ayni
    canli hesap /leagues/me ve /overview'de kullanilan, bkz.
    app/api/routes/leagues.py _weekly_xp_by_user).
  - Terfi/dusme bolgeleri: UI'daki (LeagueTable bilesenleri, web+mobil)
    GORSEL onizlemeyle BIREBIR ayni oran -- grup buyuklugu >6 ise
    ust ~1/3'u TERFI, alt ~1/3'u DUSME bolgesi (round(N/3), en az 1).
    6 ve altindaki gruplarda (henuz dolmamis / kucuk gruplar) terfi/
    dusme UYGULANMAZ -- kimse haksiz yere cikmasin/dusmesin diye.
  - Kapanis ZAMANI: bu script'in NE ZAMAN calistigi = kapanis zamani.
    week_end'i GECMIS ("<= simdi") HER "active" lig grubunu bulur, o
    anda kapatir. Railway cron'u SAATLIK calistirmasi onerilir (bkz.
    devir notundaki "5 * * * *") -- yani bir grup, hafta bittikten en
    fazla ~1 saat sonra kapanir (haftalik dongude ihmal edilebilir bir
    gecikme).

NE YAPAR (grup basina):
  1. Uyeleri + bu haftaki CANLI XP'lerini cek, XP'ye gore sirala.
  2. league_memberships.final_xp / final_rank / outcome (promoted /
     demoted / stayed) alanlarini DONDURUR (artik degismeyecek).
  3. SADECE gercek kullanicilar icin (is_bot=false) -- botlarin
     current_league_tier'i TASARIM GEREGI SABIT, bkz. modul docstring'i
     leagues.py'de + migration 052 yorumu, dikkatlice olcek-lendirilmis
     bot havuzunu bosaltmamak icin -- profiles.current_league_tier'i
     terfi/dusme yonunde 1 kademe kaydirir (bronze<->master sinirinda
     tasma YOK, sinirdaki kullanici sadece "stayed" sayilir cunku
     GERCEKTE kademesi degismiyor).
  4. leagues.status = 'completed' yapar.
  5. YENI grup ACMAZ -- bu zaten LAZY: kullanici bir sonraki
     /leagues/me cagrisinda public.ensure_active_league_membership
     (migration 047) onu YENI kademesindeki bu haftanin grubuna otomatik
     yerlestirir (gerekirse bot dolgulu yeni bir grup acarak). Boylece
     TEK bir "kullaniciyi liglere yerlestir" mantigi (RPC) korunuyor --
     bu script onu IKINCI kez YAZMIYOR.

Calistirma: backend/ dizininden `python league_weekly_rollover.py`
(Railway'de saatlik scheduled task/cron olarak, bkz. devir notu).
job_run ile cron_job_runs tablosuna kaydediliyor (diger tek seferlik /
periyodik script'lerle -- expire_premium.py, simulate_bot_activity.py
vb. -- ayni desen).
"""

import asyncio
from datetime import datetime, timezone

from app.core.database import supabase_admin

try:
    from app.services.job_log import job_run
except ImportError:
    # bkz. backfill_word_types.py'deki ayni yorum -- SADECE loglamayi
    # devre disi birakir, asil rollover islevini ETKİLEMEZ.
    from contextlib import contextmanager

    @contextmanager
    def job_run(_name):
        yield None

# migration 041_leagues_schema.sql'deki 6 sabit kademeyle birebir eslesir
# (slug -> tier_index: bronze=0 ... master=5). Yeni bir kademe eklenirse
# HEM o migration'a HEM buraya (HEM leagues.py/leagueLocale.ts/
# leagueStrings.ts'teki ayni adli sozluklere) eklenmeli.
_TIER_SLUGS_BY_INDEX = ["bronze", "silver", "gold", "platinum", "diamond", "master"]


def _weekly_xp_by_user(user_ids: list[str], week_start: str, week_end: str) -> dict[str, int]:
    if not user_ids:
        return {}
    rows = (
        supabase_admin.table("xp_events")
        .select("user_id, amount")
        .in_("user_id", user_ids)
        .gte("created_at", week_start)
        .lt("created_at", week_end)
        .execute()
        .data
    ) or []
    totals: dict[str, int] = {uid: 0 for uid in user_ids}
    for row in rows:
        totals[row["user_id"]] = totals.get(row["user_id"], 0) + row["amount"]
    return totals


async def main() -> None:
    with job_run("league_weekly_rollover"):
        now_iso = datetime.now(timezone.utc).isoformat()
        leagues = (
            supabase_admin.table("leagues")
            .select("id, tier_slug, week_start, week_end")
            .eq("status", "active")
            .lte("week_end", now_iso)
            .execute()
            .data
        ) or []
        print(f"Kapatilacak lig grubu sayisi: {len(leagues)}")

        promoted = demoted = stayed = 0

        for league in leagues:
            league_id = league["id"]
            member_rows = (
                supabase_admin.table("league_memberships")
                .select("user_id")
                .eq("league_id", league_id)
                .execute()
                .data
            ) or []
            user_ids = [m["user_id"] for m in member_rows]
            if not user_ids:
                supabase_admin.table("leagues").update({"status": "completed"}).eq("id", league_id).execute()
                continue

            profile_rows = (
                supabase_admin.table("profiles")
                .select("id, is_bot, current_league_tier")
                .in_("id", user_ids)
                .execute()
                .data
            ) or []
            profiles_by_id = {p["id"]: p for p in profile_rows}

            xp_by_user = _weekly_xp_by_user(user_ids, league["week_start"], league["week_end"])
            ranked = sorted(user_ids, key=lambda uid: xp_by_user.get(uid, 0), reverse=True)
            member_count = len(ranked)
            # LeagueTable.tsx (web+mobil) ile BIREBIR ayni oran -- gorsel
            # onizleme ile gercek kapanis mantigi SIMDI tutarli.
            zone_size = max(1, round(member_count / 3)) if member_count > 6 else 0

            try:
                tier_index = _TIER_SLUGS_BY_INDEX.index(league["tier_slug"])
            except ValueError:
                tier_index = 0

            for rank0, uid in enumerate(ranked):
                rank = rank0 + 1
                is_promote_zone = zone_size > 0 and rank <= zone_size
                is_demote_zone = zone_size > 0 and rank > member_count - zone_size

                new_tier_index = tier_index
                if is_promote_zone:
                    new_tier_index = min(tier_index + 1, len(_TIER_SLUGS_BY_INDEX) - 1)
                elif is_demote_zone:
                    new_tier_index = max(tier_index - 1, 0)

                if new_tier_index > tier_index:
                    outcome = "promoted"
                elif new_tier_index < tier_index:
                    outcome = "demoted"
                else:
                    # Zon icinde olsa bile sinirda (bronze'da dusme /
                    # master'da terfi) GERCEKTE kademe degismiyor --
                    # yanlis "promoted/demoted" etiketi gostermeyelim.
                    outcome = "stayed"

                supabase_admin.table("league_memberships").update(
                    {
                        "final_xp": xp_by_user.get(uid, 0),
                        "final_rank": rank,
                        "outcome": outcome,
                    }
                ).eq("league_id", league_id).eq("user_id", uid).execute()

                profile = profiles_by_id.get(uid) or {}
                is_bot = bool(profile.get("is_bot"))
                if not is_bot and outcome != "stayed":
                    supabase_admin.table("profiles").update(
                        {"current_league_tier": _TIER_SLUGS_BY_INDEX[new_tier_index]}
                    ).eq("id", uid).execute()

                if outcome == "promoted":
                    promoted += 1
                elif outcome == "demoted":
                    demoted += 1
                else:
                    stayed += 1

            supabase_admin.table("leagues").update({"status": "completed"}).eq("id", league_id).execute()
            print(
                f"[{league['tier_slug']}] {league_id} kapatildi -- "
                f"{member_count} uye, terfi/dusme/sabit: bu grupta hesaplandi"
            )

        print(f"BITTI. Toplam terfi: {promoted}, dusme: {demoted}, sabit: {stayed}")


if __name__ == "__main__":
    asyncio.run(main())
