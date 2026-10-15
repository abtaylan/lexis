"""
backend/app/services/study_passage_generator.py

Günün Okuma Parçası — 14 Ekim 2026, kullanıcı isteği (Behçet, YÖKDİL hazırlığı
sırasında): "o gün çalıştığım gramer konusunun üstüne haber/blog yazısı
üretsen, o konuyla alakalı cümleler içerse, bilmediğim kelimeleri sisteme
eklesem... phrasal verb soruları da olsa."

exam_question_generator.py ile AYNI desen: Anthropic Messages API, zorunlu
tool-use ile yapılandırılmış JSON çıktısı (serbest metin parse etmek yerine).
O dosyadan FARKI: bu üretim moderasyon kuyruğuna girmez (exam_questions'a
yazılmaz) — çünkü burada "doğru/yanlış" bir sınav sorusu değil, sadece
kişiye özel bir okuma/kelime materyali üretiliyor; kalite riski düşük,
kullanıcı istediği an yeniden üretebilir (CTA: "Yeni Parça Üret").
"""

from anthropic import Anthropic, APIError

from app.core.config import settings

_SUBMIT_TOOL = {
    "name": "submit_study_passage",
    "description": "Üretilen okuma parçasını, kelime listesini ve phrasal verb'ü yapılandırılmış olarak gönderir.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title_tr": {
                "type": "string",
                "description": "Parçanın Türkçe kısa başlığı (örn. 'Şehir Hayatında Değişim').",
            },
            "passage_en": {
                "type": "string",
                "description": (
                    "120-180 kelimelik, akademik tonda İngilizce bir metin "
                    "(haber/blog tarzı, tek parça, paragraf bölünmesi "
                    "gerekmiyor). Verilen gramer konusu metin içinde EN AZ "
                    "3-4 farklı cümlede doğal şekilde kullanılmalı."
                ),
            },
            "passage_tr": {
                "type": "string",
                "description": (
                    "passage_en'in TAM, doğal akan Türkçe çevirisi (birebir "
                    "kelime kelime değil, anlamı doğru şekilde aktaran bir "
                    "çeviri) — öğrenci anlamadığı bir cümleyi buradan kontrol eder."
                ),
            },
            "comprehension_note_tr": {
                "type": "string",
                "description": (
                    "Türkçe, 1-2 cümle: gramer konusunun bu parçada hangi "
                    "cümlelerde/nasıl kullanıldığını öğrenciye işaret eder."
                ),
            },
            "vocabulary": {
                "type": "array",
                "minItems": 6,
                "maxItems": 10,
                "description": "Parçada geçen, B2-C1 seviyesinde zorlayıcı olabilecek kelimeler.",
                "items": {
                    "type": "object",
                    "properties": {
                        "word": {"type": "string", "description": "Kelimenin parçadaki hâli (sözlük formu)."},
                        "meaning_tr": {"type": "string", "description": "Türkçe anlamı."},
                        "part_of_speech": {
                            "type": "string",
                            "description": "noun/verb/adjective/adverb gibi kısa etiket.",
                        },
                    },
                    "required": ["word", "meaning_tr"],
                },
            },
            "phrasal_verb": {
                "type": "object",
                "description": "Parçaya doğal şekilde yerleştirilmiş TEK bir phrasal verb (YÖKDİL'de sık çıkar).",
                "properties": {
                    "phrase": {"type": "string"},
                    "meaning_tr": {"type": "string"},
                    "example_sentence": {
                        "type": "string",
                        "description": "Parçadaki cümlenin kendisi ya da ona çok yakın, phrasal verb'ü içeren bir cümle.",
                    },
                },
                "required": ["phrase", "meaning_tr", "example_sentence"],
            },
            "questions": {
                "type": "array",
                "minItems": 4,
                "maxItems": 5,
                "description": (
                    "Parçaya dayalı, YÖKDİL tarzında 4-5 adet çoktan seçmeli "
                    "okuduğunu anlama sorusu (soru kökü ve şıklar Türkçe)."
                ),
                "items": {
                    "type": "object",
                    "properties": {
                        "question_tr": {
                            "type": "string",
                            "description": "Türkçe soru kökü (örn. 'Parçaya göre, ... ?').",
                        },
                        "options": {
                            "type": "array",
                            "minItems": 4,
                            "maxItems": 4,
                            "items": {"type": "string"},
                            "description": "4 şık, Türkçe, birbirine yakın uzunlukta.",
                        },
                        "correct_index": {
                            "type": "integer",
                            "description": "Doğru şıkkın 0 tabanlı indeksi (0-3).",
                        },
                        "explanation_tr": {
                            "type": "string",
                            "description": "Türkçe, kısa: doğru şıkkın parçanın hangi cümlesine dayandığının açıklaması.",
                        },
                    },
                    "required": ["question_tr", "options", "correct_index", "explanation_tr"],
                },
            },
        },
        "required": [
            "title_tr", "passage_en", "passage_tr", "comprehension_note_tr",
            "vocabulary", "phrasal_verb", "questions",
        ],
    },
}


