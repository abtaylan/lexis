from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class WordStatus(str, Enum):
    learning = "learning"
    learned = "learned"
    archived = "archived"


class ListType(str, Enum):
    active = "active"
    passive = "passive"


class WordCreate(BaseModel):
    word: str = Field(..., min_length=1, max_length=200)
    meaning: str = Field(..., min_length=1)
    meaning_native: str | None = None
    meaning_target: str | None = None
    example: str | None = None
    word_type: str | None = None
    word_type_native: str | None = None
    list_type: ListType = ListType.active


class WordUpdate(BaseModel):
    meaning: str | None = None
    meaning_native: str | None = None
    meaning_target: str | None = None
    example: str | None = None
    word_type: str | None = None
    word_type_native: str | None = None
    list_type: ListType | None = None
    status: WordStatus | None = None


class WordResponse(BaseModel):
    id: str
    word: str
    meaning: str
    meaning_native: str | None = None
    meaning_target: str | None = None
    example: str | None = None
    word_type: str | None = None
    word_type_native: str | None = None
    list_type: str
    status: str
    repetition_count: int = 0
    last_reviewed_at: datetime | None = None
    next_review_at: datetime | None = None
    created_at: datetime


class WordListResponse(BaseModel):
    items: list[WordResponse]
    total: int
    page: int
    page_size: int


class ReviewResult(BaseModel):
    word_id: str
    success: bool   # True = bildi, False = bilmedi


class WeakWordTypeItem(BaseModel):
    word_type: str
    word_count: int
    avg_ease_factor: float


class WeakWordTypesResult(BaseModel):
    """GET /words/stats/weak-word-types cevabı — V2 madde #6, Faz 2.

    exams.py::WeakTopicsResult'ın kelime tarafı analogu, ama farklı bir
    veri kaynağından hesaplanır: quiz_results/study_sessions tabloları
    şemada var ama hiç kullanılmıyor (backend'de INSERT edilmediği için
    her zaman boş) — bu yüzden geçmiş "deneme" kaydı yerine kelimenin
    GÜNCEL SM-2 ease_factor değeri (review_word / calculate_next_review)
    üzerinden, ortalaması varsayılan 2.5'in altında kalan word_type'lar
    "zayıf" sayılır."""

    period_days: int
    items: list[WeakWordTypeItem]
