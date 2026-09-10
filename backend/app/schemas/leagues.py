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


class LeagueStatusResponse(BaseModel):
    """GET /leagues/me cevabı — kullanıcının bu haftaki lig grubu +
    CANLI (xp_events'ten hesaplanan) liderlik tablosu. members xp'ye göre
    ZATEN sıralı döner (azalan)."""

    league_id: str
    tier_slug: str
    tier_index: int
    week_start: datetime
    week_end: datetime
    members: list[LeagueMemberItem]
