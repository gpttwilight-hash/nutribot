"""User model — body params, daily norms, gamification, subscription."""

import uuid
from datetime import datetime, date

from sqlalchemy import BigInteger, Column, Date, DateTime, Float, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tg_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String(100))
    first_name = Column(String(100))

    # Body parameters
    goal = Column(String(10), nullable=False, default="maintain")  # cut | bulk | maintain
    gender = Column(String(10))  # male | female
    age = Column(Integer)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    target_weight_kg = Column(Float)
    activity_level = Column(String(20))  # sedentary | moderate | active | athlete

    # Daily norms (calculated during onboarding)
    daily_calories = Column(Integer)
    daily_protein_g = Column(Integer)
    daily_fat_g = Column(Integer)
    daily_carbs_g = Column(Integer)

    # Gamification
    level = Column(Integer, default=1)
    xp = Column(Integer, default=0)
    xp_to_next_level = Column(Integer, default=500)
    streak_days = Column(Integer, default=0)
    max_streak_days = Column(Integer, default=0)
    last_streak_date = Column(Date)

    # Subscription
    trial_started_at = Column(DateTime)
    subscription_status = Column(String(20), default="trial")  # trial | active | expired | cancelled
    subscription_expires_at = Column(DateTime)

    # Onboarding
    onboarding_completed = Column(Integer, default=0)  # 0 = not started

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    last_active_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    food_logs = relationship("FoodLog", back_populates="user", cascade="all, delete-orphan")
    workouts = relationship("Workout", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    weight_logs = relationship("WeightLog", back_populates="user", cascade="all, delete-orphan")
