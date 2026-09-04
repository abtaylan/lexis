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
    - "definition_to_word" (Faz 2, monolingual): İngilizce tanım gösterilir,
      doğru İngilizce kelime 4 seçenekten bulunur. Sadece pool_source="general"
      ile çalışır — kullanıcının kendi "words" tablosunda İngilizce tanım
      tutulmaz, sadece general_word_pool.definition doldurulur (backfill).
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
    GameSessionCreate,
    GameSessionResponse,
    GameWordOption,
    GuessLetterRequest,
    GuessLetterResponse,
    NextWordResponse,
    PoolSource,
)
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
            detail="Bu yön (İngilizce tanım) sadece genel kelime havuzuyla kullanılabilir, "
            "kendi kelimelerinde İngilizce tanım tutulmuyor.",
        )

    row = {
        "user_id": current_user.id,
        "mode": session_in.mode.value,
        "pool_source": session_in.pool_source.value,
        "direction": session_in.direction.value,
        "score": 0,
        "xp_earned": 0,
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
            .select("id, word, meaning, meaning_native, example")
            .eq("user_id", current_user.id)
        )
        if attempted:
            query = query.not_.in_("id", attempted)
        candidates = (query.limit(CANDIDATE_FETCH_LIMIT).execute().data) or []

        if not candidates:
            return NextWordResponse(finished=True)

        chosen = random.choice(candidates)
        meaning_text = chosen.get("meaning_native") or chosen.get("meaning")
        chosen_word_id = chosen["id"]
        chosen_general_word_id = None
    else:
        # pool_source == "general"
        learning_lang, native_lang = _get_profile_langs(current_user.id)
        attempted = _attempted_ids(session_id, "general_word_id")
        query = (
            supabase_admin.table("general_word_pool")
            .select("id, word, meaning, example, definition")
            .eq("source_lang", learning_lang)
            .eq("target_lang", native_lang)
            .eq("is_active", True)
        )
        if attempted:
            query = query.not_.in_("id", attempted)
        if direction == Direction.definition_to_word.value:
            # Sadece İngilizce tanımı backfill edilmiş kelimeler bu yönde
            # sorulabilir (definition NULL olan kelimeler atlanır).
            query = query.not_.is_("definition", "null")
        candidates = (query.limit(CANDIDATE_FETCH_LIMIT).execute().data) or []

        if not candidates:
            return NextWordResponse(finished=True)

        chosen = random.choice(candidates)
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

    # ── multiple_choice modu (direction'a göre iki farklı yön) ──
    options = None
    if mode == "multiple_choice":
        if direction in (Direction.meaning_to_word.value, Direction.definition_to_word.value):
            # Anlam VEYA İngilizce tanım gösterilir, doğru KELİME 4 seçenekten bulunur.
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
