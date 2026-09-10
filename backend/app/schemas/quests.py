"""
backend/app/schemas/quests.py

V2 Yol Haritası §6.3 (Faz 3c) — Görev haritası şemaları.
"""

from datetime import datetime

from pydantic import BaseModel


class QuestNodeItem(BaseModel):
    id: str
    slug: str
    title_tr: str
    title_en: str
    description_tr: str | None = None
    description_en: str | None = None
    requirement_type: str
    requirement_count: int
    reward_xp: int = 0
    reward_badge_code: str | None = None
    order_index: int
    current_value: int
    is_completed: bool
    is_unlocked: bool
    completed_at: datetime | None = None


class QuestListResponse(BaseModel):
    items: list[QuestNodeItem]
