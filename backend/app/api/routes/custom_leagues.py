"""
backend/app/api/routes/custom_leagues.py

V2 Faz 3 devami (10 Eylul 2026 kullanici istegi): "Ek olarak kendi
arkadaslarimdan olusan ozel lig kurup kendi aramizda yarisabilmeliyim.
Lig sayfasina girince Duello'da oldugu gibi yeni oda ac mantiginda bir
buton olacak, butona tiklayinca, oraya kendi arkadaslarimi ve sistemde
bulunan diger user'lari ekleyebilmeliyim."

KAPSAM: kademe (tier) lig sistemiden (leagues.py) TAMAMEN BAGIMSIZ --
botlarla ya da haftalik donguyle ILGISI YOK. Kullanicinin kendi kurdugu
kucuk, ozel bir "arkadas ligi": bir isim verilir, sonra hem arkadaslar
(social.py::/friends) hem sistemdeki HERHANGI bir kullanici (social.py::
/users/search) davet edilebilir -- duels.py::invite_friend_to_duel'in
aksine burada SADECE arkadaslarla sinirli DEGIL (kullanicinin acik
istegi: "sistemde bulunan diger user'lari da ekleyebilmeliyim").

Oda yasam dongusu deseni duels.py ile BIREBIR ayni (create -> invite ->
accept/decline/cancel -> leave), bkz. o modulun ayni adli fonksiyonlari.
Siralama mantigi leagues.py::_weekly_stats_by_user/_rank_key ile AYNI
sayaclari (xp/games_won/duels_won/flashcards_reviewed) kullanir, TEK
fark: pencere "bu hafta" degil, HER UYENIN KENDI joined_at'inden beri
(haftalik donguye/terfi-dusmeye TABI DEGIL, bkz. modul ustu ozet).
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.custom_leagues import (
    CustomLeagueCreate,
    CustomLeagueDetailResponse,
    CustomLeagueInviteCreate,
    CustomLeagueInviteItem,
    CustomLeagueInvitesListResponse,
    CustomLeagueItem,
    CustomLeagueListResponse,
    CustomLeagueMemberItem,
    CustomLeagueTransferOwnership,
)
from app.services.notify import notify_user

router = APIRouter()

MAX_MEMBERS_CAP = 50


def _get_league_or_404(league_id: str) -> dict:
    row = (
        supabase_admin.table("custom_leagues")
        .select("*")
        .eq("id", league_id)
        .limit(1)
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="Bu ozel lig bulunamadi.")
    return row[0]


def _member_ids(league_id: str) -> list[str]:
    rows = (
        supabase_admin.table("custom_league_members")
        .select("user_id")
        .eq("league_id", league_id)
        .execute()
        .data
    ) or []
    return [r["user_id"] for r in rows]


def _is_member(league_id: str, user_id: str) -> bool:
    row = (
        supabase_admin.table("custom_league_members")
        .select("user_id")
        .eq("league_id", league_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
    )
    return bool(row)


def _member_stats(members: list[dict]) -> dict[str, dict[str, int]]:
    """members: [{"user_id":..., "joined_at": iso str}, ...]. leagues.py
    _weekly_stats_by_user ile AYNI sayac mantigi (xp/games_won/duels_won/
    flashcards_reviewed) -- TEK fark pencere: sabit bir hafta degil, HER
    uyenin KENDI joined_at'inden beri (kisi bazli farkli cutoff oldugu
    icin tek bir batch sorguyla yapilamiyor -- ozel ligler kucuk oldugu
    icin (bkz. MAX_MEMBERS_CAP) uye basina ayri sorgu performans sorunu
    degil)."""
    stats: dict[str, dict[str, int]] = {}
    for m in members:
        rows = (
            supabase_admin.table("xp_events")
            .select("amount, source_type")
            .eq("user_id", m["user_id"])
            .gte("created_at", m["joined_at"])
            .execute()
            .data
        ) or []
        entry = {"xp": 0, "games_won": 0, "duels_won": 0, "flashcards_reviewed": 0}
        for row in rows:
            entry["xp"] += row["amount"]
            source_type = row.get("source_type") or ""
            if source_type.startswith("game_"):
                entry["games_won"] += 1
            elif source_type == "duel_win":
                entry["duels_won"] += 1
            elif source_type == "flashcard_review":
                entry["flashcards_reviewed"] += 1
        stats[m["user_id"]] = entry
    return stats


def _rank_key(stats: dict[str, int]) -> tuple[int, int, int, int]:
    """leagues.py _rank_key ile BIREBIR ayni siralama: xp -> duels_won ->
    games_won -> flashcards_reviewed, hepsi azalan."""
    return (stats["xp"], stats["duels_won"], stats["games_won"], stats["flashcards_reviewed"])


def _to_league_item(league: dict, current_user_id: str) -> CustomLeagueItem:
    return CustomLeagueItem(
        id=league["id"],
        name=league["name"],
        created_by=league["created_by"],
        max_members=league["max_members"],
        member_count=len(_member_ids(league["id"])),
        created_at=league["created_at"],
        is_creator=(league["created_by"] == current_user_id),
    )


def _to_invite_item(row: dict, current_user_id: str, league_name_by_id: dict[str, str] | None = None) -> CustomLeagueInviteItem:
    profiles = (
        supabase_admin.table("profiles")
        .select("id, username, display_name")
        .in_("id", [row["inviter_id"], row["invitee_id"]])
        .execute()
        .data
    ) or []
    by_id = {p["id"]: p for p in profiles}
    inviter = by_id.get(row["inviter_id"], {})
    invitee = by_id.get(row["invitee_id"], {})

    league_name = (league_name_by_id or {}).get(row["league_id"])
    if league_name is None:
        league_row = (
            supabase_admin.table("custom_leagues")
            .select("name")
            .eq("id", row["league_id"])
            .limit(1)
            .execute()
            .data
        )
        league_name = league_row[0]["name"] if league_row else "Ozel Lig"

    return CustomLeagueInviteItem(
        id=row["id"],
        league_id=row["league_id"],
        league_name=league_name,
        inviter_id=row["inviter_id"],
        inviter_username=inviter.get("username"),
        inviter_display_name=inviter.get("display_name"),
        invitee_id=row["invitee_id"],
        invitee_username=invitee.get("username"),
        invitee_display_name=invitee.get("display_name"),
        status=row["status"],
        created_at=row["created_at"],
        is_received=(row["invitee_id"] == current_user_id),
    )


@router.post("", response_model=CustomLeagueItem, status_code=201)
async def create_custom_league(
    league_in: CustomLeagueCreate,
    current_user=Depends(get_current_user),
):
    """Yeni ozel lig odasi ac -- Duello odasi (duels.py::create_duel) ile
    AYNI mantik: olusturan otomatik ilk uye olur."""
    name = league_in.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Lig adi bos olamaz.")
    max_members = max(2, min(league_in.max_members, MAX_MEMBERS_CAP))

    result = (
        supabase_admin.table("custom_leagues")
        .insert({"name": name, "created_by": current_user.id, "max_members": max_members})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Ozel lig olusturulamadi.")
    league = result.data[0]

    supabase_admin.table("custom_league_members").insert(
        {"league_id": league["id"], "user_id": current_user.id}
    ).execute()

    return _to_league_item(league, current_user.id)


@router.get("/mine", response_model=CustomLeagueListResponse)
async def list_my_custom_leagues(current_user=Depends(get_current_user)):
    """Uyesi oldugum TUM ozel ligler (kurdugum + davetle katildigim),
    en yeni once."""
    membership_rows = (
        supabase_admin.table("custom_league_members")
        .select("league_id")
        .eq("user_id", current_user.id)
        .execute()
        .data
    ) or []
    league_ids = [r["league_id"] for r in membership_rows]
    if not league_ids:
        return CustomLeagueListResponse(items=[])

    leagues = (
        supabase_admin.table("custom_leagues")
        .select("*")
        .in_("id", league_ids)
        .order("created_at", desc=True)
        .execute()
        .data
    ) or []
    return CustomLeagueListResponse(items=[_to_league_item(l, current_user.id) for l in leagues])


@router.get("/{league_id}", response_model=CustomLeagueDetailResponse)
async def get_custom_league_detail(league_id: str, current_user=Depends(get_current_user)):
    """Ozel ligin tam uye/siralama tablosu -- SADECE uyeler gorebilir
    (kademe liglerindeki gibi herkese acik DEGIL, bkz. modul docstring'i)."""
    league = _get_league_or_404(league_id)
    if not _is_member(league_id, current_user.id):
        raise HTTPException(status_code=403, detail="Bu ozel ligi sadece uyeleri gorebilir.")

    member_rows = (
        supabase_admin.table("custom_league_members")
        .select("user_id, joined_at")
        .eq("league_id", league_id)
        .execute()
        .data
    ) or []
    if not member_rows:
        return CustomLeagueDetailResponse(
            id=league["id"], name=league["name"], created_by=league["created_by"],
            max_members=league["max_members"], created_at=league["created_at"], members=[],
        )

    user_ids = [m["user_id"] for m in member_rows]
    profile_rows = (
        supabase_admin.table("profiles")
        .select("id, username, display_name, avatar_url")
        .in_("id", user_ids)
        .execute()
        .data
    ) or []
    profiles_by_id = {p["id"]: p for p in profile_rows}
    stats_by_user = _member_stats(member_rows)

    members = sorted(
        (
            CustomLeagueMemberItem(
                user_id=m["user_id"],
                username=profiles_by_id.get(m["user_id"], {}).get("username"),
                display_name=profiles_by_id.get(m["user_id"], {}).get("display_name"),
                avatar_url=profiles_by_id.get(m["user_id"], {}).get("avatar_url"),
                xp=stats_by_user.get(m["user_id"], {}).get("xp", 0),
                games_won=stats_by_user.get(m["user_id"], {}).get("games_won", 0),
                duels_won=stats_by_user.get(m["user_id"], {}).get("duels_won", 0),
                flashcards_reviewed=stats_by_user.get(m["user_id"], {}).get("flashcards_reviewed", 0),
                is_me=(m["user_id"] == current_user.id),
                is_creator=(m["user_id"] == league["created_by"]),
                joined_at=m["joined_at"],
            )
            for m in member_rows
        ),
        key=lambda m: _rank_key({
            "xp": m.xp, "games_won": m.games_won, "duels_won": m.duels_won,
            "flashcards_reviewed": m.flashcards_reviewed,
        }),
        reverse=True,
    )

    return CustomLeagueDetailResponse(
        id=league["id"], name=league["name"], created_by=league["created_by"],
        max_members=league["max_members"], created_at=league["created_at"], members=members,
    )


@router.delete("/{league_id}", status_code=204)
async def delete_custom_league(league_id: str, current_user=Depends(get_current_user)):
    """Ozel ligi tamamen sil -- SADECE kurucu yapabilir. Kurucu ligden
    ayrilmak istiyorsa artik once transfer_custom_league_ownership ile
    kurucugu baska bir uyeye devredip SONRA leave cagirabilir (10 Eylul
    2026'da eklendi -- oncesinde "kurucu ayrilamaz, silmeli" tek secenekti,
    bkz. LEXIS_DEVIR_2026-09-10.md §4)."""
    league = _get_league_or_404(league_id)
    if league["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Bu ozel ligi sadece kurucusu silebilir.")
    supabase_admin.table("custom_leagues").delete().eq("id", league_id).execute()


@router.post("/{league_id}/leave", status_code=204)
async def leave_custom_league(league_id: str, current_user=Depends(get_current_user)):
    league = _get_league_or_404(league_id)
    if league["created_by"] == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Kurucu ozel ligden ayrilamaz -- once kurucugu baska bir uyeye devret "
            "(POST /{league_id}/transfer-ownership) ya da ligi tamamen silmek icin DELETE kullan.",
        )
    if not _is_member(league_id, current_user.id):
        raise HTTPException(status_code=404, detail="Bu ozel ligin uyesi degilsin.")
    supabase_admin.table("custom_league_members").delete().eq("league_id", league_id).eq(
        "user_id", current_user.id
    ).execute()


