from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.models.enums import WorkoutStatus
from app.schemas.workout import (
    ExerciseSetCreate,
    ExerciseSetRead,
    ExerciseSetUpdate,
    WorkoutHistoryList,
    WorkoutSessionCreate,
    WorkoutSessionRead,
    WorkoutSessionUpdate,
)
from app.services.workouts import WorkoutService

router = APIRouter()


@router.post("", response_model=WorkoutSessionRead, status_code=201)
def create_session(payload: WorkoutSessionCreate, current_user: CurrentUser, db: DbSession) -> WorkoutSessionRead:
    return WorkoutSessionRead.model_validate(WorkoutService(db).create(current_user, payload))


@router.get("", response_model=WorkoutHistoryList)
def list_sessions(
    current_user: CurrentUser,
    db: DbSession,
    status_filter: Annotated[WorkoutStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> WorkoutHistoryList:
    items, total = WorkoutService(db).list_for_user(current_user, status_filter, limit, offset)
    return WorkoutHistoryList(
        items=[WorkoutSessionRead.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{session_id}", response_model=WorkoutSessionRead)
def get_session(session_id: UUID, current_user: CurrentUser, db: DbSession) -> WorkoutSessionRead:
    return WorkoutSessionRead.model_validate(WorkoutService(db).get(current_user, session_id))


@router.put("/{session_id}", response_model=WorkoutSessionRead)
def update_session(
    session_id: UUID,
    payload: WorkoutSessionUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> WorkoutSessionRead:
    return WorkoutSessionRead.model_validate(WorkoutService(db).update(current_user, session_id, payload))


@router.post("/{session_id}/complete", response_model=WorkoutSessionRead)
def complete_session(session_id: UUID, current_user: CurrentUser, db: DbSession) -> WorkoutSessionRead:
    return WorkoutSessionRead.model_validate(WorkoutService(db).complete(current_user, session_id))


@router.post("/{session_id}/abandon", response_model=WorkoutSessionRead)
def abandon_session(session_id: UUID, current_user: CurrentUser, db: DbSession) -> WorkoutSessionRead:
    return WorkoutSessionRead.model_validate(WorkoutService(db).abandon(current_user, session_id))


@router.post("/{session_id}/exercises/{session_exercise_id}/sets", response_model=ExerciseSetRead, status_code=201)
def add_set(
    session_id: UUID,
    session_exercise_id: UUID,
    payload: ExerciseSetCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> ExerciseSetRead:
    set_ = WorkoutService(db).add_set(current_user, session_id, session_exercise_id, payload)
    return ExerciseSetRead.model_validate(set_)


@router.put("/{session_id}/sets/{set_id}", response_model=ExerciseSetRead)
def update_set(
    session_id: UUID,
    set_id: UUID,
    payload: ExerciseSetUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> ExerciseSetRead:
    return ExerciseSetRead.model_validate(WorkoutService(db).update_set(current_user, session_id, set_id, payload))


@router.delete("/{session_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(session_id: UUID, set_id: UUID, current_user: CurrentUser, db: DbSession) -> Response:
    WorkoutService(db).delete_set(current_user, session_id, set_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
