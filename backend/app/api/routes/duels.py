"""
backend/app/api/routes/duels.py

V2 Yol Haritası §6.3 (Faz 3a) — Gerçek Zamanlı Düello, oda yaşam döngüsü.

KAPSAM: Faz 3a'da (bkz. eski docstring notu) oda oluştur/listele/katıl/
ayrıl/durum uçları eklenmişti; round üretimi ve oyun akışı BİLİNÇLİ OLARAK
YARIM bırakılmıştı çünkü duel_rounds çok-oyunculu bir modelde her
katılımcının FARKLI native_lang'i olabilir ve hangi dilde anlam
gösterileceği netleşmemişti.

Faz 3e ürün kararı (10 Eylül 2026, kullanıcıyla netleştirildi): sorular
SADECE hedef dilde sorulur (games.py'deki "definition_to_word" yönüyle
aynı desen — tanım gösterilir, doğru kelime 4 seçenekten bulunur), ana
dile hiç referans verilmez. Bu karar round-servis uçlarını (aşağıda)
KİLİTLEDİ — artık bu modül round üretimi (start_duel içinde, oda
başlarken TÜM turlar önceden üretilir) + round-servis (current/begin/
answer/advance) uçlarını da içeriyor.

HÂLÂ BİLİNÇLİ OLARAK YOK: frontend UI (mobil/web duel ekranı) ve
gerçek zamanlı yayın (Realtime broadcast/presence) — istemciler şimdilik
GET .../rounds/current'ı POLLING ile çekmeli. Bu ikisi ayrı bir alt-adım
(plan, "tüm özelliği tek seferde yapma" uyarısına uygun olarak
bölünmeye devam ediyor).

"""

import random
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.duels import (
    DuelAnswerRequest,
    DuelAnswerResponse,
    DuelCreate,
    DuelListResponse,
    DuelParticipantItem,
    DuelResponse,
    DuelRoundPublic,
    DuelStatusResponse,
)
from app.services.xp_service import award_xp

router = APIRouter()

# Faz 3e round-servis sabitleri — games.py'deki CANDIDATE_FETCH_LIMIT /
# DISTRACTOR_FETCH_LIMIT deseniyle tutarlı.
ROUND_CANDIDATE_FETCH_LIMIT = 300
ROUND_DURATION_SECONDS = 15
ANSWER_SCORE_POINTS = 10