class StudyPassageGenerationError(Exception):
    """AI ile okuma parçası üretimi başarısız olduğunda fırlatılır."""


def generate_study_passage(
    *, topic_slug: str, topic_title_tr: str, topic_summary_tr: str, exam_type: str = "yokdil"
) -> dict:
    """Verilen gramer konusuna göre kısa bir okuma parçası + kelime listesi +
    phrasal verb üretir. Ağ/yapılandırma/parse hatalarında
    StudyPassageGenerationError fırlatır (route bunu 502/500'e çevirir —
    bkz. exams.py::generate-ai route'undaki AYNI hata dönüştürme deseni)."""
    if not settings.ANTHROPIC_API_KEY:
        raise StudyPassageGenerationError(
            "ANTHROPIC_API_KEY yapılandırılmamış — okuma parçası üretimi kapalı."
        )

    exam_hint = (
        "YÖKDİL tarzında akademik İngilizce (bilimsel/akademik konular, haber/blog üslubu)"
        if exam_type == "yokdil"
        else "YDS tarzında genel İngilizce (güncel/toplumsal konular, haber/blog üslubu)"
    )

    prompt = (
        f"İngilizce öğrenen, B2-C1 seviyesinde, {exam_hint} sınavına hazırlanan bir "
        f"öğrenci için kısa bir okuma parçası üret.\n\n"
        f"Bugün çalıştığı gramer konusu: \"{topic_title_tr}\" ({topic_summary_tr})\n\n"
        "Kurallar:\n"
        "- passage_en İngilizce, 120-180 kelime, TEK parça (paragraf başlığı/numarası yok).\n"
        "- Yukarıdaki gramer konusu metin içinde EN AZ 3-4 farklı cümlede doğal şekilde "
        "geçsin — zorlama değil, konunun gerçek kullanımını örneklesin.\n"
        "- Konu akademik/güncel bir temaya bağlı olsun (bilim, teknoloji, toplum, çevre, "
        "eğitim gibi) — kurgu/hikaye değil, haber ya da blog yazısı tonunda.\n"
        "- vocabulary: parçada geçen, Türkçe konuşan bir B2-C1 öğrencisinin muhtemelen "
        "bilmediği 6-10 kelime, sözlük formunda ve Türkçe anlamlarıyla.\n"
        "- phrasal_verb: parçaya doğal şekilde yerleştirilmiş TEK bir phrasal verb "
        "(YÖKDİL/YDS'de sık çıkan türden, örn. 'bring about', 'carry out', 'come up with').\n"
        "- passage_tr, passage_en'in tam ve doğal akan Türkçe çevirisi olsun (öğrencinin "
        "anlamadığı bir cümleyi kontrol edebilmesi için).\n"
        "- comprehension_note_tr Türkçe, kısa, gramer konusunun parçada nasıl kullanıldığını işaret etsin.\n"
        "- questions: parçanın içeriğine dayalı, YÖKDİL tarzında (okuduğunu anlama, çıkarım, "
        "ana fikir/detay sorularının karışımı) 4-5 adet çoktan seçmeli soru üret. Her sorunun "
        "soru kökü ve 4 şıkkı Türkçe olsun, şıklar birbirine yakın uzunlukta ve mantıklı çelirici "
        "(distractor) olsun — kolayca elenebilecek saçma şıklar yazma. Her soru için doğru şıkkın "
        "indeksini ve kısa bir Türkçe açıklama ver.\n"
        "- Telif hakkı olan bir metinden alıntı yapma — tamamen özgün içerik üret.\n"
        "- Sadece submit_study_passage aracını çağırarak cevap ver, ek metin yazma."
    )

    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2048,
            tools=[_SUBMIT_TOOL],
            tool_choice={"type": "tool", "name": "submit_study_passage"},
            messages=[{"role": "user", "content": prompt}],
        )
    except APIError as exc:
        raise StudyPassageGenerationError(f"Anthropic API hatası: {exc}") from exc
    except Exception as exc:
        raise StudyPassageGenerationError(
            f"Okuma parçası üretimi beklenmeyen hatayla başarısız oldu "
            f"({type(exc).__name__}): {exc}"
        ) from exc

    tool_use = next(
        (block for block in response.content if getattr(block, "type", None) == "tool_use"),
        None,
    )
    if tool_use is None:
        raise StudyPassageGenerationError("Model tool_use bloğu döndürmedi.")

    data = tool_use.input or {}
    passage_en = (data.get("passage_en") or "").strip()
    passage_tr = (data.get("passage_tr") or "").strip()
    title_tr = (data.get("title_tr") or topic_title_tr).strip()
    comprehension_note_tr = (data.get("comprehension_note_tr") or "").strip()
    if not passage_en:
        raise StudyPassageGenerationError("Model boş bir okuma parçası döndürdü.")

    raw_vocab = data.get("vocabulary") or []
    if not isinstance(raw_vocab, list):
        raw_vocab = []
    vocabulary = []
    for item in raw_vocab:
        if not isinstance(item, dict) or not item.get("word") or not item.get("meaning_tr"):
            continue
        vocabulary.append(
            {
                "word": item["word"].strip(),
                "meaning_tr": item["meaning_tr"].strip(),
                "part_of_speech": (item.get("part_of_speech") or "").strip() or None,
            }
        )

    raw_phrasal = data.get("phrasal_verb")
    phrasal_verb = None
    if isinstance(raw_phrasal, dict) and raw_phrasal.get("phrase") and raw_phrasal.get("meaning_tr"):
        phrasal_verb = {
            "phrase": raw_phrasal["phrase"].strip(),
            "meaning_tr": raw_phrasal["meaning_tr"].strip(),
            "example_sentence": (raw_phrasal.get("example_sentence") or "").strip(),
        }

    # 15 Ekim 2026, kullanıcı isteği: "o metinle ilgili 4-5 adet soru da olsun,
    # yökdil tarzında" -- gevşek doğrulama: eksik/bozuk alanlı bir soru
    # tamamen atlanır (tüm üretim boşa gitmesin), ama 4 şıktan azsa ya da
    # correct_index aralık dışındaysa o soru da düşürülür.
    raw_questions = data.get("questions") or []
    if not isinstance(raw_questions, list):
        raw_questions = []
    questions = []
    for item in raw_questions:
        if not isinstance(item, dict):
            continue
        question_tr = (item.get("question_tr") or "").strip()
        raw_options = item.get("options")
        if not question_tr or not isinstance(raw_options, list) or len(raw_options) != 4:
            continue
        options = [str(opt).strip() for opt in raw_options]
        if any(not opt for opt in options):
            continue
        try:
            correct_index = int(item.get("correct_index"))
        except (TypeError, ValueError):
            continue
        if correct_index < 0 or correct_index > 3:
            continue
        questions.append(
            {
                "question_tr": question_tr,
                "options": options,
                "correct_index": correct_index,
                "explanation_tr": (item.get("explanation_tr") or "").strip(),
            }
        )

    return {
        "topic_slug": topic_slug,
        "title_tr": title_tr,
        "passage_en": passage_en,
        "passage_tr": passage_tr,
        "comprehension_note_tr": comprehension_note_tr,
        "vocabulary": vocabulary,
        "phrasal_verb": phrasal_verb,
        "questions": questions,
    }