@router.post("/{league_id}/transfer-ownership", response_model=CustomLeagueItem)
async def transfer_custom_league_ownership(
    league_id: str,
    transfer_in: CustomLeagueTransferOwnership,
    current_user=Depends(get_current_user),
):
    """Ozel ligin kurucusunu (created_by) baska bir uyeye devret -- SADECE
    mevcut kurucu cagirabilir, hedef MUTLAKA ligin mevcut bir uyesi olmali
    (yeni bir kullanici otomatik uye yapilmiyor -- once invite/accept ile
    uye olmasi gerekiyor). Devirden sonra ESKI kurucu sade bir uye olarak
    ligde KALIR -- isterse ayrica leave cagirabilir (artik kurucu
    olmadigi icin bu sefer engellenmez). 10 Eylul 2026'da eklendi (bkz.
    LEXIS_DEVIR_2026-09-10.md §4 -- delete_custom_league/leave_custom_league'
    deki "ownership transfer henuz yok" kisitlamasinin giderilmesi)."""
    league = _get_league_or_404(league_id)
    if league["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Kurucu devrini sadece mevcut kurucu yapabilir.")

    new_owner_id = transfer_in.new_owner_user_id
    if new_owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Zaten bu ligin kurucususun.")
    if not _is_member(league_id, new_owner_id):
        raise HTTPException(status_code=400, detail="Kurucu devri sadece ligin mevcut bir uyesine yapilabilir.")

    updated = (
        supabase_admin.table("custom_leagues")
        .update({"created_by": new_owner_id})
        .eq("id", league_id)
        .execute()
    ).data[0]

    new_owner = (
        supabase_admin.table("profiles")
        .select("username, display_name")
        .eq("id", new_owner_id)
        .limit(1)
        .execute()
        .data
    )
    new_owner_name = (
        (new_owner[0].get("display_name") if new_owner else None)
        or (new_owner[0].get("username") if new_owner else None)
        or "Bir uye"
    )
    notify_user(
        new_owner_id,
        "custom_league_ownership_transfer",
        "Ozel lig kurucusu oldun",
        f"\"{league['name']}\" ozel liginin kurucusu artik sensin.",
    )
    # eski kurucuya da bilgi ver -- devrin gerceklestigini teyit etsin
    notify_user(
        current_user.id,
        "custom_league_ownership_transfer_confirm",
        "Kurucu devri tamamlandi",
        f"\"{league['name']}\" ozel liginin kurucusunu {new_owner_name} kullanicisina devrettin.",
    )

    return _to_league_item(updated, current_user.id)


