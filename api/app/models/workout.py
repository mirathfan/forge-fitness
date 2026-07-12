from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import SetType, WorkoutStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.exercise import Exercise


class WorkoutSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "workout_sessions"
    __table_args__ = (Index("ix_sessions_user_status_started", "user_id", "status", "started_at"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    workout_template_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("workout_templates.id", ondelete="SET NULL"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[WorkoutStatus] = mapped_column(
        Enum(WorkoutStatus, name="workout_status"),
        default=WorkoutStatus.active,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    total_duration_seconds: Mapped[int | None]

    exercises: Mapped[list[WorkoutSessionExercise]] = relationship(
        back_populates="workout_session",
        cascade="all, delete-orphan",
        order_by="WorkoutSessionExercise.position",
    )


class WorkoutSessionExercise(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "workout_session_exercises"
    __table_args__ = (
        UniqueConstraint("workout_session_id", "position", name="uq_session_exercise_position"),
        Index("ix_session_exercises_session_exercise", "workout_session_id", "exercise_id"),
    )

    workout_session_id: Mapped[UUID] = mapped_column(ForeignKey("workout_sessions.id", ondelete="CASCADE"))
    exercise_id: Mapped[UUID] = mapped_column(ForeignKey("exercises.id", ondelete="RESTRICT"), index=True)
    position: Mapped[int] = mapped_column(nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)

    workout_session: Mapped[WorkoutSession] = relationship(back_populates="exercises")
    exercise: Mapped[Exercise] = relationship()
    sets: Mapped[list[ExerciseSet]] = relationship(
        back_populates="workout_session_exercise",
        cascade="all, delete-orphan",
        order_by="ExerciseSet.set_number",
    )


class ExerciseSet(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "exercise_sets"
    __table_args__ = (
        UniqueConstraint("workout_session_exercise_id", "set_number", name="uq_exercise_set_number"),
        Index("ix_sets_session_exercise_completed", "workout_session_exercise_id", "is_completed"),
    )

    workout_session_exercise_id: Mapped[UUID] = mapped_column(
        ForeignKey("workout_session_exercises.id", ondelete="CASCADE"),
        index=True,
    )
    set_number: Mapped[int] = mapped_column(nullable=False)
    set_type: Mapped[SetType] = mapped_column(Enum(SetType, name="set_type"), default=SetType.working)
    weight_kg: Mapped[float] = mapped_column(Numeric(7, 2), nullable=False)
    repetitions: Mapped[int] = mapped_column(nullable=False)
    rpe: Mapped[float | None] = mapped_column(Numeric(3, 1))
    reps_in_reserve: Mapped[int | None]
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workout_session_exercise: Mapped[WorkoutSessionExercise] = relationship(back_populates="sets")
