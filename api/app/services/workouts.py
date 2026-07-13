from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.enums import SetType, WorkoutStatus
from app.models.user import User
from app.models.workout import ExerciseSet, WorkoutSession, WorkoutSessionExercise
from app.repositories.exercises import ExerciseRepository
from app.repositories.workouts import WorkoutRepository
from app.schemas.workout import (
    ExerciseHistoryEntry,
    ExerciseSetCreate,
    ExerciseSetUpdate,
    PreviousPerformanceSet,
    WorkoutSessionCreate,
    WorkoutSessionUpdate,
)
from app.services.errors import ConflictError, NotFoundError
from app.services.recommendations import RecommendationService
from app.services.templates import TemplateService


class WorkoutService:
    def __init__(self, db: Session):
        self.db = db
        self.workouts = WorkoutRepository(db)
        self.exercises = ExerciseRepository(db)

    def list_for_user(
        self,
        user: User,
        status: WorkoutStatus | None,
        limit: int,
        offset: int,
    ) -> tuple[list[WorkoutSession], int]:
        return self.workouts.list_for_user(user.id, status, limit, offset)

    def get(self, user: User, session_id: UUID) -> WorkoutSession:
        session = self.workouts.get_for_user(session_id, user.id)
        if session is None:
            raise NotFoundError("Workout session not found")
        return session

    def create(self, user: User, payload: WorkoutSessionCreate) -> WorkoutSession:
        if self.workouts.get_active(user.id) is not None:
            raise ConflictError("Finish or abandon the active workout before starting another")

        now = datetime.now(UTC)
        if payload.workout_template_id:
            template = TemplateService(self.db).get(user, payload.workout_template_id)
            session_name = payload.name or template.name
            session = WorkoutSession(
                user_id=user.id,
                workout_template_id=template.id,
                name=session_name,
                status=WorkoutStatus.active,
                started_at=now,
            )
            self.db.add(session)
            self.db.flush()
            for item in template.exercises:
                session.exercises.append(
                    WorkoutSessionExercise(
                        exercise_id=item.exercise_id,
                        position=item.position,
                        notes=item.notes,
                    )
                )
        else:
            session = WorkoutSession(
                user_id=user.id,
                name=payload.name or "Untitled Workout",
                status=WorkoutStatus.active,
                started_at=now,
            )
            self.db.add(session)

        self.db.commit()
        return self.get(user, session.id)

    def update(self, user: User, session_id: UUID, payload: WorkoutSessionUpdate) -> WorkoutSession:
        session = self.get(user, session_id)
        if payload.name is not None:
            session.name = payload.name.strip()
        if payload.notes is not None:
            session.notes = payload.notes
        self.db.commit()
        return self.get(user, session.id)

    def complete(self, user: User, session_id: UUID) -> WorkoutSession:
        session = self.get(user, session_id)
        if session.status == WorkoutStatus.completed:
            return session
        if session.status != WorkoutStatus.active:
            raise ConflictError("Only an active workout can be completed")
        now = datetime.now(UTC)
        session.status = WorkoutStatus.completed
        session.completed_at = now
        session.total_duration_seconds = max(0, int((now - self._aware(session.started_at)).total_seconds()))
        self.db.flush()
        RecommendationService(self.db).generate_for_session(session)
        self.db.commit()
        return self.get(user, session.id)

    def abandon(self, user: User, session_id: UUID) -> WorkoutSession:
        session = self.get(user, session_id)
        if session.status != WorkoutStatus.active:
            raise ConflictError("Only an active workout can be abandoned")
        now = datetime.now(UTC)
        session.status = WorkoutStatus.abandoned
        session.completed_at = now
        session.total_duration_seconds = max(0, int((now - self._aware(session.started_at)).total_seconds()))
        self.db.commit()
        return self.get(user, session.id)

    def add_set(
        self,
        user: User,
        session_id: UUID,
        session_exercise_id: UUID,
        payload: ExerciseSetCreate,
    ) -> ExerciseSet:
        session = self.get(user, session_id)
        session_exercise = self.workouts.get_session_exercise(session_id, session_exercise_id)
        if session_exercise is None:
            raise NotFoundError("Workout exercise not found")
        if payload.client_mutation_id is not None:
            existing = self.workouts.get_set_by_client_mutation(session_exercise_id, payload.client_mutation_id)
            if existing is not None:
                return existing
        if session.status != WorkoutStatus.active:
            raise ConflictError("Sets can only be logged on an active workout")
        set_number = (
            self.db.scalar(
                select(func.coalesce(func.max(ExerciseSet.set_number), 0)).where(
                    ExerciseSet.workout_session_exercise_id == session_exercise_id
                )
            )
            or 0
        ) + 1
        set_ = ExerciseSet(
            workout_session_exercise_id=session_exercise_id,
            set_number=set_number,
            completed_at=datetime.now(UTC) if payload.is_completed else None,
            **payload.model_dump(),
        )
        self.db.add(set_)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            if payload.client_mutation_id is not None:
                existing = self.workouts.get_set_by_client_mutation(session_exercise_id, payload.client_mutation_id)
                if existing is not None:
                    return existing
            raise
        self.db.refresh(set_)
        return set_

    def update_set(self, user: User, session_id: UUID, set_id: UUID, payload: ExerciseSetUpdate) -> ExerciseSet:
        session = self.get(user, session_id)
        if session.status != WorkoutStatus.active:
            raise ConflictError("Sets can only be edited on an active workout")
        set_ = self.workouts.get_set(session_id, set_id)
        if set_ is None:
            raise NotFoundError("Set not found")
        update_data = payload.model_dump()
        set_number = update_data.pop("set_number")
        update_data.pop("client_mutation_id", None)
        if set_number is not None:
            set_.set_number = set_number
        for key, value in update_data.items():
            setattr(set_, key, value)
        set_.completed_at = datetime.now(UTC) if set_.is_completed else None
        self.db.commit()
        self.db.refresh(set_)
        return set_

    def delete_set(self, user: User, session_id: UUID, set_id: UUID) -> None:
        session = self.get(user, session_id)
        if session.status != WorkoutStatus.active:
            raise ConflictError("Sets can only be deleted on an active workout")
        set_ = self.workouts.get_set(session_id, set_id)
        if set_ is None:
            raise NotFoundError("Set not found")
        self.db.delete(set_)
        self.db.commit()

    def previous_performance(self, user: User, exercise_id: UUID) -> list[PreviousPerformanceSet]:
        if self.exercises.get_visible(exercise_id, user.id) is None:
            raise NotFoundError("Exercise not found")
        latest_session_id = self.db.scalar(
            select(WorkoutSession.id)
            .join(WorkoutSessionExercise, WorkoutSessionExercise.workout_session_id == WorkoutSession.id)
            .where(
                WorkoutSession.user_id == user.id,
                WorkoutSession.status == WorkoutStatus.completed,
                WorkoutSessionExercise.exercise_id == exercise_id,
            )
            .order_by(WorkoutSession.completed_at.desc())
            .limit(1)
        )
        if latest_session_id is None:
            return []
        rows = list(
            self.db.execute(
                select(WorkoutSession.id, WorkoutSession.completed_at, ExerciseSet)
                .join(WorkoutSessionExercise, WorkoutSessionExercise.workout_session_id == WorkoutSession.id)
                .join(ExerciseSet, ExerciseSet.workout_session_exercise_id == WorkoutSessionExercise.id)
                .where(
                    WorkoutSession.id == latest_session_id,
                    WorkoutSessionExercise.exercise_id == exercise_id,
                    ExerciseSet.is_completed.is_(True),
                    ExerciseSet.set_type == SetType.working,
                )
                .order_by(ExerciseSet.set_number.asc())
            )
        )
        return [
            PreviousPerformanceSet(
                session_id=session_id,
                completed_at=completed_at,
                weight_kg=float(set_.weight_kg),
                repetitions=set_.repetitions,
                rpe=float(set_.rpe) if set_.rpe is not None else None,
                set_type=set_.set_type,
            )
            for session_id, completed_at, set_ in rows
        ]

    def exercise_history(self, user: User, exercise_id: UUID) -> list[ExerciseHistoryEntry]:
        if self.exercises.get_visible(exercise_id, user.id) is None:
            raise NotFoundError("Exercise not found")
        rows = list(
            self.db.execute(
                select(WorkoutSession, ExerciseSet)
                .join(WorkoutSessionExercise, WorkoutSessionExercise.workout_session_id == WorkoutSession.id)
                .join(ExerciseSet, ExerciseSet.workout_session_exercise_id == WorkoutSessionExercise.id)
                .where(
                    WorkoutSession.user_id == user.id,
                    WorkoutSession.status == WorkoutStatus.completed,
                    WorkoutSessionExercise.exercise_id == exercise_id,
                    ExerciseSet.is_completed.is_(True),
                )
                .order_by(WorkoutSession.completed_at.desc(), ExerciseSet.set_number.asc())
            )
        )
        grouped: dict[UUID, ExerciseHistoryEntry] = {}
        for session, set_ in rows:
            if session.id not in grouped:
                grouped[session.id] = ExerciseHistoryEntry(
                    session_id=session.id,
                    workout_name=session.name,
                    completed_at=session.completed_at,
                    sets=[],
                )
            grouped[session.id].sets.append(
                PreviousPerformanceSet(
                    session_id=session.id,
                    completed_at=session.completed_at,
                    weight_kg=float(set_.weight_kg),
                    repetitions=set_.repetitions,
                    rpe=float(set_.rpe) if set_.rpe is not None else None,
                    set_type=set_.set_type,
                )
            )
        return list(grouped.values())

    @staticmethod
    def _aware(value: datetime) -> datetime:
        return value if value.tzinfo is not None else value.replace(tzinfo=UTC)
