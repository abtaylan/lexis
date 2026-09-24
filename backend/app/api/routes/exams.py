"""
backend/app/api/routes/exams.py

Sınav Hazırlık Alanı (V2 Yol Haritası §1.1, öncelik #1) — YDS/YÖKDİL/IELTS/TOEFL.
Kullanıcı isteği: "uygulama içinde YDS/YÖKDİL/IELTS/TOEFL alanı olsun, burada bu
sınavlar için örnek sorular, doğru cevap analizi, örnek denemeler ... hatta
buradaki sorulardan kişi kendi kelime havuzuna kelime ekleyebilsin."

Kapsam kararları (devir notu §1.1'deki açık soruların çözümü, 9 Eylül 2026 —
kullanıcının stated preference'ı "execute autonomously without confirmation"
gereği onay beklenmeden karara bağlandı):
- İçerik: telif riski nedeniyle gerçek geçmiş sınav soruları KULLANILMIYOR,
  orijinal sorular seed ediliyor (bkz. supabase/migrations/024_exam_prep_yds_seed.sql).
- Dil kapsamı: şimdilik sadece native_lang=tr + learning_lang=en kullanıcılarına
  gösteriliyor (bkz. _exam_area_enabled) — diğer dil çiftlerinde /exam-types
  boş liste döner, istemci alanı gizler.
- MVP: tek sınav türüyle (YDS, 15 soru) uçtan uca akış; YÖKDİL/IELTS/TOEFL şema+
  API olarak hazır ama soru bankası henüz boş (question_count=0 -> available=
  false) — sırası gelince aynı desenle yeni seed migration'ı eklenip otomatik açılır.
- games.py'deki desenlerle tutarlı: session/next-item/attempt/finish akışı,
  supabase_admin ile doğrudan erişim, award_xp ile XP entegrasyonu, "words"
  tablosuna kelime ekleme _sync_word_progress'teki insert şablonunu izler.

9 Eylül 2026 — İstatistik & İçerik Motoru Faz 2 eklendi: kullanıcılar kendi
soru önerilerini gönderebiliyor (POST /questions/suggest, status=pending
olarak düşer), adminler bu kuyruğu görüp onaylayıp/reddedebiliyor
(GET/POST /admin/questions/...). next_question ve list_exam_types artık
sadece status=approved sorularla çalışıyor — pending/rejected sorular
kullanıcıya hiç gösterilmiyor (bkz. supabase/migrations/026_exam_prep_stats_and_content.sql).
"""

import random
import re
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_admin, get_current_admin_full, get_current_user
from app.core.database import supabase_admin
from app.schemas.exams import (
    AddWordFromQuestionResponse,
    AIQuestionGenerateRequest,
    AIQuestionGenerateResult,
    ExamAttemptCreate,
    ExamAttemptResponse,
    ExamFinishResponse,
    ExamPracticeQuestionItem,
    ExamPracticeQuestionsResult,
    ExamQuestionModerationResponse,
    ExamQuestionOption,
    ExamQuestionSuggestionCreate,
    ExamQuestionSuggestionResponse,
    ExamSessionCreate,
    ExamSessionResponse,
    ExamType,
    ExamTypeInfo,
    MyMistakePatternItem,
    MyMistakePatternsResult,
    NextQuestionResponse,
    PendingExamQuestion,
    PlacementStatusResponse,
    RelatedGrammarTopic,
    TopicPracticeAttemptCreate,
    WeakTopicItem,
    WeakTopicsResult,
)
from app.services.audit_log import log_admin_action
from app.services.auth_users import list_all_auth_users
from app.services.exam_question_generator import (
    ExamQuestionGenerationError,
    generate_questions,
    verify_question,
)
from app.services.spaced_repetition import calculate_next_review
from app.services.xp_service import award_xp

router = APIRouter()

# Desteklenen sınav türleri — YDS/YÖKDİL/IELTS/TOEFL zaten sadece
# native_lang=tr + learning_lang=en kullanıcı kitlesine gösteriliyordu (bkz.
# modül docstring'i). 'placement' (18 Eylül 2026, çoklu dil seviye tespit
# sınavı) BUNA TABİ DEĞİL -- her 12 learning_lang için içerik var (bkz.
# seed_placement_exam_questions.py) ve _exam_content_learning_langs() zaten
# dinamik olarak hangi dilde içerik varsa onu açıyor. 'placement' burada
# SADECE list_exam_types'ın onu döndürmesi (mobil/web'in exam-prep ekranına
# ?examType=placement deep-link'iyle geldiğinde geçerli saymasi) için var --
# EXAM_TYPE_ORDER (mobil) / eşdeğeri (web) listelerine BİLEREK eklenmedi, o
# yüzden normal "Sınav Hazırlık" tür seçim ekranında görünmez, sadece
# yönlendirme akışıyla (bkz. /exams/placement/status) erişilir.
SUPPORTED_EXAM_TYPES = ["yds", "yokdil", "ielts", "toefl", "placement"]

PRACTICE_DEFAULT_QUESTIONS = 10
CANDIDATE_FETCH_LIMIT = 200

# Deneme sınavı (timed_mock) ayarları — gerçek sınavların kısaltılmış MVP
# versiyonu (örn. gerçek YDS 80 soru/180 dk'dır; burada uygulama-içi deneyim
# için kısaltıldı, ileride exam_type başına ayrı ayrı genişletilebilir).
# 'placement': kullanıcı isteği (18 Eylül 2026) "seviye tespit sınavı 50
# soru olacak" -- soru bankası zaten dil başına ~50 soru (6 CEFR seviyesine
# yayılmış, bkz. seed_placement_exam_questions.py) -- SONRA kullanıcı isteği
# (23 Eylül 2026) "50 dk mobil için çok fazla" diyerek 25 soru / 20 dk'ya
# düşürüldü (soru havuzunda hâlâ 25'in üzerinde soru var, seçim mantığı
# next_question()'da rastgele havuzdan çekiyor ve total_questions'a göre
# duruyor -- 50 hiçbir yerde sabit kodlanmamış, bu yüzden güvenli).
EXAM_MOCK_CONFIG: dict[str, dict[str, int]] = {
    "yds": {"total_questions": 15, "time_limit_seconds": 20 * 60},
    "yokdil": {"total_questions": 15, "time_limit_seconds": 20 * 60},
    "ielts": {"total_questions": 15, "time_limit_seconds": 20 * 60},
    "placement": {"total_questions": 25, "time_limit_seconds": 20 * 60},
    "toefl": {"total_questions": 15, "time_limit_seconds": 20 * 60},
}

# 24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 3: periyodik yeniden seviye
# tespiti. Kullanici zaten bir kez placement (EXAM_MOCK_CONFIG['placement'],
# 25 soru) cozmusse, bir sonraki placement oturumu artik "recheck" sayilir --
# tam bir yeniden olcum yerine, mevcut seviyesinin etrafinda daha kisa,
# odakli bir kontrol (bkz. _recheck_level_sequence). create_session bu
# konfigurasyonu is_recheck durumuna gore secer; next_question de
# session['total_questions'] degerinden hangi konfigurasyonun kullanildigini
# (dolayisiyla hangi soru dagilim stratejisinin gerektigini) anlar.
RECHECK_MOCK_CONFIG: dict[str, int] = {"total_questions": 15, "time_limit_seconds": 12 * 60}
# Takvimsel varsayilan: son placement/recheck sinavindan RECHECK_INTERVAL_DAYS
# gun sonra otomatik olarak yeni bir recheck onerilir (placement/status
# uzerinden, ZORUNLU DEGIL -- sadece dashboard'da bir teklif karti).
RECHECK_INTERVAL_DAYS = 14
# Erken tetikleme: Madde 1'in periyodik (oyun performansina dayali, dolayli)
# degerlendirmesi ust uste ayni yonde SURUKLENME gosterirse (iki ardisik
# 'up' ya da iki ardisik 'down'), bu dolayli sinyali doGrulamak icin takvimi
# beklemeden bir recheck onerilir.
DRIFT_SIGNAL_COUNT = 2


