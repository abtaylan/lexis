"""
backend/app/schemas/roleplay.py

"Roleplay/diyalog botu" istek/yanit semalari -- 25 Kasim 2026'da dallanan
diyalog agaci modeline gecis: serbest metin yazmak yerine sabit secenek
secimi. bkz. roleplay_service.py modul docstring'i.
"""

from pydantic import BaseModel


class RoleplayScenarioSummary(BaseModel):
    slug: str
    title_tr: str
    title_en: str


class RoleplayCategory(BaseModel):
    slug: str
    title_tr: str
    title_en: str
    icon: str
    scenarios: list[RoleplayScenarioSummary]


class RoleplayOption(BaseModel):
    id: str
    text: str


class RoleplaySessionStart(BaseModel):
    scenario_slug: str


class RoleplaySessionResponse(BaseModel):
    id: str
    scenario_slug: str
    category_slug: str
    learning_lang: str
    status: str
    bot_line: str
    options: list[RoleplayOption]


class RoleplayChoiceCreate(BaseModel):
    option_id: str


class RoleplayChoiceResponse(BaseModel):
    reaction: str
    quality: str
    next_bot_line: str | None
    options: list[RoleplayOption] | None
    status: str
    xp_awarded: int


class RoleplayFinishResponse(BaseModel):
    status: str
    xp_awarded: int
