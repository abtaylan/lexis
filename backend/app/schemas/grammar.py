"""
backend/app/schemas/grammar.py

Sınav Hazırlık — Gramer Rehberi (Grammar Reference) pydantic şemaları.
Faz 1, 9 Eylül 2026 — bkz. app/api/routes/grammar.py modül docstring'i.
"""

from pydantic import BaseModel


class GrammarExampleSentence(BaseModel):
    en: str
    tr: str | None = None


class GrammarCommonMistake(BaseModel):
    wrong: str
    correct: str
    note: str


class GrammarCategoryResponse(BaseModel):
    id: str
    slug: str
    name_tr: str
    name_en: str
    sort_order: int


class GrammarTopicSummary(BaseModel):
    """Liste görünümü — detay alanlarını (rule_content_md, examples, mistakes) taşımaz,
    sayfa yükünü küçük tutar."""

    id: str
    slug: str
    category_id: str
    title_tr: str
    summary_tr: str
    level: str
    exam_relevance: list[str]
    sort_order: int
    has_practice_questions: bool = False
    # 16 Ekim 2026, kullanici istegi: "konu basliklarini numaralandiralim,
    # tum programa da uygulayalim" -- kategori sirasina gore degil, TUM
    # 91 konu arasinda GLOBAL sira numarasi (bkz. grammar.py::_topic_number_map).
    topic_number: int | None = None


class GrammarTopicDetail(BaseModel):
    id: str
    slug: str
    category_id: str
    title_tr: str
    summary_tr: str
    level: str
    exam_relevance: list[str]
    rule_content_md: str
    example_sentences: list[GrammarExampleSentence]
    common_mistakes: list[GrammarCommonMistake]
    has_practice_questions: bool = False
    # 16 Ekim 2026 -- bkz. GrammarTopicSummary.topic_number ustundeki not.
    topic_number: int | None = None
    total_topics: int | None = None


# ── Günün Okuma Parçası (14 Ekim 2026) — bkz. services/study_passage_generator.py ──
# Kullanıcı isteği (Behçet, YÖKDİL hazırlığı sırasında): o gün çalıştığı gramer
# konusunu içeren kısa bir AI-üretimi okuma parçası + parçadaki zor kelimeler
# (tek dokunuşla kendi kelime listesine eklenebilsin) + parçaya doğal olarak
# yerleştirilmiş bir phrasal verb.


class StudyPassageVocabItem(BaseModel):
    word: str
    meaning_tr: str
    part_of_speech: str | None = None


class StudyPassagePhrasalVerb(BaseModel):
    phrase: str
    meaning_tr: str
    example_sentence: str


# 15 Ekim 2026, kullanıcı isteği: "Metin üretmeyi gördüm, güzel olmuş, onun
# türkçesi de olsun, ayrıca o metinle ilgili 4-5 adet soru da olsun, yökdil
# tarzında." -- passage_tr (parçanın tam Türkçe çevirisi) ve questions (4-5
# çoktan seçmeli, YÖKDİL tarzı okuduğunu anlama sorusu) eklendi.
class StudyPassageQuestion(BaseModel):
    question_tr: str
    options: list[str]
    correct_index: int
    explanation_tr: str


class StudyPassageResponse(BaseModel):
    topic_slug: str
    title_tr: str
    passage_en: str
    passage_tr: str
    comprehension_note_tr: str
    vocabulary: list[StudyPassageVocabItem]
    phrasal_verb: StudyPassagePhrasalVerb | None = None
    questions: list[StudyPassageQuestion] = []
