from fastapi import APIRouter, HTTPException, Query

from app.services.dictionary_service import lookup_word

router = APIRouter()


@router.get("/lookup")
async def lookup(
    word: str = Query(..., min_length=1, max_length=100),
    learning_lang: str = Query("en", min_length=2, max_length=10),
    native_lang: str = Query("tr", min_length=2, max_length=10),
):
    """Kelimeyi öğrenilen dile göre uygun sözlük/çeviri kaynağından arar.
    learning_lang: kullanıcının öğrendiği dil (words.target_lang ile aynı)
    native_lang:   kullanıcının ana dili (words.source_lang ile aynı)"""
    result = await lookup_word(word.strip(), learning_lang, native_lang)
    if result.get("error") and not result.get("meanings"):
        raise HTTPException(status_code=404, detail=result["error"])
    return result
