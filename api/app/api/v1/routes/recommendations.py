from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.recommendation import ProgressionRecommendationRead
from app.services.recommendations import RecommendationService

router = APIRouter()


@router.get("", response_model=list[ProgressionRecommendationRead])
def list_recommendations(current_user: CurrentUser, db: DbSession) -> list[ProgressionRecommendationRead]:
    return [
        ProgressionRecommendationRead.model_validate(item)
        for item in RecommendationService(db).list_for_user(current_user)
    ]


@router.get("/{recommendation_id}", response_model=ProgressionRecommendationRead)
def get_recommendation(
    recommendation_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> ProgressionRecommendationRead:
    return ProgressionRecommendationRead.model_validate(RecommendationService(db).get(current_user, recommendation_id))
