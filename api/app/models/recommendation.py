from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import RecommendationType
from app.models.mixins import UUIDPrimaryKeyMixin, utc_now

if TYPE_CHECKING:
    from app.models.exercise import Exercise


class ProgressionRecommendation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "progression_recommendations"
    __table_args__ = (Index("ix_recommendations_user_created", "user_id", "created_at"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    exercise_id: Mapped[UUID] = mapped_column(ForeignKey("exercises.id", ondelete="CASCADE"), index=True)
    source_workout_session_id: Mapped[UUID] = mapped_column(
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    recommendation_type: Mapped[RecommendationType] = mapped_column(
        Enum(RecommendationType, name="recommendation_type"),
    )
    current_weight_kg: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    recommended_weight_kg: Mapped[float | None] = mapped_column(Numeric(7, 2))
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    exercise: Mapped[Exercise] = relationship()
