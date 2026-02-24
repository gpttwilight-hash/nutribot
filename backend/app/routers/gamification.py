"""Gamification router — profile, achievements, daily bonus."""

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.achievement import ACHIEVEMENT_DEFINITIONS, Achievement
from app.models.user import User
from app.services.gamification_service import award_xp

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/profile")
async def get_gamification_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get gamification profile: level, XP, streak, achievements."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get achievements
    ach_result = await db.execute(
        select(Achievement).where(Achievement.user_id == user_id)
    )
    achievements = ach_result.scalars().all()
    earned_codes = {a.achievement_code for a in achievements}

    achievement_list = []
    for code, definition in ACHIEVEMENT_DEFINITIONS.items():
        achievement_list.append({
            "code": code,
            "name": definition["name"],
            "description": definition["description"],
            "icon": definition["icon"],
            "achieved_at": next(
                (a.achieved_at.isoformat() for a in achievements if a.achievement_code == code),
                None,
            ),
            "earned": code in earned_codes,
        })

    return {
        "level": user.level,
        "xp": user.xp,
        "xp_to_next": user.xp_to_next_level,
        "streak_days": user.streak_days,
        "max_streak": user.max_streak_days,
        "achievements": achievement_list,
    }


@router.get("/achievements")
async def get_achievements(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get all achievements with earned/available status."""
    ach_result = await db.execute(
        select(Achievement).where(Achievement.user_id == user_id)
    )
    achievements = ach_result.scalars().all()
    earned_codes = {a.achievement_code: a for a in achievements}

    earned = []
    available = []
    for code, definition in ACHIEVEMENT_DEFINITIONS.items():
        item = {
            "code": code,
            "name": definition["name"],
            "description": definition["description"],
            "icon": definition["icon"],
        }
        if code in earned_codes:
            item["achieved_at"] = earned_codes[code].achieved_at.isoformat()
            earned.append(item)
        else:
            available.append(item)

    return {"earned": earned, "available": available}


@router.post("/daily-bonus")
async def claim_daily_bonus(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Claim daily login bonus (+10 XP). One claim per day."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today = date.today()

    # Check if already claimed today (using last_active_at date)
    if user.last_active_at and user.last_active_at.date() == today:
        return {"xp_awarded": 0, "already_claimed": True}

    # Award daily bonus
    user.last_active_at = datetime.now(timezone.utc)
    xp_result = await award_xp(db, user, 10)

    return {
        "xp_awarded": 10,
        "already_claimed": False,
        "level_up": xp_result.get("level_up", False),
    }
