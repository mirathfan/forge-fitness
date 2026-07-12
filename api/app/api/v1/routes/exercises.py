from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession
from app.schemas.exercise import ExerciseCreate, ExerciseList, ExerciseRead
from app.schemas.workout import ExerciseHistoryEntry, PreviousPerformanceSet
from app.services.exercises import ExerciseService
from app.services.workouts import WorkoutService

router = APIRouter()


@router.get("", response_model=ExerciseList)
def list_exercises(
    current_user: CurrentUser,
    db: DbSession,
    search: str | None = None,
    muscle_group: str | None = None,
    equipment: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ExerciseList:
    items, total = ExerciseService(db).list_visible(current_user, search, muscle_group, equipment, limit, offset)
    return ExerciseList(
        items=[ExerciseRead.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{exercise_id}", response_model=ExerciseRead)
def get_exercise(exercise_id: UUID, current_user: CurrentUser, db: DbSession) -> ExerciseRead:
    return ExerciseRead.model_validate(ExerciseService(db).get(current_user, exercise_id))


@router.post("", response_model=ExerciseRead, status_code=201)
def create_exercise(payload: ExerciseCreate, current_user: CurrentUser, db: DbSession) -> ExerciseRead:
    return ExerciseRead.model_validate(ExerciseService(db).create_custom(current_user, payload))


@router.get("/{exercise_id}/history", response_model=list[ExerciseHistoryEntry])
def exercise_history(exercise_id: UUID, current_user: CurrentUser, db: DbSession) -> list[ExerciseHistoryEntry]:
    return WorkoutService(db).exercise_history(current_user, exercise_id)


@router.get("/{exercise_id}/previous-performance", response_model=list[PreviousPerformanceSet])
def previous_performance(
    exercise_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> list[PreviousPerformanceSet]:
    return WorkoutService(db).previous_performance(current_user, exercise_id)
