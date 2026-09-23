"""
backend/app/schemas/study_program.py

Adaptif Ogrenme Motoru Madde 2 (24 Eylul 2026) -- haftalik rolling calisma
programi cevap modelleri. Bkz. app/services/study_program_service.py.
"""

from datetime import date

from pydantic import BaseModel


class StudyProgramTopic(BaseModel):
    topic_tag: str
    # "weak": kullanicinin son 4 haftada yanlis yaptigi konu.
    # "next": yeterli zayif konu yoksa, seviyesine uygun siradaki konu.
    reason: str
    title: str
    grammar_slug: str | None = None
    wrong_count: int = 0
    total_count: int = 0
    # Bu haftaki ilerleme (canli)
    practiced_count: int = 0
    practiced_correct: int = 0
    target_count: int = 5
    done: bool = False


class StudyProgramToday(BaseModel):
    new_words_today: int
    new_word_goal: int
    reviews_due: int


class StudyProgramWeekendQuiz(BaseModel):
    available: bool
    answered_count: int
    target_count: int
    done: bool


class StudyProgramResponse(BaseModel):
    available: bool
    learning_lang: str
    week_start: date | None = None
    level: str | None = None
    focus_topics: list[StudyProgramTopic] = []
    today: StudyProgramToday | None = None
    weekend_quiz: StudyProgramWeekendQuiz | None = None
    completed_topics: int = 0
