#!/usr/bin/env python3
import os, sys, time, jwt, requests

KEY_ID = "284UT28JG5"
ISSUER_ID = "77ca5820-f0c6-401a-b60f-7309e4276e3f"
PRIVATE_KEY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "AuthKey_284UT28JG5.p8")
APP_ID = "6806612758"
BASE = "https://api.appstoreconnect.apple.com/v1"

with open(PRIVATE_KEY_PATH) as f:
    PRIVATE_KEY = f.read()

def make_token():
    now = int(time.time())
    payload = {"iss": ISSUER_ID, "iat": now, "exp": now + 19*60, "aud": "appstoreconnect-v1"}
    return jwt.encode(payload, PRIVATE_KEY, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})

r = requests.get(f"{BASE}/apps/{APP_ID}/appStoreVersions", headers={"Authorization": f"Bearer {make_token()}"}, params={"limit": 50})
r.raise_for_status()
for v in r.json()["data"]:
    a = v["attributes"]
    print(f"{a['versionString']}  state={a['appStoreState']}  platform={a['platform']}  id={v['id']}")
