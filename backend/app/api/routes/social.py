"""
backend/app/api/routes/social.py

Madde 6, Faz 1 — Arkadaşlık + Takip + Profil görüntüleme.
Madde 6, Faz 2 — Engelleme + Mesajlaşma.
Madde 6, Faz 3 — Meydan okuma.
Backend: /api/v1/social/*
"""

from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.schemas.social import (
    BlockedListResponse,
    ChallengeCreate,
    ChallengeItem,
    ChallengesListResponse,
    ChallengeSubmitScore,
    ConversationsListResponse,
    ConversationThreadResponse,
    FollowListResponse,
    FriendRequestCreate,
    FriendshipItem,
    FriendsListResponse,
    MessageCreate,
    MessageItem,
    PendingRequestsResponse,
    PublicProfileResponse,
    ReportCreate,
    UnreadCountResponse,
    UserSearchResponse,
)
from app.services import (
    block_service,
    challenge_service,
    follow_service,
    friends_service,
    messaging_service,
    public_profile_service,
    report_service,
)

router = APIRouter()


# ── Kullanıcı arama ──────────────────────────────────────────────────
@router.get("/users/search", response_model=UserSearchResponse)
async def search_users(q: str = "", limit: int = 20, current_user=Depends(get_current_user)):
    items = friends_service.search_users(current_user.id, q, limit)
    return {"items": items}


# ── Arkadaşlık ───────────────────────────────────────────────────────
@router.get("/friends", response_model=FriendsListResponse)
async def get_friends(current_user=Depends(get_current_user)):
    return {"items": friends_service.list_friends(current_user.id)}


@router.get("/friends/pending", response_model=PendingRequestsResponse)
async def get_pending_requests(current_user=Depends(get_current_user)):
    return friends_service.list_pending(current_user.id)


@router.post("/friends/request", response_model=FriendshipItem)
async def send_friend_request(data: FriendRequestCreate, current_user=Depends(get_current_user)):
    return friends_service.send_friend_request(current_user.id, data.username)


@router.post("/friends/{friendship_id}/accept", response_model=FriendshipItem)
async def accept_friend_request(friendship_id: str, current_user=Depends(get_current_user)):
    return friends_service.respond_to_request(current_user.id, friendship_id, accept=True)


@router.post("/friends/{friendship_id}/decline", response_model=FriendshipItem)
async def decline_friend_request(friendship_id: str, current_user=Depends(get_current_user)):
    return friends_service.respond_to_request(current_user.id, friendship_id, accept=False)


@router.delete("/friends/{user_id}")
async def remove_friend(user_id: str, current_user=Depends(get_current_user)):
    friends_service.remove_friend(current_user.id, user_id)
    return {"message": "ok"}


# ── Takip ────────────────────────────────────────────────────────────
@router.post("/follow/{user_id}")
async def follow_user(user_id: str, current_user=Depends(get_current_user)):
    follow_service.follow_user(current_user.id, user_id)
    return {"message": "ok"}


@router.delete("/follow/{user_id}")
async def unfollow_user(user_id: str, current_user=Depends(get_current_user)):
    follow_service.unfollow_user(current_user.id, user_id)
    return {"message": "ok"}


@router.get("/followers", response_model=FollowListResponse)
async def get_followers(current_user=Depends(get_current_user)):
    items = follow_service.list_followers(current_user.id)
    return {"items": items, "total": len(items)}


@router.get("/following", response_model=FollowListResponse)
async def get_following(current_user=Depends(get_current_user)):
    items = follow_service.list_following(current_user.id)
    return {"items": items, "total": len(items)}


# ── Herkese açık profil ─────────────────────────────────────────────
@router.get("/profile/{username}", response_model=PublicProfileResponse)
async def get_public_profile(username: str, current_user=Depends(get_current_user)):
    return public_profile_service.get_public_profile(username, current_user.id)


# ── Engelleme (Faz 2) ────────────────────────────────────────────────
@router.post("/block/{user_id}")
async def block_user(user_id: str, current_user=Depends(get_current_user)):
    block_service.block_user(current_user.id, user_id)
    return {"message": "ok"}


@router.delete("/block/{user_id}")
async def unblock_user(user_id: str, current_user=Depends(get_current_user)):
    block_service.unblock_user(current_user.id, user_id)
    return {"message": "ok"}


@router.get("/blocked", response_model=BlockedListResponse)
async def get_blocked_users(current_user=Depends(get_current_user)):
    return {"items": block_service.list_blocked(current_user.id)}


# ── Şikayet/Rapor — engellemeye ek moderasyon yolu, bkz. Guideline 1.2 ─
@router.post("/report/{user_id}")
async def report_user(user_id: str, data: ReportCreate, current_user=Depends(get_current_user)):
    report_service.create_report(current_user.id, user_id, data.reason, data.details, data.message_id)
    return {"message": "ok"}


# ── Mesajlaşma (Faz 2) — polling tabanlı, bkz. messaging_service.py ──
@router.get("/conversations", response_model=ConversationsListResponse)
async def get_conversations(current_user=Depends(get_current_user)):
    return {"items": messaging_service.list_conversations(current_user.id)}


@router.get("/conversations/{username}", response_model=ConversationThreadResponse)
async def get_conversation_thread(username: str, current_user=Depends(get_current_user)):
    return messaging_service.get_thread(current_user.id, username)


@router.post("/conversations/{username}", response_model=MessageItem)
async def post_message(username: str, data: MessageCreate, current_user=Depends(get_current_user)):
    return messaging_service.send_message(current_user.id, username, data.body)


@router.get("/messages/unread-count", response_model=UnreadCountResponse)
async def get_unread_message_count(current_user=Depends(get_current_user)):
    return {"unread_count": messaging_service.unread_total(current_user.id)}


# ── Meydan okuma (Faz 3) — bkz. challenge_service.py ─────────────────
@router.post("/challenges", response_model=ChallengeItem)
async def create_challenge(data: ChallengeCreate, current_user=Depends(get_current_user)):
    return challenge_service.create_challenge(current_user.id, data.username, data.mode)


@router.get("/challenges", response_model=ChallengesListResponse)
async def get_challenges(current_user=Depends(get_current_user)):
    return challenge_service.list_challenges(current_user.id)


@router.post("/challenges/{challenge_id}/accept", response_model=ChallengeItem)
async def accept_challenge(challenge_id: str, current_user=Depends(get_current_user)):
    return challenge_service.respond_to_challenge(current_user.id, challenge_id, accept=True)


@router.post("/challenges/{challenge_id}/decline", response_model=ChallengeItem)
async def decline_challenge(challenge_id: str, current_user=Depends(get_current_user)):
    return challenge_service.respond_to_challenge(current_user.id, challenge_id, accept=False)


@router.post("/challenges/{challenge_id}/cancel")
async def cancel_challenge(challenge_id: str, current_user=Depends(get_current_user)):
    challenge_service.cancel_challenge(current_user.id, challenge_id)
    return {"message": "ok"}


@router.post("/challenges/{challenge_id}/submit", response_model=ChallengeItem)
async def submit_challenge_score(
    challenge_id: str, data: ChallengeSubmitScore, current_user=Depends(get_current_user)
):
    return challenge_service.submit_score(current_user.id, challenge_id, data.session_id)
