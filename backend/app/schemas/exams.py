"""
backend/app/schemas/exams.py

Sınav Hazırlık Alanı (V2 §1.1) pydantic şemaları. games.py/schemas/games.py
ile aynı desen: Enum tipleri + Create/Response modelleri.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ExamType(str, Enum):
    yds = "yds"
    yokdil = "yokdil"
    ielts = "ielts"
    toefl = "toefl"


class ExamSessionMode(str, Enum):
    practice = "practice"
    timed_mock = "timed_mock"


class ExamTypeInfo(BaseModel):
    exam_type: ExamType
    question_count: int
    available: bool  # question_count > 0 (soru bankası henüz boşsa istemci "Yakında" gösterir)


class ExamSessionCreate(BaseModel):
    exam_type: ExamType
    session_mode: ExamSessionMode = ExamSessionMode.practice
    total_questions: int | None = Field(default=None, ge=1, le=50)  # sadece practice modunda kullanılır


class ExamSessionResponse(BaseModel):
    id: str
    exam_type: str
    session_mode: str
    total_questions: int
    time_limit_seconds: int | None = None
    score: int
    xp_earned: int
    started_at: datetime
    ended_at: datetime | None = None


class ExamQuestionOption(BaseModel):
    id: str
    text: str


class NextQuestionResponse(BaseModel):
    finished: bool = False
    question_id: str | None = None
    question_text: str | None = None
    options: list[ExamQuestionOption] | None = None
    question_index: int | None = None  # 1-tabanlı, kaçıncı soru
    total_questions: int | None = None


class ExamAttemptCreate(BaseModel):
    question_id: str
    selected_option: str
    time_taken_ms: int | None = None


class ExamRelatedWord(BaseModel):
    word: str
    meaning: str
    example: str | None = None


class ExamAttemptResponse(BaseModel):
    id: str
    is_correct: bool
    correct_option: str
    explanation: str
    related_words: list[ExamRelatedWord] | None = None
    xp_awarded: int
    session_score: int
    leveled_up: bool
    new_level: int | None = None


class ExamFinishResponse(BaseModel):
    id: str
    exam_type: str
    session_mode: str
    score: int
    total_questions: int
    xp_earned: int
    started_at: datetime
    ended_at: datetime
    mock_bonus_xp: int = 0


class AddWordFromQuestionResponse(BaseModel):
    added_count: int
    already_had_count: int
