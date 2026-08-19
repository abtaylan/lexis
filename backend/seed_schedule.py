"""
seed_schedule.py
Calisma programini backend'e yukler.

Kullanim:
  cd backend
  venv\\Scripts\\activate
  python seed_schedule.py                # varsayilan: en
  python seed_schedule.py --lang de      # Almanca sablon
  python seed_schedule.py --lang ja      # Japonca sablon

Desteklenen diller: schedule_templates.SUPPORTED_LANGS
(Madde 4 kapsaminda 19 Agustos 2026'da eklendi -- bkz. schedule_templates.py)
"""

import argparse
import asyncio
import httpx

from schedule_templates import SUPPORTED_LANGS, program_for_lang

BASE_URL = "http://localhost:8000"

# Giris bilgilerin -- kendi hesabinla degistir
EMAIL    = "yeni3@test.com"
PASSWORD = "test123"


async def main(lang: str):
    program = program_for_lang(lang)

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # 1. Login
        print(f"[{lang}] Giris yapiliyor...")
        r = await client.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})
        r.raise_for_status()
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Giris basarili")

        # 2. Mevcut programi temizle
        print("Mevcut program siliniyor...")
        existing = await client.get("/api/v1/schedule", headers=headers)
        data = existing.json()
        items = data if isinstance(data, list) else data.get("items", [])
        for item in items:
            await client.delete(f"/api/v1/schedule/{item['id']}", headers=headers)
        print(f"  {len(items)} kayit silindi")

        # 3. Yeni program ekle
        print(f"[{lang}] Program yukleniyor...")
        for entry in program:
            r = await client.post("/api/v1/schedule", json=entry, headers=headers)
            if r.status_code in (200, 201):
                print(f"  OK  {entry['activity']} ({entry['time_slot']})")
            else:
                print(f"  ERR {r.status_code}: {r.text}")

        print("\nSeed tamamlandi!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Calisma programi seed script'i")
    parser.add_argument(
        "--lang",
        default="en",
        choices=SUPPORTED_LANGS,
        help="Sablon dili (varsayilan: en)",
    )
    args = parser.parse_args()
    asyncio.run(main(args.lang))
