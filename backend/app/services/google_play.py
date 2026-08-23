"""
Google Play Developer API istemcisi — mobil IAP abonelik doğrulaması (Android).

Referans: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2

Kimlik doğrulama bir Google Cloud servis hesabı (Play Console > Setup > API
access'ten bağlanan, "Pub/Sub" rolüyle) ile yapılır — service account JSON
anahtarı, "https://www.googleapis.com/auth/androidpublisher" scope'uyla
OAuth2 access token almak için kullanılır.

ÖNEMLİ — kurulum tamamlanmadan bu dosya çalışmaz: Play Console'da uygulama
oluşturulup bir servis hesabı bağlanmadan GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
boş kalır. Bu durumda verify_subscription() NotConfiguredError fırlatır —
asla sessizce "doğrulandı" varsaymaz, premium asla sahte bir şekilde verilmez.
"""
from __future__ import annotations

import json

import httpx
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account

from app.core.config import settings

_SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]


class NotConfiguredError(RuntimeError):
    """Google Play servis hesabı kimlik bilgileri henüz girilmemiş."""


class GoogleVerificationError(RuntimeError):
    """Google Play Developer API isteği reddetti ya da beklenmeyen bir yanıt döndü."""


def _is_configured() -> bool:
    return bool(settings.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)


def _get_access_token() -> str:
    info = json.loads(settings.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)
    credentials = service_account.Credentials.from_service_account_info(info, scopes=_SCOPES)
    credentials.refresh(GoogleAuthRequest())
    return credentials.token


async def verify_subscription(product_id: str, purchase_token: str) -> dict:
    """Verilen purchaseToken'ı Google Play Developer API'sine sorar ve
    doğrulanmış abonelik bilgisini (durum, bitiş tarihi, vb.) döner.

    Raises:
        NotConfiguredError: Google servis hesabı .env'de henüz yok.
        GoogleVerificationError: Google isteği reddetti / beklenmeyen yanıt.
    """
    if not _is_configured():
        raise NotConfiguredError(
            "Google Play servis hesabı kimlik bilgileri (.env: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) "
            "henüz girilmemiş — Play Console'da uygulama oluşturulup 'Setup > API access'ten "
            "bir servis hesabı bağlanıp JSON anahtarı indirildikten sonra doldurulmalı. "
            "Bu olmadan Android satın almaları doğrulanamaz."
        )

    token = _get_access_token()
    package_name = settings.GOOGLE_PLAY_PACKAGE_NAME

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
            f"{package_name}/purchases/subscriptionsv2/tokens/{purchase_token}",
            headers={"Authorization": f"Bearer {token}"},
        )

    if resp.status_code != 200:
        raise GoogleVerificationError(
            f"Google Play Developer API hatası: HTTP {resp.status_code} — {resp.text}"
        )

    return resp.json()