@router.post("/{league_id}/invite", response_model=CustomLeagueInviteItem, status_code=201)
async def invite_to_custom_league(
    league_id: str,
    invite_in: CustomLeagueInviteCreate,
    current_user=Depends(get_current_user),
):
    """Arkadas VEYA sistemdeki HERHANGI bir kullaniciyi (kullanici adiyla)
    ozel liginize davet et -- duels.py::invite_friend_to_duel'in aksine
    arkadaslikla SINIRLI DEGIL (kullanicinin acik istegi, bkz. modul
    docstring'i). Davet edebilmek icin davet EDENIN zaten bu ligin uyesi
    olmasi yeterli (SADECE kurucu degil -- "kendi aramizda" ruhuna uygun,
    herhangi bir uye arkadaslarini ekleyebilir)."""
    league = _get_league_or_404(league_id)
    if not _is_member(league_id, current_user.id):
        raise HTTPException(status_code=403, detail="Bu ozel lige sadece uyeleri davet gonderebilir.")

    target = (
        supabase_admin.table("profiles")
        .select("id, username, display_name")
        .eq("username", invite_in.username.strip())
        .limit(1)
        .execute()
        .data
    )
    if not target:
        raise HTTPException(status_code=404, detail="Bu kullanici adiyla bir kullanici bulunamadi.")
    other = target[0]
    if other["id"] == current_user.id:
        raise HTTPException(status_code=400, detail="Kendine davet gonderemezsin.")
    if _is_member(league_id, other["id"]):
        raise HTTPException(status_code=400, detail="Bu kullanici zaten ligin uyesi.")

    member_count = len(_member_ids(league_id))
    if member_count >= league["max_members"]:
        raise HTTPException(status_code=400, detail="Ozel lig dolu.")

    existing_pending = (
        supabase_admin.table("custom_league_invites")
        .select("id")
        .eq("league_id", league_id)
        .eq("invitee_id", other["id"])
        .eq("status", "pending")
        .limit(1)
        .execute()
        .data
    )
    if existing_pending:
        raise HTTPException(status_code=409, detail="Bu kullaniciya zaten bekleyen bir davet var.")

    invite_row = (
        supabase_admin.table("custom_league_invites")
        .insert({"league_id": league_id, "inviter_id": current_user.id, "invitee_id": other["id"], "status": "pending"})
        .execute()
    ).data[0]

    inviter = (
        supabase_admin.table("profiles").select("username, display_name").eq("id", current_user.id).limit(1).execute().data
    )
    inviter_name = (inviter[0].get("display_name") if inviter else None) or (inviter[0].get("username") if inviter else None) or "Bir kullanici"
    notify_user(
        other["id"],
        "custom_league_invite",
        "Yeni ozel lig daveti",
        f"{inviter_name} seni \"{league['name']}\" ozel ligine davet etti.",
    )

    return _to_invite_item(invite_row, current_user.id, {league_id: league["name"]})


