"""
backend/app/schemas/study_program.py

Adaptif Ogrenme Motoru Madde 2 (24 Eylul 2026) -- haftalik rolling calisma
programi cevap modelleri. Bkz. app/services/study_program_service.py.

24 Kasim 2026 -- Behcet'in kullanici istegi ("calisma programimda o gun
hangi konu varsa onla ilgili sinav taktigi bolumunu de ekle ... her ay
sonunda da o ay boyunca ogrendigim konularin taktik sinavina gireyim"):
StudyProgramTopic artik (varsa) o konunun exam_tactics satirini TASIYOR
(bkz. tactic alani) ve StudyProgramResponse'a aylik taktik sinavi durumu
(StudyProgramMonthlyExam) eklendi -- weekend_quiz ile AYNI desen, ama
haftalik degil AYLIK kapsam.
"""

from datetime import date

from pydantic import BaseModel

from app.schemas.exams import ExamTacticItem


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
    # 24 Kasim 2026 -- bu topic_tag icin exam_tactics'te bir satir varsa
    # (bkz. ExamTacticItem), odak konu kartinin altinda daraltilmis bir
    # taktik karti olarak gosterilir -- "o gun hangi konu varsa onun
    # taktigine de calisayim" istegi.
    tactic: ExamTacticItem | None = None


class StudyProgramToday(BaseModel):
    new_words_today: int
    new_word_goal: int
    reviews_due: int


class StudyProgramWeekendQuiz(BaseModel):
    available: bool
    answered_count: int
    target_count: int
    done: bool


# 23 Kasim 2026 -- "Haftalik Toplu Pratik" (Behcet'in kullanici istegi):
# weekend_quiz'den AYRI, haftanin her gunu kullanilabilen, cok daha genis
# bir soru cozumu turu. all_topics_done erisimi kisitlamaz, sadece mobil
# tarafta "simdi tam zamani" vurgusu icindir.
class StudyProgramBulkPractice(BaseModel):
    available: bool
    topic_count: int
    all_topics_done: bool


# 24 Kasim 2026 -- "Aylik Taktik Sinavi" (Behcet'in kullanici istegi: "her
# ay sonunda da o ay boyunca ogrendigim konularin taktik sinavina
# gireyim"). weekend_quiz ile AYNI desen (available/answered_count/
# target_count/done) ama kapsam o HAFTA degil, bu AY icinde herhangi bir
# haftanin odak konusu olmus TUM topic_tag'lerdir (bkz.
# study_program_service.monthly_focus_tags) ve sadece ayin SON
# MONTHLY_EXAM_WINDOW_DAYS gununde acilir (weekend_quiz'in Cmt/Pzr
# kisitlamasiyla ayni mantik, ay olcegine tasinmis hali).
class StudyProgramMonthlyExam(BaseModel):
    available: bool
    month_start: date | None = None
    topic_count: int
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
    bulk_practice: StudyProgramBulkPractice | None = None
    monthly_exam: StudyProgramMonthlyExam | None = None
    completed_topics: int = 0
