from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.workout import ExerciseSet, WorkoutSession
from app.repositories.exercise_analytics import ExerciseAnalyticsRepository
from app.repositories.exercises import ExerciseRepository
from app.schemas.exercise import ExerciseRead
from app.schemas.exercise_analytics import (
    ExerciseAnalyticsOption,
    ExerciseAnalyticsRead,
    ExerciseAnalyticsSet,
    ExerciseAnalyticsTrendPoint,
)
from app.services.errors import NotFoundError


@dataclass(frozen=True)
class AnalyticsSet:
    session: WorkoutSession
    set_: ExerciseSet

    @property
    def weight_kg(self) -> float:
        return float(self.set_.weight_kg)

    @property
    def repetitions(self) -> int:
        return self.set_.repetitions

    @property
    def volume_kg(self) -> float:
        return self.weight_kg * self.repetitions


def estimate_one_rep_max_kg(weight_kg: float, repetitions: int) -> float | None:
    if weight_kg <= 0 or repetitions < 1 or repetitions > 12:
        return None
    return round(weight_kg * (1 + repetitions / 30), 2)


def is_valid_working_set(set_: ExerciseSet) -> bool:
    return float(set_.weight_kg) > 0 and set_.repetitions > 0


class ExerciseAnalyticsService:
    def __init__(self, db: Session):
        self.db = db
        self.analytics = ExerciseAnalyticsRepository(db)
        self.exercises = ExerciseRepository(db)

    def list_options(self, user: User) -> list[ExerciseAnalyticsOption]:
        options: list[ExerciseAnalyticsOption] = []
        for exercise, completed_sessions, latest_completed_at in self.analytics.list_exercises_with_history(user.id):
            if latest_completed_at is None:
                continue
            analytics = self.get(user, exercise.id)
            options.append(
                ExerciseAnalyticsOption(
                    exercise=ExerciseRead.model_validate(exercise),
                    completed_sessions=completed_sessions,
                    latest_completed_at=latest_completed_at,
                    latest_estimated_one_rep_max_kg=analytics.estimated_one_rep_max_kg,
                )
            )
        return options

    def get(self, user: User, exercise_id: UUID) -> ExerciseAnalyticsRead:
        exercise = self.exercises.get_visible(exercise_id, user.id)
        if exercise is None:
            raise NotFoundError("Exercise not found")

        rows = self.analytics.sets_for_exercise(user.id, exercise_id)
        sets = [AnalyticsSet(session, set_) for session, set_ in rows if is_valid_working_set(set_)]
        trend = self._trend(sets)
        best_set = self._best_set(sets)
        return ExerciseAnalyticsRead(
            exercise=ExerciseRead.model_validate(exercise),
            estimated_one_rep_max_kg=best_set.estimated_one_rep_max_kg if best_set else None,
            best_working_set=best_set,
            heaviest_working_weight_kg=round(max((set_.weight_kg for set_ in sets), default=0), 2) or None,
            total_working_volume_kg=round(sum(set_.volume_kg for set_ in sets), 2),
            trend=trend,
        )

    def _trend(self, sets: list[AnalyticsSet]) -> list[ExerciseAnalyticsTrendPoint]:
        grouped: dict[UUID, list[AnalyticsSet]] = {}
        for set_ in sets:
            grouped.setdefault(set_.session.id, []).append(set_)

        points: list[ExerciseAnalyticsTrendPoint] = []
        for session_sets in grouped.values():
            session = session_sets[0].session
            best_set = self._best_set(session_sets)
            points.append(
                ExerciseAnalyticsTrendPoint(
                    workout_session_id=session.id,
                    workout_name=session.name,
                    completed_at=completed_session_time(session),
                    heaviest_weight_kg=round(max(set_.weight_kg for set_ in session_sets), 2),
                    total_volume_kg=round(sum(set_.volume_kg for set_ in session_sets), 2),
                    best_estimated_one_rep_max_kg=best_set.estimated_one_rep_max_kg if best_set else None,
                    best_set=best_set,
                )
            )
        return points

    def _best_set(self, sets: list[AnalyticsSet]) -> ExerciseAnalyticsSet | None:
        candidates = [
            (estimate_one_rep_max_kg(set_.weight_kg, set_.repetitions), set_)
            for set_ in sets
            if estimate_one_rep_max_kg(set_.weight_kg, set_.repetitions) is not None
        ]
        if not candidates:
            return None
        estimated, best = max(candidates, key=lambda item: (item[0] or 0, item[1].weight_kg, item[1].repetitions))
        return ExerciseAnalyticsSet(
            workout_session_id=best.session.id,
            workout_name=best.session.name,
            completed_at=completed_session_time(best.session),
            weight_kg=round(best.weight_kg, 2),
            repetitions=best.repetitions,
            estimated_one_rep_max_kg=estimated,
        )


def completed_session_time(session: WorkoutSession) -> datetime:
    if session.completed_at is None:
        raise ValueError("Completed workout session is missing completed_at")
    return session.completed_at
