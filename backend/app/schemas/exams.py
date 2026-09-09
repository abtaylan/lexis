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


# ── Sınav Hazırlık İstatistik & İçerik Motoru — Faz 2: soru havuzu
#    büyütme (kullanıcı katkısı + moderasyon kuyruğu) ──────────────────


class ExamQuestionSuggestionCreate(BaseModel):
    """Kullanıcının kendi önerdiği soru — onay bekleyen (pending) kayıt
    olarak exam_questions'a düşer, admin onaylayana kadar next-question
    havuzunda görünmez."""

    exam_type: ExamType
    question_text: str = Field(min_length=10, max_length=2000)
    options: list[ExamQuestionOption] = Field(min_length=2, max_length=6)
    correct_option: str
    explanation: str | None = Field(default=None, max_length=2000)
    topic_tag: str | None = Field(default=None, max_length=100)


class ExamQuestionSuggestionResponse(BaseModel):
    id: str
    status: str


class PendingExamQuestion(BaseModel):
    """Admin moderasyon kuyruğunda listelenen soru — kaynağı user veya ai,
    durumu pending olan tüm exam_questions kayıtları."""

    id: str
    exam_type: str
    learning_lang: str
    question_text: str
    options: list[ExamQuestionOption]
    correct_option: str
    explanation: str | None = None
    topic_tag: str | None = None
    source_type: str
    submitted_by: str | None = None
    submitted_by_email: str | None = None
    created_at: datetime


class ExamQuestionModerationResponse(BaseModel):
    id: str
    status: str
