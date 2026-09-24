"""
backend/app/api/routes/games.py

Kelime tahmin oyunu endpoint'leri.

İki kelime kaynağı desteklenir (pool_source):
- "own" -> kullanıcının kendi words tablosu (o an öğrendiği/eklediği kelimeler)
- "general" -> general_word_pool (genel, ortak kelime havuzu, seed script ile doldurulur)

Kaynak havuzun boyutu sabit/sınırlı değildir: next-word her çağrıda o session'da
daha önce sorulmamış kelimeler arasından canlı sorgu ile seçilir. "own" için
kullanıcı kelime ekledikçe havuz büyür; "general" için seed script tekrar
çalıştırılarak istenildiği kadar kelime eklenebilir.

Altı oyun modu desteklenir:
- "multiple_choice" -> kelime gösterilir, doğru anlamı 4 seçenekten seçilir.
  Bu modda ayrıca `direction` (yön) seçilebilir:
    - "word_to_meaning" (varsayılan): kelime gösterilir, anlamı bulunur.
    - "meaning_to_word": anlam gösterilir, doğru kelime 4 seçenekten bulunur.
    - "definition_to_word" (Faz 2, monolingual): öğrenilen dildeki tanım
      gösterilir, doğru kelime (aynı dilde) 4 seçenekten bulunur. Sadece
      pool_source="general" ile çalışır — kullanıcının kendi "words"
      tablosunda tanım metni tutulmaz, sadece general_word_pool.definition
      doldurulur (backfill, 10 dilin tamamı için mevcuttur — bkz. seed script).
      NOT (7 Eylül 2026 düzeltmesi): bu mod başlangıçta sadece İngilizce için
      tasarlanmıştı; UI metinleri "İngilizce tanım" diyordu ama backfill artık
      10 dilin tamamını kapsıyor — metinler dil-nötr hale getirildi (bkz.
      mobile/web dirDefinitionToWordDesc).
  Üç yönün de XP değeri farklıdır (definition_to_word en zor kabul edilir,
  meaning_to_word ondan biraz daha kolay, çünkü öğrenilen dildeki kelimeyi
  üretmeyi/tanımayı gerektirirler).
- "wordle" (adam asmaca) -> anlam gösterilir, kelimenin harfleri tek tek
  tahmin edilerek bulunmaya çalışılır (her zaman meaning->word yönünde;
  Türkçe anlamlar genelde virgülle ayrılmış birden fazla kelime içerdiği için
  harf-harf tahmin modeline uygun değildir). Aktif turun durumu (hangi kelime
  seçildi, hangi harfler tahmin edildi, kaç yanlış hak kaldı)
  game_sessions.state (jsonb) alanında tutulur.
- "typing", "matching", "listening", "sprint" (Faz 3) -> dördü de next-word/attempt
  akışını kullanır (word_to_meaning yönünde); ek uç nokta/şema gerekmez.
  Doğruluk kontrolü (is_correct) istemci tarafında hesaplanıp /attempt'e
  gönderilir (multiple_choice'taki gibi) — "matching" dahil: 4 Eylül 2026'dan
  itibaren yanlış eşleştirmeler de /attempt'e gönderiliyor (önceden sadece
  doğru eşleşme gönderiliyordu, bu bir XP sömürüsüne yol açıyordu — bkz.
  LEXIS_XP_YENI_KURALLAR.md). "listening" kelimeyi istemci üzerinde
  (expo-speech) seslendirir; "sprint" ise "typing" ile aynı akışı süre
  sınırlı (60 sn) kullanır. XP değerleri xp_service.XP_AMOUNTS içinde ayrıca
  tanımlıdır (game_typing, game_matching, game_listening, game_sprint).

XP KURALI ("İlk Doğru Deneme", 4 Eylül 2026): /attempt endpoint'i, bir kelime
için XP vermeden önce bu session'da o kelime için DAHA ÖNCE kaydedilmiş bir
deneme olup olmadığını kontrol eder (bkz. _prior_attempt_count). Varsa —
yanlış bilinip sonra doğru bulunmuş olsa bile — XP verilmez, sadece skor
sayılır. İstemcinin gönderdiği attempts_count alanına güvenilmez; gerçek
sayı sunucudaki game_attempts kayıtlarından türetilir. Detay:
LEXIS_XP_YENI_KURALLAR.md
"""

import random
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.games import (
    AttemptCreate,
    AttemptResponse,
    Direction,
    FinishSessionResponse,
    GameMode,
    GameSessionCreate,
    GameSessionResponse,
    GameWordOption,
    GuessLetterRequest,
    GuessLetterResponse,
    NextWordResponse,
    PoolSource,
    WeakDifficultyItem,
    WeakDifficultyResult,
)
from app.services.spaced_repetition import calculate_next_review
from app.services.streak import update_streak
from app.services.weak_categories_service import get_weak_difficulty_levels
from app.services.xp_service import award_xp

router = APIRouter()

# Tek seferde çekilecek aday kelime sayısı üst sınırı (performans içindir,
# oyunun toplam kelime sayısını SINIRLAMAZ — havuzdaki her kelime, session
# başına en fazla bir kez sorulana kadar sırayla erişilebilir olmaya devam eder).
CANDIDATE_FETCH_LIMIT = 500
DISTRACTOR_FETCH_LIMIT = 30

