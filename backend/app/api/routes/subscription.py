import time
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import supabase_admin
from app.schemas.subscription import (
    CheckoutRequest,
    CheckoutResponse,
    PricingPlan,
    SubscriptionStatus,
    VerifyPurchaseRequest,
    VerifyPurchaseResponse,
)
from app.services import apple_appstore, google_play
from app.services.iyzico_client import iyzico_client

router = APIRouter()

# NOT — mobil ödeme mimarisi kararı: /checkout ve /cancel (aşağıda) web'e
# (iyzico'ya) özgüdür; mobil premium ekranı bunları KULLANMIYOR, bunun
# yerine /verify-purchase'ı çağırıyor (bkz. dosyanın altı). Store kuralları
# mobilde native Apple/Google IAP'ı zorunlu kılıyor, iyzico web'de kalıyor.

# Her para birimi kendi fiyatına VE kendi iyzico pricing-plan referansına
# sahip (iyzico'da bir "pricing plan" tek bir para birimine bağlı olduğu
# için panelden ayrı ayrı oluşturulmaları gerekiyor). Bir para biriminin
# fiyatı ya da ref'i boş/0 ise o para birimi listeye hiç girmiyor — böylece
# sadece TRY doluyken davranış bugünküyle birebir aynı kalıyor.
_CURRENCY_CONFIGS = [
    ("TRY", settings.PREMIUM_MONTHLY_PRICE, settings.PREMIUM_YEARLY_PRICE,
     settings.IYZICO_MONTHLY_PLAN_REF, settings.IYZICO_YEARLY_PLAN_REF),
    ("USD", settings.PREMIUM_MONTHLY_PRICE_USD, settings.PREMIUM_YEARLY_PRICE_USD,
     settings.IYZICO_MONTHLY_PLAN_REF_USD, settings.IYZICO_YEARLY_PLAN_REF_USD),
    ("EUR", settings.PREMIUM_MONTHLY_PRICE_EUR, settings.PREMIUM_YEARLY_PRICE_EUR,
     settings.IYZICO_MONTHLY_PLAN_REF_EUR, settings.IYZICO_YEARLY_PLAN_REF_EUR),
]
_INTERVAL_LABELS = {"monthly": "Aylık", "yearly": "Yıllık"}
_PLAN_NAMES = {"monthly": "Lexis Premium — Aylık", "yearly": "Lexis Premium — Yıllık"}


def _build_plans() -> list[PricingPlan]:
    plans: list[PricingPlan] = []
    for currency, monthly_price, yearly_price, monthly_ref, yearly_ref in _CURRENCY_CONFIGS:
        if monthly_price and monthly_ref:
            plans.append(PricingPlan(
                id=f"monthly_{currency.lower()}", code="monthly", name=_PLAN_NAMES["monthly"],
                price=monthly_price, currency=currency, interval_label=_INTERVAL_LABELS["monthly"],
                iyzico_pricing_plan_ref=monthly_ref,
            ))
        if yearly_price and yearly_ref:
            plans.append(PricingPlan(
                id=f"yearly_{currency.lower()}", code="yearly", name=_PLAN_NAMES["yearly"],
                price=yearly_price, currency=currency, interval_label=_INTERVAL_LABELS["yearly"],
                iyzico_pricing_plan_ref=yearly_ref,
            ))
    return plans


PLANS: list[PricingPlan] = _build_plans()


def _plan_by_id(plan_id: str) -> PricingPlan:
    for p in PLANS:
        if p.id == plan_id:
            return p
    raise HTTPException(status_code=400, detail="Geçersiz plan kodu.")


@router.get("/plans", response_model=list[PricingPlan])
async def get_plans():
    return PLANS


