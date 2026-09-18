"""
backend/seed_general_word_pool.py

Kelime tahmin oyunu için genel kelime havuzunu (general_word_pool tablosu)
doldurur. Bu script kullanıcı hesabı gerektirmez — service-role
(supabase_admin) client ile doğrudan tabloya yazar.

Anlam/örnek cümleleri UYDURULMAZ: mevcut app.services.dictionary_service
.lookup_word() fonksiyonu (Cambridge -> dictionaryapi.dev -> MyMemory
zinciri, kelime ekleme akışında zaten canlıda kullanılan aynı kod)
çağrılarak gerçek sözlük verisi çekilir. Bir kelime için anlam
bulunamazsa o kelime ATLANIR (tabloya yanlış/uydurma veri yazılmaz) ve
script sonunda "bulunamayan kelimeler" listesi olarak raporlanır.

Kapsam: source_lang='en', target_lang= TARGET_LANGS listesindeki her dil
(varsayılan: tr + de/fr/es/it/ar/ru/ja/pt + ko/zh — admin panelin "İçerik"
sayfasında eksik olarak işaretlenen diller). Aynı İngilizce kelime listesi
(~1300+ kelime, 18 Eylül 2026 genişletmesinden sonra) her hedef dil
için ayrı ayrı işlenir; anlam o dile çevrilir.

GÜNCELLEME (18 Eylül 2026 — kullanıcı isteği, "her seviye için en az 300
kelime" gereksinimi): BEGINNER_WORDS / INTERMEDIATE_WORDS / ADVANCED_WORDS
listeleri ~100'den 300+'a genişletildi (beginner ~494, intermediate ~372,
advanced ~456). Script'in geri kalanı (dictionary_service.lookup_word ile
gerçek sözlük verisi çekme, bulunamayan kelimeleri atlama) DEĞİŞMEDİ.

GÜNCELLEME (12 Eylül 2026, V2 öncelik #7 — "Yeni Diller: Korece + Çince"):
ko/zh eklendi. ÖNEMLİ SINIR: bu script SADECE source_lang='en' üretir —
yani "İngilizce kelime + Korece/Çince TANIM" (İngilizce öğrenen Korece/
Çince konuşanlar için) üretir, "Korece/Çince KELİME" (source_lang='ko'/'zh',
yani Korece/Çince'yi HEDEF DİL olarak öğrenmek için gereken kelime havuzu)
ÜRETMEZ — bkz. migration 068_add_korean_chinese_languages.sql'deki bilinçli
sınır notu. Bu script'i (tr/de/fr/es/it/ar/ru/ja/pt gibi) source_lang='en'
kapsamı için çalıştırmak, Korece/Çince ANA DİLİ olan kullanıcıların
İngilizce öğrenirken kendi dillerinde tanım görmesini sağlar; Korece/
Çince'yi bizzat ÖĞRENİLEN dil olarak seçen kullanıcılar için düello/kelime-
tahmin oyunu içeriği bu script'le gelmez, ayrı bir iş (source_lang='ko'/'zh'
üreten, muhtemelen farklı bir sözlük kaynağı gerektiren bir script) olarak
ele alınmalı.

Çalıştırma (tüm diller):
    cd backend
    venv\\Scripts\\activate      # Windows
    python seed_general_word_pool.py

Tek bir dil için çalıştırmak isterseniz (ör. sadece Korece):
    python seed_general_word_pool.py ko

Var olan (aynı source_lang + target_lang + word, case-insensitive)
kayıtları tekrar eklemez — script kesintiye uğrarsa güvenle tekrar
çalıştırılabilir, sadece eksik kalanlar işlenir.
"""

import asyncio
import sys

from app.core.database import supabase_admin
from app.services.dictionary_service import lookup_word

SOURCE_LANG = "en"
TARGET_LANGS = ["tr", "de", "fr", "es", "it", "ar", "ru", "ja", "pt", "ko", "zh"]

