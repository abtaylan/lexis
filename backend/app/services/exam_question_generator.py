"""
backend/app/services/exam_question_generator.py

Sınav Hazırlık İstatistik & İçerik Motoru — Faz 2b: AI ile soru üretimi.

Admin panelinden (POST /api/v1/exams/admin/questions/generate-ai) tetiklenir.
Üretilen sorular DOĞRUDAN havuza girmez — diğer kaynaklarla (kullanıcı önerisi)
aynı moderasyon kuyruğundan geçer: source_type='ai', status='pending' olarak
kaydedilir (bkz. supabase/migrations/026_exam_prep_stats_and_content.sql).
Admin, GET /admin/questions/pending üzerinden inceleyip onaylar/reddeder —
next_question/list_exam_types zaten sadece status=approved sorularla çalışıyor,
o yüzden AI çıktısı hiçbir zaman incelenmeden kullanıcıya gösterilmez.

Model: Anthropic Messages API, zorunlu tool-use ile yapılandırılmış JSON
çıktısı alınır (serbest metin parse etmek yerine — daha güvenilir).
"""

from anthropic import Anthropic, APIError

from app.core.config import settings

# Sınav türü başına kısa bağlam — üretilen soruların o sınavın tarzına
# (kapsam/zorluk) yakın olması için. Şu an tüm sınav türleri sadece
# native_lang=tr + learning_lang=en kullanıcılarına gösteriliyor (bkz.
# routes/exams.py modül docstring'i) — çoklu dil genellemesi V2 yol
# haritasında ayrı bir madde (§ çoklu dil/sınav genellemesi).
EXAM_TOPIC_HINTS: dict[str, str] = {
    "yds": (
        "YDS (Yabancı Dil Bilgisi Seviye Tespit Sınavı) tarzında sorular: "
        "İngilizce dilbilgisi, kelime bilgisi, cloze test, cümle/paragraf "
        "tamamlama, çeviri mantığı."
    ),
    "yokdil": (
        "YÖKDİL tarzında sorular: akademik İngilizce, bilimsel/akademik metin "
        "anlama, dilbilgisi ve kelime bilgisi."
    ),
    "ielts": (
        "IELTS tarzında sorular: genel ve akademik İngilizce yeterlilik "
        "(reading/grammar/vocabulary), gerçek sınav formatına yakın zorluk."
    ),
    "toefl": (
        "TOEFL tarzında sorular: akademik İngilizce yeterlilik "
        "(reading/grammar/vocabulary), gerçek sınav formatına yakın zorluk."
    ),
}

_SUBMIT_TOOL = {
    "name": "submit_questions",
    "description": "Üretilen çoktan seçmeli sınav sorularını yapılandırılmış olarak gönderir.",
    "input_schema": {
        "type": "object",
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "question_text": {
                            "type": "string",
                            "description": "Soru kökü (İngilizce).",
                        },
                        "options": {
                            "type": "array",
                            "minItems": 4,
                            "maxItems": 4,
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string", "enum": ["a", "b", "c", "d"]},
                                    "text": {"type": "string"},
                                },
                                "required": ["id", "text"],
                            },
                        },
                        "correct_option": {"type": "string", "enum": ["a", "b", "c", "d"]},
                        "explanation": {
                            "type": "string",
                            "description": "Türkçe kısa açıklama: doğru şık neden doğru.",
                        },
                        "topic_tag": {
                            "type": "string",
                            "description": "Kısa İngilizce konu etiketi, örn. 'tenses', 'phrasal-verbs', 'reading-comprehension'.",
                        },
                    },
                    "required": ["question_text", "options", "correct_option", "explanation"],
                },
            },
        },
        "required": ["questions"],
    },
}


class ExamQuestionGenerationError(Exception):
    """AI ile soru üretimi başarısız olduğunda fırlatılır — route bunu
    HTTP 502 (upstream/model hatası) ya da 500'e (yapılandırma eksikliği için
    400/500) çevirir."""


def generate_questions(
    exam_type: str, count: int, topic_tag: str | None = None
) -> list[dict]:
    """Anthropic API ile `count` adet çoktan seçmeli soru üretir; her biri
    exam_questions.options ile aynı şekle (list[{"id","text"}]) sahip,
    doğrulanmış dict olarak döner. Ağ/yapılandırma/parse hatalarında
    ExamQuestionGenerationError fırlatır."""
    if not settings.ANTHROPIC_API_KEY:
        raise ExamQuestionGenerationError(
            "ANTHROPIC_API_KEY yapılandırılmamış — AI soru üretimi kapalı."
        )

    hint = EXAM_TOPIC_HINTS.get(exam_type, "")
    topic_line = (
        f"Sadece şu konuya odaklan: {topic_tag}."
        if topic_tag
        else "Konu çeşitliliği olsun, aynı konu art arda tekrar etmesin."
    )

    prompt = (
        f"{hint}\n\n"
        f"Bu sınav formatında, İngilizce öğrenen orta-ileri seviye (B2-C1) bir "
        f"öğrenci için {count} adet ÖZGÜN, birbirinden farklı çoktan seçmeli "
        f"soru üret. {topic_line}\n\n"
        "Kurallar:\n"
        "- Her sorunun tam olarak 4 şıkkı olsun (id: a, b, c, d), sadece 1 tanesi doğru.\n"
        "- Şıklar birbirine yakın uzunlukta ve inandırıcı olsun (çeldirici kalitesi önemli, "
        "bariz yanlış şık olmasın).\n"
        "- explanation alanı Türkçe yazılsın, öğrenciye doğru şıkkın neden doğru olduğunu "
        "kısaca (1-2 cümle) anlatsın.\n"
        "- question_text ve options İngilizce olsun.\n"
        "- Telif hakkı olan bir metinden alıntı yapma veya gerçek bir sınavdan soru kopyalama — "
        "tamamen özgün içerik üret.\n"
        "- Sadece submit_questions aracını çağırarak cevap ver, ek metin yazma."
    )

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=4096,
            tools=[_SUBMIT_TOOL],
            tool_choice={"type": "tool", "name": "submit_questions"},
            messages=[{"role": "user", "content": prompt}],
        )
    except APIError as exc:
        raise ExamQuestionGenerationError(f"Anthropic API hatası: {exc}") from exc

    tool_use = next(
        (block for block in response.content if getattr(block, "type", None) == "tool_use"),
        None,
    )
    if tool_use is None:
        raise ExamQuestionGenerationError("Model tool_use bloğu döndürmedi.")

    raw_questions = tool_use.input.get("questions") or []
    validated: list[dict] = []
    for q in raw_questions:
        options = q.get("options") or []
        ids = {opt.get("id") for opt in options}
        if len(options) != 4 or ids != {"a", "b", "c", "d"}:
            continue  # bozuk/eksik şık seti — sessizce atla, moderasyon kuyruğuna eksik veri girmesin
        if q.get("correct_option") not in ids:
            continue
        if not q.get("question_text") or not q.get("explanation"):
            continue
        validated.append(
            {
                "question_text": q["question_text"].strip(),
                "options": [
                    {"id": opt["id"], "text": (opt.get("text") or "").strip()}
                    for opt in options
                ],
                "correct_option": q["correct_option"],
                "explanation": q["explanation"].strip(),
                "topic_tag": (q.get("topic_tag") or topic_tag or None),
            }
        )

    if not validated:
        raise ExamQuestionGenerationError("Model geçerli formatta hiç soru üretmedi.")

    return validated
