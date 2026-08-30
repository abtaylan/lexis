from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class GameMode(str, Enum):
    wordle = "wordle"
    multiple_choice = "multiple_choice"
    typing = "typing"
    matching = "matching"
    listening = "listening"
    sprint = "sprint"


class PoolSource(str, Enum):
    own = "own"        # kullanıcının kendi words tablosu (öğrendiği kelimeler)
    general = "general"  # general_word_pool (genel havuz)


class Direction(str, Enum):
    """multiple_choice modunda soru yönü. wordle modunda kullanılmaz (her zaman
    anlam gösterilip kelime bulunur)."""
    word_to_meaning = "word_to_meaning"  # kelime göster, anlamı bul (varsayılan)
    meaning_to_word = "meaning_to_word"  # anlamı göster, kelimeyi bul
    definition_to_word = "definition_to_word"  # İngilizce tanım göster, İngilizce kelimeyi bul
    # (Faz 2 — monolingual, en zor yön; sadece pool_source="general" ve
    # general_word_pool.definition dolu olan kelimelerle çalışır, çünkü
    # kullanıcının kendi "words" tablosunda İngilizce tanım tutulmaz.)


class GameSessionCreate(BaseModel):
    mode: GameMode
    pool_source: PoolSource = PoolSource.general
    direction: Direction = Direction.word_to_meaning


class GameSessionResponse(BaseModel):
    id: str
    mode: str
    pool_source: str
    direction: str
    score: int
    xp_earned: int
    started_at: datetime
    ended_at: datetime | None = None


class GameWordOption(BaseModel):
    id: str
    text: str


class NextWordResponse(BaseModel):
    finished: bool = False
    # pool_source='own' ise word_id, 'general' ise general_word_id dolu olur
    word_id: str | None = None
    general_word_id: str | None = None
    word: str | None = None
    meaning: str | None = None
    example: str | None = None
    options: list[GameWordOption] | None = None  # multiple_choice modunda dolu
    direction: str | None = None  # multiple_choice modunda dolu
    # ── wordle (adam asmaca) moduna özel alanlar ──
    word_length: int | None = None
    revealed: str | None = None  # örn. "_ e _ _ e" (harf aralarında boşluk)
    max_wrong_guesses: int | None = None


class AttemptCreate(BaseModel):
    word_id: str | None = None
    general_word_id: str | None = None
    is_correct: bool
    attempts_count: int = Field(default=1, ge=1)
    time_taken_ms: int | None = None


class AttemptResponse(BaseModel):
    id: str
    is_correct: bool
    xp_awarded: int
    session_score: int
    leveled_up: bool
    new_level: int | None = None


class FinishSessionResponse(BaseModel):
    id: str
    mode: str
    pool_source: str
    score: int
    xp_earned: int
    started_at: datetime
    ended_at: datetime
    word_count: int
    correct_count: int


# ── Adam asmaca (wordle) moduna özel ────────────────────────────
class GuessLetterRequest(BaseModel):
    letter: str = Field(min_length=1, max_length=1)


class GuessLetterResponse(BaseModel):
    letter: str
    correct: bool
    revealed: str  # örn. "_ e _ _ e"
    guessed_letters: list[str]
    wrong_guesses: int
    max_wrong_guesses: int
    is_complete: bool  # kelime tamamen bulundu
    is_game_over: bool  # yanlış hakkı bitti, kelime bulunamadı
    word: str | None = None  # sadece tur bittiğinde (is_complete/is_game_over) dolu
    xp_awarded: int = 0
    leveled_up: bool = False
    new_level: int | None = None