# Komut satırından tek dil verilirse sadece onu işle (ör: `python seed_general_word_pool.py ru`)
if len(sys.argv) > 1:
    TARGET_LANGS = [sys.argv[1]]

# Sözlük API'lerine nazik davranmak için istekler arası bekleme (saniye)
REQUEST_DELAY_SECONDS = 0.4

# ──────────────────────────────────────────────────────────────────────
# Kelime listesi: (word, difficulty_level)
# difficulty_level: "beginner" | "intermediate" | "advanced"
# Yaygın kullanım sıklığına göre kabaca 3 seviyeye ayrılmış ~300 kelime.
# ────────────────────────────────────────────────────────────────────

BEGINNER_WORDS = [
    "house", "water", "food", "family", "friend", "school", "work", "time",
    "day", "night", "morning", "evening", "big", "small", "good", "bad",
    "happy", "sad", "hot", "cold", "run", "walk", "eat", "drink", "sleep",
    "read", "write", "speak", "listen", "watch", "book", "table", "chair",
    "door", "window", "car", "bus", "train", "city", "country", "street",
    "money", "shop", "market", "phone", "computer", "letter", "name",
    "number", "color", "red", "blue", "green", "yellow", "black", "white",
    "mother", "father", "sister", "brother", "child", "baby", "man",
    "woman", "boy", "girl", "dog", "cat", "bird", "tree", "flower", "sun",
    "moon", "star", "sky", "rain", "snow", "wind", "summer", "winter",
    "spring", "autumn", "week", "month", "year", "hour", "minute",
    "breakfast", "lunch", "dinner", "kitchen", "bedroom", "bathroom",
    "garden", "park", "hospital", "doctor", "teacher", "student", "job",
    "music", "movie",
    "grandmother", "grandfather", "uncle", "aunt", "cousin", "neighbor",
    "husband", "wife", "son", "daughter", "teenager", "adult", "guest",
    "stranger", "colleague", "partner", "head", "hand", "foot", "leg", "arm",
    "eye", "ear", "nose", "mouth", "hair", "finger", "tooth", "back", "chest",
    "shoulder", "knee", "heart", "brain", "skin", "face", "neck", "stomach",
    "blood", "bread", "rice", "meat", "chicken", "fish", "egg", "milk",
    "cheese", "butter", "sugar", "salt", "pepper", "coffee", "tea", "juice",
    "fruit", "vegetable", "apple", "banana", "orange", "potato", "tomato",
    "onion", "carrot", "soup", "cake", "sandwich", "pizza", "salad", "cream",
    "shirt", "trousers", "dress", "skirt", "jacket", "coat", "shoes", "socks",
    "hat", "glasses", "ring", "bag", "wallet", "bed", "sofa", "lamp",
    "mirror", "clock", "key", "wall", "floor", "roof", "stairs", "shelf",
    "box", "bottle", "cup", "glass", "plate", "spoon", "fork", "knife",
    "pillow", "blanket", "towel", "soap", "brush", "comb", "airport",
    "station", "restaurant", "hotel", "bank", "church", "mosque", "library",
    "museum", "theater", "beach", "mountain", "river", "lake", "sea",
    "forest", "island", "village", "farm", "office", "factory", "bridge",
    "road", "bicycle", "motorcycle", "ship", "boat", "airplane", "taxi",
    "ticket", "map", "passport", "luggage", "suitcase", "horse", "cow",
    "sheep", "pig", "lion", "tiger", "elephant", "monkey", "rabbit", "mouse",
    "snake", "insect", "butterfly", "bee", "spider", "grass", "leaf", "stone",
    "rock", "sand", "ocean", "cloud", "fire", "ice", "earth", "world", "cook",
    "wash", "clean", "open", "close", "buy", "sell", "pay", "give", "take",
    "bring", "carry", "push", "pull", "throw", "catch", "jump", "climb",
    "swim", "fly", "drive", "ride", "stop", "start", "finish", "begin", "end",
    "wait", "help", "need", "want", "like", "love", "hate", "hope", "try",
    "learn", "teach", "study", "play", "sing", "dance", "laugh", "cry",
    "smile", "shout", "whisper", "ask", "answer", "tell", "talk", "call",
    "visit", "meet", "invite", "welcome", "thank", "forgive", "remember",
    "forget", "choose", "decide", "plan", "build", "break", "fix", "repair",
    "cut", "draw", "paint", "count", "add", "pour", "mix", "fill", "empty",
    "wear", "feel", "touch", "smell", "taste", "see", "look", "find", "lose",
    "win", "fail", "pass", "follow", "lead", "guide", "protect", "save",
    "spend", "borrow", "lend", "share", "own", "belong", "believe", "doubt",
    "worry", "relax", "rest", "wake", "arrive", "leave", "enter", "exit",
    "return", "stay", "move", "turn", "rise", "fall", "grow", "change",
    "continue", "repeat", "practice", "exercise", "travel", "explore",
    "young", "tall", "short", "wide", "narrow", "thick", "thin", "heavy",
    "light", "strong", "weak", "fast", "slow", "easy", "difficult", "hard",
    "soft", "dirty", "wet", "dry", "full", "rich", "poor", "cheap",
    "expensive", "quiet", "loud", "bright", "dark", "near", "far", "early",
    "late", "right", "wrong", "true", "false", "safe", "dangerous", "free",
    "busy", "tired", "hungry", "thirsty", "sick", "healthy", "beautiful",
    "ugly", "kind", "rude", "brave", "afraid", "polite", "honest", "funny",
    "boring", "interesting", "famous", "popular", "normal", "strange",
    "different", "same", "favorite", "careful", "careless", "today",
    "tomorrow", "yesterday", "weekend", "holiday", "birthday", "second",
    "noon", "midnight", "always", "never", "sometimes", "often", "usually",
    "already", "still", "soon", "later", "again", "once", "twice", "pen",
    "pencil", "paper", "page", "homework", "exam", "test", "grade",
    "classmate", "uniform", "playground", "meeting", "boss", "interview",
    "customer",
]

