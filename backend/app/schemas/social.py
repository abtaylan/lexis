"""
backend/app/schemas/social.py

Madde 6, Faz 1 — Arkadaşlık + Takip + Profil görüntüleme.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ── Ortak: hafif kullanıcı kartı (arama sonucu, arkadaş listesi, takipçi/
#    takip edilen listesi vb. hep bu şekli kullanır) ──────────────────
class UserCard(BaseModel):
    id: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    level: int = 1
    # Bu kartı gören kullanıcı ile aradaki ilişki — frontend'in doğru
    # butonu (İstek gönder / Bekliyor / Arkadaş / Takip et / Takipten çık)
    # göstermesi için. relationship_status sadece arama sonuçlarında dolu.
    relationship_status: Optional[str] = None  # 'none' | 'pending_sent' | 'pending_received' | 'friends'
    is_following: Optional[bool] = None


class UserSearchResponse(BaseModel):
    items: List[UserCard]


# ── Arkadaşlık ───────────────────────────────────────────────────────
class FriendRequestCreate(BaseModel):
    username: str = Field(min_length=1, max_length=50)


class FriendshipItem(BaseModel):
    id: str
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None
    user: UserCard  # karşı taraf


class FriendsListResponse(BaseModel):
    items: List[FriendshipItem]


class PendingRequestsResponse(BaseModel):
    incoming: List[FriendshipItem]
    outgoing: List[FriendshipItem]


# ── Takip ────────────────────────────────────────────────────────────
class FollowListResponse(BaseModel):
    items: List[UserCard]
    total: int


# ── Herkese açık profil ─────────────────────────────────────────────
class PublicProfileStats(BaseModel):
    learning_lang: str
    total_words: int
    learned: int
    learning: int
    current_streak: int


class PublicScheduleItem(BaseModel):
    day_of_week: int
    time_slot: str
    activity: str
    duration_min: int


class PublicProfileResponse(BaseModel):
    id: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    level: int = 1
    total_xp: int = 0
    created_at: datetime
    friend_count: int
    follower_count: int
    following_count: int
    relationship_status: str  # 'self' | 'none' | 'pending_sent' | 'pending_received' | 'friends'
    # relationship_status 'pending_sent'/'pending_received' ise dolu — frontend'in
    # accept/decline çağrısını doğrudan yapabilmesi için (bkz. routes/social.py
    # POST /friends/{friendship_id}/accept).
    friendship_id: Optional[str] = None
    is_following: bool
    stats: PublicProfileStats
    schedule: List[PublicScheduleItem]


# ── Faz 2: Engelleme ────────────────────────────────────────────────
class BlockedListResponse(BaseModel):
    items: List[UserCard]


# ── Şikayet/Rapor — bkz. app/services/report_service.py ─────────────
class ReportCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=50)
    details: Optional[str] = Field(default=None, max_length=2000)
    message_id: Optional[str] = None


# ── Faz 2: Mesajlaşma ───────────────────────────────────────────────
class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageItem(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    body: str
    created_at: datetime
    read_at: Optional[datetime] = None


class ConversationItem(BaseModel):
    id: str
    other_user: UserCard
    last_message_preview: Optional[str] = None
    last_message_sender_id: Optional[str] = None
    last_message_at: datetime
    unread_count: int = 0


class ConversationsListResponse(BaseModel):
    items: List[ConversationItem]


class ConversationThreadResponse(BaseModel):
    conversation_id: str
    other_user: UserCard
    messages: List[MessageItem]


class UnreadCountResponse(BaseModel):
    unread_count: int


# ── Faz 3: Meydan okuma ─────────────────────────────────────────────
class ChallengeCreate(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    mode: str  # public.game_mode: wordle | multiple_choice | typing | matching | listening | sprint


class ChallengeSubmitScore(BaseModel):
    session_id: str


class ChallengeItem(BaseModel):
    id: str
    mode: str
    status: str  # 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'
    is_challenger: bool
    other_user: Optional[UserCard] = None
    your_session_id: Optional[str] = None
    opponent_session_id: Optional[str] = None
    winner_id: Optional[str] = None
    you_won: Optional[bool] = None  # sadece status='completed' iken dolu
    created_at: datetime
    responded_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ChallengesListResponse(BaseModel):
    incoming: List[ChallengeItem]
    outgoing: List[ChallengeItem]
    active: List[ChallengeItem]
    completed: List[ChallengeItem]
