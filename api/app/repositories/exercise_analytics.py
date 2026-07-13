from datetime import datetime
from uuid import UUID

from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.models.enums import SetType, WorkoutStatus
from app.models.exercise import Exercise
from app.models.workout import ExerciseSet, WorkoutSession, WorkoutSessionExercise


class ExerciseAnalyticsRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_exercises_with_history(self, user_id: UUID) -> list[tuple[Exercise, int, datetime | None]]:
        statement = (
            select(
                Exercise,
                func.count(distinct(WorkoutSession.id)),
                func.max(WorkoutSession.completed_at),
            )
            .join(WorkoutSessionExercise, WorkoutSessionExercise.exercise_id == Exercise.id)
            .join(WorkoutSession, WorkoutSession.id == WorkoutSessionExercise.workout_session_id)
            .join(ExerciseSet, ExerciseSet.workout_session_exercise_id == WorkoutSessionExercise.id)
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == WorkoutStatus.completed,
                WorkoutSession.completed_at.is_not(None),
                ExerciseSet.is_completed.is_(True),
                ExerciseSet.set_type == SetType.working,
                ExerciseSet.weight_kg > 0,
                ExerciseSet.repetitions > 0,
            )
            .group_by(Exercise.id)
            .order_by(func.max(WorkoutSession.completed_at).desc())
        )
        return list(self.db.execute(statement).tuples().all())

    def sets_for_exercise(self, user_id: UUID, exercise_id: UUID) -> list[tuple[WorkoutSession, ExerciseSet]]:
        statement = (
            select(WorkoutSession, ExerciseSet)
            .join(WorkoutSessionExercise, WorkoutSessionExercise.workout_session_id == WorkoutSession.id)
            .join(ExerciseSet, ExerciseSet.workout_session_exercise_id == WorkoutSessionExercise.id)
            .where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == WorkoutStatus.completed,
                WorkoutSession.completed_at.is_not(None),
                WorkoutSessionExercise.exercise_id == exercise_id,
                ExerciseSet.is_completed.is_(True),
                ExerciseSet.set_type == SetType.working,
            )
            .order_by(WorkoutSession.completed_at.asc(), ExerciseSet.set_number.asc())
        )
        return list(self.db.execute(statement).tuples().all())