INTERMEDIATE_WORDS = [
    "however", "therefore", "although", "similar", "opportunity",
    "environment", "decision", "government", "economy", "increase",
    "decrease", "achieve", "develop", "improve", "suggest", "consider",
    "evidence", "research", "method", "result", "effect", "cause",
    "benefit", "challenge", "solution", "process", "system", "structure",
    "function", "purpose", "avoid", "prevent", "reduce", "produce",
    "provide", "require", "involve", "include", "exclude", "describe",
    "explain", "compare", "contrast", "analyze", "evaluate", "discuss",
    "argue", "claim", "assume", "predict", "estimate", "measure",
    "calculate", "organize", "manage", "control", "influence", "impact",
    "significant", "essential", "sufficient", "appropriate", "relevant",
    "obvious", "complex", "particular", "specific", "general",
    "individual", "various", "several", "entire", "previous", "current",
    "future", "recent", "immediate", "gradual", "temporary", "permanent",
    "available", "possible", "likely", "unlikely", "certain", "uncertain",
    "aware", "familiar", "curious", "confident", "anxious", "motivated",
    "exhausted", "frustrated", "satisfied", "disappointed", "surprised",
    "concerned", "determined", "flexible",
    "achievement", "advantage", "disadvantage", "ability", "skill",
    "knowledge", "experience", "education", "training", "career",
    "profession", "technology", "innovation", "invention", "discovery",
    "progress", "development", "growth", "expansion", "competition",
    "cooperation", "collaboration", "partnership", "agreement",
    "disagreement", "conflict", "dispute", "compromise", "communication",
    "conversation", "discussion", "presentation", "demonstration",
    "explanation", "description", "definition", "instruction", "guideline",
    "regulation", "restriction", "permission", "prohibition", "requirement",
    "qualification", "application", "submission", "approval", "rejection",
    "acceptance", "recommendation", "suggestion", "proposal", "initiative",
    "strategy", "tactic", "approach", "technique", "procedure", "protocol",
    "policy", "principle", "standard", "criterion", "category",
    "classification", "characteristic", "feature", "quality", "quantity",
    "proportion", "percentage", "ratio", "average", "statistic", "data",
    "information", "fact", "detail", "aspect", "factor", "element",
    "component", "ingredient", "material", "substance", "resource", "source",
    "origin", "background", "context", "situation", "condition",
    "circumstance", "scenario", "incident", "event", "occasion", "ceremony",
    "celebration", "festival", "tradition", "custom", "society", "community",
    "population", "generation", "citizen", "resident", "immigrant", "tourist",
    "visitor", "participant", "volunteer", "leader", "manager", "director",
    "employer", "supervisor", "assistant", "representative", "official",
    "authority", "institution", "corporation", "enterprise", "trade",
    "commerce", "investment", "budget", "expense", "income", "profit", "loss",
    "debt", "loan", "credit", "account", "transaction", "currency",
    "contract", "property", "ownership", "capital", "asset", "routine",
    "habit", "lifestyle", "attitude", "behavior", "personality", "character",
    "emotion", "feeling", "sensation", "impression", "opinion", "perspective",
    "viewpoint", "belief", "value", "moral", "ethic", "virtue", "tolerance",
    "patience", "honesty", "loyalty", "responsibility", "duty", "obligation",
    "privilege", "freedom", "equality", "justice", "fairness", "democracy",
    "election", "candidate", "campaign", "vote", "parliament", "council",
    "committee", "minister", "president", "ambassador", "embassy", "diplomat",
    "treaty", "alliance", "nation", "border", "territory", "region",
    "district", "province", "census", "survey", "questionnaire", "sample",
    "analysis", "assumption", "conclusion", "summary", "outline", "draft",
    "revision", "edition", "publication", "author", "editor", "journalist",
    "column", "headline", "broadcast", "channel", "audience", "viewer",
    "listener", "reader", "critic", "review", "rating", "award", "talent",
    "instinct", "intuition", "memory", "imagination", "creativity",
    "curiosity", "ambition", "motivation", "inspiration", "determination",
    "confidence", "courage", "humility", "generosity", "kindness", "sympathy",
    "compassion", "gratitude", "forgiveness", "apology", "excuse",
    "complaint", "criticism", "praise", "compliment", "insult", "argument",
    "debate", "consensus", "majority", "minority", "diversity", "inclusion",
    "identity", "heritage", "ancestor", "descendant", "ritual", "faith",
    "religion", "spirit", "soul", "philosophy", "logic", "reasoning",
    "intellect", "wisdom",
]

