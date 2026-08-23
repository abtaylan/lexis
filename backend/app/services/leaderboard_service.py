"""
backend/app/services/leaderboard_service.py

Siralama (leaderboard) servisi. XPBar sadece kullanicinin KENDI XP/seviye
ilerlemesini gosteriyordu; bu servis ona ek olarak rakip karsilastirmali
genel/haftalik/aylik siralama saglar.

- Genel siralama: profiles.total_xp (kalici, hic sifirlanmaz).
- Haftalik/aylik siralama: xp_events tablosundan ilgili donemde kazanilan
  XP toplanarak hesaplanir (total_xp'den bagimsiz, donem basinda sanki
  sifirdan basliyormus gibi). xp_events zaten her XP kazanimini
  timestamp'li kaydediyor (bkz. xp_service.award_xp), bu yuzden ekstra
  migration/tablo gerekmedi.

Not: Proje genelinde Supabase RPC / raw SQL kullanilmiyor; sorgu builder ile
veri cekilip Python tarafinda gruplaniyor (bkz. admin_platform.py'deki
by_mode deseni). Ayni yaklasim burada da izlendi -- tutarlilik icin. Kullanici
sayisi/xp_events hacmi buyudukce bu fonksiyon bir Postgres RPC'ye (SUM +
RANK() OVER) tasinmali; simdilik olcek icin yeterli.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, time, timedelta, timezone
from typing import Any, Literal

from app.core.database import supabase_admin

LeaderboardPeriod = Literal["all", "weekly", "monthly"]

# Donem sinirlari uygulamanin varsayilan saat dilimine (profiles.timezone
# varsayilani Europe/Istanbul) gore hesaplanir. Kullanici bazinda farkli
# saat dilimi desteklemiyoruz -- MVP icin tek, sabit sinir yeterli.
#
# ZoneInfo("Europe/Istanbul") KASITLI OLARAK KULLANILMADI: Windows'ta
# Python'un IANA saat dilimi veritabani (tzdata) varsayilan olarak kurulu
# gelmiyor, bu da ZoneInfo(...) satirini MODUL YUKLENIRKEN
# ZoneInfoNotFoundError ile patlatabilir -- bu da bu servisi import eden
# stats.py'yi ve dolayisiyla /stats/* altindaki TUM route'lari (XPBar'in
# kullandigi /stats/xp dahil) coker. Turkiye 2016'dan beri yaz saati
# uygulamiyor (yil boyu sabit UTC+3), bu yuzden IANA veritabanina hic
# ihtiyac yok -- sabit offset guvenli ve platform bagimsiz.
_TZ = timezone(timedelta(hours=3))


def _period_start(period: LeaderboardPeriod) -> str | None:
    """Donemin baslangicini (Europe/Istanbul yerel gece yarisi) ISO
    timestamp olarak dondurur. 'all' icin None (filtre yok, tum zamanlar)."""
    if period == "all":
        return None

    today_local = datetime.now(_TZ).date()
    if period == "weekly":
        start_date = today_local - timedelta(days=today_local.weekday())  # Pazartesi
    else:  # monthly
        start_date = today_local.replace(day=1)

    return datetime.combine(start_date, time.min, tzinfo=_TZ).isoformat()


def _profiles_by_id(user_ids: list[str]) -> dict[str, dict[str, Any]]:
    if not user_ids:
        return {}
    res = (
        supabase_admin.table("profiles")
        .select("id, username, display_name, avatar_url, level, total_xp")
        .in_("id", user_ids)
        .execute()
    )
    return {row["id"]: row for row in (res.data or [])}


def _to_entry(profile: dict[str, Any], xp: int, rank: int, user_id: str) -> dict[str, Any]:
    return {
        "rank": rank,
        "user_id": user_id,
        "username": profile.get("username") or profile.get("display_name") or "?",
        "display_name": profile.get("display_name"),
        "level": profile.get("level", 1),
        "xp": xp,
    }


async def get_leaderboard(
    current_user_id: str,
    period: LeaderboardPeriod = "all",
    limit: int = 20,
) -> dict[str, Any]:
    if period == "all":
        return await _get_all_time_leaderboard(current_user_id, limit)
    return await _get_period_leaderboard(current_user_id, period, limit)


async def _get_all_time_leaderboard(current_user_id: str, limit: int) -> dict[str, Any]:
    top_res = (
        supabase_admin.table("profiles")
        .select("id, username, display_name, avatar_url, level, total_xp")
        .order("total_xp", desc=True)
        .limit(limit)
        .execute()
    )
    top_rows = top_res.data or []

    top = [_to_entry(p, p.get("total_xp", 0), i + 1, p["id"]) for i, p in enumerate(top_rows)]

    me_entry = next((r for r in top if r["user_id"] == current_user_id), None)
    if me_entry is not None:
        me = {**me_entry, "in_top": True}
    else:
        my_profile_res = (
            supabase_admin.table("profiles")
            .select("id, username, display_name, avatar_url, level, total_xp")
            .eq("id", current_user_id)
            .single()
            .execute()
        )
        my_profile = my_profile_res.data or {}
        my_total = my_profile.get("total_xp", 0)
        higher_count_res = (
            supabase_admin.table("profiles")
            .select("id", count="exact")
            .gt("total_xp", my_total)
            .execute()
        )
        my_rank = (higher_count_res.count or 0) + 1
        me = {**_to_entry(my_profile, my_total, my_rank, current_user_id), "in_top": False}

    return {"period": "all", "top": top, "me": me}


async def _get_period_leaderboard(
    current_user_id: str, period: LeaderboardPeriod, limit: int
) -> dict[str, Any]:
    start = _period_start(period)

    events_res = (
        supabase_admin.table("xp_events")
        .select("user_id, amount")
        .gte("created_at", start)
        .execute()
    )
    sums: dict[str, int] = defaultdict(int)
    for e in events_res.data or []:
        sums[e["user_id"]] += e["amount"]

    ranked = sorted(sums.items(), key=lambda kv: kv[1], reverse=True)
    top_slice = ranked[:limit]

    needed_ids = {uid for uid, _ in top_slice}
    needed_ids.add(current_user_id)
    profiles = _profiles_by_id(list(needed_ids))

    top = [
        _to_entry(profiles.get(uid, {}), xp, i + 1, uid)
        for i, (uid, xp) in enumerate(top_slice)
        if uid in profiles
    ]

    me_entry = next((r for r in top if r["user_id"] == current_user_id), None)
    if me_entry is not None:
        me = {**me_entry, "in_top": True}
    else:
        my_xp = sums.get(current_user_id, 0)
        my_rank = sum(1 for _, xp in ranked if xp > my_xp) + 1
        my_profile = profiles.get(current_user_id, {})
        me = {**_to_entry(my_profile, my_xp, my_rank, current_user_id), "in_top": False}

    return {"period": period, "top": top, "me": me}


# ── Ödül dağıtımı (distribute_leaderboard_rewards.py) ──────────────────────
# Yukarıdaki _get_period_leaderboard, /stats/leaderboard endpoint'i için
# ŞU AN devam eden (açık) dönemi gösterir. Ödül dağıtımı ise bir ÖNCEKİ
# TAMAMLANMIŞ dönemi (geçen hafta / geçen ay) ödüllendirmeli — bu yüzden
# ayrı, kapalı bir [start, end) aralığı hesaplayan fonksiyonlar burada.


def _previous_period_range(period: Literal["weekly", "monthly"]) -> tuple[str, str]:
    """'weekly'/'monthly' için bir ÖNCEKİ TAMAMLANMIŞ dönemin [start, end)
    aralığını (Europe/Istanbul yerel gece yarısı, ISO timestamp) döndürür."""
    today_local = datetime.now(_TZ).date()
    if period == "weekly":
        this_period_start = today_local - timedelta(days=today_local.weekday())  # bu haftanın Pazartesi'si
        prev_start = this_period_start - timedelta(days=7)
        prev_end = this_period_start
    else:  # monthly
        this_period_start = today_local.replace(day=1)
        prev_end = this_period_start
        if this_period_start.month == 1:
            prev_start = this_period_start.replace(year=this_period_start.year - 1, month=12)
        else:
            prev_start = this_period_start.replace(month=this_period_start.month - 1)

    start_iso = datetime.combine(prev_start, time.min, tzinfo=_TZ).isoformat()
    end_iso = datetime.combine(prev_end, time.min, tzinfo=_TZ).isoformat()
    return start_iso, end_iso


def _period_key(period: Literal["weekly", "monthly"], range_start_iso: str) -> str:
    """user_badges.period_key için insan-okunur, dönem-benzersiz bir anahtar
    üretir — örn. '2026-W34' / '2026-08'. Aynı dönem için dağıtım script'i
    kaç kez çalışırsa çalışsın aynı key üretilir (idempotency'nin temeli,
    bkz. badge_service.award_badge)."""
    d = datetime.fromisoformat(range_start_iso).date()
    if period == "weekly":
        iso_year, iso_week, _ = d.isocalendar()
        return f"{iso_year}-W{iso_week:02d}"
    return d.strftime("%Y-%m")


async def get_top_n_for_reward(period: Literal["weekly", "monthly"], limit: int = 10) -> dict[str, Any]:
    """Ödül dağıtımı için: bir ÖNCEKİ tamamlanmış dönemin en yüksek XP'li
    kullanıcılarını döndürür. Canlı /stats/leaderboard endpoint'inin
    kullandığı _get_period_leaderboard ile KARIŞTIRILMAMALI — o şu anki
    (açık) dönemi gösterir, bu ise kapanmış geçmiş dönemi."""
    start, end = _previous_period_range(period)

    events_res = (
        supabase_admin.table("xp_events")
        .select("user_id, amount")
        .gte("created_at", start)
        .lt("created_at", end)
        .execute()
    )
    sums: dict[str, int] = defaultdict(int)
    for e in events_res.data or []:
        sums[e["user_id"]] += e["amount"]

    ranked = sorted(sums.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    profiles = _profiles_by_id([uid for uid, _ in ranked])

    top = [
        _to_entry(profiles.get(uid, {}), xp, i + 1, uid)
        for i, (uid, xp) in enumerate(ranked)
        if uid in profiles and xp > 0
    ]
    return {"period": period, "period_key": _period_key(period, start), "top": top}
