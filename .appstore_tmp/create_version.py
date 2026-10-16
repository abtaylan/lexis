#!/usr/bin/env python3
"""Yeni bir App Store surumu (versiyon satiri) olusturur, taslak olarak kalir."""
import os
import sys
import time
import jwt
import requests

KEY_ID = "284UT28JG5"
ISSUER_ID = "77ca5820-f0c6-401a-b60f-7309e4276e3f"
PRIVATE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "AuthKey_284UT28JG5.p8")
APP_ID = "6806612758"
BASE = "https://api.appstoreconnect.apple.com/v1"

with open(PRIVATE_KEY_PATH) as f:
    PRIVATE_KEY = f.read()


def make_token():
    now = int(time.time())
    payload = {"iss": ISSUER_ID, "iat": now, "exp": now + 19 * 60, "aud": "appstoreconnect-v1"}
    return jwt.encode(payload, PRIVATE_KEY, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


def hdrs():
    return {"Authorization": f"Bearer {make_token()}", "Content-Type": "application/json"}


def main():
    version_string = sys.argv[1]  # ornek: 1.0.3

    body = {
        "data": {
            "type": "appStoreVersions",
            "attributes": {
                "platform": "IOS",
                "versionString": version_string,
                "releaseType": "MANUAL",
            },
            "relationships": {
                "app": {"data": {"type": "apps", "id": APP_ID}}
            },
        }
    }
    r = requests.post(f"{BASE}/appStoreVersions", headers=hdrs(), json=body)
    if not r.ok:
        print("HATA:", r.status_code, r.text)
        r.raise_for_status()
    version_id = r.json()["data"]["id"]
    print(f"Surum olusturuldu: {version_string} -> id={version_id}")

    r2 = requests.get(f"{BASE}/appStoreVersions/{version_id}/appStoreVersionLocalizations",
                       headers=hdrs())
    r2.raise_for_status()
    locs = r2.json()["data"]
    if locs:
        print("Mevcut lokalizasyonlar:")
        for loc in locs:
            print(f"  locale={loc['attributes']['locale']}  id={loc['id']}")
    else:
        print("UYARI: Hicbir lokalizasyon otomatik kopyalanmadi. tr lokalizasyonu olusturuluyor...")
        loc_body = {
            "data": {
                "type": "appStoreVersionLocalizations",
                "attributes": {"locale": "tr"},
                "relationships": {
                    "appStoreVersion": {"data": {"type": "appStoreVersions", "id": version_id}}
                },
            }
        }
        r3 = requests.post(f"{BASE}/appStoreVersionLocalizations", headers=hdrs(), json=loc_body)
        if not r3.ok:
            print("HATA (lokalizasyon):", r3.status_code, r3.text)
            r3.raise_for_status()
        print(f"tr lokalizasyonu olusturuldu: id={r3.json()['data']['id']}")


if __name__ == "__main__":
    main()
