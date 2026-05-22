from datetime import datetime, timezone, timedelta
from typing import Dict, Any


def calculate_next_review(word: Dict[str, Any], success: bool) -> Dict[str, Any]:
    """
    SM-2 algoritması ile bir sonraki tekrar tarihini hesapla.
    
    Parametreler:
        word: mevcut kelime verisi (repetition_count, ease_factor, interval_days)
        success: True = biliyor, False = bilmiyor
    """
    rep = int(word.get("repetition_count", 0))
    ef = float(word.get("ease_factor", 2.5))
    interval = int(word.get("interval_days", 1))

    if success:
        if rep == 0:
            interval = 1
        elif rep == 1:
            interval = 6
        else:
            interval = round(interval * ef)

        # Ease factor güncelle (minimum 1.3)
        ef = max(1.3, ef + 0.1)
        rep += 1
        status = "learned" if rep >= 6 else "learning"
    else:
        # Başarısız: başa dön
        rep = 0
        interval = 1
        ef = max(1.3, ef - 0.2)
        status = "learning"

    next_review = datetime.now(timezone.utc) + timedelta(days=interval)

    return {
        "repetition_count": rep,
        "ease_factor": round(ef, 2),
        "interval_days": interval,
        "last_reviewed_at": datetime.now(timezone.utc).isoformat(),
        "next_review_at": next_review.isoformat(),
        "status": status,
    }
