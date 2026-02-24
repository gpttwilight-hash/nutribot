"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from aiogram.types import Update

from app.core.config import get_settings
from app.routers import auth, food, gamification, subscription, weight, workouts
from app.bot.handlers import bot, dp

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print("🚀 NutriBot API starting...")
    yield
    print("👋 NutriBot API shutting down...")


app = FastAPI(
    title="NutriBot API",
    description="Telegram Mini App для подсчёта калорий и трекинга питания",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "https://web.telegram.org",
        "https://*.telegram.org",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(food.router, prefix=settings.API_V1_PREFIX)
app.include_router(workouts.router, prefix=settings.API_V1_PREFIX)
app.include_router(gamification.router, prefix=settings.API_V1_PREFIX)
app.include_router(subscription.router, prefix=settings.API_V1_PREFIX)
app.include_router(weight.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {"status": "ok", "app": "NutriBot", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post(f"{settings.API_V1_PREFIX}/bot/webhook")
async def bot_webhook(request: Request):
    """Receive Telegram updates via webhook."""
    # Verify secret token
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if settings.TELEGRAM_WEBHOOK_SECRET and secret != settings.TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret token")

    if bot is None:
        raise HTTPException(status_code=503, detail="Bot not configured")

    body = await request.json()
    update = Update(**body)
    await dp.feed_update(bot, update)
    return {"ok": True}
