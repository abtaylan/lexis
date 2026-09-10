"""
backend/app/schemas/organizations.py

V2 Yol Haritası §6.3 (Faz 3d) — B2B / kurumsal ligler şemaları.
"""

from datetime import datetime

from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)


class OrganizationItem(BaseModel):
    id: str
    name: str
    plan: str
    created_at: datetime
    my_role: str


class OrganizationListResponse(BaseModel):
    items: list[OrganizationItem]


class OrganizationMemberItem(BaseModel):
    user_id: str
    username: str | None = None
    email: str | None = None
    role: str
    joined_at: datetime
    total_xp: int = 0


class OrganizationMembersResponse(BaseModel):
    items: list[OrganizationMemberItem]


class OrganizationInviteRequest(BaseModel):
    email: str
    role: str = Field(default="member")
