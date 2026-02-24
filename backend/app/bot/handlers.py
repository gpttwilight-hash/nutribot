"""Telegram bot handlers — /start command and Mini App button."""

from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from app.core.config import get_settings

settings = get_settings()

bot = Bot(token=settings.TELEGRAM_BOT_TOKEN) if settings.TELEGRAM_BOT_TOKEN else None
dp = Dispatcher()


@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    """Handle /start command — send welcome message with Mini App button."""
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🍎 Открыть NutriBot",
                    web_app=WebAppInfo(url=settings.FRONTEND_URL),
                )
            ],
            [
                InlineKeyboardButton(
                    text="❓ Помощь",
                    callback_data="help",
                )
            ],
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


@dp.callback_query(lambda c: c.data == "help")
async def help_callback(callback: types.CallbackQuery):
    """Handle help button press."""
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
