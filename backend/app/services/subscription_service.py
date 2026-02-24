"""Subscription service — trial, payment, and status management."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import Subscription
from app.models.user import User


async def start_trial(db: AsyncSession, user: User) -> dict:
    """Start 7-day trial for a new user."""
    now = datetime.now(timezone.utc)
    user.trial_started_at = now
    user.subscription_status = "trial"
    user.subscription_expires_at = now + timedelta(days=7)

    return {
        "status": "trial",
        "expires_at": user.subscription_expires_at.isoformat(),
        "days_left": 7,
    }


async def activate_subscription(
    db: AsyncSession, user: User, telegram_payment_id: str, stars_amount: int
) -> dict:
    """Activate a paid subscription after successful Telegram Stars payment."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=30)

    subscription = Subscription(
        user_id=user.id,
        telegram_payment_id=telegram_payment_id,
        stars_amount=stars_amount,
        status="active",
        period_days=30,
        starts_at=now,
        expires_at=expires_at,
    )
    db.add(subscription)

    user.subscription_status = "active"
    user.subscription_expires_at = expires_at

    return {
        "status": "active",
        "expires_at": expires_at.isoformat(),
        "days_left": 30,
    }


def get_subscription_status(user: User) -> dict:
    """Get current subscription status for a user."""
    now = datetime.now(timezone.utc)

    status = user.subscription_status or "expired"
    expires_at = user.subscription_expires_at
    days_left = 0

    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        delta = expires_at - now
        days_left = max(0, delta.days)

        # Auto-expire if past expiry
        if days_left == 0 and status in ("trial", "active"):
            status = "expired"

    return {
        "status": status,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "days_left": days_left,
    }


def has_premium_access(user: User) -> bool:
    """Check if user has active premium access (trial or paid)."""
    sub_status = get_subscription_status(user)
    return sub_status["status"] in ("trial", "active") and sub_status["days_left"] > 0
