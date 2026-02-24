"""Workout model — daily workout tracking."""

import uuid

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    workout_date = Column(Date, nullable=False)
    completed = Column(Boolean, default=False)
    notes = Column(Text)  # Up to 300 chars
    xp_awarded = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # One workout per day per user
    __table_args__ = (UniqueConstraint("user_id", "workout_date", name="uq_user_workout_date"),)

    # Relationships
    user = relationship("User", back_populates="workouts")
