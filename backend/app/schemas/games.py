from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GameWordItem(BaseModel):
    id: str
    word: str
    meaning: str
    example: Optional[str] = None


class GameStartRequest(BaseModel):
    mode: str = "multiple_choice"       # wordle | multiple_choice | typing | matching | listening | sprint
    pool_source: str = "own"            # own | general
    direction: str = "word_to_meaning"
    word_count: int = 10


class GameSessionResponse(BaseModel):
    id: str
    mode: str
    pool_source: str
    direction: str
    learning_lang: str
    score: int
    xp_earned: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    words: List[GameWordItem] = []


class GameAttemptCreate(BaseModel):
    word_id: Optional[str] = None
    general_word_id: Optional[str] = None
    is_correct: bool
    attempts_count: int = 1
    time_taken_ms: Optional[int] = None


class GameAttemptResponse(BaseModel):
    id: str
    is_correct: bool
    xp_awarded: int
    total_score: int
    total_xp: int


class GameFinishResponse(BaseModel):
    id: str
    score: int
    xp_earned: int
    ended_at: datetime


class GameHistoryItem(BaseModel):
    id: str
    mode: str
    pool_source: str
    score: int
    xp_earned: int
    started_at: datetime
    ended_at: Optional[datetime] = None


class GameModesResponse(BaseModel):
    modes: List[str]
    pool_sources: List[str]
