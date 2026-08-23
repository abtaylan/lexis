"""
Apple App Store Server API v2 istemcisi — mobil IAP abonelik doğrulaması.

Referans: https://developer.apple.com/documentation/appstoreserverapi

Kimlik doğrulama, App Store Connect'te oluşturulan bir "App Store Connect
API" anahtarıyla (Issuer ID + Key ID + .p8 özel anahtar) imzalanmış kısa
ömürlü bir JWT ile yapılır — iyzico'daki API key/secret modelinden farklı
olarak burada HER istek için taze bir JWT üretilir (ES256 imzalı).

ÖNEMLİ — kurulum tamamlanmadan bu dosya çalışmaz: Apple Developer Program
üyeliği aktive edilip (bkz. proje notları — 26 Ağustos) App Store Connect'te
"Users and Access > Integrations > App Store Connect API"'den bir anahtar
oluşturulmadan APPLE_ISSUER_ID/APPLE_KEY_ID/APPLE_PRIVATE_KEY_P8 boş kalır.
Bu durumda verify_transaction() NotConfiguredError fırlatır — asla sessizce
"doğrulandı" varsaymaz, premium asla sahte bir şekilde verilmez.
"""
from __future__ import annotations

import time
import uuid

import httpx
import jwt  # PyJWT[crypto]

from app.core.config import settings


class NotConfiguredError(RuntimeError):
    """Apple App Store Connect API kimlik bilgileri henüz girilmemiş."""


class AppleVerificationError(RuntimeError):
    """Apple sunucusu isteği reddetti ya da beklenmeyen bir yanıt döndü."""


_PRODUCTION_BASE = "https://api.storekit.itunes.apple.com"
_SANDBOX_BASE = "https://api.storekit-sandbox.itunes.apple.com"


def _is_configured() -> bool:
    return bool(settings.APPLE_ISSUER_ID and settings.APPLE_KEY_ID and settings.APPLE_PRIVATE_KEY_P8)


def _build_server_jwt() -> str:
    """App Store Server API çağrıları için ES256 imzalı, kısa ömürlü
    (maks. 60 dk, burada 5 dk) sunucu JWT'si üretir."""
    now = int(time.time())
    headers = {"alg": "ES256", "kid": settings.APPLE_KEY_ID, "typ": "JWT"}
    payload = {
        "iss": settings.APPLE_ISSUER_ID,
        "iat": now,
        "exp": now + 300,
        "aud": "appstoreconnect-v1",
        "bid": settings.APPLE_BUNDLE_ID,
        "nonce": str(uuid.uuid4()),
    }
    # .env'de private key satır sonları "\n" olarak kaçışlanmış tek satır
    # halinde tutuluyor (PEM formatı çok satırlı olduğu için) — gerçek
    # newline'lara geri çevriliyor.
    private_key = settings.APPLE_PRIVATE_KEY_P8.replace("\\n", "\n")
    return jwt.encode(payload, private_key, algorithm="ES256", headers=headers)


def _decode_unverified_payload(jws: str) -> dict:
    """Apple'ın kendi sunucusundan (TLS üzerinden, doğrudan bizim isteğimize
    yanıt olarak) gelen signedTransactionInfo/signedRenewalInfo JWS'lerinin
    payload'ını çözer. Güven sınırı burada TLS + Apple'ın sunucusudur —
    istemciden (mobil uygulamadan) gelen bir JWS burada ASLA doğrudan
    çözülmez, önce bu dosyadaki verify_transaction() ile Apple'a sorulur."""
    return jwt.decode(jws, options={"verify_signature": False})


async def verify_transaction(transaction_id: str) -> dict:
    """Verilen transactionId'yi Apple'ın App Store Server API'sine sorar ve
    doğrulanmış işlem bilgisini (ürün id, bitiş tarihi, vb.) döner.

    Raises:
        NotConfiguredError: Apple kimlik bilgileri .env'de henüz yok.
        AppleVerificationError: Apple isteği reddetti / beklenmeyen yanıt.
    """
    if not _is_configured():
        raise NotConfiguredError(
            "Apple App Store Connect API kimlik bilgileri (.env: APPLE_ISSUER_ID / "
            "APPLE_KEY_ID / APPLE_PRIVATE_KEY_P8) henüz girilmemiş — Apple Developer "
            "Program aktive edilip App Store Connect'te bir API anahtarı oluşturulduktan "
            "sonra doldurulmalı. Bu olmadan iOS satın almaları doğrulanamaz."
        )

    base = _SANDBOX_BASE if settings.APPLE_USE_SANDBOX else _PRODUCTION_BASE
    token = _build_server_jwt()

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{base}/inApps/v1/transactions/{transaction_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    if resp.status_code != 200:
        raise AppleVerificationError(
            f"Apple App Store Server API hatası: HTTP {resp.status_code} — {resp.text}"
        )

    body = resp.json()
    signed_transaction_info = body.get("signedTransactionInfo")
    if not signed_transaction_info:
        raise AppleVerificationError("Apple yanıtında signedTransactionInfo yok.")

    return _decode_unverified_payload(signed_transaction_info)