@router.get("/invites/mine", response_model=CustomLeagueInvitesListResponse)
async def list_my_custom_league_invites(current_user=Depends(get_current_user)):
    """Bekleyen davetler -- hem bana gelenler hem gonderdiklerim, en yeni
    once (duels.py::list_my_duel_invites ile AYNI desen)."""
    rows = (
        supabase_admin.table("custom_league_invites")
        .select("*")
        .eq("status", "pending")
        .or_(f"inviter_id.eq.{current_user.id},invitee_id.eq.{current_user.id}")
        .order("created_at", desc=True)
        .execute()
        .data
    ) or []
    return CustomLeagueInvitesListResponse(items=[_to_invite_item(row, current_user.id) for row in rows])


def _get_invite_or_404(invite_id: str) -> dict:
    row = (
        supabase_admin.table("custom_league_invites")
        .select("*")
        .eq("id", invite_id)
        .limit(1)
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="Ozel lig daveti bulunamadi.")
    return row[0]


@router.post("/invites/{invite_id}/accept", response_model=CustomLeagueItem)
async def accept_custom_league_invite(invite_id: str, current_user=Depends(get_current_user)):
    row = _get_invite_or_404(invite_id)
    if row["invitee_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Bu daveti yalnizca davet edilen yanitlayabilir.")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Bu davet zaten yanitlanmis.")

    league = _get_league_or_404(row["league_id"])
    member_count = len(_member_ids(league["id"]))
    if member_count >= league["max_members"]:
        raise HTTPException(status_code=400, detail="Ozel lig dolu.")

    supabase_admin.table("custom_league_members").insert(
        {"league_id": league["id"], "user_id": current_user.id}
    ).execute()
    supabase_admin.table("custom_league_invites").update(
        {"status": "accepted", "responded_at": datetime.now(UTC).isoformat()}
    ).eq("id", invite_id).execute()

    accepter = (
        supabase_admin.table("profiles").select("username, display_name").eq("id", current_user.id).limit(1).execute().data
    )
    accepter_name = (accepter[0].get("display_name") if accepter else None) or (accepter[0].get("username") if accepter else None) or "Bir kullanici"
    notify_user(
        row["inviter_id"],
        "custom_league_invite_accept",
        "Ozel lig daveti kabul edildi",
        f"{accepter_name} \"{league['name']}\" ozel lig davetini kabul etti.",
    )

    return _to_league_item(league, current_user.id)


@router.post("/invites/{invite_id}/decline", status_code=204)
async def decline_custom_league_invite(invite_id: str, current_user=Depends(get_current_user)):
    row = _get_invite_or_404(invite_id)
    if row["invitee_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Bu daveti yalnizca davet edilen yanitlayabilir.")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Bu davet zaten yanitlanmis.")
    supabase_admin.table("custom_league_invites").update(
        {"status": "declined", "responded_at": datetime.now(UTC).isoformat()}
    ).eq("id", invite_id).execute()


@router.post("/invites/{invite_id}/cancel", status_code=204)
async def cancel_custom_league_invite(invite_id: str, current_user=Depends(get_current_user)):
    row = _get_invite_or_404(invite_id)
    if row["inviter_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Bu daveti yalnizca gonderen iptal edebilir.")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Sadece bekleyen bir davet iptal edilebilir.")
    supabase_admin.table("custom_league_invites").update(
        {"status": "cancelled", "responded_at": datetime.now(UTC).isoformat()}
    ).eq("id", invite_id).execute()