ADVANCED_WORDS = [
    "ambiguous", "meticulous", "ubiquitous", "paradox", "resilience",
    "plausible", "arbitrary", "coherent", "discrepancy", "eloquent",
    "pragmatic", "subtle", "tangible", "intangible", "inevitable",
    "redundant", "superficial", "profound", "comprehensive", "elaborate",
    "ostensibly", "inherently", "inadvertently", "notwithstanding",
    "nonetheless", "albeit", "whereby", "thereby", "henceforth",
    "subsequently", "consequently", "nevertheless", "furthermore",
    "moreover", "whereas", "encompass", "constitute", "undermine",
    "exacerbate", "mitigate", "alleviate", "facilitate", "corroborate",
    "substantiate", "refute", "contend", "postulate", "infer", "deduce",
    "extrapolate", "ascertain", "discern", "scrutinize", "elucidate",
    "delineate", "articulate", "epitomize", "exemplify", "juxtapose",
    "reconcile", "dichotomy", "hypothesis", "empirical", "theoretical",
    "ideological", "paradigm", "phenomenon", "anomaly", "catalyst",
    "precedent", "ramification", "repercussion", "implication",
    "connotation", "denotation", "nuance", "ambivalence", "apathy",
    "empathy", "skepticism", "cynicism", "altruism", "pragmatism",
    "autonomy", "sovereignty", "jurisdiction", "legislation",
    "litigation", "arbitration", "mediation", "negotiation", "diplomacy",
    "sanction", "embargo", "tariff", "subsidy", "deficit", "surplus",
    "inflation", "recession", "austerity",
    "tenacious", "audacious", "clandestine", "surreptitious", "perfunctory",
    "cursory", "vindictive", "obstinate", "belligerent", "conciliatory",
    "sycophantic", "obsequious", "pernicious", "insidious", "deleterious",
    "salubrious", "innocuous", "benign", "malicious", "capricious",
    "mercurial", "volatile", "stoic", "phlegmatic", "gregarious", "taciturn",
    "loquacious", "verbose", "terse", "laconic", "succinct", "prolix",
    "esoteric", "arcane", "abstruse", "cryptic", "enigmatic", "inscrutable",
    "equivocal", "unequivocal", "unambiguous", "categorical", "peremptory",
    "presumptuous", "impertinent", "audacity", "temerity", "trepidation",
    "consternation", "exasperation", "indignation", "vexation", "contentious",
    "controversial", "polarizing", "divisive", "schismatic", "heterodox",
    "orthodox", "dogmatic", "doctrinaire", "zealous", "fervent", "ardent",
    "indifferent", "apathetic", "listless", "languid", "torpid", "lethargic",
    "vigorous", "robust", "vigilant", "circumspect", "prudent", "judicious",
    "discerning", "perspicacious", "astute", "shrewd", "sagacious", "erudite",
    "scholarly", "pedantic", "didactic", "utilitarian", "altruistic",
    "egalitarian", "meritocratic", "hierarchical", "bureaucratic",
    "autocratic", "authoritarian", "totalitarian", "libertarian", "anarchic",
    "sovereign", "jurisdictional", "constitutional", "statutory", "judicial",
    "legislative", "executive", "adjudicate", "arbitrate", "mediate",
    "capitulate", "concede", "acquiesce", "relinquish", "forfeit",
    "confiscate", "expropriate", "allocate", "distribute", "disseminate",
    "propagate", "perpetuate", "proliferate", "diminish", "attenuate",
    "amplify", "augment", "supplement", "complement", "counteract",
    "neutralize", "nullify", "invalidate", "rebut", "contradict", "demarcate",
    "circumscribe", "exhaustive", "rudimentary", "elementary", "fundamental",
    "intrinsic", "extrinsic", "inherent", "innate", "acquired", "congenital",
    "hereditary", "genetic", "anecdotal", "speculative", "conjectural",
    "hypothetical", "axiomatic", "tautological", "paradoxical",
    "contradictory", "anomalous", "idiosyncratic", "peculiar",
    "quintessential", "emblematic", "archetypal", "prototypical", "exemplary",
    "obfuscate", "equivocate", "prevaricate", "dissemble", "vacillate",
    "deliberate", "ruminate", "contemplate", "cogitate", "conjecture",
    "surmise", "presume", "intuit", "apprehend", "comprehend", "construe",
    "interpret", "misconstrue", "misinterpret", "misrepresent", "distort",
    "exaggerate", "embellish", "fabricate", "falsify", "counterfeit",
    "plagiarize", "emulate", "replicate", "simulate", "approximate",
    "interpolate", "calibrate", "quantify", "systematize", "codify",
    "standardize", "homogenize", "diversify", "differentiate", "stratify",
    "categorize", "subdivide", "bifurcate", "polarize", "consolidate",
    "amalgamate", "merge", "integrate", "segregate", "isolate", "insulate",
    "sequester", "quarantine", "ostracize", "alienate", "estrange", "appease",
    "placate", "mollify", "pacify", "assuage", "soothe", "provoke",
    "instigate", "incite", "agitate", "galvanize", "mobilize", "rally",
    "muster", "convene", "congregate", "disperse", "disband", "dissolve",
    "terminate", "cease", "abate", "subside", "wane", "ebb", "dwindle",
    "escalate", "intensify", "burgeon", "flourish", "thrive", "prosper",
    "languish", "stagnate", "atrophy", "deteriorate", "decay", "corrode",
    "erode", "disintegrate", "crumble", "collapse", "surrender", "forgo",
    "renounce", "abdicate", "resign", "retract", "rescind", "revoke", "annul",
    "abrogate", "repeal", "overturn", "overrule", "supersede", "supplant",
    "displace", "dislodge", "extricate", "disentangle", "unravel", "untangle",
    "decipher", "decode", "encrypt", "encode", "transcribe", "translate",
    "paraphrase", "summarize", "condense", "expound", "expand", "digress",
    "deviate", "diverge", "converge", "coincide", "correlate", "correspond",
    "parallel", "resemble", "distinguish", "discriminate", "collate",
    "compile", "aggregate", "accumulate", "amass", "hoard", "stockpile",
    "apportion", "disburse", "remit", "reimburse", "compensate", "indemnify",
    "subsidize", "sponsor", "endow", "bequeath", "bestow", "confer", "grant",
    "allot", "ration", "curtail", "curb", "restrain", "constrain", "inhibit",
    "impede", "obstruct", "hinder", "thwart", "deter", "dissuade", "preclude",
    "forestall", "avert", "circumvent", "bypass", "evade", "elude", "eschew",
    "abstain", "refrain", "desist", "relent", "yield", "submit", "defer",
    "comply", "conform", "adhere", "abide",
]

