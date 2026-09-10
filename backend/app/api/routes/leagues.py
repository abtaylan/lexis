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

FAZ 3F GÜNCELLEMESİ (10 Eylül 2026 kullanıcı isteği — "tüm kişiler
otomatik olarak en düşük lige dahil edilmeli" + "user eksikliği
noktasında bot'lar"): "bul ya da oluştur" mantığı artık BU MODÜLDE
DEĞİL, bir Postgres fonksiyonunda (public.ensure_active_league_membership,
bkz. migration 047). Neden: aynı mantığı HEM burada (lazy — kullanıcı
ekranı açtığında) HEM yeni kullanıcı kaydında (DB trigger,
sinyal kaynağından bağımsız: e-posta/OTP, Apple, ileride Google) tek
kaynaktan çalıştırmak gerekiyordu — iki ayrı Python/SQL kopyası
birbirinden kopabilirdi (bkz. yukarıdaki xp_source_type uyarısı, AYNI
sınıf risk). _ensure_active_membership burada artık sadece o
fonksiyonu RPC ile çağıran ince bir sarmalayıcı. Yeni bir grup İLK kez
açıldığında (hem trigger hem bu RPC üzerinden) o kademedeki bot
havuzundan (profiles.is_bot, migration 046) otomatik dolgu yapılıyor —
artık hiçbir lig grubu boş/tek kişilik başlamıyor.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.leagues import LeagueMemberItem, LeagueStatusResponse
from pydantic import BaseModel

router = APIRouter()


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


def _ensure_active_membership(user_id: str, tier_slug: str) -> dict:
    """Kullanıcının bu haftaki aktif lig üyeliğini döndürür — yoksa,
    public.ensure_active_league_membership (migration 047) çağrılır:
    tier_slug'daki dolu olmayan bir gruba katılır ya da (hiç yoksa/hepsi
    doluysa) bot dolgulu yeni bir grup açar."""
    result = supabase_admin.rpc(
        "ensure_active_league_membership",
        {"p_user_id": user_id, "p_tier_slug": tier_slug},
    ).execute()
    league_id = result.data
    league = (
        supabase_admin.table("leagues")
        .select("*")
        .eq("id", league_id)
        .single()
        .execute()
    )
    if not league.data:
        raise HTTPException(status_code=500, detail="Lig grubu oluşturulamadı.")
    return league.data


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


def _build_league_status(league: dict, tier: dict, current_user_id: str) -> LeagueStatusResponse:
    """/me VE /{league_id} ortak govdesi (Faz 3f, 10 Eylul 2026 --
    "lige tıklayınca o ligin icindeki user'ları sıralamayı puan
    durumunu falan goreyim") -- verilen lig grubunun tam uye/siralama
    tablosunu doner, kullanicinin bu gruba UYE olmasi sart degil."""
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
                is_me=(uid == current_user_id),
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


@router.get("/me", response_model=LeagueStatusResponse)
async def get_my_league(current_user=Depends(get_current_user)):
    """Kullanıcının bu haftaki lig grubunu döndürür — hiç yoksa (ilk kez
    çağrılıyorsa ya da geçen hafta kapanmışsa) otomatik olarak
    profiles.current_league_tier'daki kademede bir gruba yerleştirir.
    Bot katılımcılar (is_bot=true) sıradan katılımcılar gibi döner —
    istemci tarafında ayırt edilmiyor (bilinçli — gerçek bir rakip gibi
    görünmeleri isteniyor)."""
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

    return _build_league_status(league, tier, current_user.id)


# ------------------------------------------------------------
# Faz 3f -- genel lig istatistikleri (bot'lar HARIC -- gercek kullanici
# sayisini/dagilimini yansitsin diye, bkz. migration 046/047).
# ------------------------------------------------------------
class LeagueTierCount(BaseModel):
    tier_slug: str
    count: int


class LeagueStatsResponse(BaseModel):
    total_real_players: int
    tier_distribution: list[LeagueTierCount]


@router.get("/stats", response_model=LeagueStatsResponse)
async def get_league_stats(current_user=Depends(get_current_user)):
    tier_rows = (
        supabase_admin.table("profiles")
        .select("current_league_tier")
        .eq("is_bot", False)
        .execute()
        .data
    ) or []
    counts: dict[str, int] = {}
    for r in tier_rows:
        counts[r["current_league_tier"]] = counts.get(r["current_league_tier"], 0) + 1
    tier_distribution = [LeagueTierCount(tier_slug=k, count=v) for k, v in counts.items()]
    return LeagueStatsResponse(total_real_players=len(tier_rows), tier_distribution=tier_distribution)


# ------------------------------------------------------------
# Faz 3f (kullanici geri bildirimi, 10 Eylul 2026 -- "diger ligler
# gorunmuyor, onlari da gorebilmek lazim") -- SADECE kendi ligini degil,
# o hafta AKTIF olan TUM lig gruplarini (her kademede -- Bronz'dan
# Usta'ya -- kapasite dolunca birden fazla grup acilabilir, bkz.
# ensure_active_league_membership) ozet halinde doner: her grup icin
# uye sayisi + en iyi 3 kisi. Kullanicinin KENDI grubu is_mine=true ile
# isaretlenir. Salt-okunur bir "gozat" ucu -- baska bir gruba KATILMA
# YOK (o zaten otomatik/tek yoldan yonetiliyor, bkz. modul docstring'i).
# ------------------------------------------------------------
class LeagueOverviewGroup(BaseModel):
    league_id: str
    tier_slug: str
    tier_index: int
    tier_name_tr: str
    tier_name_en: str
    member_count: int
    top_members: list[LeagueMemberItem]
    is_mine: bool


class LeagueOverviewResponse(BaseModel):
    groups: list[LeagueOverviewGroup]


@router.get("/overview", response_model=LeagueOverviewResponse)
async def get_league_overview(current_user=Depends(get_current_user)):
    tiers = {
        t["slug"]: t
        for t in (supabase_admin.table("league_tiers").select("*").execute().data or [])
    }

    leagues = (
        supabase_admin.table("leagues").select("*").eq("status", "active").execute().data
    ) or []
    leagues.sort(key=lambda l: (tiers.get(l["tier_slug"], {}).get("tier_index", 0), l["created_at"]))

    my_league_ids = {
        m["league_id"]
        for m in (
            supabase_admin.table("league_memberships")
            .select("league_id")
            .eq("user_id", current_user.id)
            .execute()
            .data
            or []
        )
    }

    groups: list[LeagueOverviewGroup] = []
    for league in leagues:
        member_rows = (
            supabase_admin.table("league_memberships")
            .select("user_id")
            .eq("league_id", league["id"])
            .execute()
            .data
        ) or []
        user_ids = [m["user_id"] for m in member_rows]
        if not user_ids:
            continue

        profile_rows = (
            supabase_admin.table("profiles")
            .select("id, username, avatar_url")
            .in_("id", user_ids)
            .execute()
            .data
        ) or []
        profiles_by_id = {p["id"]: p for p in profile_rows}

        xp_by_user = _weekly_xp_by_user(user_ids, league["week_start"], league["week_end"])
        ranked = sorted(
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

        tier = tiers.get(league["tier_slug"], {})
        groups.append(
            LeagueOverviewGroup(
                league_id=league["id"],
                tier_slug=league["tier_slug"],
                tier_index=tier.get("tier_index", 0),
                tier_name_tr=tier.get("name_tr", league["tier_slug"]),
                tier_name_en=tier.get("name_en", league["tier_slug"]),
                member_count=len(user_ids),
                top_members=ranked[:3],
                is_mine=(league["id"] in my_league_ids),
            )
        )

    return LeagueOverviewResponse(groups=groups)
# ------------------------------------------------------------
# Faz 3f (10 Eylul 2026 kullanici istegi -- "lige tıklayınca o ligin
# icindeki user'ları sıralamayı puan durumunu falan goreyim") --
# overview (GET /leagues/overview) listesinden tıklanan HERHANGİ bir
# aktif lig grubunun tam uye tablosu. leagues/league_memberships'in
# mevcut "select_all" RLS ilkesiyle tutarli -- icerikte hassas bir sey
# yok, kullanicinin o gruba uye olmasi sart degil.
# ------------------------------------------------------------
@router.get("/{league_id}", response_model=LeagueStatusResponse)
async def get_league_detail(league_id: str, current_user=Depends(get_current_user)):
    league = (
        supabase_admin.table("leagues")
        .select("*")
        .eq("id", league_id)
        .single()
        .execute()
    )
    if not league.data:
        raise HTTPException(status_code=404, detail="Lig bulunamadı.")
    tier = _get_tier(league.data["tier_slug"])
    return _build_league_status(league.data, tier, current_user.id)
