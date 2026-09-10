"""
backend/app/schemas/quests.py

V2 Yol Haritası §6.3 (Faz 3c) — Görev haritası şemaları.

Görev haritası v2 (10 Eylül 2026, "içeriği tamamen değişecek" isteği,
bkz. migration 049/059): görevler artık düz bir liste değil, dünya
(world) -> bölüm (part) -> görev (node) hiyerarşisinde ve her görevin
bir content_type'ı var (aggregate/game/flashcard/grammar_topic/quiz/
question_practice/duel) -- frontend bu tipe göre "dokununca nereye git"
kararını verir (bkz. routes/quests.py modül docstring'i). Geriye dönük
uyumluluk BİLİNÇLİ: QuestNodeItem'a alan EKLENDİ, hiçbir alan
kaldırılmadı/yeniden adlandırılmadı -- eski istemciler (varsa) hâlâ
çalışır, yeni istemciler world/part alanlarına göre gruplayıp harita
UI'ı çizer.
"""

from datetime import datetime
from typing import Any

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
    # ── v2 alanları (10 Eylül 2026 devamı) ──
    world_slug: str | None = None
    world_title_tr: str | None = None
    world_title_en: str | None = None
    part_index: int | None = None
    part_title_tr: str | None = None
    part_title_en: str | None = None
    content_type: str = "aggregate"
    content_ref: dict[str, Any] | None = None
    difficulty_index: int = 1


class QuestListResponse(BaseModel):
    items: list[QuestNodeItem]


class QuestWorldSummary(BaseModel):
    slug: str
    title_tr: str
    title_en: str
    order_index: int
    node_count: int
    completed_count: int
    is_unlocked: bool
