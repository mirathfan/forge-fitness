from datetime import datetime
from uuid import UUID

from app.models.enums import RecommendationType
from app.schemas.common import ORMModel
from app.schemas.exercise import ExerciseRead


class ProgressionRecommendationRead(ORMModel):
    id: UUID
    exercise_id: UUID
    source_workout_session_id: UUID
    recommendation_type: RecommendationType
    current_weight_kg: float
    recommended_weight_kg: float | None
    explanation: str
    created_at: datetime
    exercise: ExerciseRead
