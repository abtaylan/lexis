from pydantic import BaseModel
from typing import Optional


class PricingPlan(BaseModel):
    id: str                   # 'monthly_try' | 'monthly_usd' | 'yearly_eur' | ... — checkout'ta kullanılan benzersiz kimlik
    code: str                 # 'monthly' | 'yearly' — abonelik periyodu (subscriptions.plan_code ile eşleşir)
    name: str
    price: float
    currency: str = "TRY"
    interval_label: str       # "Aylık" | "Yıllık"
    iyzico_pricing_plan_ref: str


class CheckoutRequest(BaseModel):
    plan_id: str               # PricingPlan.id — ör. 'monthly_try', 'yearly_usd'


class CheckoutResponse(BaseModel):
    checkout_form_content: Optional[str] = None
    payment_page_url: Optional[str] = None
    token: Optional[str] = None


class SubscriptionStatus(BaseModel):
    is_premium: bool
    premium_until: Optional[str] = None
    plan_code: Optional[str] = None
    status: Optional[str] = None


# ── Mobil Apple/Google IAP (App Store / Play Store native abonelik) ──────
# Kullanıcı kararı: web'de iyzico kalıyor, mobilde store kuralları gereği
# native IAP kullanılıyor (bkz. backlog Bölüm 1/2). Store politikaları,
# dijital abonelik için uygulama içi satın almayı zorunlu kılıyor.
class VerifyPurchaseRequest(BaseModel):
    platform: str              # 'ios' | 'android'
    product_id: str            # store'daki abonelik ürün kimliği (ör. app.lexis.mobile.premium.monthly)
    transaction_id: str        # iOS: StoreKit transactionId / Android: orderId
    purchase_token: str        # iOS: StoreKit2 JWS (Transaction.jwsRepresentation) / Android: purchaseToken


class VerifyPurchaseResponse(BaseModel):
    is_premium: bool
    premium_until: Optional[str] = None
    plan_code: Optional[str] = None
    status: Optional[str] = None
