"""
backend/app/schemas/daily_challenge.py

"Gunluk Kelime Avi" istek/yanit semalari -- duels.py'deki
DuelGuessLetterRequest/Response ile AYNI alan seti/desen, duello/round
kavrami olmadigi icin sadelestirildi (bkz. daily_challenge_service.py
modul docstring'i).
"""

from pydantic import BaseModel, Field


class DailyChallengeGuessRequest(BaseModel):
    letter: str = Field(min_length=1, max_length=1)


class DailyChallengeState(BaseModel):
    puzzle_date: str
    learning_lang: str
    revealed: str
    guessed_letters: list[str]
    wrong_guesses: int
    max_wrong_guesses: int
    is_complete: bool
    is_failed: bool
    word: str | None = None
    meaning: str | None = None
    example: str | None = None
    streak: int


class DailyChallengeGuessResponse(BaseModel):
    letter: str
    correct: bool
    revealed: str
    guessed_letters: list[str]
    wrong_guesses: int
    max_wrong_guesses: int
    is_complete: bool
    is_failed: bool
    word: str | None = None
    meaning: str | None = None
    example: str | None = None
    streak: int
