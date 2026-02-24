"""FoodLog model — meal entries with КБЖУ data."""

import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class FoodLog(Base):
    __tablename__ = "food_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    logged_at = Column(DateTime, server_default=func.now())
    meal_type = Column(String(20))  # breakfast | lunch | dinner | snack

    # Food data
    food_name = Column(String(200), nullable=False)
    calories = Column(Float, nullable=False)
    protein_g = Column(Float, default=0)
    fat_g = Column(Float, default=0)
    carbs_g = Column(Float, default=0)
    weight_g = Column(Float, default=100)

    # Source
    source = Column(String(20), default="manual")  # ai_photo | manual | search
    photo_url = Column(Text)
    ai_confidence = Column(Float)

    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="food_logs")
