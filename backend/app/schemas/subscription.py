from pydantic import BaseModel
from typing import Optional


class PricingPlan(BaseModel):
    code: str                 # 'monthly' | 'yearly'
    name: str
    price: float
    currency: str = "TRY"
    interval_label: str       # "Aylık" | "Yıllık"
    iyzico_pricing_plan_ref: str


class CheckoutRequest(BaseModel):
    plan_code: str            # 'monthly' | 'yearly'


class CheckoutResponse(BaseModel):
    checkout_form_content: Optional[str] = None
    payment_page_url: Optional[str] = None
    token: Optional[str] = None


class SubscriptionStatus(BaseModel):
    is_premium: bool
    premium_until: Optional[str] = None
    plan_code: Optional[str] = None
    status: Optional[str] = None
