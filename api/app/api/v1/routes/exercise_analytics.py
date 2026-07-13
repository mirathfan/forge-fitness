from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.exercise_analytics import ExerciseAnalyticsOption, ExerciseAnalyticsRead
from app.services.exercise_analytics import ExerciseAnalyticsService

router = APIRouter()


@router.get("", response_model=list[ExerciseAnalyticsOption])
def list_exercise_analytics_options(current_user: CurrentUser, db: DbSession) -> list[ExerciseAnalyticsOption]:
    return ExerciseAnalyticsService(db).list_options(current_user)


@router.get("/{exercise_id}", response_model=ExerciseAnalyticsRead)
def get_exercise_analytics(exercise_id: UUID, current_user: CurrentUser, db: DbSession) -> ExerciseAnalyticsRead:
    return ExerciseAnalyticsService(db).get(current_user, exercise_id)
