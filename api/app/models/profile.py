from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import ExperienceLevel, FitnessGoal, WeightUnit
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class UserProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    date_of_birth: Mapped[date | None]
    height_cm: Mapped[float | None] = mapped_column(Numeric(5, 2))
    current_weight_kg: Mapped[float | None] = mapped_column(Numeric(6, 2))
    preferred_weight_unit: Mapped[WeightUnit] = mapped_column(
        Enum(WeightUnit, name="weight_unit"),
        default=WeightUnit.kg,
    )
    fitness_goal: Mapped[FitnessGoal] = mapped_column(
        Enum(FitnessGoal, name="fitness_goal"),
        default=FitnessGoal.maintain,
    )
    experience_level: Mapped[ExperienceLevel] = mapped_column(
        Enum(ExperienceLevel, name="experience_level"),
        default=ExperienceLevel.beginner,
    )

    user: Mapped[User] = relationship(back_populates="profile")
