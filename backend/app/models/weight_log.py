"""WeightLog model — daily weight tracking."""

import uuid

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class WeightLog(Base):
    __tablename__ = "weight_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    weight_kg = Column(Float, nullable=False)
    logged_date = Column(Date, server_default=func.current_date())
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "logged_date", name="uq_user_weight_date"),)

    # Relationships
    user = relationship("User", back_populates="weight_logs")
