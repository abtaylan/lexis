"""
backend/app/schemas/leagues.py

V2 Yol Haritası §6.3 (Faz 3b) — Lig sistemi şemaları.
"""

from datetime import datetime

from pydantic import BaseModel


class LeagueTierItem(BaseModel):
    slug: str
    tier_index: int
    name_tr: str
    name_en: str


class LeagueMemberItem(BaseModel):
    user_id: str
    username: str | None = None
    avatar_url: str | None = None
    xp: int
    is_me: bool = False
    # Faz 3 devami (10 Eylul 2026 kullanici istegi -- "kazanilan oyun,
    # kazanilan duello gibi sayisal degerler eklenmeli, ayni puanda
    # olanlar bunlara gore siralanacak"): bu hafta xp_events'ten CANLI
    # sayilan iki ek sayac (bkz. leagues.py _weekly_stats_by_user).
    # games_won: bu hafta tamamlanan (source_type 'game_' ile baslayan)
    # oyun/pratik sayisi. duels_won: bu hafta kazanilan duello sayisi
    # (source_type='duel_win', bkz. duels.py advance_round). ESIT XP'de
    # siralama once duels_won sonra games_won'a gore kirilir.
    games_won: int = 0
    duels_won: int = 0


class LeagueStatusResponse(BaseModel):
    """GET /leagues/me cevabı — kullanıcının bu haftaki lig grubu +
    CANLI (xp_events'ten hesaplanan) liderlik tablosu. members xp'ye göre
    ZATEN sıralı döner (azalan)."""

    league_id: str
    tier_slug: str
    tier_index: int
    group_name: str
    week_start: datetime
    week_end: datetime
    members: list[LeagueMemberItem]
