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
    DuelInviteCreate,
    DuelInviteItem,
    DuelInvitesListResponse,
    DuelListResponse,
    DuelParticipantItem,
    DuelResponse,
    DuelRoundPublic,
    DuelStatusResponse,
)
from app.schemas.social import UserCard
from app.services import badge_service
from app.services.friends_service import friendship_status_map
from app.services.notify import notify_user
from app.services.xp_service import award_xp
from pydantic import BaseModel

router = APIRouter()

# Faz 3e round-servis sabitleri — games.py'deki CANDIDATE_FETCH_LIMIT /
# DISTRACTOR_FETCH_LIMIT deseniyle tutarlı.
ROUND_CANDIDATE_FETCH_LIMIT = 300
ROUND_DURATION_SECONDS = 15
ANSWER_SCORE_POINTS = 10

# Faz 3f (10 Eylul 2026 kullanici istegi -- "rakip bulunamiyor") -- bekleyen
# odaya rakip yoksa bot otomatik katilir, ve turlarda cevap vermeyen bot
# katilimcilar icin otomatik cevap uretilir (bkz. asagidaki yardimcilar).
BOT_FILL_INITIAL_DELAY_SECONDS = 10
BOT_FILL_INTERVAL_SECONDS = 20
BOT_FILL_MAX_TOTAL = 4
BOT_ANSWER_ACCURACY = {"kolay": 0.5, "orta": 0.7, "zor": 0.85, "usta": 0.95}


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


def _profile_card(user_id: str) -> UserCard | None:
    row = (
        supabase_admin.table("profiles")
        .select("id, username, display_name, avatar_url, level")
        .eq("id", user_id)
        .limit(1)
        .execute()
        .data
    )
    if not row:
        return None
    p = row[0]
    return UserCard(
        id=p["id"],
        username=p.get("username"),
        display_name=p.get("display_name"),
        avatar_url=p.get("avatar_url"),
        level=p.get("level", 1),
    )


def _add_participant(duel_id: str, user_id: str) -> None:
    """join_duel VE davet kabul akisinin ORTAK katilimci-ekleme mantigi
    (Faz 3f oncesi sadece join_duel icindeydi, tekrar kullanim icin
    ayrildi) -- zaten katilimciysa (ayrilmissa) left_at'i temizler,
    degilse yeni satir ekler. Kapasite kontrolu CAGIRANIN
    sorumlulugunda (join_duel ve accept_duel_invite ayri ayri, farkli
    hata mesajlariyla kontrol ediyor)."""
    existing = (
        supabase_admin.table("duel_participants")
        .select("user_id, left_at")
        .eq("duel_id", duel_id)
        .eq("user_id", user_id)
        .execute()
        .data
    )
    if existing:
        if existing[0].get("left_at"):
            supabase_admin.table("duel_participants").update(
                {"left_at": None}
            ).eq("duel_id", duel_id).eq("user_id", user_id).execute()
        return
    supabase_admin.table("duel_participants").insert(
        {"duel_id": duel_id, "user_id": user_id}
    ).execute()


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


# Faz 3e zorluk kademesi (10 Eylül 2026 ürün kararı): hem düelloda hem
# ligde (bkz. Faz 3b) seviye ilerledikçe zorlaşmalı. general_word_pool
# difficulty_level'ı zaten 3 kademeli (beginner/intermediate/advanced,
# her dil için ~900 kelime/kademe, definition backfill %100 — bkz.
# istatistik sorgusu 10 Eylül 2026) — yeni bir üretim altyapısı kurmaya
# gerek kalmadan, mevcut havuz kademeye göre bölünerek kullanılıyor.
DIFFICULTY_PROGRESSION = ["beginner", "intermediate", "advanced"]