def _profile_langs(user_id: str) -> tuple[str, str]:
    profile = (
        supabase_admin.table("profiles")
        .select("native_lang, learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    data = profile.data or {}
    return data.get("native_lang", "tr"), data.get("learning_lang", "en")


def _exam_content_learning_langs() -> set[str]:
    """Onayli (approved) soru icerigi olan learning_lang kodlarinin kumesi —
    V2 Yol Haritasi madde #5 (9 Eylul 2026): Sinav Hazirlik Alani artik
    native_lang=tr + learning_lang=en'e SABIT degil, hangi dil ciftlerinde
    icerik VARSA o kullanicilara acik. Su an sadece learning_lang=en icin
    soru bankasi dolu (bkz. supabase/migrations/024_exam_prep_yds_seed.sql
    ve sonraki dalgalar) — yeni bir dil icin soru eklenince bu fonksiyon
    otomatik olarak o dili de acar, kod degisikligi gerekmez."""
    result = (
        supabase_admin.table("exam_questions")
        .select("learning_lang")
        .eq("is_active", True)
        .eq("status", "approved")
        .execute()
    )
    return {row["learning_lang"] for row in (result.data or []) if row.get("learning_lang")}


def _exam_area_enabled(user_id: str) -> bool:
    _, learning_lang = _profile_langs(user_id)
    return learning_lang in _exam_content_learning_langs()


def _get_session(session_id: str, user_id: str) -> dict:
    result = (
        supabase_admin.table("exam_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Sınav oturumu bulunamadı.")
    return result.data[0]


def _attempted_question_ids(session_id: str) -> list[str]:
    result = (
        supabase_admin.table("exam_attempts")
        .select("question_id")
        .eq("session_id", session_id)
        .execute()
    )
    return [row["question_id"] for row in (result.data or [])]


# ── Madde #3: cevap sonrası kişisel öneri — ortak yardımcılar ─────────
# exam_questions.topic_tag, grammar_topics.slug ile aynı sözlükten (bkz.
# 027_grammar_reference.sql yorumu). Bu yüzden basit bir .in_("slug", tags)
# sorgusu yeterli — ayrı bir eşleme tablosuna gerek yok.


def _grammar_topics_for_tags(tags: list[str]) -> dict[str, RelatedGrammarTopic]:
    """topic_tag -> RelatedGrammarTopic eşlemesi. Sadece status='published'
    konular döner (draft konular kullanıcıya hiç gösterilmez, grammar.py'deki
    aynı kuralla tutarlı). Eşleşmeyen tag'ler sonuçta hiç yer almaz."""
    tags = [t for t in dict.fromkeys(tags) if t]
    if not tags:
        return {}
    topics = (
        supabase_admin.table("grammar_topics")
        .select("slug, title_tr, category_id")
        .in_("slug", tags)
        .eq("status", "published")
        .execute()
        .data
    ) or []
    if not topics:
        return {}
    category_ids = list({t["category_id"] for t in topics})
    categories = (
        supabase_admin.table("grammar_categories")
        .select("id, name_tr")
        .in_("id", category_ids)
        .execute()
        .data
    ) or []
    category_name_by_id = {c["id"]: c["name_tr"] for c in categories}
    return {
        t["slug"]: RelatedGrammarTopic(
            slug=t["slug"],
            title_tr=t["title_tr"],
            category_name_tr=category_name_by_id.get(t["category_id"], ""),
        )
        for t in topics
    }


def _user_session_ids_since(user_id: str, since_iso: str) -> list[str]:
    result = (
        supabase_admin.table("exam_sessions")
        .select("id")
        .eq("user_id", user_id)
        .gte("started_at", since_iso)
        .execute()
    )
    return [row["id"] for row in (result.data or [])]


@router.get("/exam-types", response_model=list[ExamTypeInfo])
async def list_exam_types(current_user=Depends(get_current_user)):
    if not _exam_area_enabled(current_user.id):
        return []

    _, learning_lang = _profile_langs(current_user.id)
    infos = []
    for exam_type in SUPPORTED_EXAM_TYPES:
        # NOT: count="exact" kasıtlı olarak kullanılmıyor — games.py'deki aynı
        # kararla tutarlı (kurulu supabase-py sürümünde test edilmedi, bkz.
        # games.py::_prior_attempt_count yorumu). len(result.data) güvenli.
        # status=approved filtresi: pending/rejected sorular sayıya dahil değil
        # (kullanıcı katkısı/AI üretimi onay bekleyen sorular "kaç soru var"
        # göstergesini şişirmesin).
        result = (
            supabase_admin.table("exam_questions")
            .select("id")
            .eq("exam_type", exam_type)
            .eq("is_active", True)
            .eq("status", "approved")
            .eq("learning_lang", learning_lang)
            .execute()
        )
        count = len(result.data or [])
        infos.append(ExamTypeInfo(exam_type=exam_type, question_count=count, available=count > 0))
    return infos


@router.post("/sessions", response_model=ExamSessionResponse, status_code=201)
async def create_session(session_in: ExamSessionCreate, current_user=Depends(get_current_user)):
    if not _exam_area_enabled(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Sınav Hazırlık Alanı şu an sadece İngilizce öğrenen kullanıcılar için kullanılabilir.",
        )

    exam_type = session_in.exam_type.value
    _, learning_lang = _profile_langs(current_user.id)

    # 24 Eylul 2026 -- Madde 3: kullanici bu dilde daha once placement
    # tamamladiysa (placement_completed_at dolu), sonraki her placement
    # oturumu artik bir "recheck" -- daha kisa, mevcut seviye etrafinda
    # odakli. Ilk kez cozuyorsa (needs_placement=True durumu) tam surum.
    is_recheck = (
        exam_type == "placement"
        and _existing_placement_completed_at(current_user.id, learning_lang) is not None
    )

    if session_in.session_mode.value == "timed_mock":
        config = RECHECK_MOCK_CONFIG if is_recheck else EXAM_MOCK_CONFIG[exam_type]
        total_questions = config["total_questions"]
        time_limit_seconds = config["time_limit_seconds"]
    else:
        total_questions = session_in.total_questions or PRACTICE_DEFAULT_QUESTIONS
        time_limit_seconds = None

    # 24 Eylul 2026 -- seviye tespit sinavi DEVAM (resume) destegi. Uretimde
    # 23 placement oturumundan sadece 2'si bitmisti: uygulama her acilista
    # (ve istemcideki otomatik-baslatma effect'i iki kez tetiklendiginde,
    # saniyeler icinde) YENI bir oturum aciyordu, yarim kalan cevaplar
    # tamamen kayboluyordu. Artik suresi dolmamis, bitmemis bir placement
    # oturumu varsa AYNISI dondurulur (next_question zaten cevaplanan soru
    # sayisindan devam ediyor); suresi dolmuslar ise once kapatilir.
    if exam_type == "placement":
        _finalize_stale_placement_sessions(current_user.id, learning_lang)
        resumable = _resumable_placement_session(
            current_user.id, learning_lang, total_questions
        )
        if resumable:
            return _session_response(resumable, resumed=True)

    row = {
        "user_id": current_user.id,
        "exam_type": exam_type,
        "session_mode": session_in.session_mode.value,
        "total_questions": total_questions,
        "time_limit_seconds": time_limit_seconds,
        "score": 0,
        "xp_earned": 0,
        "learning_lang": learning_lang,
    }
    result = supabase_admin.table("exam_sessions").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Sınav oturumu oluşturulamadı.")
    return _session_response(result.data[0], resumed=False)


@router.get("/sessions/{session_id}/next-question", response_model=NextQuestionResponse)
async def next_question(session_id: str, current_user=Depends(get_current_user)):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    attempted = _attempted_question_ids(session_id)
    if len(attempted) >= session["total_questions"]:
        return NextQuestionResponse(finished=True)

    # placement sinavinda bu soru indexi icin hedeflenen CEFR seviyesi --
    # bkz. _placement_level_sequence()/_recheck_level_sequence() yorumlari.
    # Diger sinav turlerinde (yds/yokdil/ielts/toefl) davranis DEGISMEDI,
    # target_level None kalir.
    #
    # 24 Eylul 2026 -- Madde 3: total_questions RECHECK_MOCK_CONFIG'daki
    # degere esitse (create_session bunu is_recheck durumuna gore secmisti)
    # bu bir recheck oturumudur -- mevcut seviye etrafinda odakli dagilim
    # kullanilir. Aksi halde (25 initial ya da eski 50 legacy) tam spread.
    target_level = None
    previously_seen: list[str] = []
    if session["exam_type"] == "placement":
        learning_lang = session.get("learning_lang", "en")
        is_recheck_session = session["total_questions"] == RECHECK_MOCK_CONFIG["total_questions"]
        if is_recheck_session:
            center_level = _current_or_placement_level(current_user.id, learning_lang)
            level_sequence = _recheck_level_sequence(session["total_questions"], center_level)
            # Recheck'in amaci "hala orada mi" sorusuna TAZE bir cevap vermek
            # -- initial sinavda (ya da onceki bir recheck'te) zaten gorulmus
            # sorular haric tutulur.
            previously_seen = _user_seen_placement_question_ids(
                current_user.id, learning_lang, exclude_session_id=session_id
            )
        else:
            level_sequence = _placement_level_sequence(session["total_questions"])
        if len(attempted) < len(level_sequence):
            target_level = level_sequence[len(attempted)]

    def _fetch_candidates(filter_level: str | None, exclude_seen: bool) -> list[dict]:
        q = (
            supabase_admin.table("exam_questions")
            .select("id, question_text, options")
            .eq("exam_type", session["exam_type"])
            .eq("is_active", True)
            .eq("status", "approved")
            .eq("learning_lang", session.get("learning_lang", "en"))
        )
        exclude = list(attempted) + (previously_seen if exclude_seen else [])
        if exclude:
            q = q.not_.in_("id", exclude)
        if filter_level:
            q = q.eq("difficulty_level", filter_level)
        return (q.limit(CANDIDATE_FETCH_LIMIT).execute().data) or []

    # Kademeli gevseme: once hic gorulmemis + hedef seviye, sonra sirayla
    # seviye filtresi, sonra "daha once gorulmus" kisitlamasi kaldirilir --
    # sinav asla tikanmasin (bir seviyede/dilde soru havuzu zayifsa bile),
    # sadece o soru icin hedeflenen ozellik(ler) kacirilmis olur.
    candidates = _fetch_candidates(target_level, exclude_seen=True)
    if not candidates and target_level:
        candidates = _fetch_candidates(None, exclude_seen=True)
    if not candidates and previously_seen:
        candidates = _fetch_candidates(target_level, exclude_seen=False)
    if not candidates and previously_seen and target_level:
        candidates = _fetch_candidates(None, exclude_seen=False)

    if not candidates:
        return NextQuestionResponse(finished=True)

    chosen = random.choice(candidates)
    options = [ExamQuestionOption(**opt) for opt in chosen["options"]]
    return NextQuestionResponse(
        finished=False,
        question_id=chosen["id"],
        question_text=chosen["question_text"],
        options=options,
        question_index=len(attempted) + 1,
        total_questions=session["total_questions"],
    )


@router.post("/sessions/{session_id}/attempt", response_model=ExamAttemptResponse, status_code=201)
async def submit_attempt(
    session_id: str, attempt_in: ExamAttemptCreate, current_user=Depends(get_current_user)
):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    question_result = (
        supabase_admin.table("exam_questions")
        .select("*")
        .eq("id", attempt_in.question_id)
        .single()
        .execute()
    )
    if not question_result.data:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    question = question_result.data

    is_correct = attempt_in.selected_option == question["correct_option"]

    xp_awarded = 0
    leveled_up = False
    new_level = None
    if is_correct:
        xp_result = await award_xp(
            user_id=current_user.id, source_type="exam_question", source_id=session_id
        )
        xp_awarded = xp_result.amount_awarded
        leveled_up = xp_result.leveled_up
        new_level = xp_result.level

    try:
        attempt_result = (
            supabase_admin.table("exam_attempts")
            .insert(
                {
                    "session_id": session_id,
                    "question_id": attempt_in.question_id,
                    "selected_option": attempt_in.selected_option,
                    "is_correct": is_correct,
                    "time_taken_ms": attempt_in.time_taken_ms,
                    "xp_awarded": xp_awarded,
                }
            )
            .execute()
        )
    except Exception as e:
        # exam_attempts_session_question_uniq — bu soru bu oturumda zaten cevaplanmış.
        print(f"EXAM_ATTEMPT_INSERT_ERROR: {e}")
        raise HTTPException(status_code=409, detail="Bu soru bu oturumda zaten cevaplandı.")

    if not attempt_result.data:
        raise HTTPException(status_code=500, detail="Deneme kaydedilemedi.")

    new_score = session["score"] + (1 if is_correct else 0)
    new_xp_earned = session["xp_earned"] + xp_awarded
    supabase_admin.table("exam_sessions").update(
        {"score": new_score, "xp_earned": new_xp_earned}
    ).eq("id", session_id).execute()

    # Madde #3a: yanlış cevapta ilgili Gramer Rehberi konusuna yönlendirme.
    # topic_tag her zaman döner (doğru cevapta da) — istemci sadece yanlış
    # cevapta "İlgili konuyu incele" / "Bu konudan pratik yap" gösterir,
    # ama veri her durumda hazır olsun diye burada hesaplanıyor.
    topic_tag = question.get("topic_tag")
    related_grammar_topic = _grammar_topics_for_tags([topic_tag]).get(topic_tag) if topic_tag else None

    return ExamAttemptResponse(
        id=attempt_result.data[0]["id"],
        is_correct=is_correct,
        correct_option=question["correct_option"],
        explanation=question["explanation"],
        related_words=question.get("related_words"),
        xp_awarded=xp_awarded,
        session_score=new_score,
        leveled_up=leveled_up,
        new_level=new_level,
        topic_tag=topic_tag,
        related_grammar_topic=related_grammar_topic,
    )


# 18 Eylül 2026 — Seviye Tespit Sınavı (placement) sonucundan CEFR seviyesi
# tahmini. Gerçek bir adaptif sınav/IRT modeli DEĞİL (kapsam dışı) — basit
# ve savunulabilir bir sezgisel yöntem: CEFR seviyeleri a1'den c2'ye doğru
# sırayla gezilir, kullanıcının o seviyede cevapladığı sorularda doğruluk
# oranı >= %50 ise tahmini seviye o seviyeye yükseltilir, %50'nin altına
# düştüğü ilk seviyede durulur (o seviyeyi henüz kaldıramadığı varsayılır).
# O seviyeden hiç soru gelmediyse (havuzda az soru kalmışsa ihtimal dahilinde)
# ne yükseltip ne düşürmeden bir sonrakine geçilir.
CEFR_LEVEL_ORDER = ["a1", "a2", "b1", "b2", "c1", "c2"]
PLACEMENT_LEVEL_PASS_THRESHOLD = 0.5


# 23 Eylul 2026 -- kullanici geri bildirimi: "bu 25 soru seviye belirleyici
# olmali". Eskiden (50 soru) next_question() TUM seviyelerden tamamen
# RASTGELE cekiyordu; soru havuzu zaten dil basina ~50 oldugundan (bkz.
# seed_placement_exam_questions.py, MIN_PER_LEVEL_TO_SKIP=6) pratikte
# neredeyse TUM sorular soruluyor ve her seviye dogal olarak kapsanmis
# oluyordu. 25 soruya dusunce bu garanti kalkti -- saf rastgele secim
# sansa bagli olarak bazi CEFR seviyelerini hic sormayabilir, bu da
# _compute_placement_level()'in o seviyeyi atlayip yanlis/eksik bir
# tahminde bulunmasina yol acar. Bunun yerine 25 soruyu 6 seviyeye
# (a1..c2) MUMKUN OLDUGUNCA ESIT dagitiyoruz (once temel seviyeler
# doldurulur) -- boylece next_question() her cagrildiginda hedef bir
# seviyesi olur ve o seviyeden soru cekilir. Gercek adaptif/IRT modeli
# degil (kapsam disi, yukaridaki yoruma bkz.) ama artik "sansa birak"
# yerine "her seviyeden olcum al" garantisi var.
def _existing_placement_completed_at(user_id: str, learning_lang: str) -> str | None:
    rows = (
        supabase_admin.table("user_learning_languages")
        .select("placement_completed_at")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    return rows[0].get("placement_completed_at") if rows else None


def _current_or_placement_level(user_id: str, learning_lang: str) -> str | None:
    rows = (
        supabase_admin.table("user_learning_languages")
        .select("current_level, placement_level")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    if not rows:
        return None
    return rows[0].get("current_level") or rows[0].get("placement_level")


def _placement_level_sequence(total_questions: int) -> list[str]:
    """total_questions sorusunu CEFR_LEVEL_ORDER seviyelerine mumkun oldugunca
    esit dagitip, dusuk seviyeden yuksege dogru sirali bir liste dondurur
    (orn. 25 soru -> [a1,a1,a1,a1,a1, a2,a2,a2,a2, b1,b1,b1,b1, ...]).
    Kalan (bolunemeyen) sorular en dusuk seviyelerden baslanarak fazladan
    verilir -- temel seviyelerin dogru olculmesi, ileri seviyelerin bir
    soru eksik olculmesinden daha onemli."""
    n_levels = len(CEFR_LEVEL_ORDER)
    base, remainder = divmod(max(total_questions, 0), n_levels)
    counts = {level: base for level in CEFR_LEVEL_ORDER}
    for level in CEFR_LEVEL_ORDER[:remainder]:
        counts[level] += 1
    sequence: list[str] = []
    for level in CEFR_LEVEL_ORDER:
        sequence.extend([level] * counts[level])
    return sequence


# 24 Eylul 2026 -- Madde 3 (recheck). Full spread yerine kullanicinin
# MEVCUT seviyesi etrafinda yogunlasan bir dagilim: %40 tam seviyesi,
# %25+%25 bir alt/bir ust, kalan (varsa) iki alt/iki ust'e esit paylastirilir
# -- amaci "hala orada mi, kaymis mi" sorusuna 15 soruyla cevap vermek,
# tum CEFR yelpazesini yeniden olcmek degil (o zaten placement_level'da var).
_RECHECK_OFFSET_WEIGHTS: list[tuple[int, float]] = [(0, 0.40), (-1, 0.25), (1, 0.25), (-2, 0.05), (2, 0.05)]


def _recheck_level_sequence(total_questions: int, center_level: str | None) -> list[str]:
    center = center_level if center_level in CEFR_LEVEL_ORDER else CEFR_LEVEL_ORDER[1]  # varsayilan a2
    center_idx = CEFR_LEVEL_ORDER.index(center)

    in_range: list[tuple[str, float]] = []
    for offset, weight in _RECHECK_OFFSET_WEIGHTS:
        idx = center_idx + offset
        if 0 <= idx < len(CEFR_LEVEL_ORDER):
            in_range.append((CEFR_LEVEL_ORDER[idx], weight))
    total_weight = sum(w for _, w in in_range)

    # En buyuk kalan (largest remainder) yontemi: once tam sayi kismi
    # verilir, kalan sorular en buyuk kesirli kalanlara (esitlikte merkeze
    # en yakin seviyeye) dagitilir -- boylece toplam TAM total_questions'a
    # esitlenir (basit floor/round ile es gecebilecegi gibi bir sapma yok).
    raw = {level: total_questions * (weight / total_weight) for level, weight in in_range}
    counts = {level: int(v) for level, v in raw.items()}
    remainder = total_questions - sum(counts.values())
    order_by_closeness = sorted(
        in_range, key=lambda lw: (-((raw[lw[0]]) % 1), abs(CEFR_LEVEL_ORDER.index(lw[0]) - center_idx))
    )
    for level, _ in order_by_closeness[:remainder]:
        counts[level] += 1

    sequence: list[str] = []
    for level in CEFR_LEVEL_ORDER:
        if level in counts:
            sequence.extend([level] * counts[level])
    return sequence


def _user_seen_placement_question_ids(
    user_id: str, learning_lang: str, exclude_session_id: str | None = None
) -> list[str]:
    """Kullanicinin BASKA placement oturumlarinda (bu oturum haric) daha once
    cevapladigi soru id'leri -- recheck sinavinin, initial sinavdakiyle AYNI
    sorulari tekrar sormamasi icin (bkz. Madde 3 plani: 'kullanicinin daha
    once gordugu sorulari tekrar gostermemeye dikkat et'). Eski/yarim kalmis
    (finalize edilmis) oturumlar da dahildir -- gorulmus soru gorulmus
    sayilir, oturum bitmis olsa da."""
    query = (
        supabase_admin.table("exam_sessions")
        .select("id")
        .eq("user_id", user_id)
        .eq("exam_type", "placement")
        .eq("learning_lang", learning_lang)
    )
    if exclude_session_id:
        query = query.neq("id", exclude_session_id)
    session_ids = [s["id"] for s in (query.execute().data or [])]
    if not session_ids:
        return []
    attempts = (
        supabase_admin.table("exam_attempts")
        .select("question_id")
        .in_("session_id", session_ids)
        .execute()
        .data
    ) or []
    return [a["question_id"] for a in attempts]


def _has_recent_drift_signal(user_id: str, learning_lang: str, since_iso: str | None) -> bool:
    """Son DRIFT_SIGNAL_COUNT 'periodic_reassessment' kaydi ayni yonde
    (hepsi 'up' ya da hepsi 'down') mi? since_iso verilirse (son placement/
    recheck sinavinin tarihi) sadece ONDAN SONRAKI kayitlar sayilir -- bir
    recheck zaten o sapmayi ele almissa ayni sinyal tekrar erken tetiklemesin."""
    query = (
        supabase_admin.table("user_level_history")
        .select("direction, assessed_at")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .eq("source", "periodic_reassessment")
        .order("assessed_at", desc=True)
        .limit(DRIFT_SIGNAL_COUNT)
    )
    rows = query.execute().data or []
    if since_iso:
        rows = [r for r in rows if r["assessed_at"] > since_iso]
    if len(rows) < DRIFT_SIGNAL_COUNT:
        return False
    directions = {r["direction"] for r in rows}
    return directions in ({"up"}, {"down"})


def _compute_placement_level(session_id: str) -> str | None:
    attempts = (
        supabase_admin.table("exam_attempts")
        .select("question_id, is_correct")
        .eq("session_id", session_id)
        .execute()
        .data
    ) or []
    if not attempts:
        return None

    question_ids = list({a["question_id"] for a in attempts})
    questions = (
        supabase_admin.table("exam_questions")
        .select("id, difficulty_level")
        .in_("id", question_ids)
        .execute()
        .data
    ) or []
    level_by_question = {q["id"]: q.get("difficulty_level") for q in questions}

    correct_by_level: dict[str, int] = {}
    total_by_level: dict[str, int] = {}
    for a in attempts:
        level = level_by_question.get(a["question_id"])
        if level not in CEFR_LEVEL_ORDER:
            continue
        total_by_level[level] = total_by_level.get(level, 0) + 1
        if a["is_correct"]:
            correct_by_level[level] = correct_by_level.get(level, 0) + 1

    level, _determined = _estimate_level_from_counts(correct_by_level, total_by_level)
    return level


def _estimate_level_from_counts(
    correct_by_level: dict[str, int], total_by_level: dict[str, int]
) -> tuple[str | None, bool]:
    """(tahmini_seviye, kesin_mi) dondurur.

    kesin_mi=True: kullanicinin gecemedigi bir seviyeye ulasildi ya da c2'ye
    kadar tum seviyeler olculdu -- yani tahmin bir "tavan" iceriyor.
    kesin_mi=False: cevaplanan tum seviyeler gecildi ama daha ust seviyeler
    hic olculmedi (yarim birakilan sinav) -- tahmin sadece bir ALT SINIR.

    24 Eylul 2026 HATA DUZELTMESI: eskiden kullanici ilk olculen seviyede
    (a1) bile %50'nin altinda kalirsa None donuyordu -> seviye hic
    yazilmiyordu -> placement/status needs_placement=True kalmaya devam
    ediyordu ve gercek bir baslangic seviyesindeki kullanici her giriste
    TEKRAR sinava yonlendiriliyordu (sonsuz dongu). En dusuk olculebilir
    seviye a1 oldugu icin artik taban a1'dir."""
    estimated_level: str | None = None
    any_measured = False
    for level in CEFR_LEVEL_ORDER:
        total = total_by_level.get(level, 0)
        if total == 0:
            continue
        any_measured = True
        accuracy = correct_by_level.get(level, 0) / total
        if accuracy >= PLACEMENT_LEVEL_PASS_THRESHOLD:
            estimated_level = level
        else:
            return (estimated_level or CEFR_LEVEL_ORDER[0], True)
    if not any_measured:
        return (None, False)
    measured_top = max(
        (lv for lv in CEFR_LEVEL_ORDER if total_by_level.get(lv, 0) > 0),
        key=CEFR_LEVEL_ORDER.index,
    )
    return (estimated_level, measured_top == CEFR_LEVEL_ORDER[-1])


def _store_placement_level(user_id: str, learning_lang: str, level: str, completed_at: str) -> None:
    """user_learning_languages.placement_level/placement_completed_at'i yazar.
    Once UPDATE dener (asil beklenen yol -- kullanicinin bu dil icin zaten bir
    user_learning_languages satiri olmasi gerekir); satir yoksa (eski kullanici
    / tutarsizlik ihtimaline karsi) INSERT'e duser.

    19 Eylul 2026 (task #65 -- adaptif seviye yeniden degerlendirme sistemi,
    bkz. 079_user_level_tracking.sql): placement_level'e EK OLARAK
    current_level/level_last_assessed_at de burada sifirlanir --
    current_level, "su anki" yasayan seviyedir ve seviye tespit sinavi
    (placement) HER YAPILDIGINDA (ilk kez de, kullanici tekrar sinava
    girse de) en guclu/en dogrudan sinyal sayilir -- level_assessment_
    service.py'nin periyodik, dolayli (oyun dogruluk orani) tahminini
    GECERSIZ KILAR. Yani kullanici tekrar placement sinavina girerse,
    current_level bilinçli olarak yeni sonuca "resetlenir" (onceki
    periyodik yukselis/dususler unutulur) -- bu urun karari, cunku
    placement dogrudan olcum, reassessment ise dolayli tahmin.

    user_level_history'ye de bir kayit dusulur (source="placement_exam")
    -- boylece raporlarda "ne zaman placement yapildi, ne zaman periyodik
    degisti" ayrimi gorunur kalir (bkz. user_report_service.py).

    BILINCLI KOD TEKRARI: CEFR_LEVEL_ORDER burada kucuk bir liste olarak
    tekrar tanimlaniyor (level_assessment_service.py'deki AYNI sabitin
    kopyasi) -- route modulleri arasinda capraz bagimlilik olusturmamak
    icin bilincli bir tercih (bkz. games.py::weak_difficulty_levels ve
    duels.py'deki benzer yorumlar)."""
    CEFR_LEVEL_ORDER = ["a1", "a2", "b1", "b2", "c1", "c2"]

    existing = (
        supabase_admin.table("user_learning_languages")
        .select("current_level")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    previous_current_level = existing[0].get("current_level") if existing else None

    if previous_current_level is None:
        direction = "initial"
    elif previous_current_level == level:
        direction = "initial"  # ayni seviye -- "yukselis/dusus" degil, yeniden onay
    else:
        prev_idx = (
            CEFR_LEVEL_ORDER.index(previous_current_level)
            if previous_current_level in CEFR_LEVEL_ORDER
            else None
        )
        new_idx = CEFR_LEVEL_ORDER.index(level) if level in CEFR_LEVEL_ORDER else None
        if prev_idx is None or new_idx is None:
            direction = "initial"
        else:
            direction = "up" if new_idx > prev_idx else "down"

    update_result = (
        supabase_admin.table("user_learning_languages")
        .update(
            {
                "placement_level": level,
                "placement_completed_at": completed_at,
                "current_level": level,
                "level_last_assessed_at": completed_at,
            }
        )
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
    )
    if not update_result.data:
        supabase_admin.table("user_learning_languages").insert(
            {
                "user_id": user_id,
                "learning_lang": learning_lang,
                "is_active": True,
                "placement_level": level,
                "placement_completed_at": completed_at,
                "current_level": level,
                "level_last_assessed_at": completed_at,
            }
        ).execute()

    supabase_admin.table("user_level_history").insert(
        {
            "user_id": user_id,
            "learning_lang": learning_lang,
            "level": level,
            "previous_level": previous_current_level,
            "direction": direction,
            "source": "placement_exam",
            "assessed_at": completed_at,
        }
    ).execute()



# ── Seviye Tespit Sınavı — devam (resume) ve yarım kalan oturumları kapatma ──
# 24 Eylul 2026. Bir oturumun "suresi" = time_limit_seconds (timed_mock);
# suresiz (practice) placement oturumlari icin PLACEMENT_UNTIMED_RESUME_WINDOW
# kullanilir. Suresinin bitmesine RESUME_MIN_REMAINING_SECONDS'tan az kalmis
# bir oturum devam ettirilmez (kullaniciya 30 saniyelik bir sinav vermek
# anlamsiz) -- kapatilir ve yenisi acilir.
PLACEMENT_UNTIMED_RESUME_WINDOW = timedelta(hours=24)
RESUME_MIN_REMAINING_SECONDS = 60
# Yarida birakilip suresi dolan bir oturumdan seviye yazmak icin gereken en
# az cevap orani. Sorular a1 -> c2 artan sirada soruldugu icin yarim bir
# sinavda ust seviyeler hic olculmemis olur; bu durumda tahmin sadece bir alt
# sinirdir. Alt sinir yine de yazilir (dinamik seviye sistemi --
# level_assessment_service.py -- zamanla yukari tasir) ama ancak sinavin en
# az yarisi cevaplandiysa. Daha az cevapta, kullanicinin gecemedigi bir
# seviyeye ulasilmissa (tahmin kesinse) yine yazilir.
PLACEMENT_PARTIAL_MIN_RATIO = 0.5


def _parse_ts(value: str) -> datetime:
    """PostgREST zaman damgalarini (orn. '2026-09-23T16:00:30.88917+00:00',
    kesir hanesi degisken) timezone-aware datetime'a cevirir."""
    v = value.replace("Z", "+00:00")
    m = re.match(r"^(.*?\.)(\d+)(.*)$", v)
    if m:
        v = m.group(1) + m.group(2)[:6].ljust(6, "0") + m.group(3)
    dt = datetime.fromisoformat(v)
    return dt if dt.tzinfo else dt.replace(tzinfo=UTC)


def _session_deadline(session: dict) -> datetime:
    started = _parse_ts(session["started_at"])
    limit = session.get("time_limit_seconds")
    if limit:
        return started + timedelta(seconds=int(limit))
    return started + PLACEMENT_UNTIMED_RESUME_WINDOW


def _session_response(session: dict, resumed: bool) -> ExamSessionResponse:
    remaining: int | None = None
    if session.get("time_limit_seconds"):
        remaining = max(
            0, int((_session_deadline(session) - datetime.now(UTC)).total_seconds())
        )
    return ExamSessionResponse(
        id=session["id"],
        exam_type=session["exam_type"],
        session_mode=session["session_mode"],
        total_questions=session["total_questions"],
        time_limit_seconds=session.get("time_limit_seconds"),
        score=session.get("score") or 0,
        xp_earned=session.get("xp_earned") or 0,
        started_at=session["started_at"],
        ended_at=session.get("ended_at"),
        remaining_seconds=remaining,
        resumed=resumed,
        answered_count=len(_attempted_question_ids(session["id"])) if resumed else 0,
    )


def _open_placement_sessions(user_id: str, learning_lang: str) -> list[dict]:
    return (
        supabase_admin.table("exam_sessions")
        .select("*")
        .eq("user_id", user_id)
        .eq("exam_type", "placement")
        .eq("learning_lang", learning_lang)
        .is_("ended_at", "null")
        .order("started_at", desc=True)
        .execute()
        .data
    ) or []


def _resumable_placement_session(
    user_id: str, learning_lang: str, total_questions: int
) -> dict | None:
    now = datetime.now(UTC)
    for session in _open_placement_sessions(user_id, learning_lang):
        if session["total_questions"] != total_questions:
            continue  # eski 50 soruluk format -- devam ettirilmez
        remaining = (_session_deadline(session) - now).total_seconds()
        if remaining >= RESUME_MIN_REMAINING_SECONDS:
            return session
    return None


def _finalize_stale_placement_sessions(user_id: str, learning_lang: str) -> str | None:
    """Suresi dolmus (ya da eski formatta kalmis) ama hic finish edilmemis
    placement oturumlarini kapatir. Yeterli cevap varsa seviyeyi hesaplayip
    yazar. Yazilan son seviyeyi (varsa) dondurur. Kullanici basina birkac
    satirlik is -- placement/status ve create_session icinden cagrilir,
    ayri bir cron gerekmez."""
    now = datetime.now(UTC)
    stored_level: str | None = None
    current_total = EXAM_MOCK_CONFIG["placement"]["total_questions"]
    recheck_total = RECHECK_MOCK_CONFIG["total_questions"]
    # En eskiden yeniye: en guncel sinav sonucu en son yazilsin.
    for session in reversed(_open_placement_sessions(user_id, learning_lang)):
        deadline = _session_deadline(session)
        # 24 Eylul 2026 -- Madde 3: recheck oturumlari (15 soru) da GECERLI
        # bir guncel format -- sadece ilk-kez (25 soru) formatiyla eslesmiyor
        # diye "legacy" sayilip zamanindan once kapatilmamali. legacy_format
        # artik SADECE ne guncel ilk-kez ne de guncel recheck boyutuyla
        # eslesen (gercekten eski/terk edilmis) oturumlari isaretler.
        legacy_format = session["total_questions"] not in (current_total, recheck_total)
        if deadline - now >= timedelta(seconds=RESUME_MIN_REMAINING_SECONDS) and not legacy_format:
            continue  # hala devam ettirilebilir

        attempts = (
            supabase_admin.table("exam_attempts")
            .select("question_id, is_correct, created_at")
            .eq("session_id", session["id"])
            .execute()
            .data
        ) or []
        ended_at_dt = min(deadline, now)
        if attempts:
            last_answer = max(_parse_ts(a["created_at"]) for a in attempts)
            ended_at_dt = min(ended_at_dt, max(last_answer, _parse_ts(session["started_at"])))
        ended_at = ended_at_dt.isoformat()

        closed = (
            supabase_admin.table("exam_sessions")
            .update({"ended_at": ended_at})
            .eq("id", session["id"])
            .is_("ended_at", "null")
            .execute()
            .data
        )
        if not closed or not attempts:
            continue  # baska bir istek zaten kapatti / hic cevap yok

        question_ids = list({a["question_id"] for a in attempts})
        questions = (
            supabase_admin.table("exam_questions")
            .select("id, difficulty_level")
            .in_("id", question_ids)
            .execute()
            .data
        ) or []
        level_by_question = {q["id"]: q.get("difficulty_level") for q in questions}
        correct_by_level: dict[str, int] = {}
        total_by_level: dict[str, int] = {}
        for a in attempts:
            lv = level_by_question.get(a["question_id"])
            if lv not in CEFR_LEVEL_ORDER:
                continue
            total_by_level[lv] = total_by_level.get(lv, 0) + 1
            if a["is_correct"]:
                correct_by_level[lv] = correct_by_level.get(lv, 0) + 1

        level, determined = _estimate_level_from_counts(correct_by_level, total_by_level)
        enough = len(attempts) >= session["total_questions"] * PLACEMENT_PARTIAL_MIN_RATIO
        if level and (determined or enough):
            _store_placement_level(user_id, learning_lang, level, ended_at)
            stored_level = level
    return stored_level


@router.post("/sessions/{session_id}/finish", response_model=ExamFinishResponse)
async def finish_session(session_id: str, current_user=Depends(get_current_user)):
    session = _get_session(session_id, current_user.id)
    if session.get("ended_at"):
        raise HTTPException(status_code=400, detail="Oturum zaten bitmiş.")

    # Deneme sınavı (timed_mock) tamamlama bonusu — sadece bir kez, finish
    # çağrısında verilir (practice modunda bonus yok, o zaten soru başına XP alır).
    mock_bonus_xp = 0
    if session["session_mode"] == "timed_mock":
        xp_result = await award_xp(
            user_id=current_user.id, source_type="exam_mock_complete", source_id=session_id
        )
        mock_bonus_xp = xp_result.amount_awarded

    ended_at = datetime.now(UTC).isoformat()
    new_xp_earned = session["xp_earned"] + mock_bonus_xp
    update_result = (
        supabase_admin.table("exam_sessions")
        .update({"ended_at": ended_at, "xp_earned": new_xp_earned})
        .eq("id", session_id)
        .execute()
    )
    if not update_result.data:
        raise HTTPException(status_code=500, detail="Oturum kapatılamadı.")

    updated = update_result.data[0]

    placement_level: str | None = None
    if updated["exam_type"] == "placement":
        placement_level = _compute_placement_level(session_id)
        if placement_level:
            learning_lang = session.get("learning_lang") or "en"
            _store_placement_level(current_user.id, learning_lang, placement_level, ended_at)

    return ExamFinishResponse(
        id=updated["id"],
        exam_type=updated["exam_type"],
        session_mode=updated["session_mode"],
        score=updated["score"],
        total_questions=updated["total_questions"],
        xp_earned=updated["xp_earned"],
        started_at=updated["started_at"],
        ended_at=updated["ended_at"],
        mock_bonus_xp=mock_bonus_xp,
        placement_level=placement_level,
    )


# ── Seviye Tespit Sınavı — yönlendirme durumu ─────────────────────────
# Kullanıcı isteği (18 Eylül 2026): "sisteme girer girmez hemen seviye
# tespit sınavına yönlendirilsin" (mevcut VE yeni kullanıcılar, tüm
# platformlar). Mobil/web uygulaması girişten hemen sonra bunu çağırıp
# needs_placement=true ise kullanıcıyı /(app)/exam-prep?examType=
# placement&sessionMode=timed_mock'a yönlendirir. Tek kaynak burasi --
# istemci tarafinda ayrica bir "tamamlandi mi" mantigi tutulmuyor.
@router.get("/placement/status", response_model=PlacementStatusResponse)
async def get_placement_status(current_user=Depends(get_current_user)):
    _, learning_lang = _profile_langs(current_user.id)
    # 24 Eylul 2026 -- uygulama girisinde yarim kalip suresi dolan placement
    # oturumlari burada kapatilir; yeterli cevap varsa seviye yazilir ve
    # kullanici bir daha sinava yonlendirilmez.
    _finalize_stale_placement_sessions(current_user.id, learning_lang)
    rows = (
        supabase_admin.table("user_learning_languages")
        .select("placement_level, placement_completed_at, current_level")
        .eq("user_id", current_user.id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    row = rows[0] if rows else {}
    completed_at = row.get("placement_completed_at")
    has_content = learning_lang in _exam_content_learning_langs()
    needs_placement = has_content and not completed_at

    # 24 Eylul 2026 -- Madde 3: periyodik yeniden seviye tespiti onerisi.
    # SADECE placement zaten tamamlanmissa anlamli (ilk kez cozecek
    # kullaniciya zaten needs_placement zorunlu akisi devreye giriyor).
    # Iki tetikleyiciden biri yeterli: takvim (RECHECK_INTERVAL_DAYS gun
    # gecmis) ya da Madde 1'in sureklilik gosteren sapma sinyali (bkz.
    # _has_recent_drift_signal). Bu ZORUNLU DEGIL -- sadece dashboard'da
    # bir oneri karti (needs_placement'in aksine kullanici isterse
    # gecebilir).
    needs_recheck = False
    if has_content and completed_at:
        days_since = (datetime.now(UTC) - _parse_ts(completed_at)).days
        needs_recheck = days_since >= RECHECK_INTERVAL_DAYS or _has_recent_drift_signal(
            current_user.id, learning_lang, since_iso=completed_at
        )

    return PlacementStatusResponse(
        learning_lang=learning_lang,
        needs_placement=needs_placement,
        # 24 Eylul 2026 (CEFR rozeti ozelligi) -- onceden burada sadece
        # placement_level (baslangic sinav sonucu, SABIT) donuyordu. Ama
        # Madde 1'in adaptif motoru current_level'i oyun performansina gore
        # SUREKLI guncelliyor (level_assessment_service.py) -- yani placement_
        # level zamanla "yasayan" seviyeden geri kalabiliyordu. Diger servisler
        # (study_program_service, user_report_service) zaten current_level'i
        # ONCELIKLI okuyordu, bu uc nokta ayni deseni takip etmiyordu -- artik
        # ediyor. Hicbir istemci su ana kadar bu alani okumuyordu (dashboard'da
        # kullanilacak yeni CEFR rozeti haric), o yuzden davranis degisikligi
        # guvenli.
        current_level=row.get("current_level") or row.get("placement_level"),
        completed_at=completed_at,
        has_resumable_session=bool(
            not completed_at
            and _resumable_placement_session(
                current_user.id,
                learning_lang,
                EXAM_MOCK_CONFIG["placement"]["total_questions"],
            )
        ),
        needs_recheck=needs_recheck,
    )


@router.post(
    "/questions/{question_id}/add-word",
    response_model=AddWordFromQuestionResponse,
    status_code=201,
)
async def add_word_from_question(question_id: str, current_user=Depends(get_current_user)):
    """Sorunun related_words alanındaki kelime(ler)i kullanıcının kelime
    hazinesine ekler (zaten varsa atlanır). Kullanıcı isteği (devir notu
    §1.1): "buradaki sorulardan kişi kendi kelime havuzuna kelime ekleyebilsin".
    games.py::_sync_word_progress'teki insert şablonuyla tutarlı (bkz. calculate_next_review)."""
    question_result = (
        supabase_admin.table("exam_questions")
        .select("related_words")
        .eq("id", question_id)
        .single()
        .execute()
    )
    if not question_result.data:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")

    related_words = question_result.data.get("related_words") or []
    native_lang, learning_lang = _profile_langs(current_user.id)

    added_count = 0
    already_had_count = 0
    for rw in related_words:
        word_text = rw.get("word")
        if not word_text:
            continue
        existing = (
            supabase_admin.table("words")
            .select("id")
            .eq("user_id", current_user.id)
            .ilike("word", word_text)
            .eq("source_lang", learning_lang)
            .execute()
        ).data
        if existing:
            already_had_count += 1
            continue

        insert_row = {
            "user_id": current_user.id,
            "word": word_text,
            "meaning": rw.get("meaning"),
            "meaning_native": rw.get("meaning"),
            "example": rw.get("example"),
            "source_lang": learning_lang,
            "target_lang": native_lang,
        }
        insert_row.update(calculate_next_review(insert_row, True))
        supabase_admin.table("words").insert(insert_row).execute()
        added_count += 1

    return AddWordFromQuestionResponse(added_count=added_count, already_had_count=already_had_count)


# ── İstatistik & İçerik Motoru Faz 2: kullanıcı soru önerisi ───────────


@router.post("/questions/suggest", response_model=ExamQuestionSuggestionResponse, status_code=201)
async def suggest_question(
    payload: ExamQuestionSuggestionCreate, current_user=Depends(get_current_user)
):
    """Kullanıcı kendi sorusunu önerir — status=pending olarak kaydedilir,
    next_question/list_exam_types onaylanmadan (status=approved) bu soruyu
    hiç görmez. Admin GET/POST /admin/questions/... ile onaylar/reddeder."""
    if not _exam_area_enabled(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Sınav Hazırlık Alanı şu an sadece İngilizce öğrenen kullanıcılar için kullanılabilir.",
        )

    option_ids = [opt.id for opt in payload.options]
    if len(set(option_ids)) != len(option_ids):
        raise HTTPException(status_code=422, detail="Şık id'leri birbirinden farklı olmalı.")
    if payload.correct_option not in option_ids:
        raise HTTPException(
            status_code=422, detail="correct_option, options listesindeki bir id ile eşleşmeli."
        )

    _, learning_lang = _profile_langs(current_user.id)

    row = {
        "exam_type": payload.exam_type.value,
        "question_text": payload.question_text,
        "options": [opt.model_dump() for opt in payload.options],
        "correct_option": payload.correct_option,
        "explanation": payload.explanation,
        "topic_tag": payload.topic_tag,
        "learning_lang": learning_lang,
        "source_type": "user",
        "status": "pending",
        "submitted_by": current_user.id,
        "is_active": True,
    }
    result = supabase_admin.table("exam_questions").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Soru önerisi kaydedilemedi.")

    created = result.data[0]

    # V2 backlog #10 (14 Eylül 2026): katkı XP'si — soru gönderilir
    # gönderilmez küçük/anlık bir ödül (bkz. xp_service.py::XP_AMOUNTS
    # yorumu). try/except: bir XP hatası kullanıcının soru gönderme
    # isteğini ASLA başarısız kılmamalı — soru zaten kaydedildi.
    xp_awarded = 0
    try:
        xp_result = await award_xp(
            user_id=current_user.id,
            source_type="exam_question_suggested",
            source_id=created["id"],
        )
        xp_awarded = xp_result.amount_awarded
    except Exception as exc:
        print(f"SUGGEST_QUESTION award_xp warning: {type(exc).__name__}: {exc}")

    # AI ön-kontrolü — ASLA otomatik onay/red tetiklemez, sadece admin
    # kuyruğunda görünecek bir etiket+not ekler (verify_question hiçbir
    # zaman exception fırlatmaz, bkz. o fonksiyonun docstring'i).
    verification = verify_question(
        exam_type=payload.exam_type.value,
        question_text=payload.question_text,
        options=[opt.model_dump() for opt in payload.options],
        correct_option=payload.correct_option,
        explanation=payload.explanation,
        topic_tag=payload.topic_tag,
    )
    try:
        supabase_admin.table("exam_questions").update(
            {
                "ai_verdict": verification["verdict"],
                "ai_verdict_note": verification["note"],
                "ai_verified_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", created["id"]).execute()
    except Exception as exc:
        print(f"SUGGEST_QUESTION ai_verdict update warning: {type(exc).__name__}: {exc}")

    return ExamQuestionSuggestionResponse(
        id=created["id"], status=created["status"], xp_awarded=xp_awarded
    )


# ── İstatistik & İçerik Motoru Faz 2: admin moderasyon kuyruğu ────────
# admin.py'deki RBAC desenini izler: get_current_admin salt-okunur listeleme
# için yeterli, get_current_admin_full mutasyon (onay/red) için zorunlu.


@router.get("/admin/questions/pending", response_model=list[PendingExamQuestion])
async def list_pending_questions(admin=Depends(get_current_admin)):
    result = (
        supabase_admin.table("exam_questions")
        .select("*")
        .eq("status", "pending")
        .order("created_at", desc=False)
        .execute()
    )
    rows = result.data or []

    email_map: dict[str, str] = {}
    submitter_ids = {r["submitted_by"] for r in rows if r.get("submitted_by")}
    if submitter_ids:
        try:
            users = list_all_auth_users()
            for u in users:
                if u.id in submitter_ids:
                    email_map[u.id] = u.email
        except Exception as e:
            print(f"LIST_PENDING_QUESTIONS email map warning: {e}")

    return [
        PendingExamQuestion(
            id=r["id"],
            exam_type=r["exam_type"],
            learning_lang=r["learning_lang"],
            question_text=r["question_text"],
            options=[ExamQuestionOption(**opt) for opt in r["options"]],
            correct_option=r["correct_option"],
            explanation=r.get("explanation"),
            topic_tag=r.get("topic_tag"),
            source_type=r["source_type"],
            submitted_by=r.get("submitted_by"),
            submitted_by_email=email_map.get(r.get("submitted_by")),
            ai_verdict=r.get("ai_verdict"),
            ai_verdict_note=r.get("ai_verdict_note"),
            created_at=r["created_at"],
        )
        for r in rows
    ]


@router.post(
    "/admin/questions/{question_id}/approve", response_model=ExamQuestionModerationResponse
)
async def approve_question(question_id: str, admin=Depends(get_current_admin_full)):
    result = (
        supabase_admin.table("exam_questions")
        .update({"status": "approved"})
        .eq("id", question_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")

    approved = result.data[0]
    log_admin_action(admin.id, admin.email, "exam_question.approve", "exam_question", question_id)

    # V2 backlog #10: onay EK bonusu — sadece gerçek bir kullanıcı katkısıysa
    # (source_type='user' + submitted_by dolu; AI sorularında ödüllenecek
    # bir kullanıcı yok). try/except: bir XP hatası admin'in onay
    # işlemini ASLA başarısız kılmamalı — status zaten güncellendi.
    if approved.get("source_type") == "user" and approved.get("submitted_by"):
        try:
            await award_xp(
                user_id=approved["submitted_by"],
                source_type="exam_question_approved",
                source_id=question_id,
            )
        except Exception as exc:
            print(f"APPROVE_QUESTION award_xp warning: {type(exc).__name__}: {exc}")

    return ExamQuestionModerationResponse(id=question_id, status="approved")


@router.post(
    "/admin/questions/{question_id}/reject", response_model=ExamQuestionModerationResponse
)
async def reject_question(question_id: str, admin=Depends(get_current_admin_full)):
    result = (
        supabase_admin.table("exam_questions")
        .update({"status": "rejected"})
        .eq("id", question_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Soru bulunamadı.")
    log_admin_action(admin.id, admin.email, "exam_question.reject", "exam_question", question_id)
    return ExamQuestionModerationResponse(id=question_id, status="rejected")


# ── İstatistik & İçerik Motoru Faz 2b: AI ile soru üretimi (admin) ────
# Üretilen sorular DOĞRUDAN havuza girmez — kullanıcı önerileriyle aynı
# moderasyon kuyruğundan geçer (source_type='ai', status='pending').
# get_current_admin_full zorunlu: bu bir mutasyon + ücretli AI API çağrısı.


@router.post("/admin/questions/generate-ai", response_model=AIQuestionGenerateResult)
async def generate_ai_questions(
    payload: AIQuestionGenerateRequest, admin=Depends(get_current_admin_full)
):
    try:
        questions = generate_questions(
            payload.exam_type.value, payload.count, payload.topic_tag
        )
    except ExamQuestionGenerationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    rows = [
        {
            "exam_type": payload.exam_type.value,
            "learning_lang": "en",
            "question_text": q["question_text"],
            "options": q["options"],
            "correct_option": q["correct_option"],
            "explanation": q["explanation"],
            "topic_tag": q["topic_tag"],
            "source_type": "ai",
            "status": "pending",
            "is_active": True,
        }
        for q in questions
    ]
    result = supabase_admin.table("exam_questions").insert(rows).execute()
    created_ids = [row["id"] for row in (result.data or [])]

    log_admin_action(
        admin.id,
        admin.email,
        "exam_question.generate_ai",
        "exam_type",
        payload.exam_type.value,
        {
            "requested": payload.count,
            "created": len(created_ids),
            "topic_tag": payload.topic_tag,
        },
    )

    return AIQuestionGenerateResult(
        requested=payload.count, created=len(created_ids), question_ids=created_ids
    )

# ── Madde #3b: aynı konudan ekstra pratik soru önerisi ────────────────
# Bağımsız, oturumsuz mini pratik seti — next-question/attempt akışından
# farklı olarak session açmaz, XP vermez, exam_attempts'e yazmaz. Sadece
# kullanıcının az önce yanlış yaptığı konuyu pekiştirmesi için.


@router.get("/topics/{topic_tag}/practice-questions", response_model=ExamPracticeQuestionsResult)
async def practice_questions_by_topic(
    topic_tag: str,
    exam_type: ExamType | None = None,
    exclude_question_id: str | None = None,
    limit: int = 5,
    current_user=Depends(get_current_user),
):
    if not _exam_area_enabled(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Sınav Hazırlık Alanı şu an sadece İngilizce öğrenen kullanıcılar için kullanılabilir.",
        )
    limit = max(1, min(limit, 10))

    _, practice_learning_lang = _profile_langs(current_user.id)
    query = (
        supabase_admin.table("exam_questions")
        .select("id, exam_type, question_text, options, correct_option, explanation")
        .eq("topic_tag", topic_tag)
        .eq("is_active", True)
        .eq("status", "approved")
        .eq("learning_lang", practice_learning_lang)
    )
    if exam_type is not None:
        query = query.eq("exam_type", exam_type.value)
    candidates = (query.limit(CANDIDATE_FETCH_LIMIT).execute().data) or []
    if exclude_question_id:
        candidates = [q for q in candidates if q["id"] != exclude_question_id]
    random.shuffle(candidates)
    chosen = candidates[:limit]

    related_grammar_topic = _grammar_topics_for_tags([topic_tag]).get(topic_tag)

    return ExamPracticeQuestionsResult(
        topic_tag=topic_tag,
        related_grammar_topic=related_grammar_topic,
        questions=[
            ExamPracticeQuestionItem(
                id=q["id"],
                exam_type=q["exam_type"],
                question_text=q["question_text"],
                options=[ExamQuestionOption(**opt) for opt in q["options"]],
                correct_option=q["correct_option"],
                explanation=q["explanation"],
                topic_tag=topic_tag,
            )
            for q in chosen
        ],
    )


@router.post("/topics/{topic_tag}/practice-attempt", status_code=201)
async def log_topic_practice_attempt(
    topic_tag: str,
    attempt_in: TopicPracticeAttemptCreate,
    current_user=Depends(get_current_user),
):
    """Görev Haritası v2 (10 Eylül 2026) — bkz. ExamPracticeQuestionsResult
    docstring'i. practice_questions_by_topic ekranında cevaplanan HER soru
    için istemci bunu çağırır; sadece topic_practice_attempts'e bir satır
    yazar. XP verilmez, exam_sessions/exam_attempts'e DOKUNULMAZ."""
    row = {
        "user_id": current_user.id,
        "topic_tag": topic_tag,
        "question_id": attempt_in.question_id,
        "is_correct": attempt_in.is_correct,
    }
    supabase_admin.table("topic_practice_attempts").insert(row).execute()
    return {"message": "Kaydedildi"}


# ── Madde #3c: haftalık/günlük zayıf konu özeti ────────────────────────
# exam_attempts + exam_questions.topic_tag üzerinden kullanıcı bazlı
# agregasyon — ayrı bir sayaç tablosu/view yok (exam_question_stats view'ı
# soru bazlı ve kullanıcıdan bağımsız olduğu için burada kullanılamaz).


@router.get("/stats/weak-topics", response_model=WeakTopicsResult)
async def weak_topics(days: int = 7, limit: int = 5, current_user=Depends(get_current_user)):
    # list_exam_types ile aynı "soft-disable" deseni: uygun olmayan kullanıcı
    # için 403 fırlatmak yerine boş sonuç dönülür — dashboard widget'ı bu
    # durumda kendini hiç göstermez, hata da göstermez.
    if not _exam_area_enabled(current_user.id):
        return WeakTopicsResult(period_days=days, items=[])

    days = max(1, min(days, 90))
    limit = max(1, min(limit, 20))
    since_iso = (datetime.now(UTC) - timedelta(days=days)).isoformat()

    session_ids = _user_session_ids_since(current_user.id, since_iso)
    if not session_ids:
        return WeakTopicsResult(period_days=days, items=[])

    attempts = (
        supabase_admin.table("exam_attempts")
        .select("question_id, is_correct")
        .in_("session_id", session_ids)
        .execute()
        .data
    ) or []
    if not attempts:
        return WeakTopicsResult(period_days=days, items=[])

    question_ids = list({a["question_id"] for a in attempts})
    questions = (
        supabase_admin.table("exam_questions")
        .select("id, topic_tag")
        .in_("id", question_ids)
        .execute()
        .data
    ) or []
    tag_by_question_id = {q["id"]: q.get("topic_tag") for q in questions}

    counts: dict[str, dict[str, int]] = {}
    for a in attempts:
        tag = tag_by_question_id.get(a["question_id"])
        if not tag:
            continue
        bucket = counts.setdefault(tag, {"total": 0, "wrong": 0})
        bucket["total"] += 1
        if not a["is_correct"]:
            bucket["wrong"] += 1

    # Sadece en az bir yanlışın olduğu konular gösterilir — amaç "zayıf
    # konu" özeti, genel istatistik değil.
    rows = [
        {"topic_tag": tag, "total_count": c["total"], "wrong_count": c["wrong"]}
        for tag, c in counts.items()
        if c["wrong"] > 0
    ]
    rows.sort(key=lambda r: (-r["wrong_count"], r["wrong_count"] / r["total_count"]))
    rows = rows[:limit]

    grammar_map = _grammar_topics_for_tags([r["topic_tag"] for r in rows])
    items = [
        WeakTopicItem(
            topic_tag=r["topic_tag"],
            total_count=r["total_count"],
            wrong_count=r["wrong_count"],
            accuracy_ratio=round((r["total_count"] - r["wrong_count"]) / r["total_count"], 4),
            related_grammar_topic=grammar_map.get(r["topic_tag"]),
        )
        for r in rows
    ]
    return WeakTopicsResult(period_days=days, items=items)


# ================================================================
# Şık (seçenek) hata deseni — 18 Eylül 2026 (İstatistik & Analitik
# Kataloğu §7, Faz 1). Kullanıcının yanlış yaptığı sorularda hangi
# çeldiriciye yöneldiğini gösterir — exam_attempts.selected_option zaten
# tutuluyor, sadece burada agregasyon yapılıyor.
# ================================================================


@router.get("/stats/my-mistake-patterns", response_model=MyMistakePatternsResult)
async def my_mistake_patterns(limit: int = 20, current_user=Depends(get_current_user)):
    if not _exam_area_enabled(current_user.id):
        return MyMistakePatternsResult(items=[])

    limit = max(1, min(limit, 50))
    session_ids = _user_session_ids_since(
        current_user.id, "1970-01-01T00:00:00+00:00"
    )
    if not session_ids:
        return MyMistakePatternsResult(items=[])

    attempts = (
        supabase_admin.table("exam_attempts")
        .select("question_id, selected_option, is_correct")
        .in_("session_id", session_ids)
        .execute()
        .data
    ) or []
    if not attempts:
        return MyMistakePatternsResult(items=[])

    by_question: dict[str, list[dict]] = {}
    for a in attempts:
        by_question.setdefault(a["question_id"], []).append(a)

    # Sadece en az bir yanlışın olduğu sorular ilgi çekici.
    wrong_question_ids = [
        qid for qid, rows in by_question.items() if any(not r["is_correct"] for r in rows)
    ]
    if not wrong_question_ids:
        return MyMistakePatternsResult(items=[])

    questions = (
        supabase_admin.table("exam_questions")
        .select("id, question_text, topic_tag, options")
        .in_("id", wrong_question_ids)
        .execute()
        .data
    ) or []
    question_by_id = {q["id"]: q for q in questions}

    items: list[MyMistakePatternItem] = []
    for qid in wrong_question_ids:
        q = question_by_id.get(qid)
        if not q:
            continue
        rows = by_question[qid]
        wrong_rows = [r for r in rows if not r["is_correct"]]
        wrong_options = [r["selected_option"] for r in wrong_rows if r.get("selected_option")]
        if not wrong_options:
            continue
        # En çok tekrarlanan yanlış şık.
        pick_counts: dict[str, int] = {}
        for opt in wrong_options:
            pick_counts[opt] = pick_counts.get(opt, 0) + 1
        top_wrong_id = max(pick_counts, key=lambda k: pick_counts[k])
        option_text = next(
            (o["text"] for o in (q.get("options") or []) if o.get("id") == top_wrong_id), None
        )
        items.append(
            MyMistakePatternItem(
                question_id=qid,
                question_text=q["question_text"],
                topic_tag=q.get("topic_tag"),
                wrong_count=len(wrong_rows),
                total_attempts=len(rows),
                most_picked_wrong_option_id=top_wrong_id,
                most_picked_wrong_option_text=option_text,
                repeated_same_mistake=len(set(wrong_options)) == 1 and len(wrong_options) > 1,
            )
        )

    items.sort(key=lambda it: -it.wrong_count)
    return MyMistakePatternsResult(items=items[:limit])