def _get_learning_lang(user_id: str) -> str:
    profile = (
        supabase_admin.table("profiles")
        .select("learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return (profile.data or {}).get("learning_lang", "en")


def _get_duel_or_404(duel_id: str) -> dict:
    duel = (
        supabase_admin.table("duels")
        .select("*")
        .eq("id", duel_id)
        .single()
        .execute()
    )
    if not duel.data:
        raise HTTPException(status_code=404, detail="Düello odası bulunamadı.")
    return duel.data


def _participant_count(duel_id: str) -> int:
    result = (
        supabase_admin.table("duel_participants")
        .select("user_id", count="exact")
        .eq("duel_id", duel_id)
        .is_("left_at", "null")
        .execute()
    )
    return result.count or 0


def _to_duel_response(duel: dict) -> DuelResponse:
    return DuelResponse(
        id=duel["id"],
        mode=duel["mode"],
        status=duel["status"],
        learning_lang=duel["learning_lang"],
        created_by=duel["created_by"],
        max_players=duel["max_players"],
        round_count=duel["round_count"],
        created_at=duel["created_at"],
        started_at=duel.get("started_at"),
        ended_at=duel.get("ended_at"),
        participant_count=_participant_count(duel["id"]),
    )


def _generate_rounds(duel_id: str, learning_lang: str, round_count: int) -> int:
    """Oda başlarken (start_duel) TÜM turları önceden üretir — round içeriği
    zamana göre değil, oda açılışında bir kerede belirlenir (games.py'deki
    canlı/adaptif next-word akışından farklı olarak, burada tüm oyuncuların
    AYNI soruları AYNI sırada görmesi gerekiyor).

    Faz 3e ürün kararı gereği SADECE hedef dilde: general_word_pool.definition
    (tanım) gösterilir, doğru "word" 4 seçenekten bulunur — games.py'deki
    "definition_to_word" yönüyle birebir aynı desen, ama native_lang'e HİÇ
    bakılmaz (source_lang=learning_lang, target_lang filtresi YOK — aynı
    kelimenin birden fazla target_lang satırı varsa metin bazlı dedupe ile
    tekilleştirilir).

    Havuzda yeterli farklı kelime yoksa (< 4, bir soru için bile distractor
    yetmez) 0 döner — çağıran taraf (start_duel) bunu 400'e çevirir. Havuzda
    round_count'tan AZ ama >=4 farklı kelime varsa, üretilebilen kadar tur
    üretilir (duel.round_count DEĞİŞTİRİLMEZ, sadece fiilen üretilen tur
    sayısı bundan az olabilir — advance ucu buna göre davranır, bkz. aşağı).
    """
    rows = (
        supabase_admin.table("general_word_pool")
        .select("word, definition")
        .eq("source_lang", learning_lang)
        .eq("is_active", True)
        .not_.is_("definition", "null")
        .limit(ROUND_CANDIDATE_FETCH_LIMIT)
        .execute()
        .data
    ) or []

    # Metin bazlı dedupe (aynı kelimenin farklı target_lang satırları olabilir).
    unique_by_word: dict[str, str] = {}
    for row in rows:
        key = row["word"].strip().lower()
        if key not in unique_by_word:
            unique_by_word[key] = row["word"]
    candidates = list(unique_by_word.values())  # görüntülenecek orijinal metinler

    if len(candidates) < 4:
        return 0

    actual_round_count = min(round_count, len(candidates))
    chosen_words = random.sample(candidates, actual_round_count)

    rounds_to_insert = []
    for index, correct_word in enumerate(chosen_words):
        distractor_pool = [w for w in candidates if w != correct_word]
        distractor_picks = random.sample(distractor_pool, min(3, len(distractor_pool)))
        options = [correct_word] + distractor_picks
        random.shuffle(options)
        rounds_to_insert.append(
            {
                "duel_id": duel_id,
                "round_index": index,
                # NOT: general_word_id yerine word/definition metnini doğrudan
                # options/correct_option'a gömüyoruz (dedupe sonrası hangi
                # general_word_pool satırının "temsilci" olduğu önemsiz —
                # sadece metin gösteriliyor). general_word_id FK'i NOT NULL
                # olduğu için ilk eşleşen satırı referans olarak buluyoruz.
                "general_word_id": None,
                "options": options,
                "correct_option": correct_word,
            }
        )

    # general_word_id NOT NULL (migration 037) — dedupe edilmiş her kelime
    # için gerçek bir general_word_pool.id lazım; word metnine göre tek bir
    # temsilci id çekiyoruz.
    word_to_id: dict[str, str] = {}
    id_rows = (
        supabase_admin.table("general_word_pool")
        .select("id, word")
        .eq("source_lang", learning_lang)
        .in_("word", chosen_words)
        .execute()
        .data
    ) or []
    for row in id_rows:
        word_to_id.setdefault(row["word"], row["id"])
    for r in rounds_to_insert:
        r["general_word_id"] = word_to_id.get(r["correct_option"])

    supabase_admin.table("duel_rounds").insert(rounds_to_insert).execute()
    return actual_round_count


def _get_round_or_404(duel_id: str, round_index: int) -> dict:
    row = (
        supabase_admin.table("duel_rounds")
        .select("*")
        .eq("duel_id", duel_id)
        .eq("round_index", round_index)
        .single()
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="Tur bulunamadı.")
    return row.data


def _active_participant_ids(duel_id: str) -> list[str]:
    rows = (
        supabase_admin.table("duel_participants")
        .select("user_id")
        .eq("duel_id", duel_id)
        .is_("left_at", "null")
        .execute()
        .data
    ) or []
    return [r["user_id"] for r in rows]


def _definition_for_round(round_row: dict) -> str:
    """duel_rounds satırından tanımı çeker. general_word_id NOT NULL FK
    olduğu için tek bir SELECT ile general_word_pool.definition okunur —
    round üretiminde (bkz. _generate_rounds) options/correct_option zaten
    metin olarak gömüldüğü için burada SADECE definition eksik kalıyordu."""
    row = (
        supabase_admin.table("general_word_pool")
        .select("definition")
        .eq("id", round_row["general_word_id"])
        .single()
        .execute()
    )
    return (row.data or {}).get("definition") or ""


@router.post("", response_model=DuelResponse, status_code=201)
async def create_duel(
    duel_in: DuelCreate,
    current_user=Depends(get_current_user),
):
    """Yeni düello odası aç. Oluşturan kullanıcı otomatik olarak ilk
    katılımcı olarak eklenir."""
    learning_lang = duel_in.learning_lang or _get_learning_lang(current_user.id)

    result = (
        supabase_admin.table("duels")
        .insert(
            {
                "learning_lang": learning_lang,
                "created_by": current_user.id,
                "max_players": duel_in.max_players,
                "round_count": duel_in.round_count,
            }
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Düello odası oluşturulamadı.")
    duel = result.data[0]

    supabase_admin.table("duel_participants").insert(
        {"duel_id": duel["id"], "user_id": current_user.id}
    ).execute()

    return _to_duel_response(duel)


@router.get("", response_model=DuelListResponse)
async def list_duels(
    learning_lang: str | None = Query(default=None),
    current_user=Depends(get_current_user),
):
    """Lobi — katılıma açık ('waiting') odaların listesi. Varsayılan olarak
    kullanıcının kendi öğrenme diline göre filtrelenir (farklı dil
    öğrenen kullanıcılarla eşleşme anlamsız — general_word_pool tek bir
    source_lang'e göre round üretecek)."""
    active_lang = learning_lang or _get_learning_lang(current_user.id)

    rows = (
        supabase_admin.table("duels")
        .select("*")
        .eq("status", "waiting")
        .eq("learning_lang", active_lang)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
        .data
    ) or []
    return DuelListResponse(items=[_to_duel_response(d) for d in rows])


@router.get("/{duel_id}", response_model=DuelStatusResponse)
async def get_duel_status(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    """Oda durumu + katılımcı listesi (canlı skor tablosu). Round içeriği
    (soru/doğru cevap) bilinçli olarak burada yok — bkz. modül docstring'i."""
    duel = _get_duel_or_404(duel_id)

    participant_rows = (
        supabase_admin.table("duel_participants")
        .select("user_id, score, joined_at, left_at")
        .eq("duel_id", duel_id)
        .order("score", desc=True)
        .execute()
        .data
    ) or []

    user_ids = [p["user_id"] for p in participant_rows]
    profiles_by_id: dict[str, dict] = {}
    if user_ids:
        profile_rows = (
            supabase_admin.table("profiles")
            .select("id, username, avatar_url")
            .in_("id", user_ids)
            .execute()
            .data
        ) or []
        profiles_by_id = {p["id"]: p for p in profile_rows}

    participants = [
        DuelParticipantItem(
            user_id=p["user_id"],
            username=profiles_by_id.get(p["user_id"], {}).get("username"),
            avatar_url=profiles_by_id.get(p["user_id"], {}).get("avatar_url"),
            score=p["score"],
            joined_at=p["joined_at"],
            left_at=p.get("left_at"),
        )
        for p in participant_rows
    ]

    base = _to_duel_response(duel)
    return DuelStatusResponse(**base.model_dump(), participants=participants)


@router.post("/{duel_id}/join", response_model=DuelResponse)
async def join_duel(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    duel = _get_duel_or_404(duel_id)
    if duel["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Bu odaya artık katılınamaz.")

    existing = (
        supabase_admin.table("duel_participants")
        .select("user_id, left_at")
        .eq("duel_id", duel_id)
        .eq("user_id", current_user.id)
        .execute()
        .data
    )
    if existing:
        if existing[0].get("left_at"):
            supabase_admin.table("duel_participants").update(
                {"left_at": None}
            ).eq("duel_id", duel_id).eq("user_id", current_user.id).execute()
        return _to_duel_response(duel)

    if _participant_count(duel_id) >= duel["max_players"]:
        raise HTTPException(status_code=400, detail="Oda dolu.")

    supabase_admin.table("duel_participants").insert(
        {"duel_id": duel_id, "user_id": current_user.id}
    ).execute()

    return _to_duel_response(duel)


@router.post("/{duel_id}/leave", status_code=204)
async def leave_duel(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    _get_duel_or_404(duel_id)
    supabase_admin.table("duel_participants").update(
        {"left_at": datetime.now(UTC).isoformat()}
    ).eq("duel_id", duel_id).eq("user_id", current_user.id).execute()


@router.post("/{duel_id}/start", response_model=DuelResponse)
async def start_duel(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    """Sadece odayı açan kullanıcı başlatabilir. En az 2 katılımcı gerekir.

    Faz 3e: artık TÜM turlar burada (tek seferde) üretiliyor (bkz.
    _generate_rounds) — havuzda yeterli farklı kelime yoksa (< 4) durum
    'active'e HİÇ çekilmeden 400 döner (yarım/oynanamaz bir oda
    açılmasın diye). Turların kendisi henüz "başlamış" sayılmaz
    (started_at/ends_at NULL) — ilk tur POST .../rounds/begin ile
    başlatılır (bkz. aşağıdaki round-servis uçları).
    """
    duel = _get_duel_or_404(duel_id)
    if duel["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece oda sahibi başlatabilir.")
    if duel["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Oda zaten başlatılmış veya bitmiş.")
    if _participant_count(duel_id) < 2:
        raise HTTPException(status_code=400, detail="Başlamak için en az 2 katılımcı gerekiyor.")

    generated = _generate_rounds(duel_id, duel["learning_lang"], duel["round_count"])
    if generated == 0:
        raise HTTPException(
            status_code=400,
            detail="Bu dil için yeterli kelime havuzu yok, düello başlatılamıyor.",
        )

    result = (
        supabase_admin.table("duels")
        .update({"status": "active", "started_at": datetime.now(UTC).isoformat()})
        .eq("id", duel_id)
        .execute()
    )
    return _to_duel_response(result.data[0])


@router.get("/{duel_id}/rounds/current", response_model=DuelRoundPublic)
async def get_current_round(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    """Şu anki turun İÇERİĞİNİ döndürür (doğru cevap HARİÇ — bkz. modül
    docstring'i). İstemciler bunu POLLING ile çeker (Realtime henüz yok).
    Tur henüz "başlamamışsa" (POST .../begin hiç çağrılmamışsa) started_at/
    ends_at null döner — istemci bu durumda begin'i çağırmalı."""
    duel = _get_duel_or_404(duel_id)
    if duel["status"] != "active":
        raise HTTPException(status_code=400, detail="Düello aktif değil.")
    round_row = _get_round_or_404(duel_id, duel["current_round_index"])
    return DuelRoundPublic(
        round_index=round_row["round_index"],
        definition=_definition_for_round(round_row),
        options=round_row["options"],
        started_at=round_row.get("started_at"),
        ends_at=round_row.get("ends_at"),
    )


@router.post("/{duel_id}/rounds/begin", response_model=DuelRoundPublic)
async def begin_current_round(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    """Şu anki tur henüz başlamadıysa (started_at NULL) süresini başlatır —
    İLK kim çağırırsa (host olması gerekmez, katılımcılar odaya farklı
    zamanlarda "hazır" olabilir). Zaten başlamışsa mevcut zamanlamayı
    aynen döner (idempotent — sonradan katılan/yeniden çağıran biri turu
    YENİDEN başlatmaz)."""
    duel = _get_duel_or_404(duel_id)
    if duel["status"] != "active":
        raise HTTPException(status_code=400, detail="Düello aktif değil.")
    round_row = _get_round_or_404(duel_id, duel["current_round_index"])

    if not round_row.get("started_at"):
        now = datetime.now(UTC)
        ends_at = now + timedelta(seconds=ROUND_DURATION_SECONDS)
        updated = (
            supabase_admin.table("duel_rounds")
            .update({"started_at": now.isoformat(), "ends_at": ends_at.isoformat()})
            .eq("id", round_row["id"])
            .execute()
        )
        round_row = updated.data[0]

    return DuelRoundPublic(
        round_index=round_row["round_index"],
        definition=_definition_for_round(round_row),
        options=round_row["options"],
        started_at=round_row.get("started_at"),
        ends_at=round_row.get("ends_at"),
    )


@router.post("/{duel_id}/rounds/answer", response_model=DuelAnswerResponse)
async def submit_round_answer(
    duel_id: str,
    answer_in: DuelAnswerRequest,
    current_user=Depends(get_current_user),
):
    """Şu anki tura cevap gönderir. Bir kullanıcı aynı turu SADECE BİR KEZ
    cevaplayabilir (duel_answers UNIQUE(duel_round_id, user_id) — bkz.
    migration 037); ikinci deneme 400 döner. Süre dolduysa (now > ends_at)
    de 400 döner. Doğruysa duel_participants.score ANSWER_SCORE_POINTS
    kadar artırılır (xp_service.py'deki total_xp güncellemesiyle AYNI
    oku-sonra-yaz deseni — atomik increment değil, bu kod tabanında zaten
    kabul edilen bir sınırlama)."""
    duel = _get_duel_or_404(duel_id)
    if duel["status"] != "active":
        raise HTTPException(status_code=400, detail="Düello aktif değil.")
    round_row = _get_round_or_404(duel_id, duel["current_round_index"])

    if not round_row.get("started_at"):
        raise HTTPException(status_code=400, detail="Tur henüz başlamadı.")
    ends_at = datetime.fromisoformat(round_row["ends_at"].replace("Z", "+00:00"))
    if datetime.now(UTC) > ends_at:
        raise HTTPException(status_code=400, detail="Bu tur için süre doldu.")

    existing = (
        supabase_admin.table("duel_answers")
        .select("id")
        .eq("duel_round_id", round_row["id"])
        .eq("user_id", current_user.id)
        .execute()
        .data
    )
    if existing:
        raise HTTPException(status_code=400, detail="Bu turu zaten cevapladınız.")

    is_correct = answer_in.selected_option == round_row["correct_option"]
    supabase_admin.table("duel_answers").insert(
        {
            "duel_round_id": round_row["id"],
            "user_id": current_user.id,
            "selected_option": answer_in.selected_option,
            "is_correct": is_correct,
        }
    ).execute()

    participant = (
        supabase_admin.table("duel_participants")
        .select("score")
        .eq("duel_id", duel_id)
        .eq("user_id", current_user.id)
        .single()
        .execute()
    )
    new_score = (participant.data or {}).get("score", 0)
    if is_correct:
        new_score += ANSWER_SCORE_POINTS
        supabase_admin.table("duel_participants").update({"score": new_score}).eq(
            "duel_id", duel_id
        ).eq("user_id", current_user.id).execute()

    return DuelAnswerResponse(
        is_correct=is_correct,
        correct_option=round_row["correct_option"],
        score=new_score,
    )


@router.post("/{duel_id}/rounds/advance", response_model=DuelStatusResponse)
async def advance_round(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    """Şu anki tur bitmişse (süresi dolmuş VEYA aktif tüm katılımcılar
    cevaplamış) bir sonraki tura geçer. Üretilmiş son turdan sonra
    çağrılırsa (bkz. _generate_rounds — havuz yetersizse duel.round_count'tan
    AZ tur üretilmiş olabilir) düelloyu 'finished' yapar ve XP dağıtır:
    her aktif katılımcıya "duel_participation", en yüksek skorlu
    katılımcı(lar)a EK "duel_win" (bkz. xp_service.py — bu iki tip Faz 3f'de
    Python+DB enum'una birlikte eklenmişti, ilk gerçek kullanım burası)."""
    duel = _get_duel_or_404(duel_id)
    if duel["status"] != "active":
        raise HTTPException(status_code=400, detail="Düello aktif değil.")
    round_row = _get_round_or_404(duel_id, duel["current_round_index"])

    active_ids = _active_participant_ids(duel_id)
    answered_count = (
        supabase_admin.table("duel_answers")
        .select("user_id", count="exact")
        .eq("duel_round_id", round_row["id"])
        .execute()
        .count
        or 0
    )
    round_expired = bool(round_row.get("ends_at")) and datetime.now(UTC) > datetime.fromisoformat(
        round_row["ends_at"].replace("Z", "+00:00")
    )
    if not round_expired and answered_count < len(active_ids):
        raise HTTPException(status_code=400, detail="Şu anki tur henüz bitmedi.")

    next_index = duel["current_round_index"] + 1
    has_next = (
        supabase_admin.table("duel_rounds")
        .select("id", count="exact")
        .eq("duel_id", duel_id)
        .eq("round_index", next_index)
        .execute()
        .count
        or 0
    ) > 0

    if has_next:
        result = (
            supabase_admin.table("duels")
            .update({"current_round_index": next_index})
            .eq("id", duel_id)
            .execute()
        )
        duel = result.data[0]
    else:
        result = (
            supabase_admin.table("duels")
            .update({"status": "finished", "ended_at": datetime.now(UTC).isoformat()})
            .eq("id", duel_id)
            .execute()
        )
        duel = result.data[0]

        participant_rows = (
            supabase_admin.table("duel_participants")
            .select("user_id, score")
            .eq("duel_id", duel_id)
            .execute()
            .data
        ) or []
        if participant_rows:
            top_score = max(p["score"] for p in participant_rows)
            for p in participant_rows:
                await award_xp(
                    user_id=p["user_id"],
                    source_type="duel_participation",
                    source_id=duel_id,
                )
                if p["score"] == top_score and top_score > 0:
                    await award_xp(
                        user_id=p["user_id"], source_type="duel_win", source_id=duel_id
                    )

    participant_rows = (
        supabase_admin.table("duel_participants")
        .select("user_id, score, joined_at, left_at")
        .eq("duel_id", duel_id)
        .order("score", desc=True)
        .execute()
        .data
    ) or []
    user_ids = [p["user_id"] for p in participant_rows]
    profiles_by_id: dict[str, dict] = {}
    if user_ids:
        profile_rows = (
            supabase_admin.table("profiles")
            .select("id, username, avatar_url")
            .in_("id", user_ids)
            .execute()
            .data
        ) or []
        profiles_by_id = {p["id"]: p for p in profile_rows}
    participants = [
        DuelParticipantItem(
            user_id=p["user_id"],
            username=profiles_by_id.get(p["user_id"], {}).get("username"),
            avatar_url=profiles_by_id.get(p["user_id"], {}).get("avatar_url"),
            score=p["score"],
            joined_at=p["joined_at"],
            left_at=p.get("left_at"),
        )
        for p in participant_rows
    ]
    base = _to_duel_response(duel)
    return DuelStatusResponse(**base.model_dump(), participants=participants)
