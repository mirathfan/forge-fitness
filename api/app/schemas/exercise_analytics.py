from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.exercise import ExerciseRead


class ExerciseAnalyticsSet(BaseModel):
    workout_session_id: UUID
    workout_name: str
    completed_at: datetime
    weight_kg: float
    repetitions: int
    estimated_one_rep_max_kg: float | None


class ExerciseAnalyticsTrendPoint(BaseModel):
    workout_session_id: UUID
    workout_name: str
    completed_at: datetime
    heaviest_weight_kg: float
    total_volume_kg: float
    best_estimated_one_rep_max_kg: float | None
    best_set: ExerciseAnalyticsSet | None


class ExerciseAnalyticsOption(BaseModel):
    exercise: ExerciseRead
    completed_sessions: int
    latest_completed_at: datetime
    latest_estimated_one_rep_max_kg: float | None


class ExerciseAnalyticsRead(BaseModel):
    exercise: ExerciseRead
    estimated_one_rep_max_kg: float | None
    best_working_set: ExerciseAnalyticsSet | None
    heaviest_working_weight_kg: float | None
    total_working_volume_kg: float
    trend: list[ExerciseAnalyticsTrendPoint]
