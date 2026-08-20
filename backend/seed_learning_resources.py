"""
seed_learning_resources.py
Çok dilli program kaynaklarını (learning_resources tablosu) yükler.

Bu script kullanıcı hesabı gerektirmez — service-role (supabase_admin)
client ile doğrudan tabloya yazar. backend/ klasöründen çalıştır:

cd backend
venv\Scripts\activate
python seed_learning_resources.py

Var olan (aynı language_code + category + url) kayıtları tekrar eklemez
(upsert benzeri davranış: önce mevcut olup olmadığını kontrol eder).
"""

import asyncio
from app.core.database import supabase_admin

# category: 'news_reading' | 'technical_article' | 'video_analysis'
#           | 'audio_practice' | 'general_review'
# Her biri backend/app/api/routes/schedule.py içindeki ACTIVITY_CATEGORIES
# listesiyle birebir eşleşmeli.

RESOURCES = [
    # ── İngilizce ──────────────────────────────────────────
    {"language_code": "en", "category": "news_reading", "title": "BBC Learning English",
     "url": "https://www.bbc.co.uk/learningenglish",
     "description": "Haberler ve güncel konularla İngilizce okuma-dinleme pratiği."},
    {"language_code": "en", "category": "technical_article", "title": "Medium — English Learning",
     "url": "https://medium.com/tag/english-learning",
     "description": "Orta-ileri seviye makalelerle kelime dağarcığı geliştirme."},
    {"language_code": "en", "category": "video_analysis", "title": "TED-Ed (YouTube)",
     "url": "https://www.youtube.com/@TEDEd",
     "description": "Kısa, altyazılı eğitici videolarla dinleme ve kelime pratiği."},
    {"language_code": "en", "category": "audio_practice", "title": "LingoClip",
     "url": "https://lingoclip.com/",
     "description": "Ses/video kliplerinden kelime öğrenme pratiği."},
    {"language_code": "en", "category": "general_review", "title": "Quizlet",
     "url": "https://quizlet.com/",
     "description": "Flashcard ve testlerle genel tekrar."},

    # ── Almanca ────────────────────────────────────────────
    {"language_code": "de", "category": "news_reading", "title": "DW — Nachrichten (Deutsch lernen)",
     "url": "https://learngerman.dw.com/de/nachrichten/s-8030",
     "description": "Öğrenciler için sadeleştirilmiş Almanca haberler."},
    {"language_code": "de", "category": "technical_article", "title": "DW — Top-Thema mit Vokabeln",
     "url": "https://learngerman.dw.com/de/deutsch-lernen",
     "description": "Kelime listeleriyle desteklenmiş güncel konu makaleleri (B1)."},
    {"language_code": "de", "category": "video_analysis", "title": "Easy German (YouTube)",
     "url": "https://www.youtube.com/@EasyGerman",
     "description": "Sokak röportajlarıyla doğal, günlük Almanca."},
    {"language_code": "de", "category": "audio_practice", "title": "DW Deutsch Lernen — Podcast",
     "url": "https://learngerman.dw.com/de/podcast",
     "description": "Almanca öğrenenler için podcast serisi."},
    {"language_code": "de", "category": "general_review", "title": "Quizlet — German",
     "url": "https://quizlet.com/subject/german/",
     "description": "Flashcard ve testlerle genel tekrar."},

    # ── İspanyolca ─────────────────────────────────────────
    {"language_code": "es", "category": "news_reading", "title": "News in Slow Spanish",
     "url": "https://www.newsinslowspanish.com/",
     "description": "Yavaş, anlaşılır tempoda güncel haberler."},
    {"language_code": "es", "category": "technical_article", "title": "BBC Mundo",
     "url": "https://www.bbc.com/mundo",
     "description": "Güncel olaylarla İspanyolca okuma pratiği (orta-ileri seviye)."},
    {"language_code": "es", "category": "video_analysis", "title": "Dreaming Spanish (YouTube)",
     "url": "https://www.youtube.com/@DreamingSpanish",
     "description": "Comprehensible input yöntemiyle görsel destekli videolar."},
    {"language_code": "es", "category": "audio_practice", "title": "SpanishPod101",
     "url": "https://www.spanishpod101.com/",
     "description": "Podcast tabanlı telaffuz ve dinleme pratiği."},
    {"language_code": "es", "category": "general_review", "title": "Quizlet — Spanish",
     "url": "https://quizlet.com/subject/spanish/",
     "description": "Flashcard ve testlerle genel tekrar."},

    # ── Fransızca ──────────────────────────────────────────
    {"language_code": "fr", "category": "news_reading", "title": "Le français facile avec RFI",
     "url": "https://francaisfacile.rfi.fr/",
     "description": "Sadeleştirilmiş günlük haber bülteni ve transkriptler (B1-B2)."},
    {"language_code": "fr", "category": "technical_article", "title": "TV5Monde — Apprendre le français",
     "url": "https://apprendre.tv5monde.com/fr",
     "description": "Seviyeye göre sınıflandırılmış okuma-dinleme materyalleri."},
    {"language_code": "fr", "category": "video_analysis", "title": "Français Authentique (YouTube)",
     "url": "https://www.youtube.com/@francaisauthentique",
     "description": "Doğal konuşma temposunda dinleme pratiği."},
    {"language_code": "fr", "category": "audio_practice", "title": "Coffee Break French",
     "url": "https://coffeebreaklanguages.com/coffeebreakfrench/",
     "description": "Podcast tabanlı, kademeli Fransızca öğrenimi."},
    {"language_code": "fr", "category": "general_review", "title": "Quizlet — French",
     "url": "https://quizlet.com/subject/french/",
     "description": "Flashcard ve testlerle genel tekrar."},

    # ── Arapça ─────────────────────────────────────────────
    {"language_code": "ar", "category": "news_reading", "title": "Lingua.com — Arabic Reading",
     "url": "https://lingua.com/arabic/reading/",
     "description": "Seviyeye göre sınıflandırılmış kısa okuma metinleri."},
    {"language_code": "ar", "category": "technical_article", "title": "Al Jazeera (Arapça)",
     "url": "https://www.aljazeera.net/",
     "description": "Güncel olaylarla ileri seviye okuma pratiği."},
    {"language_code": "ar", "category": "video_analysis", "title": "Easy Arabic (YouTube)",
     "url": "https://easy-arabic.org/",
     "description": "Sokak röportajlarıyla Mısır/Filistin/Tunus lehçeleri, çift altyazılı."},
    {"language_code": "ar", "category": "audio_practice", "title": "ArabicPod101",
     "url": "https://www.arabicpod101.com/",
     "description": "Podcast tabanlı telaffuz ve dinleme pratiği (MSA + lehçeler)."},
    {"language_code": "ar", "category": "general_review", "title": "Quizlet — Arabic",
     "url": "https://quizlet.com/subject/arabic/",
     "description": "Flashcard ve testlerle genel tekrar."},
]


def seed():
    print(f"{len(RESOURCES)} kaynak yüklenecek...\n")
    inserted, skipped = 0, 0
    for r in RESOURCES:
        existing = (
            supabase_admin.table("learning_resources")
            .select("id")
            .eq("language_code", r["language_code"])
            .eq("category", r["category"])
            .eq("url", r["url"])
            .execute()
        )
        if existing.data:
            print(f"  ATLANDI (zaten var) [{r['language_code']}/{r['category']}] {r['title']}")
            skipped += 1
            continue
        try:
            supabase_admin.table("learning_resources").insert(r).execute()
            print(f"  OK [{r['language_code']}/{r['category']}] {r['title']}")
            inserted += 1
        except Exception as e:
            print(f"  HATA [{r['language_code']}/{r['category']}] {r['title']}: {e}")

    print(f"\nTamamlandı! {inserted} eklendi, {skipped} atlandı.")


if __name__ == "__main__":
    seed()
