from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import WorkoutStatus
from app.models.workout import ExerciseSet, WorkoutSession, WorkoutSessionExercise


class WorkoutRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_for_user(self, session_id: UUID, user_id: UUID) -> WorkoutSession | None:
        return self.db.scalar(
            select(WorkoutSession)
            .options(
                selectinload(WorkoutSession.exercises).selectinload(WorkoutSessionExercise.exercise),
                selectinload(WorkoutSession.exercises).selectinload(WorkoutSessionExercise.sets),
            )
            .where(WorkoutSession.id == session_id, WorkoutSession.user_id == user_id)
        )

    def list_for_user(
        self,
        user_id: UUID,
        status: WorkoutStatus | None,
        limit: int,
        offset: int,
    ) -> tuple[list[WorkoutSession], int]:
        conditions = [WorkoutSession.user_id == user_id]
        if status:
            conditions.append(WorkoutSession.status == status)
        total = self.db.scalar(select(func.count()).select_from(WorkoutSession).where(*conditions)) or 0
        items = list(
            self.db.scalars(
                select(WorkoutSession)
                .options(
                    selectinload(WorkoutSession.exercises).selectinload(WorkoutSessionExercise.exercise),
                    selectinload(WorkoutSession.exercises).selectinload(WorkoutSessionExercise.sets),
                )
                .where(*conditions)
                .order_by(WorkoutSession.started_at.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        return items, total

    def get_active(self, user_id: UUID) -> WorkoutSession | None:
        return self.db.scalar(
            select(WorkoutSession).where(
                WorkoutSession.user_id == user_id,
                WorkoutSession.status == WorkoutStatus.active,
            )
        )

    def get_session_exercise(self, session_id: UUID, session_exercise_id: UUID) -> WorkoutSessionExercise | None:
        return self.db.scalar(
            select(WorkoutSessionExercise).where(
                WorkoutSessionExercise.id == session_exercise_id,
                WorkoutSessionExercise.workout_session_id == session_id,
            )
        )

    def get_set(self, session_id: UUID, set_id: UUID) -> ExerciseSet | None:
        return self.db.scalar(
            select(ExerciseSet)
            .join(WorkoutSessionExercise)
            .where(
                ExerciseSet.id == set_id,
                WorkoutSessionExercise.workout_session_id == session_id,
            )
        )

    def get_set_by_client_mutation(
        self,
        session_exercise_id: UUID,
        client_mutation_id: str,
    ) -> ExerciseSet | None:
        return self.db.scalar(
            select(ExerciseSet).where(
                ExerciseSet.workout_session_exercise_id == session_exercise_id,
                ExerciseSet.client_mutation_id == client_mutation_id,
            )
        )
