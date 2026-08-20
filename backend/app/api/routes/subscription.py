from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.subscription import (
    PlanInfo, SubscriptionStatus, CheckoutRequest, CheckoutResponse,
)
from datetime import datetime, timezone

router = APIRouter()

PLANS: List[PlanInfo] = [
    PlanInfo(
        code="monthly",
        name="Aylık Premium",
        price_try=99.0,
        period="monthly",
        features=["Sınırsız kelime oyunu", "Reklamsız deneyim", "Gelişmiş istatistikler"],
    ),
    PlanInfo(
        code="yearly",
        name="Yıllık Premium",
        price_try=899.0,
        period="yearly",
        features=[
            "Sınırsız kelime oyunu",
            "Reklamsız deneyim",
            "Gelişmiş istatistikler",
            "2 ay ücretsiz",
        ],
    ),
]


@router.get("/plans", response_model=List[PlanInfo])
async def get_plans():
    return PLANS


@router.get("/status", response_model=SubscriptionStatus)
async def get_status(current_user=Depends(get_current_user)):
    profile = (
        supabase_admin.table("profiles")
        .select("is_premium, premium_until")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    p = profile.data or {}
    is_premium = bool(p.get("is_premium"))
    premium_until = p.get("premium_until")

    if is_premium and premium_until:
        try:
            expires = datetime.fromisoformat(str(premium_until).replace("Z", "+00:00"))
            if expires < datetime.now(timezone.utc):
                is_premium = False
        except Exception:
            pass

    sub_result = (
        supabase_admin.table("subscriptions")
        .select("plan_code, status, current_period_end")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    latest = (sub_result.data or [{}])[0] if sub_result.data else {}

    return SubscriptionStatus(
        is_premium=is_premium,
        premium_until=premium_until,
        plan_code=latest.get("plan_code"),
        status=latest.get("status"),
        current_period_end=latest.get("current_period_end"),
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def start_checkout(req: CheckoutRequest, current_user=Depends(get_current_user)):
    if req.plan_code not in [p.code for p in PLANS]:
        raise HTTPException(status_code=400, detail="Geçersiz plan.")

    # NOT: iyzico canlı ödeme entegrasyonu henüz tamamlanmadı (bkz. kalan işler
    # listesi Madde 4 — "iyzico callback entegrasyonunun canlı ortamda
    # doğrulanması"). Bu uç nokta şimdilik bekleyen bir abonelik kaydı açar;
    # gerçek ödeme akışı o madde tamamlandığında buraya bağlanacak.
    supabase_admin.table("subscriptions").insert(
        {
            "user_id": current_user.id,
            "plan_code": req.plan_code,
            "status": "pending",
        }
    ).execute()

    return CheckoutResponse(
        message="Ödeme altyapısı (iyzico) henüz canlıya alınmadı. Talebiniz kaydedildi, "
        "bu adım tamamlandığında bildirim alacaksınız.",
        checkout_url=None,
    )