@router.get("/me", response_model=SubscriptionStatus)
async def get_my_subscription(current_user=Depends(get_current_user)):
    profile = (
        supabase_admin.table("profiles")
        .select("is_premium, premium_until")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    data = profile.data or {}

    latest = (
        supabase_admin.table("subscriptions")
        .select("plan_code, status")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    row = (latest.data or [{}])[0] if latest.data else {}

    return SubscriptionStatus(
        is_premium=bool(data.get("is_premium")),
        premium_until=data.get("premium_until"),
        plan_code=row.get("plan_code"),
        status=row.get("status"),
    )


@router.post("/checkout", response_model=CheckoutResponse)
async def start_checkout(req: CheckoutRequest, current_user=Depends(get_current_user)):
    plan = _plan_by_id(req.plan_id)

    # Kullanıcının profil bilgisini al (isim/soyisim iyzico'ya zorunlu)
    profile = (
        supabase_admin.table("profiles")
        .select("display_name, username")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    display_name = (profile.data or {}).get("display_name") or "Lexis"
    name_parts = display_name.strip().split(" ", 1)
    first_name = name_parts[0] or "Lexis"
    last_name = name_parts[1] if len(name_parts) > 1 else "Kullanıcı"

    # Pending abonelik kaydı oluştur — conversationId olarak bu satırın id'sini kullanıyoruz
    pending_id = str(uuid.uuid4())
    supabase_admin.table("subscriptions").insert({
        "id": pending_id,
        "user_id": current_user.id,
        "plan_code": plan.code,
        "currency": plan.currency,
        "status": "pending",
        "iyzico_pricing_plan_ref": plan.iyzico_pricing_plan_ref,
    }).execute()

    callback_url = f"{settings.BACKEND_PUBLIC_URL}/api/v1/subscription/callback?sub_id={pending_id}"

    try:
        result = await iyzico_client.initialize_checkout_form(
            pricing_plan_reference_code=plan.iyzico_pricing_plan_ref,
            conversation_id=pending_id,
            callback_url=callback_url,
            customer_email=current_user.email,
            customer_name=first_name,
            customer_surname=last_name,
        )
    except Exception as e:
        print(f"IYZICO CHECKOUT INIT ERROR: {e}")
        supabase_admin.table("subscriptions").update({"status": "failed"}).eq("id", pending_id).execute()
        raise HTTPException(status_code=502, detail="Ödeme formu başlatılamadı, lütfen tekrar deneyin.")

    if result.get("status") != "success":
        supabase_admin.table("subscriptions").update({"status": "failed"}).eq("id", pending_id).execute()
        raise HTTPException(status_code=502, detail="Ödeme formu başlatılamadı.")

    data = result.get("data", {})
    # Token'ı callback'te doğrulamak için kaydediyoruz
    supabase_admin.table("subscriptions").update({
        "iyzico_subscription_ref": data.get("token"),
    }).eq("id", pending_id).execute()

    return CheckoutResponse(
        checkout_form_content=data.get("checkoutFormContent"),
        payment_page_url=data.get("paymentPageUrl"),
        token=data.get("token"),
    )


# NOT: GET ve POST için aynı fonksiyonu tek api_route ile tanımlamak, her iki
# operasyona da aynı otomatik operationId'yi veriyordu ve Swagger/OpenAPI'de
# "Duplicate Operation ID" uyarısına yol açıyordu. Aşağıda her metod için
# ayrı, açık operation_id verilerek bu çözüldü — davranışta değişiklik yok.
@router.get("/callback", operation_id="subscription_checkout_callback_get")
@router.post("/callback", operation_id="subscription_checkout_callback_post")
async def checkout_callback(request: Request, sub_id: str):
    """iyzico ödeme tamamlandığında bu URL'e (GET veya POST) yönlendirir/post eder.
    NOT: retrieve_checkout_form yanıtındaki alan adları (referenceCode/status vb.)
    sandbox'ta canlı bir test isteğiyle doğrulanmalı — iyzico dokümantasyonunda
    tam şema paylaşılmıyor, bu yüzden burada makul isimlerle ilerlendi."""
    token = None
    if request.method == "POST":
        form = await request.form()
        token = form.get("token")
    if not token:
        token = request.query_params.get("token")

    frontend_fail_url = f"{settings.FRONTEND_URL}/premium?status=failed"
    frontend_ok_url = f"{settings.FRONTEND_URL}/premium?status=success"

    sub_row = (
        supabase_admin.table("subscriptions").select("*").eq("id", sub_id).single().execute()
    ).data
    if not sub_row:
        return RedirectResponse(frontend_fail_url)

    if not token:
        token = sub_row.get("iyzico_subscription_ref")

    try:
        result = await iyzico_client.retrieve_checkout_form(token, conversation_id=sub_id)
    except Exception as e:
        print(f"IYZICO CALLBACK RETRIEVE ERROR: {e}")
        supabase_admin.table("subscriptions").update({"status": "failed"}).eq("id", sub_id).execute()
        return RedirectResponse(frontend_fail_url)

    data = result.get("data", {})
    payment_status = (data.get("status") or data.get("paymentStatus") or "").upper()
    subscription_ref = data.get("referenceCode") or data.get("subscriptionReferenceCode")

    if result.get("status") == "success" and payment_status in ("ACTIVE", "SUCCESS"):
        plan_code = sub_row["plan_code"]
        period_days = 365 if plan_code == "yearly" else 30
        period_end = datetime.now(UTC) + timedelta(days=period_days)

        supabase_admin.table("subscriptions").update({
            "status": "active",
            "iyzico_subscription_ref": subscription_ref or sub_row.get("iyzico_subscription_ref"),
            "iyzico_customer_ref": data.get("customerReferenceCode"),
            "current_period_end": period_end.isoformat(),
        }).eq("id", sub_id).execute()

        supabase_admin.table("profiles").update({
            "is_premium": True,
            "premium_until": period_end.isoformat(),
        }).eq("id", sub_row["user_id"]).execute()

        return RedirectResponse(frontend_ok_url)

    supabase_admin.table("subscriptions").update({"status": "failed"}).eq("id", sub_id).execute()
    return RedirectResponse(frontend_fail_url)


@router.post("/webhook")
async def iyzico_webhook(request: Request):
    """iyzico'nun abonelik yenileme/başarısız ödeme bildirimleri için
    panelden tanımlanan sunucu-sunucu webhook adresi. Gövde şeması iyzico
    panelinde 'Abonelik Webhook' ayarından teyit edilmeli; burada en yaygın
    alanlar (subscriptionReferenceCode, status) baz alındı."""
    body = await request.json()
    subscription_ref = body.get("subscriptionReferenceCode") or body.get("referenceCode")
    event_status = (body.get("status") or body.get("iyzEventType") or "").upper()

    if not subscription_ref:
        return {"status": "ignored"}

    sub_row = (
        supabase_admin.table("subscriptions")
        .select("*")
        .eq("iyzico_subscription_ref", subscription_ref)
        .single()
        .execute()
    ).data
    if not sub_row:
        return {"status": "ignored"}

    if "FAIL" in event_status or event_status == "EXPIRED":
        supabase_admin.table("subscriptions").update({"status": "expired"}).eq("id", sub_row["id"]).execute()
        supabase_admin.table("profiles").update({"is_premium": False}).eq("id", sub_row["user_id"]).execute()
    elif "SUCCESS" in event_status or event_status == "ACTIVE":
        plan_code = sub_row["plan_code"]
        period_days = 365 if plan_code == "yearly" else 30
        period_end = datetime.now(UTC) + timedelta(days=period_days)
        supabase_admin.table("subscriptions").update({
            "status": "active", "current_period_end": period_end.isoformat(),
        }).eq("id", sub_row["id"]).execute()
        supabase_admin.table("profiles").update({
            "is_premium": True, "premium_until": period_end.isoformat(),
        }).eq("id", sub_row["user_id"]).execute()

    return {"status": "ok"}


@router.post("/cancel")
async def cancel_subscription(current_user=Depends(get_current_user)):
    active = (
        supabase_admin.table("subscriptions")
        .select("*")
        .eq("user_id", current_user.id)
        .eq("status", "active")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    row = (active.data or [None])[0]
    if not row:
        raise HTTPException(status_code=404, detail="Aktif abonelik bulunamadı.")

    try:
        await iyzico_client.cancel_subscription(row["iyzico_subscription_ref"])
    except Exception as e:
        print(f"IYZICO CANCEL ERROR: {e}")
        raise HTTPException(status_code=502, detail="Abonelik iptal edilemedi, lütfen tekrar deneyin.")

    supabase_admin.table("subscriptions").update({
        "status": "cancelled",
        "cancelled_at": datetime.now(UTC).isoformat(),
    }).eq("id", row["id"]).execute()

    # Dönem sonuna kadar premium erişimi korunur; premium_until geçince
    # ayrı bir cron/scheduled job is_premium'u false'a çekmeli (bkz. HANDOFF notu).
    return {"message": "Abonelik iptal edildi, dönem sonuna kadar premium erişiminiz devam eder."}


# ── Mobil Apple/Google IAP ────────────────────────────────────────────
# Mobil premium.tsx, expo-iap ile satın alma tamamlandığında (StoreKit2/Play
# Billing purchase objesini) bu endpoint'e gönderir. Doğrulama Apple/Google
# sunucularına SORULARAK yapılır (bkz. apple_appstore.py / google_play.py) —
# istemciden gelen bilgi asla doğrudan güvenilmez. Store kimlik bilgileri
# (.env) henüz girilmediyse 501 döner, ASLA sessizce premium vermez.
@router.post("/verify-purchase", response_model=VerifyPurchaseResponse)
async def verify_purchase(req: VerifyPurchaseRequest, current_user=Depends(get_current_user)):
    if req.platform not in ("ios", "android"):
        raise HTTPException(status_code=400, detail="Geçersiz platform.")

    plan_code = "yearly" if req.product_id == settings.IAP_PRODUCT_YEARLY else "monthly"

    try:
        if req.platform == "ios":
            info = await apple_appstore.verify_transaction(req.transaction_id)
            product_id = info.get("productId")
            expires_ms = info.get("expiresDate")  # unix ms
            is_active = bool(expires_ms and expires_ms > int(time.time() * 1000))
            period_end = (
                datetime.fromtimestamp(expires_ms / 1000, tz=UTC) if expires_ms else None
            )
        else:
            info = await google_play.verify_subscription(req.product_id, req.purchase_token)
            product_id = req.product_id
            # subscriptionsv2 yanıtı: subscriptionState (SUBSCRIPTION_STATE_ACTIVE/...) +
            # lineItems[].expiryTime (ISO8601). Tam alan adları, gerçek bir Play Console
            # aboneliğiyle canlı test edilene kadar kesinleşmemiş olabilir — bkz. dosya notu.
            is_active = info.get("subscriptionState") == "SUBSCRIPTION_STATE_ACTIVE"
            line_items = info.get("lineItems") or []
            expiry_iso = line_items[0].get("expiryTime") if line_items else None
            period_end = datetime.fromisoformat(expiry_iso) if expiry_iso else None
    except (apple_appstore.NotConfiguredError, google_play.NotConfiguredError) as e:
        raise HTTPException(status_code=501, detail=str(e))
    except (apple_appstore.AppleVerificationError, google_play.GoogleVerificationError) as e:
        print(f"IAP VERIFY ERROR ({req.platform}): {e}")
        raise HTTPException(status_code=502, detail="Satın alma doğrulanamadı, lütfen tekrar deneyin.")

    if not is_active:
        raise HTTPException(status_code=400, detail="Abonelik aktif değil.")

    if product_id and product_id != req.product_id:
        print(f"IAP UYARI: gönderilen product_id ({req.product_id}) doğrulanan ({product_id}) ile uyuşmuyor.")

    # Aynı transaction_id daha önce işlendiyse (ör. purchaseUpdatedListener'ın
    # tekrar tetiklenmesi) tekrar satır oluşturmak yerine güncelle.
    existing = (
        supabase_admin.table("subscriptions")
        .select("id")
        .eq("iap_transaction_id", req.transaction_id)
        .limit(1)
        .execute()
    )
    row_data = {
        "user_id": current_user.id,
        "plan_code": plan_code,
        "status": "active",
        "store": req.platform,
        "iap_product_id": req.product_id,
        "iap_transaction_id": req.transaction_id,
        "iap_purchase_token": req.purchase_token,
        "current_period_end": period_end.isoformat() if period_end else None,
    }
    if existing.data:
        supabase_admin.table("subscriptions").update(row_data).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase_admin.table("subscriptions").insert(row_data).execute()

    supabase_admin.table("profiles").update({
        "is_premium": True,
        "premium_until": period_end.isoformat() if period_end else None,
    }).eq("id", current_user.id).execute()

    return VerifyPurchaseResponse(
        is_premium=True,
        premium_until=period_end.isoformat() if period_end else None,
        plan_code=plan_code,
        status="active",
    )
