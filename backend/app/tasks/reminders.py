"""Celery tasks for scheduled push notifications."""

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "nutribot",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    timezone="Europe/Moscow",
    beat_schedule={
        "morning-reminders": {
            "task": "app.tasks.reminders.send_morning_reminders",
            "schedule": 3600.0,  # Every hour, tasks filter by time
        },
        "streak-warnings": {
            "task": "app.tasks.reminders.send_streak_warnings",
            "schedule": 3600.0,
        },
        "trial-reminders": {
            "task": "app.tasks.reminders.send_trial_reminders",
            "schedule": 86400.0,  # Daily
        },
    },
)


@celery_app.task
def send_morning_reminders():
    """Send morning breakfast reminders at 08:00 MSK."""
    # In production, query users and send via bot
    print("📧 Sending morning reminders...")


@celery_app.task
def send_streak_warnings():
    """Send streak warning at 19:00 MSK for users who haven't logged today."""
    print("🔥 Sending streak warnings...")


@celery_app.task
def send_trial_reminders():
    """Send trial expiry reminders on days 5, 6, 7."""
    print("⏰ Sending trial reminders...")
