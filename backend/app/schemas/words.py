from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


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
    meaning_native: Optional[str] = None
    meaning_target: Optional[str] = None
    example: Optional[str] = None
    word_type: Optional[str] = None
    word_type_native: Optional[str] = None
    list_type: ListType = ListType.active


class WordUpdate(BaseModel):
    meaning: Optional[str] = None
    meaning_native: Optional[str] = None
    meaning_target: Optional[str] = None
    example: Optional[str] = None
    word_type: Optional[str] = None
    word_type_native: Optional[str] = None
    list_type: Optional[ListType] = None
    status: Optional[WordStatus] = None


class WordResponse(BaseModel):
    id: str
    word: str
    meaning: str
    meaning_native: Optional[str]
    meaning_target: Optional[str]
    example: Optional[str]
    word_type: Optional[str]
    word_type_native: Optional[str]
    list_type: str
    status: str
    repetition_count: int
    last_reviewed_at: Optional[datetime]
    next_review_at: Optional[datetime]
    created_at: datetime


class WordListResponse(BaseModel):
    items: List[WordResponse]
    total: int
    page: int
    page_size: int


class ReviewResult(BaseModel):
    word_id: str
    success: bool   # True = bildi, False = bilmedi
