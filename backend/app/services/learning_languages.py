"""
backend/app/services/learning_languages.py
Kullanicinin ogrendigi BIRDEN FAZLA dili yoneten servis (coklu dil ogrenme
altyapisi, Kullanici istek listesi Madde 2). Tasarim notu:
profiles.learning_lang / profiles.native_lang alanlari "su an aktif
calisilan dil"in bir AYNASI olarak korunur -- boylece games.py/_get_profile_langs,
schedule.py/_get_learning_lang, words.py'nin create_word'te kullandigi profil
sorgusu gibi mevcut TUM okuma noktalari hic degismeden calismaya devam eder.
Bu modul sadece user_learning_languages tablosunu ve bu aynayi SENKRON
tutmakla sorumludur.
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException

from app.core.database import supabase_admin


async def _get_native_lang(user_id: str) -> str:
    result = (
        supabase_admin.table("profiles")
        .select("native_lang")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return (result.data or {}).get("native_lang", "tr")


async def list_languages(user_id: str) -> list[dict[str, Any]]:
    result = (
        supabase_admin.table("user_learning_languages")
        .select("*")
        .eq("user_id", user_id)
        .order("added_at")
        .execute()
    )
    return result.data or []


async def get_active_language(user_id: str) -> Optional[dict[str, Any]]:
    result = (
        supabase_admin.table("user_learning_languages")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", True)
        .execute()
    )
    rows = result.data or []
    return rows[0] if rows else None


async def add_language(
    user_id: str,
    learning_lang: str,
    daily_goal: Optional[int] = None,
    make_active: Optional[bool] = None,
) -> dict[str, Any]:
    """
    Kullaniciya yeni bir ogrenme dili ekler. Kullanicinin hic dili yoksa
    (ilk dil) otomatik olarak aktif yapilir. make_active=True verilirse
    profiles.learning_lang de senkronlanir.
    """
    if learning_lang == await _get_native_lang(user_id):
        raise HTTPException(status_code=400, detail="Ana dil ile öğrenme dili aynı olamaz.")

    existing = (
        supabase_admin.table("user_learning_languages")
        .select("id")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Bu dili zaten öğreniyorsun.")

    current_langs = await list_languages(user_id)
    should_activate = bool(make_active) or not current_langs

    payload = {
        "user_id": user_id,
        "learning_lang": learning_lang,
        "is_active": False,
        "daily_goal": daily_goal,
    }
    result = supabase_admin.table("user_learning_languages").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Dil eklenemedi.")
    row = result.data[0]

    if should_activate:
        row = await set_active_language(user_id, learning_lang)

    return row


async def remove_language(user_id: str, learning_lang: str) -> None:
    current_langs = await list_languages(user_id)
    if len(current_langs) <= 1:
        raise HTTPException(status_code=400, detail="En az bir öğrenme dilin olmalı.")

    target = next((l for l in current_langs if l["learning_lang"] == learning_lang), None)
    if not target:
        raise HTTPException(status_code=404, detail="Bu dili zaten öğrenmiyorsun.")

    supabase_admin.table("user_learning_languages").delete().eq("id", target["id"]).execute()

    if target["is_active"]:
        # Aktif dil silindiyse, kalan dillerden birini (en eski eklenen) aktif yap
        remaining = [l for l in current_langs if l["id"] != target["id"]]
        if remaining:
            await set_active_language(user_id, remaining[0]["learning_lang"])


async def set_active_language(user_id: str, learning_lang: str) -> dict[str, Any]:
    """
    Aktif ogrenme dilini degistirir: user_learning_languages.is_active
    bayraklarini gunceller VE profiles.learning_lang aynasini senkronlar.
    Kullanici bu dili daha once eklememisse otomatik olarak eklenir
    (PATCH /auth/profile gibi eski/basit akislarla geriye donuk uyumluluk icin).
    """
    if learning_lang == await _get_native_lang(user_id):
        raise HTTPException(status_code=400, detail="Ana dil ile öğrenme dili aynı olamaz.")

    existing = (
        supabase_admin.table("user_learning_languages")
        .select("id")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
    )
    if not existing.data:
        supabase_admin.table("user_learning_languages").insert(
            {"user_id": user_id, "learning_lang": learning_lang, "is_active": False}
        ).execute()

    # Once tum dilleri pasif yap, sonra hedefi aktif yap (partial unique index
    # ihlaline dusmemek icin sira onemli)
    supabase_admin.table("user_learning_languages").update({"is_active": False}).eq(
        "user_id", user_id
    ).eq("is_active", True).execute()
    supabase_admin.table("user_learning_languages").update({"is_active": True}).eq(
        "user_id", user_id
    ).eq("learning_lang", learning_lang).execute()

    # Ayna: profiles.learning_lang -- mevcut tum okuma noktalarinin
    # (games.py, schedule.py, words.py...) degismeden calismasini saglar
    supabase_admin.table("profiles").update({"learning_lang": learning_lang}).eq(
        "id", user_id
    ).execute()

    result = (
        supabase_admin.table("user_learning_languages")
        .select("*")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .single()
        .execute()
    )
    return result.data
