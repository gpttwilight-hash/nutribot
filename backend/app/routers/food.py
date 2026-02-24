"""Food router — CRUD, search, AI photo analysis, stats."""

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.food_log import FoodLog
from app.models.user import User
from app.services import ai_service, food_service
from app.services.gamification_service import award_xp, check_and_award_achievement, check_daily_meals_bonus, update_streak
from app.services.subscription_service import has_premium_access

router = APIRouter(prefix="/food", tags=["food"])


class FoodLogCreate(BaseModel):
    food_name: str
    calories: float
    protein_g: float = 0
    fat_g: float = 0
    carbs_g: float = 0
    weight_g: float = 100
    meal_type: str = "snack"
    source: str = "manual"


class FoodLogUpdate(BaseModel):
    food_name: str | None = None
    calories: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    carbs_g: float | None = None
    weight_g: float | None = None
    meal_type: str | None = None


# XP amounts per meal type (first log of each type per day)
MEAL_XP = {"breakfast": 15, "lunch": 15, "dinner": 15, "snack": 10}


@router.get("/log")
async def get_food_log(
    date: str = Query(default=None, description="Date in YYYY-MM-DD format"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get food log entries for a given date."""
    target_date = datetime.strptime(date, "%Y-%m-%d").date() if date else datetime.now().date()

    result = await db.execute(
        select(FoodLog)
        .where(
            FoodLog.user_id == user_id,
            func.date(FoodLog.logged_at) == target_date,
        )
        .order_by(FoodLog.logged_at)
    )
    entries = result.scalars().all()

    # Calculate totals
    totals = {"calories": 0, "protein_g": 0, "fat_g": 0, "carbs_g": 0}
    entry_list = []
    for e in entries:
        totals["calories"] += e.calories
        totals["protein_g"] += e.protein_g or 0
        totals["fat_g"] += e.fat_g or 0
        totals["carbs_g"] += e.carbs_g or 0
        entry_list.append({
            "id": str(e.id),
            "food_name": e.food_name,
            "calories": e.calories,
            "protein_g": e.protein_g,
            "fat_g": e.fat_g,
            "carbs_g": e.carbs_g,
            "weight_g": e.weight_g,
            "meal_type": e.meal_type,
            "source": e.source,
            "logged_at": e.logged_at.isoformat() if e.logged_at else None,
        })

    # Get user goal macros
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    goal = {
        "calories": user.daily_calories or 2000,
        "protein_g": user.daily_protein_g or 150,
        "fat_g": user.daily_fat_g or 65,
        "carbs_g": user.daily_carbs_g or 250,
    }

    return {"entries": entry_list, "totals": totals, "goal": goal}


@router.post("/log")
async def create_food_log(
    body: FoodLogCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Add a food log entry. Awards XP based on meal type."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    entry = FoodLog(
        user_id=user_id,
        food_name=body.food_name,
        calories=body.calories,
        protein_g=body.protein_g,
        fat_g=body.fat_g,
        carbs_g=body.carbs_g,
        weight_g=body.weight_g,
        meal_type=body.meal_type,
        source=body.source,
    )
    db.add(entry)
    await db.flush()

    # Award XP
    xp_amount = MEAL_XP.get(body.meal_type, 10)
    xp_result = await award_xp(db, user, xp_amount)

    # Update streak
    streak_result = await update_streak(db, user)

    # Check all-meals bonus
    bonus = await check_daily_meals_bonus(db, user)

    return {
        "entry": {
            "id": str(entry.id),
            "food_name": entry.food_name,
            "calories": entry.calories,
            "protein_g": entry.protein_g,
            "fat_g": entry.fat_g,
            "carbs_g": entry.carbs_g,
            "weight_g": entry.weight_g,
            "meal_type": entry.meal_type,
            "source": entry.source,
        },
        "xp_awarded": xp_result["xp_awarded"],
        "level_up": xp_result.get("level_up", False),
        "streak": streak_result,
        "all_meals_bonus": bonus,
    }


@router.put("/log/{entry_id}")
async def update_food_log(
    entry_id: str,
    body: FoodLogUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a food log entry."""
    result = await db.execute(
        select(FoodLog).where(FoodLog.id == entry_id, FoodLog.user_id == user_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)

    return {"entry": {"id": str(entry.id), "food_name": entry.food_name}}


@router.delete("/log/{entry_id}")
async def delete_food_log(
    entry_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a food log entry."""
    result = await db.execute(
        select(FoodLog).where(FoodLog.id == entry_id, FoodLog.user_id == user_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    await db.delete(entry)
    return {"deleted": True}


@router.post("/analyze-photo")
async def analyze_photo(
    photo: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """AI food photo analysis (premium only)."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not has_premium_access(user):
        raise HTTPException(status_code=403, detail="Premium subscription required")

    image_bytes = await photo.read()
    mime_type = photo.content_type or "image/jpeg"

    result = await ai_service.analyze_food_photo(image_bytes, mime_type)

    # Award XP for AI photo analysis
    await award_xp(db, user, 15)
    await check_and_award_achievement(db, user, "first_photo")

    return result


@router.get("/search")
async def search_food(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=20, le=50),
):
    """Search for food products."""
    results = await food_service.search_food(q, limit)
    return {"results": results}


@router.get("/recent")
async def get_recent_foods(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get user's last 20 logged foods."""
    result = await db.execute(
        select(FoodLog)
        .where(FoodLog.user_id == user_id)
        .order_by(FoodLog.created_at.desc())
        .limit(20)
    )
    entries = result.scalars().all()

    # Deduplicate by food_name
    seen = set()
    items = []
    for e in entries:
        if e.food_name not in seen:
            seen.add(e.food_name)
            items.append({
                "name": e.food_name,
                "calories": e.calories,
                "protein": e.protein_g,
                "fat": e.fat_g,
                "carbs": e.carbs_g,
                "weight_g": e.weight_g,
            })

    return {"items": items}


@router.get("/stats")
async def get_food_stats(
    period: str = Query(default="7d", description="7d or 30d"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get nutrition stats for a period."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    # Check premium for 30d+
    if period != "7d" and not has_premium_access(user):
        raise HTTPException(status_code=403, detail="Premium subscription required for 30d+ stats")

    days = 30 if period == "30d" else 7
    start_date = date.today() - timedelta(days=days)

    result = await db.execute(
        select(
            func.date(FoodLog.logged_at).label("day"),
            func.sum(FoodLog.calories).label("calories"),
            func.sum(FoodLog.protein_g).label("protein_g"),
            func.sum(FoodLog.fat_g).label("fat_g"),
            func.sum(FoodLog.carbs_g).label("carbs_g"),
        )
        .where(
            FoodLog.user_id == user_id,
            func.date(FoodLog.logged_at) >= start_date,
        )
        .group_by(func.date(FoodLog.logged_at))
        .order_by(func.date(FoodLog.logged_at))
    )
    rows = result.all()

    daily = [
        {
            "date": str(row.day),
            "calories": round(row.calories or 0),
            "protein_g": round(row.protein_g or 0, 1),
            "fat_g": round(row.fat_g or 0, 1),
            "carbs_g": round(row.carbs_g or 0, 1),
        }
        for row in rows
    ]

    # Calculate averages
    if daily:
        avg = {
            "calories": round(sum(d["calories"] for d in daily) / len(daily)),
            "protein_g": round(sum(d["protein_g"] for d in daily) / len(daily), 1),
            "fat_g": round(sum(d["fat_g"] for d in daily) / len(daily), 1),
            "carbs_g": round(sum(d["carbs_g"] for d in daily) / len(daily), 1),
        }
    else:
        avg = {"calories": 0, "protein_g": 0, "fat_g": 0, "carbs_g": 0}

    return {"daily": daily, "average": avg}
