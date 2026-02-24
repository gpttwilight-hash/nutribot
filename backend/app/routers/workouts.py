"""Workouts router — CRUD, calendar view, stats."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.user import User
from app.models.workout import Workout
from app.services.gamification_service import award_xp, check_workout_achievements

router = APIRouter(prefix="/workouts", tags=["workouts"])


class WorkoutCreate(BaseModel):
    workout_date: str  # YYYY-MM-DD
    completed: bool = True
    notes: str | None = None


class WorkoutUpdate(BaseModel):
    completed: bool | None = None
    notes: str | None = None


@router.get("")
async def get_workouts(
    month: str = Query(default=None, description="YYYY-MM format"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get workouts for a month."""
    if month:
        year, m = map(int, month.split("-"))
        start = date(year, m, 1)
        if m == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, m + 1, 1)
    else:
        today = date.today()
        start = today.replace(day=1)
        if start.month == 12:
            end = date(start.year + 1, 1, 1)
        else:
            end = date(start.year, start.month + 1, 1)

    result = await db.execute(
        select(Workout)
        .where(
            Workout.user_id == user_id,
            Workout.workout_date >= start,
            Workout.workout_date < end,
        )
        .order_by(Workout.workout_date)
    )
    workouts = result.scalars().all()

    return {
        "workouts": [
            {
                "id": str(w.id),
                "workout_date": str(w.workout_date),
                "completed": w.completed,
                "notes": w.notes,
                "xp_awarded": w.xp_awarded,
            }
            for w in workouts
        ]
    }


@router.post("")
async def create_workout(
    body: WorkoutCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create or update workout for a date."""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    workout_date = date.fromisoformat(body.workout_date)

    # Check if workout already exists for this date
    result = await db.execute(
        select(Workout).where(
            Workout.user_id == user_id,
            Workout.workout_date == workout_date,
        )
    )
    existing = result.scalar_one_or_none()

    xp_awarded = 0
    if existing:
        existing.completed = body.completed
        existing.notes = body.notes
        workout = existing
    else:
        workout = Workout(
            user_id=user_id,
            workout_date=workout_date,
            completed=body.completed,
            notes=body.notes,
        )
        db.add(workout)

        # Award XP for new completed workout
        if body.completed:
            xp_awarded = 40
            xp_result = await award_xp(db, user, xp_awarded)
            workout.xp_awarded = xp_awarded

            # Check workout count achievements
            await check_workout_achievements(db, user)

    await db.flush()

    return {
        "workout": {
            "id": str(workout.id),
            "workout_date": str(workout.workout_date),
            "completed": workout.completed,
            "notes": workout.notes,
        },
        "xp_awarded": xp_awarded,
    }


@router.put("/{workout_id}")
async def update_workout(
    workout_id: str,
    body: WorkoutUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing workout."""
    result = await db.execute(
        select(Workout).where(Workout.id == workout_id, Workout.user_id == user_id)
    )
    workout = result.scalar_one_or_none()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    if body.completed is not None:
        workout.completed = body.completed
    if body.notes is not None:
        workout.notes = body.notes[:300]  # Limit to 300 chars

    return {
        "workout": {
            "id": str(workout.id),
            "workout_date": str(workout.workout_date),
            "completed": workout.completed,
            "notes": workout.notes,
        }
    }


@router.get("/stats")
async def get_workout_stats(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get workout statistics."""
    today = date.today()

    # Last 7 days
    result_7 = await db.execute(
        select(func.count(Workout.id)).where(
            Workout.user_id == user_id,
            Workout.completed == True,
            Workout.workout_date >= today - timedelta(days=7),
        )
    )
    last_7 = result_7.scalar() or 0

    # Last 30 days
    result_30 = await db.execute(
        select(func.count(Workout.id)).where(
            Workout.user_id == user_id,
            Workout.completed == True,
            Workout.workout_date >= today - timedelta(days=30),
        )
    )
    last_30 = result_30.scalar() or 0

    # Best streak (consecutive completed days)
    result_all = await db.execute(
        select(Workout.workout_date)
        .where(Workout.user_id == user_id, Workout.completed == True)
        .order_by(Workout.workout_date)
    )
    dates = [row[0] for row in result_all.all()]

    best_streak = 0
    current_streak = 0
    for i, d in enumerate(dates):
        if i == 0:
            current_streak = 1
        elif (d - dates[i - 1]).days == 1:
            current_streak += 1
        else:
            current_streak = 1
        best_streak = max(best_streak, current_streak)

    return {
        "last_7_days": last_7,
        "last_30_days": last_30,
        "best_streak": best_streak,
    }
