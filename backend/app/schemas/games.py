from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class GameMode(str, Enum):
    wordle = "wordle"
    multiple_choice = "multiple_choice"
    typing = "typing"
    matching = "matching"
    listening = "listening"
    sprint = "sprint"


class PoolSource(str, Enum):
    own = "own"          # kullanıcının kendi words tablosu (öğrendiği kelimeler)
    general = "general"  # general_word_pool (genel havuz)


class GameSessionCreate(BaseModel):
    mode: GameMode
    pool_source: PoolSource = PoolSource.general


class GameSessionResponse(BaseModel):
    id: str
    mode: str
    pool_source: str
    score: int
    xp_earned: int
    started_at: datetime
    ended_at: Optional[datetime] = None


class GameWordOption(BaseModel):
    id: str
    text: str


class NextWordResponse(BaseModel):
    finished: bool = False
    # pool_source='own' ise word_id, 'general' ise general_word_id dolu olur
    word_id: Optional[str] = None
    general_word_id: Optional[str] = None
    word: Optional[str] = None
    meaning: Optional[str] = None
    example: Optional[str] = None
    options: Optional[List[GameWordOption]] = None  # multiple_choice modunda dolu


class AttemptCreate(BaseModel):
    word_id: Optional[str] = None
    general_word_id: Optional[str] = None
    is_correct: bool
    attempts_count: int = Field(default=1, ge=1)
    time_taken_ms: Optional[int] = None


class AttemptResponse(BaseModel):
    id: str
    is_correct: bool
    xp_awarded: int
    session_score: int
    leveled_up: bool
    new_level: Optional[int] = None


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
