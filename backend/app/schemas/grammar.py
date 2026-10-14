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


class StudyPassageResponse(BaseModel):
    topic_slug: str
    title_tr: str
    passage_en: str
    comprehension_note_tr: str
    vocabulary: list[StudyPassageVocabItem]
    phrasal_verb: StudyPassagePhrasalVerb | None = None
