from datetime import datetime

from pydantic import BaseModel, Field


class DuelCreate(BaseModel):
    """POST /duels gövdesi. learning_lang verilmezse kullanıcının profilindeki
    aktif öğrenme dili kullanılır (games.py::_get_profile_langs deseniyle
    tutarlı)."""

    learning_lang: str | None = None
    max_players: int = Field(default=8, ge=2, le=20)
    round_count: int = Field(default=10, ge=1, le=50)


class DuelParticipantItem(BaseModel):
    user_id: str
    username: str | None = None
    avatar_url: str | None = None
    score: int
    joined_at: datetime
    left_at: datetime | None = None


class DuelResponse(BaseModel):
    id: str
    mode: str
    status: str
    learning_lang: str
    created_by: str
    max_players: int
    round_count: int
    created_at: datetime
    started_at: datetime | None = None
    ended_at: datetime | None = None
    participant_count: int = 0


class DuelListResponse(BaseModel):
    items: list[DuelResponse]


class DuelStatusResponse(DuelResponse):
    """GET /duels/{id} cevabı — oda bilgisi + katılımcı listesi (canlı
    skor tablosu). Round içeriği (soru/doğru cevap) BİLİNÇLİ OLARAK bu
    yanıtta YOK — duel_rounds tablosunun RLS'i zaten client'a kapalı
    (bkz. migration 037), round-servis uçları ayrı bir alt-fazda (3e)
    eklenecek."""

    participants: list[DuelParticipantItem]
