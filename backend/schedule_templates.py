"""
schedule_templates.py

Madde 4 -- Calisma programi sablonlari (diger diller) kapsaminda hazirlandi.
(19 Agustos 2026)

web/src/lib/scheduleTemplates.ts ile ayni icerigin Python karsiligi --
seed_schedule.py'nin --lang parametresiyle farkli diller icin hizli test
seed'i atabilmesi icin.

NOT: Linkler Agustos 2026'da web aramasiyla spot-check edildi. Canliya
almadan once tek tek dogrulanmasi onerilir (ozellikle DE/FR podcast ve
JA haber linki).
"""

SUPPORTED_LANGS = ["en", "de", "fr", "es", "it", "ar", "ru", "ja"]

RTL_LANGS = ["ar"]

# Dilden bagimsiz haftalik yapi (page.tsx'teki "Yogun" sablonuyla ayni).
PROGRAM = [
    {"day_of_week": 1, "time_slot": "08:00", "activity": "Teknik Makale", "duration_min": 30},
    {"day_of_week": 1, "time_slot": "20:00", "activity": "LingoClip",     "duration_min": 20},
    {"day_of_week": 2, "time_slot": "08:00", "activity": "Haber Okuma",   "duration_min": 30},
    {"day_of_week": 2, "time_slot": "20:00", "activity": "Video Analizi", "duration_min": 25},
    {"day_of_week": 3, "time_slot": "08:00", "activity": "Teknik Makale", "duration_min": 30},
    {"day_of_week": 3, "time_slot": "20:00", "activity": "Podcast",       "duration_min": 20},
    {"day_of_week": 4, "time_slot": "08:00", "activity": "Haber Okuma",   "duration_min": 30},
    {"day_of_week": 4, "time_slot": "20:00", "activity": "Video Analizi", "duration_min": 25},
    {"day_of_week": 5, "time_slot": "08:00", "activity": "Teknik Makale", "duration_min": 30},
    {"day_of_week": 5, "time_slot": "20:00", "activity": "LingoClip",     "duration_min": 20},
    {"day_of_week": 6, "time_slot": "10:00", "activity": "Dizi/Film",     "duration_min": 45},
    {"day_of_week": 0, "time_slot": "10:00", "activity": "Genel Tekrar",  "duration_min": 45},
]

# Dil bazli kaynak linkleri. LingoClip / Genel Tekrar / Dizi-Film / Kelime
# Tekrari: uygulama-geneli araclar, tum dillerde ayni. Digerleri dile ozgu,
# ogrenci-dostu (learner-friendly) kaynaklar.
TASK_LINKS = {
    "en": {
        "Teknik Makale": "https://medium.com/tag/english-learning",
        "Haber Okuma":   "https://www.bbc.co.uk/learningenglish",
        "LingoClip":     "https://lingoclip.com/",
        "Video Analizi": "https://www.youtube.com/@TEDEd",
        "Genel Tekrar":  "https://quizlet.com/",
        "Kelime Tekrarı": "",
        "Dizi/Film":     "https://www.netflix.com/",
        "Podcast":       "https://www.bbc.co.uk/learningenglish/english/features/6-minute-english",
    },
    "de": {
        "Teknik Makale": "https://www.dw.com/de/deutsch-lernen/s-2469",
        "Haber Okuma":   "https://www.nachrichtenleicht.de/",
        "LingoClip":     "https://lingoclip.com/",
        "Video Analizi": "https://www.youtube.com/c/EasyGerman/videos",
        "Genel Tekrar":  "https://quizlet.com/",
        "Kelime Tekrarı": "",
        "Dizi/Film":     "https://www.netflix.com/",
        "Podcast":       "https://podcasts.apple.com/de/podcast/langsam-gesprochene-nachrichten-audios-dw-deutsch-lernen/id282930329",
    },
    "fr": {
        "Teknik Makale": "https://savoirs.rfi.fr/fr/apprendre-enseigner",
        "Haber Okuma":   "https://www.lemonde.fr/",
        "LingoClip":     "https://lingoclip.com/",
        "Video Analizi": "https://www.youtube.com/@EasyFrench",
        "Genel Tekrar":  "https://quizlet.com/",
        "Kelime Tekrarı": "",
        "Dizi/Film":     "https://www.netflix.com/",
        "Podcast":       "https://www.rfi.fr/fr/podcasts/",
    },
    "es": {
        "Teknik Makale": "https://www.newsinslowspanish.com/",
        "Haber Okuma":   "https://www.bbc.com/mundo",
        "LingoClip":     "https://lingoclip.com/",
        "Video Analizi": "https://www.youtube.com/@EasySpanish",
        "Genel Tekrar":  "https://quizlet.com/",
        "Kelime Tekrarı": "",
        "Dizi/Film":     "https://www.netflix.com/",
        "Podcast":       "https://www.newsinslowspanish.com/home/news/beginner",
    },
    "it": {
        "Teknik Makale": "https://www.newsinslowitalian.com/",
        "Haber Okuma":   "https://www.ansa.it/",
        "LingoClip":     "https://lingoclip.com/",
        "Video Analizi": "https://www.youtube.com/@EasyItalian",
        "Genel Tekrar":  "https://quizlet.com/",
        "Kelime Tekrarı": "",
        "Dizi/Film":     "https://www.netflix.com/",
        "Podcast":       "https://www.newsinslowitalian.com/home/news/beginner",
    },
    "ar": {
        "Teknik Makale": "https://www.aljazeera.net/",
        "Haber Okuma":   "https://www.bbc.com/arabic",
        "LingoClip":     "https://lingoclip.com/",
        "Video Analizi": "https://www.youtube.com/@LearnArabicwithMaha",
        "Genel Tekrar":  "https://quizlet.com/",
        "Kelime Tekrarı": "",
        "Dizi/Film":     "https://www.netflix.com/",
        "Podcast":       "https://www.arabicpod101.com/",
    },
    "ru": {
        "Teknik Makale": "https://www.russianwithmax.com/",
        "Haber Okuma":   "https://www.bbc.com/russian",
        "LingoClip":     "https://lingoclip.com/",
        "Video Analizi": "https://www.youtube.com/@EasyRussianVideos",
        "Genel Tekrar":  "https://quizlet.com/",
        "Kelime Tekrarı": "",
        "Dizi/Film":     "https://www.netflix.com/",
        "Podcast":       "https://textsinslowrussian.com/",
    },
    "ja": {
        "Teknik Makale": "https://nhkeasier.com/",
        "Haber Okuma":   "https://www3.nhk.or.jp/news/easy/",
        "LingoClip":     "https://lingoclip.com/",
        "Video Analizi": "https://www.youtube.com/@JapanesePod101",
        "Genel Tekrar":  "https://quizlet.com/",
        "Kelime Tekrarı": "",
        "Dizi/Film":     "https://www.netflix.com/",
        "Podcast":       "https://www.japanesepod101.com/",
    },
}


def program_for_lang(lang: str) -> list[dict]:
    """Verilen dile gore link_url alani doldurulmus PROGRAM listesini dondurur."""
    if lang not in TASK_LINKS:
        raise ValueError(f"Desteklenmeyen dil: {lang!r}. Desteklenenler: {SUPPORTED_LANGS}")
    links = TASK_LINKS[lang]
    return [
        {**entry, "link_url": links.get(entry["activity"], "")}
        for entry in PROGRAM
    ]
