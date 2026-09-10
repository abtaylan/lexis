from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.social import UserCard


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


class DuelRoundPublic(BaseModel):
    """Round-servis uçlarının (Faz 3e) döndürdüğü İÇERİK — SADECE
    seçenekler, doğru cevap (correct_option) BİLİNÇLİ OLARAK burada YOK
    (bkz. duels.py round-servis uçları docstring'i / migration 037'nin
    RLS güvenlik notu ile aynı ilke: doğru cevap istemciye asla
    round bitmeden gönderilmez).

    Faz 3e ürün kararı (10 Eylül 2026): oda içindeki katılımcıların ana
    dili (native_lang) farklı olabileceği için sorular SADECE hedef
    dilde (games.py'deki "definition_to_word" yönüyle aynı desen: tanım
    gösterilir, doğru kelime 4 seçenekten bulunur) — ana dile hiç
    referans verilmiyor, matchmaking learning_lang'e göre kalıyor."""

    round_index: int
    definition: str
    options: list[str]
    started_at: datetime | None = None
    ends_at: datetime | None = None


class DuelAnswerRequest(BaseModel):
    selected_option: str


class DuelAnswerResponse(BaseModel):
    is_correct: bool
    correct_option: str
    score: int
# ============================================================
# Faz 3f (10 Eylul 2026 kullanici istegi -- "arkadasa davet gonderme ekle")
# -- ozel (is_private) bir duello odasina arkadas daveti. challenges
# (016) ile AYNI ilke (sadece arkadaslar, notify_user bildirimi) ama
# challenges'in ASENKRON skor-karsilastirma modelini DEGIL, dogrudan
# mevcut CANLI duels/duel_participants akisini kullanir -- bkz.
# 050_duel_invites.sql migration yorumu.
# ============================================================
class DuelInviteCreate(BaseModel):
    """POST /duels/invite govdesi -- hedef kullanici adi + (opsiyonel)
    oda ayarlari. max_players varsayilan 2 (1'e 1 davet) ama daha
    kalabalik bir ozel oda icin yukseltilebilir (orn. birden fazla
    arkadasi ayni davetle degil, ayri davetlerle ayni duel_id'ye davet
    etmek -- accept sirasinda oda dolu degilse eklenir)."""

    username: str
    max_players: int = Field(default=2, ge=2, le=8)
    round_count: int = Field(default=10, ge=1, le=50)


class DuelInviteItem(BaseModel):
    id: str
    duel_id: str
    status: str
    is_inviter: bool
    other_user: UserCard | None = None
    created_at: datetime
    responded_at: datetime | None = None


class DuelInvitesListResponse(BaseModel):
    items: list[DuelInviteItem]