WORDS = (
    [(w, "beginner") for w in BEGINNER_WORDS]
    + [(w, "intermediate") for w in INTERMEDIATE_WORDS]
    + [(w, "advanced") for w in ADVANCED_WORDS]
)


def word_exists(word: str, target_lang: str) -> bool:
    existing = (
        supabase_admin.table("general_word_pool")
        .select("id")
        .eq("source_lang", SOURCE_LANG)
        .eq("target_lang", target_lang)
        .ilike("word", word)
        .execute()
    )
    return bool(existing.data)


async def seed_language(target_lang: str) -> None:
    print(f"\n=== en -> {target_lang}: {len(WORDS)} kelime işlenecek ===\n")

    inserted, skipped_existing, not_found = 0, 0, []

    for word, level in WORDS:
        if word_exists(word, target_lang):
            skipped_existing += 1
            continue

        result = await lookup_word(word, SOURCE_LANG, target_lang)
        meanings = result.get("meanings") or []

        if not meanings:
            not_found.append(word)
            print(f"  [BULUNAMADI] {word} — {result.get('error')}")
            await asyncio.sleep(REQUEST_DELAY_SECONDS)
            continue

        first = meanings[0]
        meaning_native = (first.get("meaning_native") or "").strip()
        examples = first.get("examples") or []
        example = examples[0] if examples else None

        if not meaning_native:
            not_found.append(word)
            print(f"  [BULUNAMADI] {word} — çeviri boş döndü")
            await asyncio.sleep(REQUEST_DELAY_SECONDS)
            continue

        row = {
            "source_lang": SOURCE_LANG,
            "target_lang": target_lang,
            "word": word,
            "meaning": meaning_native,
            "example": example,
            "difficulty_level": level,
            "is_active": True,
        }

        insert_result = supabase_admin.table("general_word_pool").insert(row).execute()
        if insert_result.data:
            inserted += 1
            print(f"  [EKLENDI] {word} ({level}) -> {meaning_native}")
        else:
            not_found.append(word)
            print(f"  [HATA] {word} — insert başarısız")

        await asyncio.sleep(REQUEST_DELAY_SECONDS)

    print(f"\n── {target_lang} özeti ──")
    print(f"Eklendi: {inserted}")
    print(f"Zaten vardı (atlandı): {skipped_existing}")
    print(f"Bulunamadı/hata (atlandı): {len(not_found)}")
    if not_found:
        print("Bulunamayan kelimeler:", ", ".join(not_found))


async def seed() -> None:
    for lang in TARGET_LANGS:
        await seed_language(lang)
    print("\n=== Tüm diller tamamlandı ===")


if __name__ == "__main__":
    asyncio.run(seed())
