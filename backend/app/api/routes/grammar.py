"""
backend/app/api/routes/grammar.py

Sınav Hazırlık — Gramer Rehberi (Grammar Reference), Faz 1 — 9 Eylül 2026.

Kullanıcı Cambridge'in "English Grammar in Use" gibi telifli bir kitabı
uygulamaya eklemek istedi; telif ihlali olacağı için reddedildi, bunun yerine
ÖZGÜN gramer referans içeriği yazılıp buradan sunulmasına karar verildi
(bkz. supabase/migrations/027_grammar_reference.sql, backend/seed_grammar_topics.py).

Erişim kısıtı exams.py::_exam_area_enabled ile AYNI desen (kasıtlı olarak
kopyalandı, cross-module import yerine — modüller birbirinden bağımsız
kalsın diye): Gramer Rehberi, Sınav Hazırlık Alanı'nın bir alt bölümü olduğu
için sadece native_lang=tr + learning_lang=en kullanıcılarına gösteriliyor.

Sadece status='published' konular kullanıcıya döner — status='draft' olan
(ör. ileride eklenecek AI taslakları, admin onayı almadan) hiç görünmez.

Admin içerik yönetimi (CRUD, AI ile taslak üretimi) bu fazın kapsamında değil.

GÜNCELLEME (9 Eylül 2026, İstatistik & İçerik Motoru madde #3b): "bu konuyu
pratik et" artık exams.py::GET /exams/topics/{topic_tag}/practice-questions
ile çalışıyor — yukarıdaki notta bahsedilen tam bir session/XP akışı yerine
BİLİNÇLİ olarak hafif bir mod seçildi (oturum açmaz, exam_attempts'e yazmaz,
XP vermez); amaç ilerleme ölçmek değil, az önce yanlış yapılan konuyu hızlıca
pekiştirmek. Aynı madde kapsamında exams.py::submit_attempt de artık yanlış
cevapta topic_tag'e karşılık gelen (varsa) grammar_topics kaydını
(related_grammar_topic) dönüyor.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_user
from app.core.database import supabase_admin
from app.schemas.grammar import (
    GrammarCategoryResponse,
    GrammarTopicDetail,
    GrammarTopicSummary,
)

router = APIRouter()


def _profile_learning_lang(user_id: str) -> str:
    profile = (
        supabase_admin.table("profiles")
        .select("learning_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return (profile.data or {}).get("learning_lang", "en")


def _grammar_content_learning_langs() -> set[str]:
    """Yayinda (published) Gramer Rehberi icerigi olan learning_lang
    kodlarinin kumesi — exams.py::_exam_content_learning_langs ile ayni
    desen (V2 Yol Haritasi madde #5, 9 Eylul 2026). Kasitli olarak
    kopyalandi, cross-module import yerine (bkz. dosya basindaki modul
    docstring'i)."""
    result = (
        supabase_admin.table("grammar_topics")
        .select("learning_lang")
        .eq("status", "published")
        .execute()
    )
    return {row["learning_lang"] for row in (result.data or []) if row.get("learning_lang")}


def _grammar_area_enabled(user_id: str) -> bool:
    return _profile_learning_lang(user_id) in _grammar_content_learning_langs()


@router.get("/categories", response_model=list[GrammarCategoryResponse])
async def list_categories(current_user=Depends(get_current_user)):
    if not _grammar_area_enabled(current_user.id):
        return []
    result = supabase_admin.table("grammar_categories").select("*").order("sort_order").execute()
    return [GrammarCategoryResponse(**row) for row in (result.data or [])]


@router.get("/topics", response_model=list[GrammarTopicSummary])
async def list_topics(current_user=Depends(get_current_user)):
    learning_lang = _profile_learning_lang(current_user.id)
    if learning_lang not in _grammar_content_learning_langs():
        return []

    result = (
        supabase_admin.table("grammar_topics")
        .select("id, slug, category_id, title_tr, summary_tr, level, exam_relevance, sort_order")
        .eq("status", "published")
        .eq("learning_lang", learning_lang)
        .order("sort_order")
        .execute()
    )
    rows = result.data or []
    if not rows:
        return []

    # Hangi konularda onaylı pratik sorusu var — tek sorguyla topluca bakılıyor
    # (her konu için ayrı sorgu atmak yerine N+1'den kaçınmak için).
    slugs = [r["slug"] for r in rows]
    q_result = (
        supabase_admin.table("exam_questions")
        .select("topic_tag")
        .eq("status", "approved")
        .in_("topic_tag", slugs)
        .execute()
    )
    slugs_with_questions = {r["topic_tag"] for r in (q_result.data or []) if r.get("topic_tag")}

    return [
        GrammarTopicSummary(**row, has_practice_questions=row["slug"] in slugs_with_questions)
        for row in rows
    ]


@router.get("/topics/{slug}", response_model=GrammarTopicDetail)
async def get_topic(slug: str, current_user=Depends(get_current_user)):
    learning_lang = _profile_learning_lang(current_user.id)
    if learning_lang not in _grammar_content_learning_langs():
        raise HTTPException(
            status_code=403,
            detail="Gramer Rehberi şu an sadece İngilizce öğrenen kullanıcılar için kullanılabilir.",
        )

    result = (
        supabase_admin.table("grammar_topics")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .eq("learning_lang", learning_lang)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Konu bulunamadı.")
    row = result.data[0]

    # count="exact" kasıtlı olarak kullanılmıyor — exams.py::list_exam_types'taki
    # aynı kararla tutarlı, len(result.data) / bool(result.data) daha güvenli.
    q_result = (
        supabase_admin.table("exam_questions")
        .select("id")
        .eq("status", "approved")
        .eq("topic_tag", slug)
        .limit(1)
        .execute()
    )
    has_questions = bool(q_result.data)

    return GrammarTopicDetail(**row, has_practice_questions=has_questions)
