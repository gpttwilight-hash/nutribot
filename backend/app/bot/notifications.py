"""Notification sender for push reminders via Telegram Bot API."""

from datetime import datetime, timezone

from app.core.config import get_settings

settings = get_settings()


# Notification templates from the TZ
NOTIFICATION_TEMPLATES = {
    "morning_breakfast": {
        "hour": 8,
        "text": "Доброе утро! Не забудь залогировать завтрак 🍳",
    },
    "lunch_reminder": {
        "hour": 13,
        "text": "Время обеда! Отметь что ел 🥗",
        "condition": "no_food_since_8",
    },
    "streak_warning": {
        "hour": 19,
        "text": "Твой стрик {streak_days} дней под угрозой! Зайди в приложение 🔥",
        "condition": "no_activity_today",
    },
    "evening_summary": {
        "hour": 21,
        "text": "До конца дня {remaining_calories} ккал. Как прошёл день? 💪",
    },
}

# Trial reminder templates
TRIAL_REMINDERS = {
    5: "Ваш бесплатный доступ заканчивается через 2 дня ⏰",
    6: "Завтра заканчивается триал. Не теряй прогресс! 🔥",
    7: "Сегодня последний день. Продолжи за 500 руб/мес 🔥",
}


async def send_notification(bot, tg_id: int, text: str):
    """Send a notification message to a user via Telegram Bot API."""
    try:
        await bot.send_message(
            chat_id=tg_id,
            text=text,
            parse_mode="Markdown",
        )
    except Exception as e:
        print(f"Failed to send notification to {tg_id}: {e}")
