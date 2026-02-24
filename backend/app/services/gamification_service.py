"""Gamification service — XP, levels, streaks, achievements."""

from datetime import date, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.achievement import ACHIEVEMENT_DEFINITIONS, Achievement
from app.models.food_log import FoodLog
from app.models.user import User
from app.models.workout import Workout


def xp_for_level(level: int) -> int:
    """XP needed to go from `level` to `level+1`."""
    return 500 * (2 ** (level - 1))


async def award_xp(db: AsyncSession, user: User, amount: int) -> dict:
    """
    Award XP to a user. Handle level-ups.
    Returns dict with xp_awarded, new_level (if leveled up), level_up flag.
    """
    user.xp += amount
    leveled_up = False
    new_level = user.level

    while user.xp >= user.xp_to_next_level:
        user.xp -= user.xp_to_next_level
        user.level += 1
        user.xp_to_next_level = xp_for_level(user.level)
        leveled_up = True
        new_level = user.level

    # Check level 10 achievement
    if user.level >= 10:
        await check_and_award_achievement(db, user, "level_10")

    return {
        "xp_awarded": amount,
        "new_level": new_level,
        "level_up": leveled_up,
        "current_xp": user.xp,
        "xp_to_next_level": user.xp_to_next_level,
    }


async def update_streak(db: AsyncSession, user: User) -> dict:
    """
    Update user's streak. Call when user logs food.
    Streak increases if user logs food today and last log was yesterday or today.
    """
    today = date.today()

    if user.last_streak_date == today:
        return {"streak_days": user.streak_days, "streak_updated": False}

    if user.last_streak_date == today - timedelta(days=1):
        user.streak_days += 1
    elif user.last_streak_date is None or (today - user.last_streak_date).days >= 2:
        user.streak_days = 1

    user.last_streak_date = today

    if user.streak_days > user.max_streak_days:
        user.max_streak_days = user.streak_days

    # Check streak achievements
    streak_achievements = {7: "streak_7", 30: "streak_30", 100: "streak_100"}
    for threshold, code in streak_achievements.items():
        if user.streak_days >= threshold:
            await check_and_award_achievement(db, user, code)

    return {"streak_days": user.streak_days, "streak_updated": True}


async def check_and_award_achievement(
    db: AsyncSession, user: User, achievement_code: str
) -> Optional[dict]:
    """Check if user already has the achievement, award if not."""
    result = await db.execute(
        select(Achievement).where(
            Achievement.user_id == user.id,
            Achievement.achievement_code == achievement_code,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        return None

    definition = ACHIEVEMENT_DEFINITIONS.get(achievement_code)
    if not definition:
        return None

    achievement = Achievement(
        user_id=user.id,
        achievement_code=achievement_code,
    )
    db.add(achievement)

    # Award bonus XP for achievement
    xp_result = await award_xp(db, user, definition["xp"])

    return {
        "achievement_code": achievement_code,
        "achievement_name": definition["name"],
        "achievement_icon": definition["icon"],
        "xp_awarded": definition["xp"],
    }


async def check_daily_meals_bonus(db: AsyncSession, user: User) -> Optional[dict]:
    """
    Check if user logged all 3 main meals today → +50 XP bonus.
    """
    today = date.today()
    result = await db.execute(
        select(FoodLog.meal_type)
        .where(
            FoodLog.user_id == user.id,
            func.date(FoodLog.logged_at) == today,
        )
        .distinct()
    )
    meal_types = {row[0] for row in result.all()}

    required = {"breakfast", "lunch", "dinner"}
    if required.issubset(meal_types):
        return await award_xp(db, user, 50)

    return None


async def check_workout_achievements(db: AsyncSession, user: User) -> list:
    """Check workout count achievements."""
    result = await db.execute(
        select(func.count(Workout.id)).where(
            Workout.user_id == user.id,
            Workout.completed == True,
        )
    )
    count = result.scalar() or 0

    awarded = []
    workout_achievements = {10: "workouts_10", 50: "workouts_50", 100: "workouts_100"}
    for threshold, code in workout_achievements.items():
        if count >= threshold:
            result = await check_and_award_achievement(db, user, code)
            if result:
                awarded.append(result)

    return awarded
