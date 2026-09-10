"""
backend/app/schemas/custom_leagues.py

V2 Faz 3 devami (10 Eylul 2026 kullanici istegi): "Ek olarak kendi
arkadaslarimdan olusan ozel lig kurup kendi aramizda yarisabilmeliyim.
Lig sayfasina girince Duello'da oldugu gibi yeni oda ac mantiginda bir
buton olacak, butona tiklayinca, oraya kendi arkadaslarimi ve sistemde
bulunan diger user'lari ekleyebilmeliyim." -- kademe (tier) liglerinden
BAGIMSIZ, kullanicinin kendi kurdugu ozel/kucuk bir lig. Haftalik
donguye TABI DEGIL (bkz. custom_leagues.py modul docstring'i) -- her
uye kendi KATILDIGI andan itibaren kazandigi XP'ye gore siralanir,
duels.py'deki oda (create/invite/accept/decline/leave) desenini
BIREBIR takip eder.
"""

from datetime import datetime

from pydantic import BaseModel


class CustomLeagueCreate(BaseModel):
    name: str
    max_members: int = 20


class CustomLeagueMemberItem(BaseModel):
    user_id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    xp: int
    # leagues.py _weekly_stats_by_user ile AYNI ucu sayac -- tek fark
    # "bu hafta" degil "katildigin andan beri" pencereli (bkz.
    # custom_leagues.py::_member_stats).
    games_won: int = 0
    duels_won: int = 0
    flashcards_reviewed: int = 0
    is_me: bool = False
    is_creator: bool = False
    joined_at: datetime


class CustomLeagueItem(BaseModel):
    id: str
    name: str
    created_by: str
    max_members: int
    member_count: int
    created_at: datetime
    is_creator: bool = False


class CustomLeagueListResponse(BaseModel):
    items: list[CustomLeagueItem]


class CustomLeagueDetailResponse(BaseModel):
    id: str
    name: str
    created_by: str
    max_members: int
    created_at: datetime
    members: list[CustomLeagueMemberItem]


class CustomLeagueInviteCreate(BaseModel):
    username: str


class CustomLeagueTransferOwnership(BaseModel):
    new_owner_user_id: str


class CustomLeagueInviteItem(BaseModel):
    id: str
    league_id: str
    league_name: str
    inviter_id: str
    inviter_username: str | None = None
    inviter_display_name: str | None = None
    invitee_id: str
    invitee_username: str | None = None
    invitee_display_name: str | None = None
    status: str
    created_at: datetime
    # True ise bu davet SU ANKI kullaniciya GELEN bir davet (invitee) --
    # frontend "kabul et/reddet" mi yoksa "beklemede" mi gosterecegini
    # bu alana bakarak karar verir (duels.py::_to_invite_item ile AYNI
    # desen).
    is_received: bool


class CustomLeagueInvitesListResponse(BaseModel):
    items: list[CustomLeagueInviteItem]
