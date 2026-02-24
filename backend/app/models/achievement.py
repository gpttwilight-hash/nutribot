"""Achievement model — user achievements and badges."""

import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    achievement_code = Column(String(50), nullable=False)
    achieved_at = Column(DateTime, server_default=func.now())
    notified = Column(Boolean, default=False)

    __table_args__ = (UniqueConstraint("user_id", "achievement_code", name="uq_user_achievement"),)

    # Relationships
    user = relationship("User", back_populates="achievements")


# Achievement definitions
ACHIEVEMENT_DEFINITIONS = {
    "streak_7": {"name": "Неделя без пропусков", "description": "Стрик 7 дней", "icon": "🔥", "xp": 100},
    "streak_30": {"name": "Месяц дисциплины", "description": "Стрик 30 дней", "icon": "💪", "xp": 300},
    "streak_100": {"name": "Легенда", "description": "Стрик 100 дней", "icon": "🏆", "xp": 500},
    "first_photo": {"name": "ИИ-фотограф", "description": "Первый анализ фото", "icon": "📸", "xp": 100},
    "first_week": {"name": "Первая неделя", "description": "7 дней логирования питания", "icon": "📅", "xp": 100},
    "workouts_10": {"name": "Начинающий атлет", "description": "10 тренировок", "icon": "🏃", "xp": 100},
    "workouts_50": {"name": "Спортсмен", "description": "50 тренировок", "icon": "🏋️", "xp": 200},
    "workouts_100": {"name": "Железный человек", "description": "100 тренировок", "icon": "🦾", "xp": 300},
    "goal_reached": {"name": "Цель достигнута", "description": "Достиг целевого веса", "icon": "🎯", "xp": 500},
    "level_10": {"name": "Про", "description": "Достиг 10 уровня", "icon": "⭐", "xp": 300},
}
