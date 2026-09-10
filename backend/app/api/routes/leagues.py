"""
backend/app/api/routes/leagues.py

V2 Yol Haritası §6.3 (Faz 3b) — Lig sistemi (haftalık kademe ligleri).

Duolingo tarzı model: her kullanıcı bir kademede (league_tiers: bronze..
master), o kademedeki ~30 kişilik bir "leagues" grubunda (o haftaya özel,
tier_slug + week_start ile eşsiz olması hedeflenir — grup dolarsa YENİ bir
grup açılır, bkz. _ensure_active_membership), o hafta KAZANDIĞI XP'ye göre
sıralanır. Sıralama league_memberships'te AYRI bir sayaçla TUTULMUYOR —
doğrudan xp_events'ten CANLI hesaplanıyor (bkz. _weekly_xp_by_user) —
xp_source_type enum'undaki Python/DB senkron hatasının (bu oturumda 2 kez
düzeltildi) aynı sınıfına düşmemek için bilinçli bir tercih: iki ayrı
"XP kaynağı" birbirinden kopabilecek bir yapı KURULMADI.

KAPSAM (bilinçli sınır): bu modül SADECE "şu anki ligim + canlı liderlik
tablosu" ucunu içerir (kullanıcı bir ligde YOKSA otomatik yerleştirilir).
Haftalık KAPANIŞ (final_xp/final_rank dondurma + terfi/düşme +
current_league_tier güncelleme + gelecek haftanın gruplarını açma)
BİLİNÇLİ OLARAK burada YOK — expire_premium.py / distribute_leaderboard_
rewards.py ile AYNI desen: gerçek dış ağ gerekmediği için (sadece
Supabase yazıyor) bir Claude scheduled task + Supabase MCP SQL ile
çalıştırılıyor (bkz. supabase/migrations/041 yorumu ve bu özelliğin
devir notundaki "Lig rollover" script'i).
"""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.leagues import LeagueMemberItem, LeagueStatusResponse

router = APIRouter()

DEFAULT_MAX_MEMBERS = 30


def _current_week_bounds() -> tuple[datetime, datetime]:
    """distribute_leaderboard_rewards.py'nin SQL karşılığındaki
    (`date_trunc('week', now() + interval '3 hours')`) ile AYNI sınır:
    Türkiye yerel saatine (+3, DST yok) göre Pazartesi 00:00 - Pazartesi 00:00."""
    now_local = datetime.now(UTC) + timedelta(hours=3)
    week_start_local = (now_local - timedelta(days=now_local.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_start = week_start_local - timedelta(hours=3)
    week_end = week_start + timedelta(days=7)
    return week_start, week_end


def _get_tier(tier_slug: str) -> dict:
    row = (
        supabase_admin.table("league_tiers")
        .select("*")
        .eq("slug", tier_slug)
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=500, detail="Geçersiz lig kademesi.")
    return row.data


def _find_active_league_for_user(user_id: str) -> dict | None:
    membership_rows = (
        supabase_admin.table("league_memberships")
        .select("league_id")
        .eq("user_id", user_id)
        .execute()
        .data
    ) or []
    league_ids = [m["league_id"] for m in membership_rows]
    if not league_ids:
        return None
    league_rows = (
        supabase_admin.table("leagues")
        .select("*")
        .in_("id", league_ids)
        .eq("status", "active")
        .execute()
        .data
    ) or []
    # Değişmez kural: bir kullanıcının aynı anda EN FAZLA bir aktif lig
    # üyeliği olur (yeni hafta grupları sadece _ensure_active_membership
    # üzerinden, kullanıcının aktif üyeliği yoksa açılır/katılır).
    return league_rows[0] if league_rows else None


def _ensure_active_membership(user_id: str, tier_slug: str) -> dict:
    """Kullanıcının bu haftaki aktif lig üyeliğini döndürür — yoksa,
    tier_slug'daki dolu olmayan bir gruba katılır ya da (hiç yoksa/hepsi
    doluysa) yeni bir grup açar."""
    existing = _find_active_league_for_user(user_id)
    if existing:
        return existing

    week_start, week_end = _current_week_bounds()

    candidate_leagues = (
        supabase_admin.table("leagues")
        .select("*")
        .eq("tier_slug", tier_slug)
        .eq("status", "active")
        .eq("week_start", week_start.isoformat())
        .order("created_at")
        .execute()
        .data
    ) or []

    for league in candidate_leagues:
        member_count = (
            supabase_admin.table("league_memberships")
            .select("user_id", count="exact")
            .eq("league_id", league["id"])
            .execute()
            .count
            or 0
        )
        if member_count < league["max_members"]:
            supabase_admin.table("league_memberships").insert(
                {"league_id": league["id"], "user_id": user_id}
            ).execute()
            return league

    # Uygun (dolu olmayan) grup yok — yeni bir grup aç.
    result = (
        supabase_admin.table("leagues")
        .insert(
            {
                "tier_slug": tier_slug,
                "week_start": week_start.isoformat(),
                "week_end": week_end.isoformat(),
                "max_members": DEFAULT_MAX_MEMBERS,
            }
        )
        .execute()
    )
    league = result.data[0]
    supabase_admin.table("league_memberships").insert(
        {"league_id": league["id"], "user_id": user_id}
    ).execute()
    return league


def _weekly_xp_by_user(user_ids: list[str], week_start: str, week_end: str) -> dict[str, int]:
    """Verilen kullanıcılar için bu haftaki toplam XP'yi xp_events'ten
    CANLI toplar (bkz. modül docstring'i — ayrı bir sayaç tutulmuyor)."""
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


@router.get("/me", response_model=LeagueStatusResponse)
async def get_my_league(current_user=Depends(get_current_user)):
    """Kullanıcının bu haftaki lig grubunu döndürür — hiç yoksa (ilk kez
    çağrılıyorsa ya da geçen hafta kapanmışsa) otomatik olarak
    profiles.current_league_tier'daki kademede bir gruba yerleştirir."""
    profile = (
        supabase_admin.table("profiles")
        .select("current_league_tier")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    tier_slug = (profile.data or {}).get("current_league_tier", "bronze")
    tier = _get_tier(tier_slug)

    league = _ensure_active_membership(current_user.id, tier_slug)

    member_rows = (
        supabase_admin.table("league_memberships")
        .select("user_id")
        .eq("league_id", league["id"])
        .execute()
        .data
    ) or []
    user_ids = [m["user_id"] for m in member_rows]

    profiles_by_id: dict[str, dict] = {}
    if user_ids:
        profile_rows = (
            supabase_admin.table("profiles")
            .select("id, username, avatar_url")
            .in_("id", user_ids)
            .execute()
            .data
        ) or []
        profiles_by_id = {p["id"]: p for p in profile_rows}

    xp_by_user = _weekly_xp_by_user(user_ids, league["week_start"], league["week_end"])

    members = sorted(
        (
            LeagueMemberItem(
                user_id=uid,
                username=profiles_by_id.get(uid, {}).get("username"),
                avatar_url=profiles_by_id.get(uid, {}).get("avatar_url"),
                xp=xp_by_user.get(uid, 0),
                is_me=(uid == current_user.id),
            )
            for uid in user_ids
        ),
        key=lambda m: m.xp,
        reverse=True,
    )

    return LeagueStatusResponse(
        league_id=league["id"],
        tier_slug=tier["slug"],
        tier_index=tier["tier_index"],
        week_start=league["week_start"],
        week_end=league["week_end"],
        members=members,
    )
