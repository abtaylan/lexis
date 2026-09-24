"""
backend/app/schemas/exams.py

Sınav Hazırlık Alanı (V2 §1.1) pydantic şemaları. games.py/schemas/games.py
ile aynı desen: Enum tipleri + Create/Response modelleri.
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ExamType(str, Enum):
    yds = "yds"
    yokdil = "yokdil"
    ielts = "ielts"
    toefl = "toefl"
    placement = "placement"  # 18 Eylul 2026 -- coklu dil seviye tespit sinavi (bkz. seed_placement_exam_questions.py)


class ExamSessionMode(str, Enum):
    practice = "practice"
    timed_mock = "timed_mock"


class ExamTypeInfo(BaseModel):
    exam_type: ExamType
    question_count: int
    available: bool  # question_count > 0 (soru bankası henüz boşsa istemci "Yakında" gösterir)


class ExamSessionCreate(BaseModel):
    exam_type: ExamType
    session_mode: ExamSessionMode = ExamSessionMode.practice
    total_questions: int | None = Field(default=None, ge=1, le=50)  # sadece practice modunda kullanılır


class ExamSessionResponse(BaseModel):
    id: str
    exam_type: str
    session_mode: str
    total_questions: int
    time_limit_seconds: int | None = None
    score: int
    xp_earned: int
    started_at: datetime
    ended_at: datetime | None = None
    # 24 Eylul 2026 -- seviye tespit sinavi devam (resume) destegi.
    # remaining_seconds: sureli oturumda kalan sure (istemci geri sayimi
    # bununla baslatmali; eski istemciler time_limit_seconds kullanmaya
    # devam eder, bu da sadece sayacin fazla gosterilmesi demek).
    # resumed: True ise bu yeni degil, yarim kalan oturumun kendisidir.
    remaining_seconds: int | None = None
    resumed: bool = False
    answered_count: int = 0


class ExamQuestionOption(BaseModel):
    id: str
    text: str


class NextQuestionResponse(BaseModel):
    finished: bool = False
    question_id: str | None = None
    question_text: str | None = None
    options: list[ExamQuestionOption] | None = None
    question_index: int | None = None  # 1-tabanlı, kaçıncı soru
    total_questions: int | None = None


class ExamAttemptCreate(BaseModel):
    question_id: str
    selected_option: str
    time_taken_ms: int | None = None


class ExamRelatedWord(BaseModel):
    word: str
    meaning: str
    example: str | None = None


class RelatedGrammarTopic(BaseModel):
    """exam_questions.topic_tag, grammar_topics.slug ile eşleştiğinde
    (ve o konu status='published' ise) döner — bkz. 027_grammar_reference.sql
    yorumu. Eşleşme yoksa (henüz gramer rehberinde karşılığı olmayan bir
    kelime/konu etiketiyse) related_grammar_topic alanı null kalır."""

    slug: str
    title_tr: str
    category_name_tr: str


class ExamAttemptResponse(BaseModel):
    id: str
    is_correct: bool
    correct_option: str
    explanation: str
    related_words: list[ExamRelatedWord] | None = None
    xp_awarded: int
    session_score: int
    leveled_up: bool
    new_level: int | None = None
    # Madde #3a/#3b: yanlış cevapta ilgili gramer konusuna yönlendirme +
    # aynı konudan ekstra pratik önerisi için gereken bilgi.
    topic_tag: str | None = None
    related_grammar_topic: RelatedGrammarTopic | None = None


class ExamFinishResponse(BaseModel):
    id: str
    exam_type: str
    session_mode: str
    score: int
    total_questions: int
    xp_earned: int
    started_at: datetime
    ended_at: datetime
    mock_bonus_xp: int = 0
    # 18 Eylul 2026 -- seviye tespit sinavi (exam_type='placement') bittiginde
    # hesaplanan CEFR seviyesi (bkz. exams.py::_compute_placement_level).
    # Diger sinav turlerinde None kalir.
    placement_level: str | None = None


class PlacementStatusResponse(BaseModel):
    # 18 Eylul 2026 -- kullanicinin aktif learning_lang'i icin seviye tespit
    # sinavi durumu (bkz. exams.py::get_placement_status). Uygulama girisinde
    # (mobil/web) "needs_placement=True" ise kullanici sinava yonlendirilir.
    learning_lang: str
    needs_placement: bool
    current_level: str | None = None
    completed_at: datetime | None = None
    # 24 Eylul 2026 -- devam ettirilebilir yarim bir placement oturumu var mi
    # (istemci "Kaldigin yerden devam et" metni gosterebilir).
    has_resumable_session: bool = False
    # 24 Eylul 2026 -- Adaptif Ogrenme Motoru Madde 3: periyodik yeniden
    # seviye tespiti onerisi (ZORUNLU DEGIL, needs_placement'in aksine).
    needs_recheck: bool = False


class AddWordFromQuestionResponse(BaseModel):
    added_count: int
    already_had_count: int


# ── Sınav Hazırlık İstatistik & İçerik Motoru — Faz 2: soru havuzu
#    büyütme (kullanıcı katkısı + moderasyon kuyruğu) ──────────────────


class ExamQuestionSuggestionCreate(BaseModel):
    """Kullanıcının kendi önerdiği soru — onay bekleyen (pending) kayıt
    olarak exam_questions'a düşer, admin onaylayana kadar next-question
    havuzunda görünmez."""

    exam_type: ExamType
    question_text: str = Field(min_length=10, max_length=2000)
    options: list[ExamQuestionOption] = Field(min_length=2, max_length=6)
    correct_option: str
    explanation: str | None = Field(default=None, max_length=2000)
    topic_tag: str | None = Field(default=None, max_length=100)


class ExamQuestionSuggestionResponse(BaseModel):
    id: str
    status: str
    xp_awarded: int = 0


class PendingExamQuestion(BaseModel):
    """Admin moderasyon kuyruğunda listelenen soru — kaynağı user veya ai,
    durumu pending olan tüm exam_questions kayıtları."""

    id: str
    exam_type: str
    learning_lang: str
    question_text: str
    options: list[ExamQuestionOption]
    correct_option: str
    explanation: str | None = None
    topic_tag: str | None = None
    source_type: str
    submitted_by: str | None = None
    submitted_by_email: str | None = None
    ai_verdict: str | None = None
    ai_verdict_note: str | None = None
    created_at: datetime


class ExamQuestionModerationResponse(BaseModel):
    id: str
    status: str



# ── İstatistik & İçerik Motoru Faz 2b: AI ile soru üretimi (admin) ─────


class AIQuestionGenerateRequest(BaseModel):
    """Admin panelinden tetiklenir — belirtilen sınav türü için AI'a soru
    ürettirir. Üretilen sorular status='pending' olarak kaydedilir, kullanıcı
    havuzuna girmeden önce admin GET/POST /admin/questions/... ile onaylar."""

    exam_type: ExamType
    count: int = Field(default=5, ge=1, le=20)
    topic_tag: str | None = Field(default=None, max_length=100)


class AIQuestionGenerateResult(BaseModel):
    requested: int
    created: int
    question_ids: list[str]


# ── İstatistik & İçerik Motoru #3: cevap sonrası kişisel öneri ─────────
# (a) yanlış cevapta ilgili Gramer Rehberi konusuna yönlendirme
# (b) aynı konudan ekstra pratik soru önerisi
# (c) haftalık/günlük zayıf konu özeti


class ExamPracticeQuestionItem(BaseModel):
    id: str
    exam_type: str
    question_text: str
    options: list[ExamQuestionOption]
    correct_option: str
    explanation: str
    # 24 Eylul 2026 -- hafta sonu quizinde (study_program.py) sorular farkli
    # konulardan gelir; istemci cevabi bu etiketle loglar.
    topic_tag: str | None = None


class ExamPracticeQuestionsResult(BaseModel):
    """GET /exams/topics/{topic_tag}/practice-questions cevabı — madde #3b.
    Bağımsız, oturumsuz mini pratik seti: XP verilmez, exam_sessions/
    exam_attempts'e YAZILMAZ, sadece aynı konuyu tekrar pekiştirmek
    içindir (bu tasarım DEĞİŞMEDİ). 10 Eylül 2026 (Görev Haritası v2)
    itibariyle istemci her cevaptan sonra AYRI, hafif bir uca
    (POST /exams/topics/{topic_tag}/practice-attempt, bkz.
    TopicPracticeAttemptCreate) log atar — bu SADECE Görev Haritası'nın
    'grammar_topic' düğümlerini ölçebilmesi için, XP/session akışına
    hiçbir etkisi yok."""

    topic_tag: str
    related_grammar_topic: RelatedGrammarTopic | None = None
    questions: list[ExamPracticeQuestionItem]


class TopicPracticeAttemptCreate(BaseModel):
    """POST /exams/topics/{topic_tag}/practice-attempt gövdesi (10 Eylül
    2026 -- Görev Haritası v2, bkz. ExamPracticeQuestionsResult docstring'i
    ve supabase/migrations/060_topic_practice_attempts.sql)."""

    question_id: str | None = None
    is_correct: bool


class WeakTopicItem(BaseModel):
    topic_tag: str
    total_count: int
    wrong_count: int
    accuracy_ratio: float
    related_grammar_topic: RelatedGrammarTopic | None = None


class WeakTopicsResult(BaseModel):
    """GET /exams/stats/weak-topics cevabı — madde #3c. Sadece en az bir
    yanlışın olduğu konular döner (wrong_count > 0), en çok yanlışa göre
    sıralı."""

    period_days: int
    items: list[WeakTopicItem]


# ================================================================
# Şık (seçenek) hata deseni — 18 Eylül 2026 (İstatistik & Analitik
# Kataloğu §7, Faz 1). NOT: soru bazında sistem geneli şık dağılımı
# (option_counts) admin tarafında zaten `exam_question_stats` view'ı +
# GET /admin/content-accuracy/questions ile mevcuttu — burada sadece
# kullanıcıya özel "hangi yanlışı tekrarlıyor" görünümü ekleniyor.
# ================================================================


class MyMistakePatternItem(BaseModel):
    question_id: str
    question_text: str
    topic_tag: str | None = None
    wrong_count: int
    total_attempts: int
    most_picked_wrong_option_id: str | None = None
    most_picked_wrong_option_text: str | None = None
    repeated_same_mistake: bool  # her yanlış denemede hep aynı şık mı işaretlendi


class MyMistakePatternsResult(BaseModel):
    """GET /exams/stats/my-mistake-patterns cevabı — kullanıcının en az bir
    kez yanlış yaptığı sorularda hangi çeldiriciye yöneldiğini gösterir."""

    items: list[MyMistakePatternItem]
