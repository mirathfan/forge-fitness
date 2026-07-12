from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.recommendation import ProgressionRecommendation


class RecommendationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(self, user_id: UUID) -> list[ProgressionRecommendation]:
        return list(
            self.db.scalars(
                select(ProgressionRecommendation)
                .options(selectinload(ProgressionRecommendation.exercise))
                .where(ProgressionRecommendation.user_id == user_id)
                .order_by(ProgressionRecommendation.created_at.desc())
            )
        )

    def get_for_user(self, recommendation_id: UUID, user_id: UUID) -> ProgressionRecommendation | None:
        return self.db.scalar(
            select(ProgressionRecommendation)
            .options(selectinload(ProgressionRecommendation.exercise))
            .where(
                ProgressionRecommendation.id == recommendation_id,
                ProgressionRecommendation.user_id == user_id,
            )
        )
