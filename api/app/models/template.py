from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.exercise import Exercise


class WorkoutTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workout_templates"
    __table_args__ = (Index("ix_templates_user_created", "user_id", "created_at"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    exercises: Mapped[list[WorkoutTemplateExercise]] = relationship(
        back_populates="workout_template",
        cascade="all, delete-orphan",
        order_by="WorkoutTemplateExercise.position",
    )


class WorkoutTemplateExercise(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "workout_template_exercises"
    __table_args__ = (
        UniqueConstraint("workout_template_id", "position", name="uq_template_exercise_position"),
    )

    workout_template_id: Mapped[UUID] = mapped_column(
        ForeignKey("workout_templates.id", ondelete="CASCADE"),
        index=True,
    )
    exercise_id: Mapped[UUID] = mapped_column(ForeignKey("exercises.id", ondelete="RESTRICT"), index=True)
    position: Mapped[int] = mapped_column(nullable=False)
    target_sets: Mapped[int] = mapped_column(default=3)
    target_reps_min: Mapped[int] = mapped_column(default=8)
    target_reps_max: Mapped[int] = mapped_column(default=12)
    target_rpe: Mapped[float | None] = mapped_column(Numeric(3, 1))
    rest_seconds: Mapped[int] = mapped_column(default=120)
    notes: Mapped[str | None] = mapped_column(Text)

    workout_template: Mapped[WorkoutTemplate] = relationship(back_populates="exercises")
    exercise: Mapped[Exercise] = relationship()