# Adam asmaca (wordle) modu için izin verilen yanlış tahmin hakkı
MAX_WRONG_GUESSES = 6


def _get_profile_langs(user_id: str) -> tuple[str, str]:
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang, learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    data = profile.data or {}
    return data.get("learning_lang", "en"), data.get("native_lang", "tr")


def _get_current_level(user_id: str, learning_lang: str) -> str | None:
    """user_learning_languages.current_level'i okur (bkz. 079_user_level_
    tracking.sql / app/services/level_assessment_service.py -- periyodik
    olarak yukari/asagi guncellenen 'su anki' CEFR seviyesi). Satir yoksa
    veya hic placement yapilmamissa None doner -- bu durumda yeni kelime
    secimi bant filtresiz yapilir (bkz. _pick_band)."""
    rows = (
        supabase_admin.table("user_learning_languages")
        .select("current_level")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    return rows[0].get("current_level") if rows else None


# general_word_pool.difficulty_level 3 kademeli (beginner/intermediate/
# advanced) -- level_assessment_service.py'deki LEVEL_TO_BAND/BAND_ORDER ile
# AYNI esleme (bilerek kopyalandi, yukaridaki not).
_LEVEL_TO_BAND: dict[str, str] = {
    "a1": "beginner", "a2": "beginner",
    "b1": "intermediate", "b2": "intermediate",
    "c1": "advanced", "c2": "advanced",
}
_BAND_ORDER: list[str] = ["beginner", "intermediate", "advanced"]

# Kullanici istegi (18 Eylul 2026): "... diger seviyelerden kelimelere
# calismasi gerekecek" -- yani pratik SADECE kullanicinin kendi bandinda
# degil, komsu bantlardan da (agirlikli olarak) gelmeli. Kendi bandi %70,
# bir alt bant %20, bir ust bant %10 -- uc bantlarda (beginner/advanced)
# olmayan komsu bandin agirligi dusurulur ama kendi bandina EKLENMEZ (asagida
# sadece "adayi olan" bantlar tutulup weights yeniden normalize edilir --
# random.choices agirliklari otomatik normalize eder, elle toplam=1 sartina
# gerek yok).
_BAND_WEIGHTS: dict[str, float] = {"current": 0.70, "below": 0.20, "above": 0.10}


def _get_session(session_id: str, user_id: str) -> dict:
    result = (
        supabase_admin.table("game_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Oyun oturumu bulunamadı.")
    return result.data[0]


def _attempted_ids(session_id: str, field: str) -> list[str]:
    result = (
        supabase_admin.table("game_attempts")
        .select(field)
        .eq("session_id", session_id)
        .execute()
    )
    return [row[field] for row in (result.data or []) if row.get(field)]


# ── Adaptif Ogrenme Motoru Madde 1 (24 Eylul 2026) -- tekrar + yeni karisimi ──
# Onaylanan tasarim: gunluk calisma = vadesi gelen SM-2 tekrarlari (%70) +
# yeni kelimeler (%30). Tekrar kelimeleri kullanicinin `words` tablosundaki
# next_review_at <= simdi olan kelimeleridir; genel havuz oturumunda bunlar
# general_word_pool'daki karsiliklari uzerinden sorulur (boylece
# game_attempts.general_word_id ve _sync_word_progress akisi degismez,
# SM-2 guncellemesi otomatik olur). Vadesi gelen kelime yoksa oturum
# tamamen yeni kelimelerle devam eder.
REVIEW_SHARE = 0.70
DUE_WORDS_FETCH_LIMIT = 100
KNOWN_WORDS_FETCH_LIMIT = 3000


def _due_word_texts(user_id: str, learning_lang: str) -> list[str]:
    now_iso = datetime.now(UTC).isoformat()
    rows = (
        supabase_admin.table("words")
        .select("word")
        .eq("user_id", user_id)
        .eq("source_lang", learning_lang)
        .neq("status", "archived")
        .lte("next_review_at", now_iso)
        .order("next_review_at")
        .limit(DUE_WORDS_FETCH_LIMIT)
        .execute()
        .data
    ) or []
    return [r["word"] for r in rows if r.get("word")]


def _known_word_texts(user_id: str, learning_lang: str) -> set[str]:
    rows = (
        supabase_admin.table("words")
        .select("word")
        .eq("user_id", user_id)
        .eq("source_lang", learning_lang)
        .limit(KNOWN_WORDS_FETCH_LIMIT)
        .execute()
        .data
    ) or []
    return {r["word"].strip().lower() for r in rows if r.get("word")}


def _general_pool_query(learning_lang: str, native_lang: str, attempted: list[str], direction: str):
    query = (
        supabase_admin.table("general_word_pool")
        .select("id, word, meaning, example, definition, difficulty_level")
        .eq("source_lang", learning_lang)
        .eq("target_lang", native_lang)
        .eq("is_active", True)
    )
    if attempted:
        query = query.not_.in_("id", attempted)
    if direction == Direction.definition_to_word.value:
        # Sadece tanımı backfill edilmiş kelimeler bu yönde sorulabilir.
        query = query.not_.is_("definition", "null")
    return query


def _band_count(
    learning_lang: str, native_lang: str, attempted: list[str], direction: str, band: str | None
) -> int:
    query = (
        supabase_admin.table("general_word_pool")
        .select("id", count="exact")
        .eq("source_lang", learning_lang)
        .eq("target_lang", native_lang)
        .eq("is_active", True)
    )
    if attempted:
        query = query.not_.in_("id", attempted)
    if direction == Direction.definition_to_word.value:
        query = query.not_.is_("definition", "null")
    if band:
        query = query.eq("difficulty_level", band)
    return query.limit(1).execute().count or 0


def _pick_band(current_level: str | None) -> str | None:
    """current_level'e gore agirlikli bant secer (kendi %70 / alt %20 /
    ust %10 -- _BAND_WEIGHTS). Seviye bilinmiyorsa None (bant filtresi yok)."""
    band = _LEVEL_TO_BAND.get(current_level or "")
    if band is None:
        return None
    idx = _BAND_ORDER.index(band)
    options: list[tuple[str, float]] = [(band, _BAND_WEIGHTS["current"])]
    if idx > 0:
        options.append((_BAND_ORDER[idx - 1], _BAND_WEIGHTS["below"]))
    if idx < len(_BAND_ORDER) - 1:
        options.append((_BAND_ORDER[idx + 1], _BAND_WEIGHTS["above"]))
    bands, weights = zip(*options)
    return random.choices(bands, weights=weights, k=1)[0]


def _random_window(
    learning_lang: str, native_lang: str, attempted: list[str], direction: str, band: str | None
) -> list[dict]:
    """Bant icinden RASTGELE bir ofsetle CANDIDATE_FETCH_LIMIT'lik pencere
    ceker.

    24 Eylul 2026 HATA DUZELTMESI: eskiden aday sorgusu siralamasiz
    .limit(CANDIDATE_FETCH_LIMIT) ile yapiliyordu -> Postgres her seferinde
    AYNI fiziksel ilk satirlari donduruyordu. Uretimde en-tr cevaplarinin
    %60'i havuzun ilk 200 satirindan geliyordu, 1.322 kelimenin sadece
    501'i hic gorulmustu. Ayni kelimelerin tekrar tekrar gelmesi hem
    cesitliligi oldurur hem de dogruluk oranini sisirip seviye
    degerlendirmesini yaniltir."""
    total = _band_count(learning_lang, native_lang, attempted, direction, band)
    if total == 0:
        return []
    offset = random.randint(0, max(0, total - CANDIDATE_FETCH_LIMIT))
    query = _general_pool_query(learning_lang, native_lang, attempted, direction)
    if band:
        query = query.eq("difficulty_level", band)
    return (
        query.order("id").range(offset, offset + CANDIDATE_FETCH_LIMIT - 1).execute().data
    ) or []


# "Cumle Kurma" (24 Eylul 2026, Madde 2 -- ucuncu secim) icin sabitler --
# general_word_pool.example zaten dogal kaynak (Cambridge-tabanli seed,
# oturumda canli SQL ile dogrulandi: 9 dilde toplam binlerce "temiz" -- kisa,
# tam, egik cizgi/parantez/esittir icermeyen -- ornek cumle var). Cok kisa
# ornekler (2-3 kelime) yeterince "kurulacak" bir cumle olmuyor, cok uzunlar
# (10+) mobilde tek satira/ekrana sigmiyor.
SENTENCE_MIN_WORDS = 4
SENTENCE_MAX_WORDS = 9


def _choose_sentence_word(learning_lang: str, native_lang: str, attempted: list[str]) -> dict | None:
    """sentence_building modu icin TEMIZ (kisa, tam, alternatif/aciklama
    icermeyen) bir ornek cumleye sahip kelime secer. _random_window'daki
    AYNI "rastgele ofsetli pencere" deseni (Postgres'in her seferinde ayni
    fiziksel ilk satirlari donmesini onlemek icin, bkz. o fonksiyonun 24
    Eylul 2026 hata duzeltmesi notu)."""
    query = (
        supabase_admin.table("general_word_pool")
        .select("id, word, meaning, example")
        .eq("source_lang", learning_lang)
        .eq("target_lang", native_lang)
        .eq("is_active", True)
        .not_.is_("example", "null")
        .not_.like("example", "%/%")
        .not_.like("example", "%(%")
        .not_.like("example", "%=%")
    )
    if attempted:
        query = query.not_.in_("id", attempted)

    count_query = (
        supabase_admin.table("general_word_pool")
        .select("id", count="exact")
        .eq("source_lang", learning_lang)
        .eq("target_lang", native_lang)
        .eq("is_active", True)
        .not_.is_("example", "null")
        .not_.like("example", "%/%")
        .not_.like("example", "%(%")
        .not_.like("example", "%=%")
    )
    if attempted:
        count_query = count_query.not_.in_("id", attempted)
    total = count_query.limit(1).execute().count or 0
    if total == 0:
        return None

    offset = random.randint(0, max(0, total - CANDIDATE_FETCH_LIMIT))
    rows = (
        query.order("id").range(offset, offset + CANDIDATE_FETCH_LIMIT - 1).execute().data
    ) or []

    candidates = [
        r for r in rows
        if SENTENCE_MIN_WORDS <= len((r.get("example") or "").split()) <= SENTENCE_MAX_WORDS
    ]
    if not candidates:
        return None
    return random.choice(candidates)


def _choose_general_word(
    user_id: str,
    learning_lang: str,
    native_lang: str,
    attempted: list[str],
    direction: str,
) -> dict | None:
    # 1) Vadesi gelen tekrar kelimesi (%70 olasilikla)
    if random.random() < REVIEW_SHARE:
        due = _due_word_texts(user_id, learning_lang)
        if due:
            review_candidates = (
                _general_pool_query(learning_lang, native_lang, attempted, direction)
                .in_("word", due)
                .limit(CANDIDATE_FETCH_LIMIT)
                .execute()
                .data
            ) or []
            if review_candidates:
                return random.choice(review_candidates)

    # 2) Yeni kelime: seviyeye gore agirlikli bant + rastgele pencere,
    #    kullanicinin kelime hazinesinde zaten olanlar tercihen elenir.
    current_level = _get_current_level(user_id, learning_lang)
    band = _pick_band(current_level)
    candidates = _random_window(learning_lang, native_lang, attempted, direction, band)
    if not candidates and band is not None:
        candidates = _random_window(learning_lang, native_lang, attempted, direction, None)
    if not candidates:
        return None
    known = _known_word_texts(user_id, learning_lang)
    fresh = [c for c in candidates if (c.get("word") or "").strip().lower() not in known]
    return random.choice(fresh or candidates)


def _prior_attempt_count(
    session_id: str, word_id: str | None, general_word_id: str | None
) -> int:
    """Bu session'da bu kelime için DAHA ÖNCE kaydedilmiş deneme sayısı.

    XP KURALI (4 Eylül 2026 — "İlk Doğru Deneme" kararı): XP sadece bu sayı
    0 iken (yani bu, o kelime için sunucunun gördüğü ilk deneme ise) verilir.
    İstemcinin gönderdiği `attempts_count` alanına KASITLI OLARAK güvenilmiyor
    (istemci taraflı sayaç manipülasyona açık) — gerçek sayı burada, sunucunun
    kendi `game_attempts` kayıtlarından sayılıyor. Bkz. LEXIS_XP_YENI_KURALLAR.md.
    """
    # NOT: `count="exact"` yerine kasıtlı olarak `.select(...).execute()` +
    # `len(result.data)` kullanılıyor — bu dosyadaki `_attempted_ids` ile
    # aynı, halihazırda kanıtlanmış desen (bkz. yukarısı); count parametresi
    # kurulu supabase-py sürümünde test edilmedi, riske girilmedi.
    query = supabase_admin.table("game_attempts").select("id").eq(
        "session_id", session_id
    )
    if word_id:
        query = query.eq("word_id", word_id)
    else:
        query = query.eq("general_word_id", general_word_id)
    result = query.execute()
    return len(result.data or [])


def _build_options(correct_text: str, distractor_texts: list[str]) -> list[GameWordOption]:
    picks = random.sample(distractor_texts, min(3, len(distractor_texts)))
    texts = [correct_text] + picks
    random.shuffle(texts)
    return [GameWordOption(id=str(i), text=t) for i, t in enumerate(texts)]


def _reveal_pattern(word: str, guessed_letters: list[str]) -> str:
    """'apple', ['a','p'] -> 'a p p _ _' (harfler arasında boşlukla, kolay okunsun diye)."""
    guessed_lower = {g.lower() for g in guessed_letters}
    chars = []
    for ch in word:
        if not ch.isalpha() or ch.lower() in guessed_lower:
            chars.append(ch)
        else:
            chars.append("_")
    return " ".join(chars)


def _fetch_word_text(word_id: str | None, general_word_id: str | None) -> str:
    if word_id:
        row = supabase_admin.table("words").select("word").eq("id", word_id).single().execute()
    else:
        row = (
            supabase_admin.table("general_word_pool")
            .select("word")
            .eq("id", general_word_id)
            .single()
            .execute()
        )
    if not row.data:
        raise HTTPException(status_code=404, detail="Kelime bulunamadı.")
    return row.data["word"]


# KULLANICI İSTEĞİ (7 Eylül 2026): "hangi oyunu oynuyorsam kesinlikle benim
# doğru bildiğim kelimeler hazinemde olsun ... yanlış bildiklerim önüme
# tekrar düşsün". Önceden submit_attempt/guess_letter sadece game_attempts'e
# yazıp XP veriyordu; `words` tablosuna (kelime hazinesi + istatistikler +
# spaced repetition) HİÇ dokunmuyordu — bu yüzden oyunlarda doğru bilinen
# genel havuz kelimeleri hazineye hiç eklenmiyor, "own" havuzundaki
# kelimeler de oyun sırasında yanlış bilinse bile tekrar rotasyonuna
# girmiyordu (sadece flashcard/review endpoint'i spaced repetition
# güncelliyordu). Bu fonksiyon her attempt sonrası çağrılarak iki tabloyu
# tutarlı hale getirir:
#   - pool_source="own" (word_id dolu): kelime zaten hazinede — her denemede
#     calculate_next_review ile durumu güncellenir (yanlışsa "learning"a
#     döner ve next_review_at yakınlaşır -> flashcard'larda tekrar önüne düşer).
#   - pool_source="general" (general_word_id dolu): kelime hazinede yoksa
#     SADECE doğru bilindiğinde otomatik eklenir (kullanıcı isteği "doğru
#     bildiğim kelimeler" ile sınırlı); zaten hazindeyse (daha önce eklenmişse)
#     her denemede normal şekilde güncellenir.
def _sync_word_progress(
    user_id: str, word_id: str | None, general_word_id: str | None, is_correct: bool
) -> None:
    if word_id:
        existing = (
            supabase_admin.table("words")
            .select("*")
            .eq("id", word_id)
            .eq("user_id", user_id)
            .execute()
        ).data
        if not existing:
            return
        row = existing[0]
    else:
        pool_row = (
            supabase_admin.table("general_word_pool")
            .select("word, meaning, example, definition, source_lang, target_lang")
            .eq("id", general_word_id)
            .single()
            .execute()
        ).data
        if not pool_row:
            return

        existing = (
            supabase_admin.table("words")
            .select("*")
            .eq("user_id", user_id)
            .ilike("word", pool_row["word"])
            .eq("source_lang", pool_row["source_lang"])
            .execute()
        ).data
        if existing:
            row = existing[0]
            word_id = row["id"]
        elif is_correct:
            insert_row = {
                "user_id": user_id,
                "word": pool_row["word"],
                "meaning": pool_row["meaning"],
                "meaning_native": pool_row["meaning"],
                "meaning_target": pool_row.get("definition"),
                "example": pool_row.get("example"),
                "source_lang": pool_row["source_lang"],
                "target_lang": pool_row["target_lang"],
            }
            insert_row.update(calculate_next_review(insert_row, True))
            supabase_admin.table("words").insert(insert_row).execute()
            return
        else:
            # Yanlış bilindi ve kelime henüz hazinede değil -> eklenecek/
            # geri döndürülecek bir şey yok, sessizce çık.
            return

    supabase_admin.table("words").update(
        calculate_next_review(row, is_correct)
    ).eq("id", word_id).execute()


@router.post("/sessions", response_model=GameSessionResponse, status_code=201)
async def create_session(
    session_in: GameSessionCreate,
    current_user=Depends(get_current_user),
):
    if (
        session_in.direction == Direction.definition_to_word
        and session_in.pool_source == PoolSource.own
    ):
        raise HTTPException(
            status_code=422,
            detail="Bu yön (tanımdan kelime bulma) sadece genel kelime havuzuyla kullanılabilir, "
            "kendi kelimelerinde tanım metni tutulmuyor.",
        )

    # Cümle Kurma (24 Eylül 2026, Madde 2) — sadece genel havuzla çalışır:
    # temiz/kısa örnek cümle filtresi general_word_pool'un Cambridge-tabanlı
    # seed verisine dayanıyor, kullanıcının kendi "words" tablosundaki
    # örnekler bu şekilde kürate edilmemiş.
    if session_in.mode == GameMode.sentence_building and session_in.pool_source == PoolSource.own:
        raise HTTPException(
            status_code=422,
            detail="Cümle kurma modu sadece genel kelime havuzuyla kullanılabilir.",
        )

    # 24 Eylul 2026 HATA DUZELTMESI: game_sessions.learning_lang hic
    # yazilmiyordu (uretimde son 30 gunun 202 oturumunun 0'inda dolu).
    # level_assessment_service.py oyun dogrulugunu TAM bu kolona gore
    # filtreledigi icin dinamik seviye degerlendirmesi hic veri bulamiyordu.
    learning_lang, _ = _get_profile_langs(current_user.id)
    row = {
        "user_id": current_user.id,
        "mode": session_in.mode.value,
        "pool_source": session_in.pool_source.value,
        "direction": session_in.direction.value,
        "score": 0,
        "xp_earned": 0,
        "learning_lang": learning_lang,
    }
    result = supabase_admin.table("game_sessions").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Oturum oluşturulamadı.")
    return result.data[0]


@router.get("/sessions/{session_id}/next-word", response_model=NextWordResponse)
async def next_word(
    session_id: str,
    current_user=Depends(get_current_user),
):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    pool_source = session["pool_source"]
    mode = session["mode"]
    direction = session.get("direction", Direction.word_to_meaning.value)

    if pool_source == "own":
        attempted = _attempted_ids(session_id, "word_id")
        query = (
            supabase_admin.table("words")
            .select("id, word, meaning, meaning_native, example, next_review_at")
            .eq("user_id", current_user.id)
        )
        if attempted:
            query = query.not_.in_("id", attempted)
        candidates = (query.limit(CANDIDATE_FETCH_LIMIT).execute().data) or []

        if not candidates:
            return NextWordResponse(finished=True)

        # 24 Eylul 2026 -- kendi kelimelerinde de vadesi gelen SM-2
        # tekrarlari %70 olasilikla once sorulur.
        now_iso = datetime.now(UTC).isoformat()
        due = [c for c in candidates if c.get("next_review_at") and c["next_review_at"] <= now_iso]
        if due and random.random() < REVIEW_SHARE:
            chosen = random.choice(due)
        else:
            chosen = random.choice(candidates)
        meaning_text = chosen.get("meaning_native") or chosen.get("meaning")
        chosen_word_id = chosen["id"]
        chosen_general_word_id = None
    else:
        # pool_source == "general"
        learning_lang, native_lang = _get_profile_langs(current_user.id)
        attempted = _attempted_ids(session_id, "general_word_id")
        if mode == "sentence_building":
            # 24 Eylul 2026, Madde 2 -- ucuncu secim: temiz (kisa, tam) bir
            # ornek cumleye sahip kelime secilir -- bkz. _choose_sentence_word().
            chosen = _choose_sentence_word(learning_lang, native_lang, attempted)
            if chosen is None:
                return NextWordResponse(finished=True)
            meaning_text = chosen["meaning"]
        else:
            # 24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 1: vadesi gelen
            # tekrarlar (%70) + seviyeye gore agirlikli, rastgele pencereden
            # yeni kelimeler (%30). Ayrinti: _choose_general_word().
            chosen = _choose_general_word(
                current_user.id, learning_lang, native_lang, attempted, direction
            )
            if chosen is None:
                return NextWordResponse(finished=True)
            meaning_text = (
                chosen.get("definition") if direction == Direction.definition_to_word.value
                else chosen["meaning"]
            )
        chosen_word_id = None
        chosen_general_word_id = chosen["id"]

    # ── wordle (adam asmaca) modu: kelime metni İSTEMCİYE GÖNDERİLMEZ ──
    # (her zaman meaning->word yönünde çalışır, direction alanı burada kullanılmaz)
    if mode == "wordle":
        new_state = {
            "current_word_id": chosen_word_id,
            "current_general_word_id": chosen_general_word_id,
            "guessed_letters": [],
            "wrong_guesses": 0,
        }
        supabase_admin.table("game_sessions").update({"state": new_state}).eq(
            "id", session_id
        ).execute()

        word_text = chosen["word"]
        return NextWordResponse(
            finished=False,
            word_id=chosen_word_id,
            general_word_id=chosen_general_word_id,
            meaning=meaning_text,
            word_length=len(word_text),
            revealed=_reveal_pattern(word_text, []),
            max_wrong_guesses=MAX_WRONG_GUESSES,
        )

    # ── sentence_building (cümle kurma) modu: DOĞRU sırada tokenlar
    # gönderilir (word_to_meaning'de kelimenin kendisinin gönderilmesiyle
    # AYNI güven modeli) -- istemci kendi karıştırır, kendi kontrol eder,
    # submit_attempt'e is_correct olarak kendi bildirir. ──
    if mode == "sentence_building":
        return NextWordResponse(
            finished=False,
            general_word_id=chosen_general_word_id,
            meaning=meaning_text,
            example=chosen.get("example"),
            sentence_tokens=(chosen.get("example") or "").split(),
        )

    # ── multiple_choice modu (direction'a göre iki farklı yön) ──
    options = None
    if mode == "multiple_choice":
        if direction in (Direction.meaning_to_word.value, Direction.definition_to_word.value):
            # Anlam VEYA tanım gösterilir, doğru KELİME 4 seçenekten bulunur.
            # (definition_to_word'de pool_source her zaman "general" — create_session'da
            # doğrulanıyor — bu yüzden "own" dalı burada pratikte hiç tetiklenmez.)
            correct_text = chosen["word"]
            if pool_source == "own":
                distractor_query = (
                    supabase_admin.table("words")
                    .select("id, word")
                    .eq("user_id", current_user.id)
                    .neq("id", chosen["id"])
                    .limit(DISTRACTOR_FETCH_LIMIT)
                )
                distractor_rows = distractor_query.execute().data or []
                distractor_texts = [d["word"] for d in distractor_rows]
            else:
                learning_lang, native_lang = _get_profile_langs(current_user.id)
                distractor_query = (
                    supabase_admin.table("general_word_pool")
                    .select("id, word")
                    .eq("source_lang", learning_lang)
                    .eq("target_lang", native_lang)
                    .neq("id", chosen["id"])
                    .limit(DISTRACTOR_FETCH_LIMIT)
                )
                distractor_rows = distractor_query.execute().data or []
                distractor_texts = [d["word"] for d in distractor_rows]
            options = _build_options(correct_text, distractor_texts)
        else:
            # word_to_meaning (varsayılan): kelime gösterilir, doğru ANLAM 4 seçenekten bulunur.
            if pool_source == "own":
                distractor_query = (
                    supabase_admin.table("words")
                    .select("id, meaning, meaning_native")
                    .eq("user_id", current_user.id)
                    .neq("id", chosen["id"])
                    .limit(DISTRACTOR_FETCH_LIMIT)
                )
                distractor_rows = distractor_query.execute().data or []
                distractor_texts = [
                    (d.get("meaning_native") or d.get("meaning")) for d in distractor_rows
                ]
            else:
                learning_lang, native_lang = _get_profile_langs(current_user.id)
                distractor_query = (
                    supabase_admin.table("general_word_pool")
                    .select("id, meaning")
                    .eq("source_lang", learning_lang)
                    .eq("target_lang", native_lang)
                    .neq("id", chosen["id"])
                    .limit(DISTRACTOR_FETCH_LIMIT)
                )
                distractor_rows = distractor_query.execute().data or []
                distractor_texts = [d["meaning"] for d in distractor_rows]
            options = _build_options(meaning_text, distractor_texts)

    return NextWordResponse(
        finished=False,
        word_id=chosen_word_id,
        general_word_id=chosen_general_word_id,
        word=chosen["word"],
        meaning=meaning_text,
        example=chosen.get("example"),
        options=options,
        direction=direction if mode == "multiple_choice" else None,
    )


@router.post("/sessions/{session_id}/attempt", response_model=AttemptResponse, status_code=201)
async def submit_attempt(
    session_id: str,
    attempt_in: AttemptCreate,
    current_user=Depends(get_current_user),
):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    if not attempt_in.word_id and not attempt_in.general_word_id:
        raise HTTPException(status_code=422, detail="word_id veya general_word_id gerekli.")

    xp_awarded = 0
    leveled_up = False
    new_level = None

    # "İlk Doğru Deneme" kuralı (4 Eylül 2026): bu kelime için sunucunun daha
    # önce kaydettiği bir deneme varsa (doğru ya da yanlış fark etmez), bu
    # sefer doğru bilinse bile XP verilmez — sadece skor/ilerleme için sayılır.
    # Detay ve gerekçe: LEXIS_XP_YENI_KURALLAR.md
    prior_attempts = _prior_attempt_count(
        session_id, attempt_in.word_id, attempt_in.general_word_id
    )
    is_first_attempt = prior_attempts == 0

    if attempt_in.is_correct and is_first_attempt:
        # multiple_choice modunda yöne göre farklı XP kaynağı kullanılır
        # (definition_to_word en zor kabul edilir, meaning_to_word ondan
        # biraz daha kolay — ikisi de word_to_meaning'den daha fazla XP verir).
        session_direction = session.get("direction")
        if session["mode"] == "multiple_choice" and session_direction == Direction.definition_to_word.value:
            source_type = "game_multiple_choice_definition"
        elif session["mode"] == "multiple_choice" and session_direction == Direction.meaning_to_word.value:
            source_type = "game_multiple_choice_reverse"
        else:
            source_type = f"game_{session['mode']}"

        xp_result = await award_xp(
            user_id=current_user.id,
            source_type=source_type,  # type: ignore[arg-type]
            source_id=session_id,
        )
        xp_awarded = xp_result.amount_awarded
        leveled_up = xp_result.leveled_up
        new_level = xp_result.level

    attempt_row = {
        "session_id": session_id,
        "word_id": attempt_in.word_id,
        "general_word_id": attempt_in.general_word_id,
        "is_correct": attempt_in.is_correct,
        "attempts_count": prior_attempts + 1,
        "time_taken_ms": attempt_in.time_taken_ms,
        "xp_awarded": xp_awarded,
    }
    attempt_result = supabase_admin.table("game_attempts").insert(attempt_row).execute()
    if not attempt_result.data:
        raise HTTPException(status_code=500, detail="Deneme kaydedilemedi.")

    # Hazine/istatistik/spaced-repetition senkronizasyonu — bkz. yukarısı.
    _sync_word_progress(
        current_user.id, attempt_in.word_id, attempt_in.general_word_id, attempt_in.is_correct
    )

    # Seri (streak) güncelle — Bug (9 Eylül 2026): bu çağrı hiç yoktu, sadece
    # words.py'deki eski flashcard-review akışı update_streak() çağırıyordu.
    # Sonuç: oyun modlarından (Çoktan Seçmeli/Adam Asmaca) XP kazanılıyor ama
    # seri sayacı hiç ilerlemiyordu — "her gün giriyorum ama seri 0 gösteriyor"
    # şikayetinin kök nedeni buydu.
    game_learning_lang, _ = _get_profile_langs(current_user.id)
    await update_streak(current_user.id, "word_reviewed", learning_lang=game_learning_lang)

    new_score = session["score"] + (1 if attempt_in.is_correct else 0)
    new_xp_earned = session["xp_earned"] + xp_awarded
    supabase_admin.table("game_sessions").update(
        {"score": new_score, "xp_earned": new_xp_earned}
    ).eq("id", session_id).execute()

    return AttemptResponse(
        id=attempt_result.data[0]["id"],
        is_correct=attempt_in.is_correct,
        xp_awarded=xp_awarded,
        session_score=new_score,
        leveled_up=leveled_up,
        new_level=new_level,
    )


@router.post(
    "/sessions/{session_id}/guess-letter",
    response_model=GuessLetterResponse,
    status_code=201,
)
async def guess_letter(
    session_id: str,
    req: GuessLetterRequest,
    current_user=Depends(get_current_user),
):
    """Adam asmaca (wordle) modunda tek bir harf tahmini gönderir."""
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")
    if session["mode"] != "wordle":
        raise HTTPException(status_code=400, detail="Bu endpoint sadece wordle modu içindir.")

    state = session.get("state") or {}
    word_id = state.get("current_word_id")
    general_word_id = state.get("current_general_word_id")
    if not word_id and not general_word_id:
        raise HTTPException(
            status_code=400, detail="Aktif bir tur yok, önce next-word çağırın."
        )

    word_text = _fetch_word_text(word_id, general_word_id)
    letter = req.letter.strip().lower()
    if not letter:
        raise HTTPException(status_code=422, detail="Geçerli bir harf girin.")

    guessed = list(state.get("guessed_letters", []))
    wrong_guesses = int(state.get("wrong_guesses", 0))
    correct = letter in word_text.lower()

    if letter not in guessed:
        guessed.append(letter)
        if not correct:
            wrong_guesses += 1

    revealed = _reveal_pattern(word_text, guessed)
    is_complete = "_" not in revealed
    is_game_over = wrong_guesses >= MAX_WRONG_GUESSES and not is_complete
    round_ended = is_complete or is_game_over

    xp_awarded = 0
    leveled_up = False
    new_level = None

    if round_ended:
        if is_complete:
            xp_result = await award_xp(
                user_id=current_user.id,
                source_type="game_wordle",
                source_id=session_id,
            )
            xp_awarded = xp_result.amount_awarded
            leveled_up = xp_result.leveled_up
            new_level = xp_result.level

        supabase_admin.table("game_attempts").insert(
            {
                "session_id": session_id,
                "word_id": word_id,
                "general_word_id": general_word_id,
                "is_correct": is_complete,
                "attempts_count": len(guessed),
                "xp_awarded": xp_awarded,
            }
        ).execute()

        # Hazine/istatistik/spaced-repetition senkronizasyonu — bkz. yukarısı.
        _sync_word_progress(current_user.id, word_id, general_word_id, is_complete)

        # Seri (streak) güncelle — bkz. submit_attempt'teki not (9 Eylül 2026 bug fix).
        game_learning_lang, _ = _get_profile_langs(current_user.id)
        await update_streak(current_user.id, "word_reviewed", learning_lang=game_learning_lang)

        new_score = session["score"] + (1 if is_complete else 0)
        new_xp_earned = session["xp_earned"] + xp_awarded
        supabase_admin.table("game_sessions").update(
            {
                "score": new_score,
                "xp_earned": new_xp_earned,
                "state": {
                    "current_word_id": None,
                    "current_general_word_id": None,
                    "guessed_letters": guessed,
                    "wrong_guesses": wrong_guesses,
                },
            }
        ).eq("id", session_id).execute()
    else:
        supabase_admin.table("game_sessions").update(
            {
                "state": {
                    "current_word_id": word_id,
                    "current_general_word_id": general_word_id,
                    "guessed_letters": guessed,
                    "wrong_guesses": wrong_guesses,
                }
            }
        ).eq("id", session_id).execute()

    return GuessLetterResponse(
        letter=letter,
        correct=correct,
        revealed=revealed,
        guessed_letters=guessed,
        wrong_guesses=wrong_guesses,
        max_wrong_guesses=MAX_WRONG_GUESSES,
        is_complete=is_complete,
        is_game_over=is_game_over,
        word=word_text if round_ended else None,
        xp_awarded=xp_awarded,
        leveled_up=leveled_up,
        new_level=new_level,
    )


@router.post("/sessions/{session_id}/finish", response_model=FinishSessionResponse)
async def finish_session(
    session_id: str,
    current_user=Depends(get_current_user),
):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    ended_at = datetime.now(UTC).isoformat()
    update_result = (
        supabase_admin.table("game_sessions")
        .update({"ended_at": ended_at})
        .eq("id", session_id)
        .execute()
    )
    if not update_result.data:
        raise HTTPException(status_code=500, detail="Oturum kapatılamadı.")

    updated = update_result.data[0]

    attempts_result = (
        supabase_admin.table("game_attempts")
        .select("is_correct")
        .eq("session_id", session_id)
        .execute()
    )
    attempts = attempts_result.data or []
    word_count = len(attempts)
    correct_count = sum(1 for a in attempts if a.get("is_correct"))

    return FinishSessionResponse(
        id=updated["id"],
        mode=updated["mode"],
        pool_source=updated["pool_source"],
        score=updated["score"],
        xp_earned=updated["xp_earned"],
        started_at=updated["started_at"],
        ended_at=updated["ended_at"],
        word_count=word_count,
        correct_count=correct_count,
    )


@router.get("/stats/weak-difficulty", response_model=WeakDifficultyResult)
async def weak_difficulty_levels(
    days: int = 30,
    limit: int = 5,
    current_user=Depends(get_current_user),
):
    """Oyun tarafinda 'zayif zorluk seviyesi' ozeti (V2 madde #6 -- Faz 2).

    exams.py::weak_topics ile ayni desen (son N gun, en cok yanlis), ama
    boyut "topic_tag" degil "difficulty_level": general_word_pool semasinda
    gramer/sinav tarafindaki gibi bir konu/kategori sutunu yok, sadece
    difficulty_level (beginner/intermediate/advanced) var. game_attempts'in
    word_id ile kullanicinin KENDI kelimesine isaret ettigi satirlar haric
    tutulur (words tablosunda difficulty_level yok) -- sadece general_word_id
    dolu (pool_source="general") denemeler sayilir; 10 Eylul 2026 itibariyla
    bu, tum oyun denemelerinin ~%95'ini kapsiyor.

    Hesaplama mantığı 24 Eylül 2026'da app/services/weak_categories_service.py
    ::get_weak_difficulty_levels'a taşındı (Madde 4b — haftalık zayıf
    kategori e-postası da AYNI fonksiyonu çağırabilsin diye, davranış
    değişikliği yok, bu route artık ince bir sarmalayıcı).
    """
    days = max(1, min(days, 365))
    limit = max(1, min(limit, 20))

    raw_items = get_weak_difficulty_levels(current_user.id, days=days, limit=limit)
    items = [WeakDifficultyItem(**item) for item in raw_items]

    return WeakDifficultyResult(period_days=days, items=items)
