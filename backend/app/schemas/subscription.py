from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PlanInfo(BaseModel):
    code: str
    name: str
    price_try: float
    period: str            # monthly | yearly
    features: List[str]


class SubscriptionStatus(BaseModel):
    is_premium: bool
    premium_until: Optional[datetime] = None
    plan_code: Optional[str] = None
    status: Optional[str] = None
    current_period_end: Optional[datetime] = None


class CheckoutRequest(BaseModel):
    plan_code: str


class CheckoutResponse(BaseModel):
    message: str
    checkout_url: Optional[str] = None
