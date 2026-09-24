"""
backend/app/services/roleplay_service.py

"Roleplay/diyalog botu" (24 Eylul 2026, Madde 2 -- Gunluk Kelime Avi'nden
sonraki ikinci secim, kullanicinin secimi: fikirlendirme oturumunun
AskUserQuestion cevabi "Madde 2 devami: Roleplay/diyalog botu"). Kullanici
onceden tanimli bir senaryoda (kafede siparis, otelde check-in, is
gorusmesi vb.) Anthropic API ile hedef dilde canli, metin tabanli bir
diyalog kurar -- mikrofon/STT YOK (kullanicinin "mobilde acilma/kapanma
sorunlariyla karsilasmayalim" istegiyle tutarli olarak yeni bir native
modul eklenmedi).

Senaryo KATALOGU DB'de DEGIL, burada Python'da statik (exams.py::
SUPPORTED_EXAM_TYPES ile AYNI desen) -- kullaniciya gore degismeyen,
nadiren guncellenen sabit bir liste.

XP kurali: oturum "bitir"ildiginde (/roleplay/sessions/{id}/finish), EN AZ
MIN_TURNS_FOR_XP kullanici mesaji gonderilmisse VE bu oturumda daha once XP
verilmemisse (xp_awarded=false, DB'de tek seferlik kilit) award_xp()
cagrilir -- word_pool_growth_service.py'deki AYNI "icerik URETILMIYOR,
sadece siniflandiriliyor/degerlendiriliyor" ayrimindan farkli olarak burada
GERCEKTEN yeni metin uretiliyor (botun replikleri) ama bu ogrenme materyali
degil, TEK KULLANIMLIK bir konusma pratigi -- moderasyon kuyrugu
GEREKMIYOR (general_word_pool/exam sorulari gibi kalici, paylasilan bir
havuza YAZILMIYOR).
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.core.config import settings
from app.core.database import supabase_admin
from app.services.xp_service import award_xp

# XP verilmeden once gereken EN AZ kullanici mesaji sayisi -- "merhaba" +
# "hoscakal" gibi bos oturumlarin XP farmlamasini onler (games.py'deki
# "ilk dogru deneme" XP kuralindaki ayni orantililik ilkesi).
MIN_TURNS_FOR_XP = 4

# Tek bir oturumda en fazla bu kadar kullanici mesaji -- Anthropic API
# maliyetini/suresini sinirlar, konusma da zaten bu kadar turdan sonra
# doganal olarak "bitirilebilir" hale gelir.
MAX_TURNS = 20

# Bir mesajda izin verilen en fazla karakter -- asiri uzun girdilerin API
# maliyetini/suresini sismesini onler.
MAX_MESSAGE_LEN = 500


class RoleplayError(Exception):
    """Kullaniciya HTTP hatasi olarak yansitilacak beklenen hatalar icin."""


# Her senaryo: slug + kisa baslik (tr/en, CefrBadge'deki "hafif" ikili
# desen) + botun canlandiracagi karakter/ortam TANIMI (Ingilizce, prompt'a
# gomulecek -- Claude'un kendi ic talimati, kullaniciya hic gosterilmiyor).
SCENARIOS: list[dict] = [
    {
        "slug": "cafe_order",
        "title_tr": "Kafede Sipariş",
        "title_en": "Ordering at a Café",
        "persona": (
            "a friendly barista at a small café. The user is a customer who just "
            "walked in. Greet them, take their order (drink + maybe food), ask "
            "follow-up questions naturally (size, milk type, for here or to go), "
            "and wrap up with the total and a friendly goodbye once they seem done."
        ),
    },
    {
        "slug": "hotel_checkin",
        "title_tr": "Otelde Check-in",
        "title_en": "Hotel Check-in",
        "persona": (
            "a hotel front-desk receptionist. The user is a guest checking in. "
            "Ask for their reservation name, confirm details (nights, room type), "
            "mention breakfast hours and wifi, and hand over the key with a "
            "friendly welcome."
        ),
    },
    {
        "slug": "job_interview",
        "title_tr": "İş Görüşmesi",
        "title_en": "Job Interview",
        "persona": (
            "a friendly hiring manager conducting a first-round interview for an "
            "entry-level role. Ask the user about their background, why they're "
            "interested in the role, and one simple behavioral question. Keep the "
            "tone warm and encouraging, not intimidating."
        ),
    },
    {
        "slug": "directions",
        "title_tr": "Yol Tarifi Sorma",
        "title_en": "Asking for Directions",
        "persona": (
            "a helpful local the user (a tourist) has stopped on the street to ask "
            "for directions to a nearby landmark (a museum, a train station, or a "
            "restaurant — pick one naturally). Give clear, simple directions, "
            "answer follow-up questions, and wish them a good day."
        ),
    },
    {
        "slug": "making_friends",
        "title_tr": "Yeni Biriyle Tanışma",
        "title_en": "Meeting Someone New",
        "persona": (
            "a friendly peer the user just met at a language exchange meetup. "
            "Make small talk: ask their name, where they're from, why they're "
            "learning this language, and what they enjoy doing in their free time."
        ),
    },
    {
        "slug": "shopping",
        "title_tr": "Alışveriş",
        "title_en": "Shopping for Clothes",
        "persona": (
            "a shop assistant in a clothing store. The user is browsing. Offer "
            "help, ask what they're looking for (size, color, occasion), suggest "
            "an item or two, and help them towards a purchase decision."
        ),
    },
]

_SCENARIOS_BY_SLUG = {s["slug"]: s for s in SCENARIOS}


def list_scenarios() -> list[dict]:
    return SCENARIOS


def _get_scenario(slug: str) -> dict:
    scenario = _SCENARIOS_BY_SLUG.get(slug)
    if not scenario:
        raise RoleplayError("unknown_scenario")
    return scenario


def _lang_name_en(code: str) -> str:
    rows = (
        supabase_admin.table("languages").select("name_en").eq("code", code).limit(1).execute().data
    ) or []
    return (rows[0].get("name_en") if rows else None) or code


def _get_current_level(user_id: str, learning_lang: str) -> str | None:
    """games.py::_get_current_level ile AYNI (kasitli kucuk tekrar --
    diger route/servis dosyalarinda da (duels.py, daily_challenge_service.py)
    ayni kucuk tekrar deseni var)."""
    rows = (
        supabase_admin.table("user_learning_languages")
        .select("current_level")
        .eq("user_id", user_id)
        .eq("learning_lang", learning_lang)
        .execute()
        .data
    ) or []
    return rows[0].get("current_level") if rows else None


def _build_system_prompt(scenario: dict, learning_lang_name: str, level: str | None) -> str:
    level_line = (
        f"The learner's approximate CEFR level is {level.upper()}, so keep your "
        "vocabulary and sentence complexity appropriate for that level."
        if level
        else "The learner's level is unknown, so use simple, clear language (roughly A2-B1)."
    )
    return (
        f"You are roleplaying, for a language-learning app, as {scenario['persona']} "
        f"You MUST speak ONLY in {learning_lang_name} — never switch languages, even if "
        f"the learner writes in another language (in that case, gently continue in "
        f"{learning_lang_name} anyway, perhaps rephrasing simply). {level_line} "
        "Keep every reply SHORT (1-3 sentences) and natural, like a real conversational "
        "turn — never lecture, never break character, never mention that you are an AI "
        "or that this is a language exercise. Do not use markdown formatting."
    )


def _call_model(system_prompt: str, history: list[dict]) -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise RoleplayError("ai_not_configured")

    from anthropic import Anthropic, APIError

    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY, timeout=30.0)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=300,
            system=system_prompt,
            messages=history,
        )
    except APIError as exc:
        raise RoleplayError(f"ai_error: {exc}") from exc
    except Exception as exc:
        raise RoleplayError(f"ai_error: {type(exc).__name__}: {exc}") from exc

    text_block = next((b for b in response.content if getattr(b, "type", None) == "text"), None)
    if text_block is None or not (text_block.text or "").strip():
        raise RoleplayError("ai_empty_response")
    return text_block.text.strip()


def _get_session(session_id: str, user_id: str) -> dict:
    rows = (
        supabase_admin.table("roleplay_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
        .data
    ) or []
    if not rows:
        raise RoleplayError("session_not_found")
    return rows[0]


def _get_history(session_id: str) -> list[dict]:
    rows = (
        supabase_admin.table("roleplay_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
        .data
    ) or []
    return [{"role": r["role"], "content": r["content"]} for r in rows]


def start_session(user_id: str, scenario_slug: str, learning_lang: str, native_lang: str) -> dict:
    scenario = _get_scenario(scenario_slug)
    learning_lang_name = _lang_name_en(learning_lang)
    level = _get_current_level(user_id, learning_lang)
    system_prompt = _build_system_prompt(scenario, learning_lang_name, level)

    # Acilis repligi: modele "konusmayi sen ac" diyoruz -- tek bir user
    # turu olarak (Anthropic API sohbeti bos messages ile baslatamiyor,
    # ilk mesaj her zaman 'user' rolunde olmali).
    opening = _call_model(
        system_prompt,
        [{"role": "user", "content": "(Start the roleplay now — greet the learner and begin the scene.)"}],
    )

    inserted = (
        supabase_admin.table("roleplay_sessions")
        .insert(
            {
                "user_id": user_id,
                "scenario_slug": scenario_slug,
                "learning_lang": learning_lang,
                "native_lang": native_lang,
            }
        )
        .execute()
        .data
    )
    session = inserted[0]

    supabase_admin.table("roleplay_messages").insert(
        {"session_id": session["id"], "role": "assistant", "content": opening}
    ).execute()

    return {
        "id": session["id"],
        "scenario_slug": scenario_slug,
        "learning_lang": learning_lang,
        "status": "active",
        "turn_count": 0,
        "messages": [{"role": "assistant", "content": opening}],
    }


def send_message(user_id: str, session_id: str, content: str) -> dict:
    content = (content or "").strip()
    if not content:
        raise RoleplayError("empty_message")
    if len(content) > MAX_MESSAGE_LEN:
        raise RoleplayError("message_too_long")

    session = _get_session(session_id, user_id)
    if session["status"] != "active":
        raise RoleplayError("session_completed")
    if session["turn_count"] >= MAX_TURNS:
        raise RoleplayError("max_turns_reached")

    scenario = _get_scenario(session["scenario_slug"])
    learning_lang_name = _lang_name_en(session["learning_lang"])
    level = _get_current_level(user_id, session["learning_lang"])
    system_prompt = _build_system_prompt(scenario, learning_lang_name, level)

    history = _get_history(session_id)
    history.append({"role": "user", "content": content})

    reply = _call_model(system_prompt, history)

    supabase_admin.table("roleplay_messages").insert(
        {"session_id": session_id, "role": "user", "content": content}
    ).execute()
    supabase_admin.table("roleplay_messages").insert(
        {"session_id": session_id, "role": "assistant", "content": reply}
    ).execute()

    new_turn_count = session["turn_count"] + 1
    supabase_admin.table("roleplay_sessions").update({"turn_count": new_turn_count}).eq(
        "id", session_id
    ).execute()

    return {
        "reply": reply,
        "turn_count": new_turn_count,
        "max_turns": MAX_TURNS,
    }


async def finish_session(user_id: str, session_id: str) -> dict:
    session = _get_session(session_id, user_id)
    if session["status"] == "completed":
        return {
            "status": "completed",
            "turn_count": session["turn_count"],
            "xp_awarded": 0,
        }

    xp_awarded = 0
    should_award = session["turn_count"] >= MIN_TURNS_FOR_XP and not session["xp_awarded"]

    update_payload: dict = {
        "status": "completed",
        "completed_at": datetime.now(UTC).isoformat(),
    }
    if should_award:
        result = await award_xp(user_id=user_id, source_type="roleplay_session")
        xp_awarded = result.amount_awarded
        update_payload["xp_awarded"] = True

    supabase_admin.table("roleplay_sessions").update(update_payload).eq("id", session_id).execute()

    return {
        "status": "completed",
        "turn_count": session["turn_count"],
        "xp_awarded": xp_awarded,
    }
