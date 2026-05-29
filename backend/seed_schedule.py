"""
seed_schedule.py
Calisma programini backend'e yukler.
Kullanim:
  cd backend
  venv\Scripts\activate
  python seed_schedule.py
"""

import asyncio
import httpx

BASE_URL = "http://localhost:8000"

# Giris bilgilerin -- kendi hesabinla degistir
EMAIL    = "yeni3@test.com"
PASSWORD = "test123"

TASK_LINKS = {
    "Teknik Makale": "https://medium.com/tag/english-learning",
    "Haber Okuma":   "https://www.bbc.co.uk/learningenglish",
    "LingoClip":     "https://lingoclip.com/",
    "Video Analizi": "https://www.youtube.com/@TEDEd",
    "Genel Tekrar":  "https://quizlet.com/",
}

# day_of_week: 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
PROGRAM = [
    {"day_of_week": 1, "time_slot": "08:00", "activity": "Teknik Makale", "duration_min": 30},
    {"day_of_week": 1, "time_slot": "20:00", "activity": "LingoClip",     "duration_min": 20},
    {"day_of_week": 2, "time_slot": "08:00", "activity": "Haber Okuma",   "duration_min": 30},
    {"day_of_week": 2, "time_slot": "20:00", "activity": "Video Analizi", "duration_min": 25},
    {"day_of_week": 3, "time_slot": "08:00", "activity": "Teknik Makale", "duration_min": 30},
    {"day_of_week": 3, "time_slot": "20:00", "activity": "LingoClip",     "duration_min": 20},
    {"day_of_week": 4, "time_slot": "08:00", "activity": "Haber Okuma",   "duration_min": 30},
    {"day_of_week": 4, "time_slot": "20:00", "activity": "Video Analizi", "duration_min": 25},
    {"day_of_week": 5, "time_slot": "08:00", "activity": "Teknik Makale", "duration_min": 30},
    {"day_of_week": 5, "time_slot": "20:00", "activity": "LingoClip",     "duration_min": 20},
    {"day_of_week": 6, "time_slot": "09:00", "activity": "Genel Tekrar",  "duration_min": 45},
    {"day_of_week": 0, "time_slot": "09:00", "activity": "Genel Tekrar",  "duration_min": 45},
]


async def main():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        # 1. Login
        print("Giris yapiliyor...")
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
        print("Program yukleniyor...")
        for entry in PROGRAM:
            payload = {
                **entry,
                "link_url": TASK_LINKS.get(entry["activity"], ""),
            }
            r = await client.post("/api/v1/schedule", json=payload, headers=headers)
            if r.status_code in (200, 201):
                print(f"  OK  {entry['activity']} ({entry['time_slot']})")
            else:
                print(f"  ERR {r.status_code}: {r.text}")

        print("\nSeed tamamlandi!")


if __name__ == "__main__":
    asyncio.run(main())