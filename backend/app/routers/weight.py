"""Weight log router — tracking body weight over time."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.user import User
from app.models.weight_log import WeightLog
from app.services.gamification_service import award_xp, check_and_award_achievement
from app.services.subscription_service import has_premium_access

router = APIRouter(prefix="/weight", tags=["weight"])


class WeightLogCreate(BaseModel):
    weight_kg: float
    logged_date: str | None = None  # YYYY-MM-DD


@router.post("/log")
async def log_weight(
    body: WeightLogCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Log weight for a date. Awards +10 XP."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    logged_date = date.fromisoformat(body.logged_date) if body.logged_date else date.today()

    # Upsert: check if entry exists for this date
    result = await db.execute(
        select(WeightLog).where(
            WeightLog.user_id == user_id,
            WeightLog.logged_date == logged_date,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.weight_kg = body.weight_kg
        entry = existing
    else:
        entry = WeightLog(
            user_id=user_id,
            weight_kg=body.weight_kg,
            logged_date=logged_date,
        )
        db.add(entry)

    # Update current weight on user profile
    user.weight_kg = body.weight_kg

    # Check goal reached achievement
    if user.target_weight_kg and abs(body.weight_kg - user.target_weight_kg) <= 0.5:
        await check_and_award_achievement(db, user, "goal_reached")

    # Award XP
    xp_result = await award_xp(db, user, 10)

    await db.flush()

    return {
        "entry": {
            "id": str(entry.id),
            "weight_kg": entry.weight_kg,
            "logged_date": str(entry.logged_date),
        },
        "xp_awarded": 10,
    }


@router.get("/history")
async def get_weight_history(
    period: str = Query(default="30d", description="30d, 90d, or all"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get weight history. 30d+ requires premium."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if period != "30d" and not has_premium_access(user):
        raise HTTPException(status_code=403, detail="Premium subscription required")

    days_map = {"30d": 30, "90d": 90, "all": 3650}
    days = days_map.get(period, 30)
    start_date = date.today() - timedelta(days=days)

    result = await db.execute(
        select(WeightLog)
        .where(
            WeightLog.user_id == user_id,
            WeightLog.logged_date >= start_date,
        )
        .order_by(WeightLog.logged_date)
    )
    entries = result.scalars().all()

    return {
        "entries": [
            {
                "weight_kg": e.weight_kg,
                "logged_date": str(e.logged_date),
            }
            for e in entries
        ]
    }
