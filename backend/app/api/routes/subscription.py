from datetime import datetime, timedelta, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.core.config import settings
from app.services.iyzico_client import iyzico_client
from app.schemas.subscription import (
    PricingPlan, CheckoutRequest, CheckoutResponse, SubscriptionStatus,
)

router = APIRouter()

PLANS: list[PricingPlan] = [
    PricingPlan(
        code="monthly",
        name="Lexis Premium — Aylık",
        price=settings.PREMIUM_MONTHLY_PRICE,
        interval_label="Aylık",
        iyzico_pricing_plan_ref=settings.IYZICO_MONTHLY_PLAN_REF,
    ),
    PricingPlan(
        code="yearly",
        name="Lexis Premium — Yıllık",
        price=settings.PREMIUM_YEARLY_PRICE,
        interval_label="Yıllık",
        iyzico_pricing_plan_ref=settings.IYZICO_YEARLY_PLAN_REF,
    ),
]


def _plan_by_code(code: str) -> PricingPlan:
    for p in PLANS:
        if p.code == code:
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
    plan = _plan_by_code(req.plan_code)

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
        period_end = datetime.now(timezone.utc) + timedelta(days=period_days)

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
        period_end = datetime.now(timezone.utc) + timedelta(days=period_days)
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
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", row["id"]).execute()

    # Dönem sonuna kadar premium erişimi korunur; premium_until geçince
    # ayrı bir cron/scheduled job is_premium'u false'a çekmeli (bkz. HANDOFF notu).
    return {"message": "Abonelik iptal edildi, dönem sonuna kadar premium erişiminiz devam eder."}
