#!/usr/bin/env python3
"""
App Store Connect API ile ekran goruntusu yukleme scripti.
Kullanim:
  python3 upload_appstore_screenshots.py <version_string> <locale> <display_type> <file1> [file2 ...]

Ornek:
  python3 upload_appstore_screenshots.py 1.0.1 tr APP_IPHONE_65 shot1.png shot2.png
"""
import sys
import os
import time
import hashlib
import json

import jwt
import requests

KEY_ID = "284UT28JG5"
ISSUER_ID = "77ca5820-f0c6-401a-b60f-7309e4276e3f"
# Anahtar dosyasi bu script ile ayni klasorde olmali.
PRIVATE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "AuthKey_284UT28JG5.p8")
APP_ID = "6806612758"
BASE = "https://api.appstoreconnect.apple.com/v1"

with open(PRIVATE_KEY_PATH) as f:
    PRIVATE_KEY = f.read()


def make_token():
    now = int(time.time())
    payload = {
        "iss": ISSUER_ID,
        "iat": now,
        "exp": now + 19 * 60,
        "aud": "appstoreconnect-v1",
    }
    headers = {"kid": KEY_ID, "typ": "JWT"}
    return jwt.encode(payload, PRIVATE_KEY, algorithm="ES256", headers=headers)


def _headers(json_body=False):
    h = {"Authorization": f"Bearer {make_token()}"}
    if json_body:
        h["Content-Type"] = "application/json"
    return h


def api_get(path, params=None):
    r = requests.get(BASE + path, headers=_headers(), params=params)
    if not r.ok:
        print("GET", path, r.status_code, r.text)
    r.raise_for_status()
    return r.json()


def api_post(path, body):
    r = requests.post(BASE + path, headers=_headers(True), json=body)
    if not r.ok:
        print("POST", path, r.status_code, r.text)
    r.raise_for_status()
    return r.json()


def api_patch(path, body):
    r = requests.patch(BASE + path, headers=_headers(True), json=body)
    if not r.ok:
        print("PATCH", path, r.status_code, r.text)
    r.raise_for_status()
    return r.json() if r.text else {}


def api_delete(path):
    r = requests.delete(BASE + path, headers=_headers())
    if not r.ok:
        print("DELETE", path, r.status_code, r.text)
    r.raise_for_status()


def find_version(version_string):
    data = api_get(f"/apps/{APP_ID}/appStoreVersions", params={"limit": 50})
    for v in data["data"]:
        if v["attributes"]["versionString"] == version_string:
            return v["id"]
    raise SystemExit(f"Version {version_string} not found. Available: "
                      f"{[v['attributes']['versionString'] for v in data['data']]}")


def find_localization(version_id, locale):
    data = api_get(f"/appStoreVersions/{version_id}/appStoreVersionLocalizations")
    for loc in data["data"]:
        if loc["attributes"]["locale"] == locale:
            return loc["id"]
    raise SystemExit(f"Locale {locale} not found. Available: "
                      f"{[l['attributes']['locale'] for l in data['data']]}")


def find_or_create_screenshot_set(localization_id, display_type):
    data = api_get(f"/appStoreVersionLocalizations/{localization_id}/appScreenshotSets")
    for s in data["data"]:
        if s["attributes"]["screenshotDisplayType"] == display_type:
            return s["id"]
    body = {
        "data": {
            "type": "appScreenshotSets",
            "attributes": {"screenshotDisplayType": display_type},
            "relationships": {
                "appStoreVersionLocalization": {
                    "data": {"type": "appStoreVersionLocalizations", "id": localization_id}
                }
            },
        }
    }
    created = api_post("/appScreenshotSets", body)
    return created["data"]["id"]


def clear_screenshot_set(set_id):
    data = api_get(f"/appScreenshotSets/{set_id}/appScreenshots")
    for shot in data["data"]:
        print("  Eski gorsel siliniyor:", shot["attributes"].get("fileName"))
        try:
            api_delete(f"/appScreenshots/{shot['id']}")
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 409:
                print("  UYARI: Bu gorsel silinemiyor (Apple kilitlemis, muhtemelen daha "
                      "once bir surum incelemesine dahil edildi icin). Atlanip yeni "
                      "gorseller eklenecek, eskisi elle silinmeli olabilir.")
            else:
                raise


def upload_one(set_id, file_path):
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)
    with open(file_path, "rb") as f:
        content = f.read()

    body = {
        "data": {
            "type": "appScreenshots",
            "attributes": {"fileName": file_name, "fileSize": file_size},
            "relationships": {
                "appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}}
            },
        }
    }
    created = api_post("/appScreenshots", body)
    shot_id = created["data"]["id"]
    ops = created["data"]["attributes"]["uploadOperations"]

    for op in ops:
        offset = op["offset"]
        length = op["length"]
        chunk = content[offset: offset + length]
        headers = {h["name"]: h["value"] for h in op["requestHeaders"]}
        r = requests.request(op["method"], op["url"], headers=headers, data=chunk)
        r.raise_for_status()

    checksum = hashlib.md5(content).hexdigest()
    api_patch(f"/appScreenshots/{shot_id}", {
        "data": {
            "type": "appScreenshots",
            "id": shot_id,
            "attributes": {"uploaded": True, "sourceFileChecksum": checksum},
        }
    })

    for attempt in range(15):
        time.sleep(2)
        check = api_get(f"/appScreenshots/{shot_id}")
        state = check["data"]["attributes"]["assetDeliveryState"]["state"]
        if state == "COMPLETE":
            print(f"  OK: {file_name} -> COMPLETE")
            return shot_id
        if state == "FAILED":
            errs = check["data"]["attributes"]["assetDeliveryState"].get("errors")
            raise SystemExit(f"  HATA: {file_name} yuklemesi basarisiz: {errs}")
    print(f"  UYARI: {file_name} hala isleniyor (son durum: {state}), devam ediliyor.")
    return shot_id


def main():
    version_string, locale, display_type = sys.argv[1], sys.argv[2], sys.argv[3]
    files = sys.argv[4:]
    if not files:
        raise SystemExit("En az bir dosya belirtmelisin.")

    print(f"Surum araniyor: {version_string}")
    version_id = find_version(version_string)
    print(f"  version_id={version_id}")

    print(f"Lokalizasyon araniyor: {locale}")
    loc_id = find_localization(version_id, locale)
    print(f"  localization_id={loc_id}")

    print(f"Ekran goruntusu seti araniyor/olusturuluyor: {display_type}")
    set_id = find_or_create_screenshot_set(loc_id, display_type)
    print(f"  set_id={set_id}")

    print("Mevcut gorseller temizleniyor...")
    clear_screenshot_set(set_id)

    print(f"{len(files)} yeni gorsel yukleniyor (sirayla)...")
    for fp in files:
        print(f"-> {fp}")
        upload_one(set_id, fp)

    print("Tamamlandi.")


if __name__ == "__main__":
    main()