def _difficulty_band_for_round(round_index: int, total_rounds: int) -> str:
    """Tur sırasına göre zorluk kademesi: ilk 1/3 kolay, orta 1/3 orta,
    son 1/3 zor — düello/lig ilerledikçe zorlaşsın diye. NOT: bu, TEK bir
    düello/maç İÇİNDEKİ ilerlemeyi kademelendirir; kullanıcının genel
    hesap seviyesine (profiles.level) göre başlangıç kademesini kaydırma
    (ör. seviye 30 oyuncuya hep 'advanced' ile başlama) BİLİNÇLİ OLARAK
    bu ilk versiyonda YOK — çok-oyunculu bir düelloda katılımcıların
    seviyeleri farklı olabileceği için "kimin seviyesi baz alınacak"
    netleşmeden eklenmedi; gerçek kullanım verisiyle değerlendirilecek."""
    if total_rounds <= 1:
        return DIFFICULTY_PROGRESSION[0]
    progress = round_index / total_rounds
    if progress < 1 / 3:
        return DIFFICULTY_PROGRESSION[0]
    if progress < 2 / 3:
        return DIFFICULTY_PROGRESSION[1]
    return DIFFICULTY_PROGRESSION[2]


def _fetch_band_candidates(learning_lang: str, difficulty_level: str) -> list[dict]:
    """Bir zorluk kademesindeki kelimeleri (id, word, definition) çeker,
    metin bazlı dedupe eder (aynı kelimenin farklı target_lang satırları
    olabilir)."""
    rows = (
        supabase_admin.table("general_word_pool")
        .select("id, word, definition")
        .eq("source_lang", learning_lang)
        .eq("is_active", True)
        .eq("difficulty_level", difficulty_level)
        .not_.is_("definition", "null")
        .limit(ROUND_CANDIDATE_FETCH_LIMIT)
        .execute()
        .data
    ) or []
    unique: dict[str, dict] = {}
    for row in rows:
        key = row["word"].strip().lower()
        if key not in unique:
            unique[key] = row
    return list(unique.values())


def _generate_rounds(duel_id: str, learning_lang: str, round_count: int) -> int:
    """Oda başlarken (start_duel) TÜM turları önceden üretir — round içeriği
    zamana göre değil, oda açılışında bir kerede belirlenir (games.py'deki
    canlı/adaptif next-word akışından farklı olarak, burada tüm oyuncuların
    AYNI soruları AYNI sırada görmesi gerekiyor).

    Faz 3e ürün kararı gereği SADECE hedef dilde: general_word_pool.definition
    (tanım) gösterilir, doğru "word" 4 seçenekten bulunur — games.py'deki
    "definition_to_word" yönüyle birebir aynı desen, ama native_lang'e HİÇ
    bakılmaz. Ayrıca zorluk _difficulty_band_for_round'a göre round_index
    ilerledikçe kolay->orta->zor kademeleniyor (bkz. yukarısı).

    Havuz tazeliği (10 Eylül 2026 kullanıcı sorusu — "hep aynı sorular
    olmamalı"): her çağrıda o kademenin havuzundan random.sample ile
    seçiliyor, sabit/statik bir soru seti YOK — ama bu, AYNI kullanıcının
    GEÇMİŞ düellolarında gördüğü kelimeleri hatırlayıp DIŞLAMIYOR (games.py
    _attempted_ids desenindeki gibi bir kullanıcı-bazlı geçmiş takibi
    BİLİNÇLİ OLARAK bu ilk versiyonda YOK). Havuz zaten dil başına
    kademe başına ~900 kelime olduğu için (definition backfill %100)
    kısa vadede pratikte tekrar riski düşük; gerçek kullanım verisi tekrarın
    fark edildiğini gösterirse eklenecek.

    Havuzda (tüm kademeler toplam) yeterli farklı kelime yoksa (< 4, bir
    soru için bile distractor yetmez) 0 döner — çağıran taraf (start_duel)
    bunu 400'e çevirir. round_count'tan AZ ama >=4 farklı kelime varsa,
    üretilebilen kadar tur üretilir (duel.round_count DEĞİŞTİRİLMEZ, sadece
    fiilen üretilen tur sayısı bundan az olabilir — advance ucu buna göre
    davranır, bkz. aşağı).
    """
    band_pools = {
        level: _fetch_band_candidates(learning_lang, level) for level in DIFFICULTY_PROGRESSION
    }
    combined_unique: dict[str, dict] = {}
    for pool in band_pools.values():
        for w in pool:
            combined_unique.setdefault(w["word"].strip().lower(), w)
    combined_pool = list(combined_unique.values())

    if len(combined_pool) < 4:
        return 0

    actual_round_count = min(round_count, len(combined_pool))
    used_words: set[str] = set()
    rounds_to_insert = []

    for index in range(actual_round_count):
        band = _difficulty_band_for_round(index, actual_round_count)
        band_pool = [w for w in band_pools[band] if w["word"] not in used_words]
        if not band_pool:
            # Bu kademede kelime tükendi (küçük bir dil/kademe için olası) —
            # tekrar olmasın diye tüm havuza (zorluk farkı gözetmeksizin) düş.
            band_pool = [w for w in combined_pool if w["word"] not in used_words]
        if not band_pool:
            break

        chosen = random.choice(band_pool)
        used_words.add(chosen["word"])

        distractor_pool = [w for w in band_pools[band] if w["word"] != chosen["word"]]
        if len(distractor_pool) < 3:
            extra = [
                w
                for w in combined_pool
                if w["word"] != chosen["word"] and w not in distractor_pool
            ]
            distractor_pool = distractor_pool + extra
        distractor_picks = random.sample(distractor_pool, min(3, len(distractor_pool)))
        options = [chosen["word"]] + [d["word"] for d in distractor_picks]
        random.shuffle(options)

        rounds_to_insert.append(
            {
                "duel_id": duel_id,
                "round_index": index,
                "general_word_id": chosen["id"],
                "options": options,
                "correct_option": chosen["word"],
            }
        )

    supabase_admin.table("duel_rounds").insert(rounds_to_insert).execute()
    return len(rounds_to_insert)


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


