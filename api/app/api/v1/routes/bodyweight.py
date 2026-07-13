from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUser, DbSession
from app.schemas.bodyweight import (
    BodyweightEntryCreate,
    BodyweightEntryList,
    BodyweightEntryRead,
    BodyweightEntryUpdate,
    BodyweightTrend,
)
from app.services.bodyweight import BodyweightService

router = APIRouter()


@router.post("", response_model=BodyweightEntryRead, status_code=201)
def create_bodyweight_entry(
    payload: BodyweightEntryCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> BodyweightEntryRead:
    return BodyweightEntryRead.model_validate(BodyweightService(db).create(current_user, payload))


@router.get("", response_model=BodyweightEntryList)
def list_bodyweight_entries(
    current_user: CurrentUser,
    db: DbSession,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> BodyweightEntryList:
    items, total = BodyweightService(db).list_for_user(current_user, start_date, end_date, limit, offset)
    return BodyweightEntryList(
        items=[BodyweightEntryRead.model_validate(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/trend", response_model=BodyweightTrend)
def get_bodyweight_trend(current_user: CurrentUser, db: DbSession) -> BodyweightTrend:
    return BodyweightService(db).trend(current_user)


@router.put("/{entry_id}", response_model=BodyweightEntryRead)
def update_bodyweight_entry(
    entry_id: UUID,
    payload: BodyweightEntryUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> BodyweightEntryRead:
    return BodyweightEntryRead.model_validate(BodyweightService(db).update(current_user, entry_id, payload))


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bodyweight_entry(entry_id: UUID, current_user: CurrentUser, db: DbSession) -> Response:
    BodyweightService(db).delete(current_user, entry_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
