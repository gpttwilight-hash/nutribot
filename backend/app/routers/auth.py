"""Auth router — Telegram initData validation and JWT issuance."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_access_token, get_current_user_id, validate_telegram_init_data
from app.core.database import get_db
from app.models.user import User
from app.services.subscription_service import start_trial

router = APIRouter(prefix="/auth", tags=["auth"])


class TelegramAuthRequest(BaseModel):
    initData: str


class OnboardingRequest(BaseModel):
    goal: str  # cut | bulk | maintain
    gender: str  # male | female
    age: int
    weight_kg: float
    height_cm: float
    target_weight_kg: float | None = None
    activity_level: str  # sedentary | moderate | active | athlete


def calculate_daily_norms(
    gender: str, weight: float, height: float, age: int, activity_level: str, goal: str
) -> dict:
    """Calculate daily КБЖУ using Mifflin-St Jeor formula."""
    if gender == "male":
        bmr = 10 * weight + 6.25 * height - 5 * age + 5
    else:
        bmr = 10 * weight + 6.25 * height - 5 * age - 161

    activity_multipliers = {
        "sedentary": 1.2,
        "moderate": 1.375,
        "active": 1.55,
        "athlete": 1.725,
    }

    tdee = bmr * activity_multipliers.get(activity_level, 1.2)

    goal_adjustments = {
        "cut": 0.80,
        "maintain": 1.00,
        "bulk": 1.15,
    }

    daily_calories = round(tdee * goal_adjustments.get(goal, 1.0))
    daily_protein_g = round(weight * 2.0)
    daily_fat_g = round(daily_calories * 0.25 / 9)
    daily_carbs_g = round((daily_calories - daily_protein_g * 4 - daily_fat_g * 9) / 4)

    return {
        "daily_calories": daily_calories,
        "daily_protein_g": daily_protein_g,
        "daily_fat_g": daily_fat_g,
        "daily_carbs_g": max(0, daily_carbs_g),
    }


@router.post("/telegram")
async def auth_telegram(body: TelegramAuthRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate via Telegram initData. Creates user if not exists."""
    user_data = validate_telegram_init_data(body.initData)

    tg_id = user_data.get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="Missing Telegram user ID")

    # Find or create user
    result = await db.execute(select(User).where(User.tg_id == tg_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            tg_id=tg_id,
            username=user_data.get("username", ""),
            first_name=user_data.get("first_name", ""),
        )
        db.add(user)
        await db.flush()

    # Create JWT
    token = create_access_token({"sub": str(user.id), "tg_id": tg_id})

    return {
        "access_token": token,
        "user": {
            "id": str(user.id),
            "tg_id": user.tg_id,
            "username": user.username,
            "first_name": user.first_name,
            "goal": user.goal,
            "level": user.level,
            "xp": user.xp,
            "xp_to_next_level": user.xp_to_next_level,
            "streak_days": user.streak_days,
            "daily_calories": user.daily_calories,
            "daily_protein_g": user.daily_protein_g,
            "daily_fat_g": user.daily_fat_g,
            "daily_carbs_g": user.daily_carbs_g,
            "subscription_status": user.subscription_status,
            "onboarding_completed": user.onboarding_completed,
        },
    }


@router.post("/onboarding")
async def complete_onboarding(
    body: OnboardingRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Complete onboarding wizard — set body params and calculate КБЖУ."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Set body params
    user.goal = body.goal
    user.gender = body.gender
    user.age = body.age
    user.weight_kg = body.weight_kg
    user.height_cm = body.height_cm
    user.target_weight_kg = body.target_weight_kg
    user.activity_level = body.activity_level

    # Calculate daily norms
    norms = calculate_daily_norms(
        body.gender, body.weight_kg, body.height_cm, body.age, body.activity_level, body.goal
    )
    user.daily_calories = norms["daily_calories"]
    user.daily_protein_g = norms["daily_protein_g"]
    user.daily_fat_g = norms["daily_fat_g"]
    user.daily_carbs_g = norms["daily_carbs_g"]

    # Start trial
    user.onboarding_completed = 1
    trial_info = await start_trial(db, user)

    return {
        "norms": norms,
        "trial": trial_info,
    }


class ProfileUpdateRequest(BaseModel):
    goal: str
    gender: str
    age: int
    weight_kg: float
    height_cm: float
    target_weight_kg: float | None = None
    activity_level: str


@router.put("/profile")
async def update_profile(
    body: ProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update user body parameters and recalculate daily КБЖУ norms."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.goal = body.goal
    user.gender = body.gender
    user.age = body.age
    user.weight_kg = body.weight_kg
    user.height_cm = body.height_cm
    user.target_weight_kg = body.target_weight_kg
    user.activity_level = body.activity_level

    norms = calculate_daily_norms(
        body.gender, body.weight_kg, body.height_cm, body.age, body.activity_level, body.goal
    )
    user.daily_calories = norms["daily_calories"]
    user.daily_protein_g = norms["daily_protein_g"]
    user.daily_fat_g = norms["daily_fat_g"]
    user.daily_carbs_g = norms["daily_carbs_g"]

    return {"norms": norms}


@router.get("/me")
async def get_me(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(user.id),
        "tg_id": user.tg_id,
        "username": user.username,
        "first_name": user.first_name,
        "goal": user.goal,
        "gender": user.gender,
        "age": user.age,
        "weight_kg": user.weight_kg,
        "height_cm": user.height_cm,
        "target_weight_kg": user.target_weight_kg,
        "activity_level": user.activity_level,
        "daily_calories": user.daily_calories,
        "daily_protein_g": user.daily_protein_g,
        "daily_fat_g": user.daily_fat_g,
        "daily_carbs_g": user.daily_carbs_g,
        "level": user.level,
        "xp": user.xp,
        "xp_to_next_level": user.xp_to_next_level,
        "streak_days": user.streak_days,
        "max_streak_days": user.max_streak_days,
        "subscription_status": user.subscription_status,
        "subscription_expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
        "onboarding_completed": user.onboarding_completed,
    }