def _bot_profile_ids() -> set[str]:
    """Tum bot (is_bot=true) profil id'lerini doner -- oda doldurma ve
    katilimci filtreleme icin kucuk, sik cagrilan bir yardimci (bot
    havuzu ~30 kisi, maliyeti onemsiz)."""
    rows = (
        supabase_admin.table("profiles").select("id").eq("is_bot", True).execute().data
    ) or []
    return {r["id"] for r in rows}


def _fill_duel_with_bot_if_needed(duel: dict) -> None:
    """Bekleyen (status='waiting') bir odada rakip bulunamiyorsa (kullanici
    sorusu, 10 Eylul 2026) zaman icinde bot ekler. Ilk BOT_FILL_INITIAL_
    DELAY_SECONDS saniye gercek bir rakip icin beklenir; sonra kademeli
    olarak (BOT_FILL_INTERVAL_SECONDS'ta bir +1) en fazla
    min(max_players, BOT_FILL_MAX_TOTAL) toplam katilimciya kadar bot
    eklenir -- 8 kisilik bos bir odanin aninda 7 bot ile dolmasi yerine,
    gercekci bir "eslesme" hissi icin."""
    if duel["status"] != "waiting":
        return
    try:
        created_at = datetime.fromisoformat(duel["created_at"].replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return
    elapsed = (datetime.now(UTC) - created_at).total_seconds()
    if elapsed < BOT_FILL_INITIAL_DELAY_SECONDS:
        return

    target_total = min(duel["max_players"], BOT_FILL_MAX_TOTAL)
    allowed_bots = min(
        target_total - 1,
        1 + int((elapsed - BOT_FILL_INITIAL_DELAY_SECONDS) // BOT_FILL_INTERVAL_SECONDS),
    )
    if allowed_bots <= 0:
        return

    participant_rows = (
        supabase_admin.table("duel_participants")
        .select("user_id")
        .eq("duel_id", duel["id"])
        .is_("left_at", "null")
        .execute()
        .data
    ) or []
    current_ids = {p["user_id"] for p in participant_rows}
    if len(current_ids) >= duel["max_players"]:
        return

    bot_ids = _bot_profile_ids()
    current_bot_count = len(current_ids & bot_ids)
    if current_bot_count >= allowed_bots:
        return

    available_bots = list(bot_ids - current_ids)
    if not available_bots:
        return

    chosen = random.choice(available_bots)
    supabase_admin.table("duel_participants").insert(
        {"duel_id": duel["id"], "user_id": chosen}
    ).execute()


def _submit_bot_answer(duel_id: str, round_row: dict, bot_id: str, difficulty: str) -> None:
    """Bir bot katilimci icin bu tura otomatik cevap uretir -- gercek
    submit_round_answer ile AYNI skor/kayit mantigi (kasitli kod
    tekrari: bot'lar current_user bagimliligi olmadan, sunucu ic
    cagrisiyla cevapliyor). Dogruluk orani BOT_ANSWER_ACCURACY'den
    zorluga gore gelir."""
    accuracy = BOT_ANSWER_ACCURACY.get(difficulty, BOT_ANSWER_ACCURACY["orta"])
    is_correct = random.random() < accuracy
    if is_correct:
        selected_option = round_row["correct_option"]
    else:
        wrong_options = [o for o in round_row["options"] if o != round_row["correct_option"]]
        selected_option = random.choice(wrong_options) if wrong_options else round_row["correct_option"]

    supabase_admin.table("duel_answers").insert(
        {
            "duel_round_id": round_row["id"],
            "user_id": bot_id,
            "selected_option": selected_option,
            "is_correct": is_correct,
        }
    ).execute()

    if is_correct:
        participant = (
            supabase_admin.table("duel_participants")
            .select("score")
            .eq("duel_id", duel_id)
            .eq("user_id", bot_id)
            .single()
            .execute()
        )
        new_score = (participant.data or {}).get("score", 0) + ANSWER_SCORE_POINTS
        supabase_admin.table("duel_participants").update({"score": new_score}).eq(
            "duel_id", duel_id
        ).eq("user_id", bot_id).execute()


def _auto_answer_bots(duel_id: str, round_row: dict, active_ids: list[str]) -> None:
    """active_ids icindeki bot katilimcilardan bu turu HENUZ cevaplamamis
    olanlara otomatik cevap urettirir -- advance_round'un basinda
    cagrilir, boylece bot'lar gercek kullanicinin cevabini "beklemis"
    gibi gorunur (cagrinin kendisi genelde bir insan cevap verip
    advance_round'u tetikledikten hemen sonra gelir, bkz. mobil/web
    tick() -- stale-closure duzeltmesi sonrasi)."""
    if not active_ids:
        return
    bot_rows = (
        supabase_admin.table("profiles")
        .select("id, bot_difficulty")
        .in_("id", active_ids)
        .eq("is_bot", True)
        .execute()
        .data
    ) or []
    if not bot_rows:
        return

    answered_rows = (
        supabase_admin.table("duel_answers")
        .select("user_id")
        .eq("duel_round_id", round_row["id"])
        .execute()
        .data
    ) or []
    already_answered = {r["user_id"] for r in answered_rows}

    for bot in bot_rows:
        if bot["id"] in already_answered:
            continue
        _submit_bot_answer(duel_id, round_row, bot["id"], bot.get("bot_difficulty") or "orta")


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
        .eq("is_private", False)
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
    (soru/doğru cevap) bilinçli olarak burada yok — bkz. modül docstring'i.
    Faz 3f: rakip bulunamayan bekleyen odalara burada bot eklenir (bkz.
    _fill_duel_with_bot_if_needed) — istemciler zaten bu ucu polling ile
    surekli cagiriyor, ayri bir arka plan gorevi gerekmiyor."""
    duel = _get_duel_or_404(duel_id)
    _fill_duel_with_bot_if_needed(duel)

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

    if _participant_count(duel_id) >= duel["max_players"]:
        raise HTTPException(status_code=400, detail="Oda dolu.")

    _add_participant(duel_id, current_user.id)

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


@router.post("/{duel_id}/cancel", status_code=204)
async def cancel_duel(
    duel_id: str,
    current_user=Depends(get_current_user),
):
    """Faz 3f (10 Eylul 2026 kullanici istegi -- "duello olusturan
    kisi, odayi silebilmeli"): sadece oda sahibi, sadece hala
    'waiting' durumdaki (henuz baslamamis) bir odayi iptal edebilir.
    Bu odaya bagli bekleyen (pending) davetler varsa (bkz. duel_invites,
    050) onlar da iptal edilir ki davet ekraninda 'hayalet' bir davet
    kalmasin."""
    duel = _get_duel_or_404(duel_id)
    if duel["created_by"] != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece oda sahibi odayı silebilir.")
    if duel["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Sadece bekleyen bir oda silinebilir.")

    supabase_admin.table("duels").update({"status": "cancelled"}).eq("id", duel_id).execute()
    supabase_admin.table("duel_invites").update(
        {"status": "cancelled", "responded_at": datetime.now(UTC).isoformat()}
    ).eq("duel_id", duel_id).eq("status", "pending").execute()


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
    # Faz 3f: bu turu henuz cevaplamamis bot katilimcilar icin otomatik
    # cevap uret -- boylece sadece gercek kullanicilar cevaplayinca degil,
    # bot'lar da "cevaplamis" sayilinca tur ilerleyebilir.
    _auto_answer_bots(duel_id, round_row, active_ids)
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
            # Faz 3f (migration 048) -- "kusursuz duello" rozeti icin bu
            # oda GERCEKTEN kac tur urettiyse (havuz yetersizse
            # duel.round_count'tan az olabilir, bkz. _generate_rounds) o
            # sayi baz alinir -- istenen round_count degil.
            generated_rounds_result = (
                supabase_admin.table("duel_rounds")
                .select("id", count="exact")
                .eq("duel_id", duel_id)
                .execute()
            )
            max_possible_score = (generated_rounds_result.count or 0) * ANSWER_SCORE_POINTS
            for p in participant_rows:
                await award_xp(
                    user_id=p["user_id"],
                    source_type="duel_participation",
                    source_id=duel_id,
                )
                participation_count_result = (
                    supabase_admin.table("xp_events")
                    .select("id", count="exact")
                    .eq("user_id", p["user_id"])
                    .eq("source_type", "duel_participation")
                    .execute()
                )
                if (participation_count_result.count or 0) >= 25:
                    await badge_service.award_badge(p["user_id"], "duel_veteran_25")
                if p["score"] == top_score and top_score > 0:
                    await award_xp(
                        user_id=p["user_id"], source_type="duel_win", source_id=duel_id
                    )
                    # Rozetler (10 Eylül 2026 kullanıcı sorusu — "sadece XP
                    # değil, ödül/rozet de olmalı"): award_badge() zaten
                    # idempotent (bkz. badge_service.py) — kazanan her
                    # düellodan sonra "first_duel_win" çağrılması güvenli,
                    # zaten sahipse no-op. 10/50 eşiği sayaç bazlı olduğu
                    # için her galibiyette YENİDEN kontrol ediliyor (o an
                    # tam eşiğe ulaşmış olabilir).
                    await badge_service.award_badge(p["user_id"], "first_duel_win")
                    win_count_result = (
                        supabase_admin.table("xp_events")
                        .select("id", count="exact")
                        .eq("user_id", p["user_id"])
                        .eq("source_type", "duel_win")
                        .execute()
                    )
                    win_count = win_count_result.count or 0
                    if win_count >= 50:
                        await badge_service.award_badge(p["user_id"], "duel_win_50")
                    elif win_count >= 10:
                        await badge_service.award_badge(p["user_id"], "duel_win_10")
                    if max_possible_score > 0 and top_score == max_possible_score:
                        await badge_service.award_badge(p["user_id"], "perfect_duel")

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


# ------------------------------------------------------------
# Faz 3f (10 Eylul 2026 kullanici istegi -- "genel istatistik ile
# user bazli istatistikler de olmali") -- kullanici bazli duello
# istatistikleri. xp_events'teki duel_participation/duel_win
# kayitlarindan sayiliyor (bkz. advance_round -- her duello sonunda
# yaziliyor), ayri bir sayac tablosu YOK (leagues.py'deki AYNI
# "tek kaynak" tercihi).
# ------------------------------------------------------------
class DuelStatsResponse(BaseModel):
    total_participations: int
    total_wins: int
    win_rate: float
    perfect_wins: int


@router.get("/stats/me", response_model=DuelStatsResponse)
async def get_my_duel_stats(current_user=Depends(get_current_user)):
    participations = (
        supabase_admin.table("xp_events")
        .select("id", count="exact")
        .eq("user_id", current_user.id)
        .eq("source_type", "duel_participation")
        .execute()
        .count
        or 0
    )
    wins = (
        supabase_admin.table("xp_events")
        .select("id", count="exact")
        .eq("user_id", current_user.id)
        .eq("source_type", "duel_win")
        .execute()
        .count
        or 0
    )
    perfect_wins = (
        supabase_admin.table("user_badges")
        .select("id", count="exact")
        .eq("user_id", current_user.id)
        .eq("badge_code", "perfect_duel")
        .execute()
        .count
        or 0
    )
    win_rate = round((wins / participations) * 100, 1) if participations else 0.0
    return DuelStatsResponse(
        total_participations=participations,
        total_wins=wins,
        win_rate=win_rate,
        perfect_wins=perfect_wins,
    )
# ------------------------------------------------------------
# Faz 3f (10 Eylul 2026 kullanici istegi -- "Evet, arkadasa davet
# gonderme ekle") -- arkadasa OZEL duello daveti. Yeni, kucuk bir
# duel_invites tablosu (050) + arka planda is_private=true bir duels
# odasi -- bkz. o migration'in ve bu bolumun ust docstring yorumlari.
# challenge_service.py'deki (016/social.py) AYNI ilke: sadece
# arkadaslar davet edebilir, notify_user ile bildirim.
# ------------------------------------------------------------
def _get_invite_or_404(invite_id: str) -> dict:
    row = (
        supabase_admin.table("duel_invites")
        .select("*")
        .eq("id", invite_id)
        .limit(1)
        .execute()
        .data
    )
    if not row:
        raise HTTPException(status_code=404, detail="Duello daveti bulunamadi.")
    return row[0]


def _to_invite_item(row: dict, current_user_id: str) -> DuelInviteItem:
    is_inviter = row["inviter_id"] == current_user_id
    other_id = row["invitee_id"] if is_inviter else row["inviter_id"]
    return DuelInviteItem(
        id=row["id"],
        duel_id=row["duel_id"],
        status=row["status"],
        is_inviter=is_inviter,
        other_user=_profile_card(other_id),
        created_at=row["created_at"],
        responded_at=row.get("responded_at"),
    )


@router.post("/invite", response_model=DuelInviteItem, status_code=201)
async def invite_friend_to_duel(
    invite_in: DuelInviteCreate,
    current_user=Depends(get_current_user),
):
    """Arkadasi, sadece ikinizin (veya davet edilen ek kisilerin) gorebilecegi
    OZEL bir duello odasina davet eder -- normal lobi listesinde (GET /duels)
    gorunmez (bkz. list_duels'in is_private filtresi)."""
    target = (
        supabase_admin.table("profiles")
        .select("id, username")
        .eq("username", invite_in.username.strip())
        .limit(1)
        .execute()
        .data
    )
    if not target:
        raise HTTPException(status_code=404, detail="Bu kullanici adiyla bir kullanici bulunamadi.")
    other = target[0]
    if other["id"] == current_user.id:
        raise HTTPException(status_code=400, detail="Kendine davet gonderemezsin.")

    rel = friendship_status_map(current_user.id).get(other["id"])
    if not rel or rel["status"] != "friends":
        raise HTTPException(status_code=403, detail="Sadece arkadaslarini duelloya davet edebilirsin.")

    learning_lang = _get_learning_lang(current_user.id)
    duel_result = (
        supabase_admin.table("duels")
        .insert(
            {
                "learning_lang": learning_lang,
                "created_by": current_user.id,
                "max_players": invite_in.max_players,
                "round_count": invite_in.round_count,
                "is_private": True,
            }
        )
        .execute()
    )
    if not duel_result.data:
        raise HTTPException(status_code=500, detail="Duello odasi olusturulamadi.")
    duel = duel_result.data[0]
    _add_participant(duel["id"], current_user.id)

    invite_row = (
        supabase_admin.table("duel_invites")
        .insert(
            {
                "duel_id": duel["id"],
                "inviter_id": current_user.id,
                "invitee_id": other["id"],
                "status": "pending",
            }
        )
        .execute()
    ).data[0]

    inviter = _profile_card(current_user.id)
    inviter_name = (inviter.display_name if inviter else None) or (inviter.username if inviter else None) or "Bir kullanici"
    notify_user(
        other["id"],
        "duel_invite",
        "Yeni duello daveti",
        f"{inviter_name} seni bir duelloya davet etti.",
    )

    return _to_invite_item(invite_row, current_user.id)


@router.get("/invites/mine", response_model=DuelInvitesListResponse)
async def list_my_duel_invites(current_user=Depends(get_current_user)):
    """Bekleyen (pending) davetler -- hem bana gelenler hem gonderdiklerim,
    en yeni once. Yanitlanmis (accepted/declined/cancelled) davetler
    bilincli olarak burada YOK -- davet ekrani sadece "aksiyon bekleyen"
    listesi, gecmis icin ayri bir uc simdilik gerekmiyor."""
    rows = (
        supabase_admin.table("duel_invites")
        .select("*")
        .eq("status", "pending")
        .or_(f"inviter_id.eq.{current_user.id},invitee_id.eq.{current_user.id}")
        .order("created_at", desc=True)
        .execute()
        .data
    ) or []
    return DuelInvitesListResponse(items=[_to_invite_item(row, current_user.id) for row in rows])


@router.post("/invites/{invite_id}/accept", response_model=DuelResponse)
async def accept_duel_invite(invite_id: str, current_user=Depends(get_current_user)):
    row = _get_invite_or_404(invite_id)
    if row["invitee_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Bu daveti yalnizca davet edilen yanitlayabilir.")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Bu davet zaten yanitlanmis.")

    duel = _get_duel_or_404(row["duel_id"])
    if duel["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Bu odaya artik katilinamaz.")
    if _participant_count(duel["id"]) >= duel["max_players"]:
        raise HTTPException(status_code=400, detail="Oda dolu.")

    _add_participant(duel["id"], current_user.id)
    supabase_admin.table("duel_invites").update(
        {"status": "accepted", "responded_at": datetime.now(UTC).isoformat()}
    ).eq("id", invite_id).execute()

    accepter = _profile_card(current_user.id)
    accepter_name = (accepter.display_name if accepter else None) or (accepter.username if accepter else None) or "Bir kullanici"
    notify_user(
        row["inviter_id"],
        "duel_invite_accept",
        "Duello daveti kabul edildi",
        f"{accepter_name} duello davetini kabul etti -- oda hazir!",
    )

    return _to_duel_response(duel)


@router.post("/invites/{invite_id}/decline", status_code=204)
async def decline_duel_invite(invite_id: str, current_user=Depends(get_current_user)):
    row = _get_invite_or_404(invite_id)
    if row["invitee_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Bu daveti yalnizca davet edilen yanitlayabilir.")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Bu davet zaten yanitlanmis.")
    supabase_admin.table("duel_invites").update(
        {"status": "declined", "responded_at": datetime.now(UTC).isoformat()}
    ).eq("id", invite_id).execute()


@router.post("/invites/{invite_id}/cancel", status_code=204)
async def cancel_duel_invite(invite_id: str, current_user=Depends(get_current_user)):
    row = _get_invite_or_404(invite_id)
    if row["inviter_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Bu daveti yalnizca gonderen iptal edebilir.")
    if row["status"] != "pending":
        raise HTTPException(status_code=409, detail="Sadece bekleyen bir davet iptal edilebilir.")
    supabase_admin.table("duel_invites").update(
        {"status": "cancelled", "responded_at": datetime.now(UTC).isoformat()}
    ).eq("id", invite_id).execute()
