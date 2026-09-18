from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.social import UserCard


class DuelCreate(BaseModel):
    """POST /duels gövdesi. learning_lang verilmezse kullanıcının profilindeki
    aktif öğrenme dili kullanılır (games.py::_get_profile_langs deseniyle
    tutarlı).

    mode (18 Eylül 2026 -- kullanıcı isteği "adam asmacada düello olmalı"):
    'multiple_choice' (varsayılan, mevcut tanım->kelime düellosu) veya
    'wordle' (adam asmaca düellosu -- aynı kelimede yarışarak harf tahmini,
    bkz. duels.py round-servis uçlarındaki mode dallanması). games.py'deki
    GameMode enum'uyla AYNI sözleşim ama burada string olarak tutuluyor ki
    DuelCreate, games.py şemalarına bağımlı olmasın (mevcut kod tabanı
    deseniyle tutarlı, DB tarafında zaten aynı public.game_mode enum'u)."""

    learning_lang: str | None = None
    mode: str = Field(default="multiple_choice", pattern="^(multiple_choice|wordle)$")
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
    mode: str = "multiple_choice"
    # multiple_choice alanları:
    definition: str | None = None
    options: list[str] | None = None
    # wordle alanları (18 Eylül 2026) -- bu kullanıcının BU turdaki kendi
    # ilerlemesi (duel_answers.guessed_letters/wrong_guesses'ten). revealed,
    # games.py::_reveal_pattern ile AYNI formatta ("a p p _ _").
    revealed: str | None = None
    guessed_letters: list[str] | None = None
    wrong_guesses: int | None = None
    max_wrong_guesses: int | None = None
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
    mode: str = Field(default="multiple_choice", pattern="^(multiple_choice|wordle)$")
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



# ============================================================
# Faz 3h (18 Eylul 2026 kullanici istegi -- "adam asmacada duello")
# -- mode='wordle' duellolarina ozel round-servis uclari.
# ============================================================
class DuelGuessLetterRequest(BaseModel):
    letter: str = Field(min_length=1, max_length=1)


class DuelGuessLetterResponse(BaseModel):
    """POST /{duel_id}/rounds/guess-letter cevabi -- games.py::
    GuessLetterResponse ile AYNI alan adlari (istemci tarafinda tek-oyunculu
    adam asmaca ekraniyla ayni bilesenler yeniden kullanilabilsin diye),
    farki: is_round_over (bu KULLANICI icin bu tur bitti mi -- diger
    katilimcilar hala oynuyor olabilir) ve first_to_finish (yaris bonusu
    kazandi mi) alanlari."""

    letter: str
    correct: bool
    revealed: str
    guessed_letters: list[str]
    wrong_guesses: int
    max_wrong_guesses: int
    is_complete: bool
    is_round_over: bool
    word: str | None = None
    score: int
    first_to_finish: bool = False
