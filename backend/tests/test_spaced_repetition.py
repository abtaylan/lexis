"""
app/services/spaced_repetition.py için birim testler (SM-2 algoritması).

Bu dosya dış bağımlılığı (Supabase, .env) olmayan saf bir fonksiyonu test
eder, bu yüzden CI'da SUPABASE_* secret'larından bağımsız çalışır.
"""
from datetime import datetime

from app.services.spaced_repetition import calculate_next_review


def test_first_success_sets_interval_to_one_day():
    word = {"repetition_count": 0, "ease_factor": 2.5, "interval_days": 1}

    result = calculate_next_review(word, success=True)

    assert result["repetition_count"] == 1
    assert result["interval_days"] == 1
    assert result["status"] == "learning"
    assert result["ease_factor"] == 2.6


def test_second_success_sets_interval_to_six_days():
    word = {"repetition_count": 1, "ease_factor": 2.6, "interval_days": 1}

    result = calculate_next_review(word, success=True)

    assert result["repetition_count"] == 2
    assert result["interval_days"] == 6


def test_later_success_multiplies_interval_by_ease_factor():
    word = {"repetition_count": 3, "ease_factor": 2.0, "interval_days": 6}

    result = calculate_next_review(word, success=True)

    assert result["repetition_count"] == 4
    assert result["interval_days"] == round(6 * 2.0)


def test_sixth_success_marks_word_as_learned():
    word = {"repetition_count": 5, "ease_factor": 2.5, "interval_days": 30}

    result = calculate_next_review(word, success=True)

    assert result["repetition_count"] == 6
    assert result["status"] == "learned"


def test_failure_resets_progress():
    word = {"repetition_count": 4, "ease_factor": 2.5, "interval_days": 20}

    result = calculate_next_review(word, success=False)

    assert result["repetition_count"] == 0
    assert result["interval_days"] == 1
    assert result["status"] == "learning"
    assert result["ease_factor"] == 2.3


def test_ease_factor_never_drops_below_minimum():
    word = {"repetition_count": 2, "ease_factor": 1.35, "interval_days": 3}

    result = calculate_next_review(word, success=False)

    assert result["ease_factor"] == 1.3


def test_returns_valid_iso_timestamps():
    word = {"repetition_count": 0, "ease_factor": 2.5, "interval_days": 1}

    result = calculate_next_review(word, success=True)

    # ValueError fırlatmadan parse edilebiliyorsa format geçerlidir.
    datetime.fromisoformat(result["last_reviewed_at"])
    datetime.fromisoformat(result["next_review_at"])
