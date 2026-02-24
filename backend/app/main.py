"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from aiogram import Bot, Dispatcher
from aiogram.types import Update

from app.core.config import get_settings
from app.routers import auth, food, gamification, subscription, weight, workouts

settings = get_settings()

# Initialize bot and dispatcher at module level using settings
_bot: Bot | None = Bot(token=settings.TELEGRAM_BOT_TOKEN) if settings.TELEGRAM_BOT_TOKEN else None
_dp: Dispatcher = Dispatcher()


def _register_handlers():
    """Register bot handlers on the dispatcher."""
    from aiogram.filters import Command
    from aiogram import types
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

    @_dp.message(Command("start"))
    async def cmd_start(message: types.Message):
        keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(
                    text="🍎 Открыть NutriBot",
                    web_app=WebAppInfo(url=settings.FRONTEND_URL),
                )],
                [InlineKeyboardButton(text="❓ Помощь", callback_data="help")],
            ]
        )
        await message.answer(
            "👋 Привет! Я **NutriBot** — твой персональный помощник в питании!\n\n"
            "🍽️ Считай калории и КБЖУ\n"
            "📸 Анализируй еду по фото с ИИ\n"
            "🏋️ Отслеживай тренировки\n"
            "🔥 Поддерживай стрик и повышай уровень\n\n"
            "Нажми кнопку ниже, чтобы начать! ⬇️",
            reply_markup=keyboard,
            parse_mode="Markdown",
        )

    @_dp.callback_query(lambda c: c.data == "help")
    async def help_callback(callback: types.CallbackQuery):
        await callback.message.answer(
            "📖 **Как пользоваться NutriBot:**\n\n"
            "1️⃣ Открой Mini App и пройди онбординг\n"
            "2️⃣ Добавляй еду через поиск или фото\n"
            "3️⃣ Следи за КБЖУ на главном экране\n"
            "4️⃣ Отмечай тренировки в календаре\n"
            "5️⃣ Зарабатывай XP и открывай достижения!\n\n"
            "🆘 Поддержка: @NutriBotSupport",
            parse_mode="Markdown",
        )
        await callback.answer()


_register_handlers()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀 NutriBot API starting... Bot configured: {_bot is not None}")
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
    import os
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    return {
        "status": "healthy",
        "bot_configured": _bot is not None,
        "token_env_set": bool(token),
        "token_preview": token[:10] + "..." if token else "empty",
    }


@app.post(f"{settings.API_V1_PREFIX}/bot/webhook")
async def bot_webhook(request: Request):
    """Receive Telegram updates via webhook."""
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if settings.TELEGRAM_WEBHOOK_SECRET and secret != settings.TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret token")

    if _bot is None:
        raise HTTPException(status_code=503, detail="Bot not configured")

    body = await request.json()
    update = Update(**body)
    await _dp.feed_update(_bot, update)
    return {"ok": True}
