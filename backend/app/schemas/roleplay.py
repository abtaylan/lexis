"""
backend/app/schemas/roleplay.py

"Roleplay/diyalog botu" istek/yanit semalari -- bkz.
roleplay_service.py modul docstring'i.
"""

from pydantic import BaseModel, Field


class RoleplayScenario(BaseModel):
    slug: str
    title_tr: str
    title_en: str


class RoleplayMessage(BaseModel):
    role: str
    content: str


class RoleplaySessionStart(BaseModel):
    scenario_slug: str


class RoleplaySessionResponse(BaseModel):
    id: str
    scenario_slug: str
    learning_lang: str
    status: str
    turn_count: int
    messages: list[RoleplayMessage]


class RoleplayMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=500)


class RoleplayMessageResponse(BaseModel):
    reply: str
    turn_count: int
    max_turns: int


class RoleplayFinishResponse(BaseModel):
    status: str
    turn_count: int
    xp_awarded: int
