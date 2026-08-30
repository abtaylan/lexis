"""
iyzico Subscription API v2 istemcisi.

iyzico'nun v2 abonelik ürünü klasik iyzipay SDK'sının desteklemediği
IYZWSv2 imza şemasını kullanıyor, bu yüzden httpx ile doğrudan REST
çağrısı yapıyoruz. Referans: https://docs.iyzico.com/urunler/abonelik
"""
import hashlib
import hmac
import json
import random
import string
import time

import httpx

from app.core.config import settings


def _random_string(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def _build_auth_header(uri_path: str, body: dict | None) -> dict:
    """IYZWSv2 imzalı Authorization header'ı üretir."""
    random_key = f"{int(time.time() * 1000)}{_random_string()}"
    body_str = json.dumps(body, separators=(",", ":"), ensure_ascii=False) if body else ""

    payload = random_key + uri_path + body_str
    signature = hmac.new(
        settings.IYZICO_SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    auth_params = (
        f"apiKey:{settings.IYZICO_API_KEY}"
        f"&randomKey:{random_key}"
        f"&signature:{signature}"
    )
    import base64
    authorization = "IYZWSv2 " + base64.b64encode(auth_params.encode("utf-8")).decode("utf-8")

    return {
        "Authorization": authorization,
        "x-iyzi-rnd": random_key,
        "Content-Type": "application/json",
    }


class IyzicoClient:
    def __init__(self):
        self.base_url = settings.IYZICO_BASE_URL.rstrip("/")

    async def _post(self, uri_path: str, body: dict) -> dict:
        headers = _build_auth_header(uri_path, body)
        # ÖNEMLİ: gönderilen body baytları, imzayı hesaplarken kullanılan
        # JSON string ile TAM olarak aynı olmalı — aksi halde iyzico
        # sunucu tarafında imza doğrulaması başarısız olur (401 Unauthorized).
        # httpx'in `json=` parametresi kendi içinde Python'un varsayılan
        # json.dumps ayarlarıyla serileştirir (boşluklu ayraçlar,
        # ensure_ascii=True → Türkçe karakterleri \uXXXX'e kaçırır), ki bu
        # _build_auth_header'daki compact + ensure_ascii=False imzalama
        # ayarlarından FARKLI. Bu yüzden aynı ayarlarla elle serileştirip
        # `content=` ile ham bayt olarak gönderiyoruz.
        body_bytes = json.dumps(body, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(f"{self.base_url}{uri_path}", headers=headers, content=body_bytes)
            self._raise_with_body(resp)
            return resp.json()

    async def _get(self, uri_path: str) -> dict:
        headers = _build_auth_header(uri_path, None)
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{self.base_url}{uri_path}", headers=headers)
            self._raise_with_body(resp)
            return resp.json()

    @staticmethod
    def _raise_with_body(resp: httpx.Response) -> None:
        """httpx'in normal `raise_for_status()`'ı iyzico'nun döndürdüğü asıl
        hata gövdesini (ör. {"status":"failure","errorCode":"...",
        "errorMessage":"..."}) gizliyor — sadece "401" diyor, NEDEN 401
        olduğunu söylemiyor. Bu yüzden hata varsa gövdeyi de exception
        mesajına ekliyoruz ki gerçek sebep (imza hatası mı, yanlış
        API key mi, "Abonelik" modülü hesapta aktif değil mi, vs.)
        terminalde görünsün."""
        if resp.status_code >= 400:
            try:
                detail = resp.text
            except Exception:
                detail = "<gövde okunamadı>"
            raise RuntimeError(
                f"iyzico API hatası: HTTP {resp.status_code} — {resp.request.url}\n"
                f"Yanıt gövdesi: {detail}"
            )

    async def initialize_checkout_form(
        self,
        *,
        pricing_plan_reference_code: str,
        conversation_id: str,
        callback_url: str,
        customer_email: str,
        customer_name: str,
        customer_surname: str,
        customer_gsm: str = "",
        identity_number: str = "11111111111",
        address: str = "Türkiye",
        city: str = "Istanbul",
        country: str = "Turkey",
        ip: str = "85.34.78.112",
    ) -> dict:
        """Abonelik checkout formunu başlatır — dönen checkoutFormContent/paymentPageUrl
        kullanıcıya yönlendirilir, ödeme sonrası callback_url'e döner."""
        uri_path = "/v2/subscription/checkoutform/initialize"
        body = {
            "locale": "tr",
            "conversationId": conversation_id,
            "pricingPlanReferenceCode": pricing_plan_reference_code,
            "subscriptionInitialStatus": "ACTIVE",
            "callbackUrl": callback_url,
            "customer": {
                "name": customer_name,
                "surname": customer_surname,
                "identityNumber": identity_number,
                "email": customer_email,
                "gsmNumber": customer_gsm,
                "shippingAddress": {
                    "contactName": f"{customer_name} {customer_surname}",
                    "city": city,
                    "country": country,
                    "address": address,
                },
                "billingAddress": {
                    "contactName": f"{customer_name} {customer_surname}",
                    "city": city,
                    "country": country,
                    "address": address,
                },
            },
        }
        return await self._post(uri_path, body)

    async def retrieve_checkout_form(self, token: str, conversation_id: str = "") -> dict:
        """Checkout form tamamlandıktan sonra callback'te bu token ile
        abonelik oluşturma sonucu sorgulanır."""
        uri_path = f"/v2/subscription/checkoutform/{token}"
        if conversation_id:
            uri_path += f"?conversationId={conversation_id}"
        return await self._get(uri_path)

    async def retrieve_subscription(self, subscription_reference_code: str) -> dict:
        uri_path = f"/v2/subscription/subscriptions/{subscription_reference_code}"
        return await self._get(uri_path)

    async def cancel_subscription(self, subscription_reference_code: str) -> dict:
        uri_path = f"/v2/subscription/subscriptions/{subscription_reference_code}/cancel"
        body = {"subscriptionReferenceCode": subscription_reference_code}
        return await self._post(uri_path, body)

    # ── Ürün / fiyatlandırma planı kurulumu (bkz. backend/setup_iyzico_plans.py) ──
    # Döviz bazlı Premium (TRY/USD/EUR) için iyzico tarafında bir "product" ve
    # onun altında 6 "pricing plan" (her para birimi için aylık+yıllık)
    # oluşturmak amacıyla kullanılıyor. Referans:
    # https://docs.iyzico.com/en/products/subscription/subscription-implementation/subscription-product
    # https://docs.iyzico.com/en/products/subscription/subscription-implementation/payment-plan

    async def create_product(
        self, *, name: str, description: str = "", conversation_id: str = ""
    ) -> dict:
        uri_path = "/v2/subscription/products"
        body = {
            "name": name,
            "description": description,
            "locale": "tr",
            "conversationId": conversation_id,
        }
        return await self._post(uri_path, body)

    async def create_pricing_plan(
        self,
        *,
        product_reference_code: str,
        name: str,
        price: float,
        currency_code: str,
        payment_interval: str,
        conversation_id: str = "",
    ) -> dict:
        """payment_interval: 'MONTHLY' | 'YEARLY'. currency_code: 'TRY' | 'USD' | 'EUR'."""
        uri_path = f"/v2/subscription/products/{product_reference_code}/pricing-plans"
        body = {
            "name": name,
            "price": price,
            "currencyCode": currency_code,
            "paymentInterval": payment_interval,
            "planPaymentType": "RECURRING",
            "locale": "tr",
            "conversationId": conversation_id,
        }
        return await self._post(uri_path, body)


iyzico_client = IyzicoClient()
