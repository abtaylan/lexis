from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.routes import auth, words, dictionary, stats, admin, schedule, languages, subscription, games, user_languages

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Lexis API starting...")
    yield
    print("👋 Lexis API shutting down...")

app = FastAPI(
    title="Lexis API",
    description="Vocabulary learning platform API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(words.router, prefix="/api/v1/words", tags=["Words"])
app.include_router(dictionary.router, prefix="/api/v1/dictionary", tags=["Dictionary"])
app.include_router(stats.router, prefix="/api/v1/stats", tags=["Stats"])
app.include_router(schedule.router, prefix="/api/v1/schedule", tags=["Schedule"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(languages.router, prefix="/api/v1/languages", tags=["Languages"])
app.include_router(subscription.router, prefix="/api/v1/subscription", tags=["Subscription"])
app.include_router(games.router, prefix="/api/v1/games", tags=["Games"])
app.include_router(user_languages.router, prefix="/api/v1/me/languages", tags=["User Languages"])

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
